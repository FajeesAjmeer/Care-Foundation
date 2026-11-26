"""Twin Care: same-origin WSGI API with transactional SQLite persistence."""
import os, json, sqlite3, secrets, hashlib, hmac, re, time, logging
from pathlib import Path
from contextlib import contextmanager
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from email.parser import BytesParser
from email.policy import default
from datetime import datetime, timezone

ROOT = Path(__file__).parent
DATA = Path(os.environ.get('DATA_DIR', ROOT / 'data'))
ORIGIN = os.environ.get('APP_ORIGIN', 'http://localhost:8000').rstrip('/')
PRODUCTION = os.environ.get('APP_ENV') == 'production'
if PRODUCTION and not ORIGIN.startswith('https://'):
    raise RuntimeError('Production APP_ORIGIN must use https://')
MAX_BODY = 16 * 1024 * 1024
DISTRICTS = ['Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya','Mullaitivu','Batticaloa','Ampara','Trincomalee','Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle']
DISEASES = ['Heart Surgery','Renal Care','Cancer Treatment','Eye Surgery','Orthopaedic Surgery','Neurological Care','Liver Disease']
SCHEMA = '''
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('member','admin')),created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',checks TEXT NOT NULL DEFAULT '[false,false,false,false]',created TEXT NOT NULL,published TEXT,reason TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS approvals(case_id TEXT REFERENCES applications(id),admin_id TEXT REFERENCES users(id),created TEXT NOT NULL,PRIMARY KEY(case_id,admin_id));
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),case_id TEXT REFERENCES applications(id),kind TEXT NOT NULL,mime TEXT NOT NULL,body BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),case_id TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',created TEXT NOT NULL,by_name TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS volunteers(owner TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS donations(id TEXT PRIMARY KEY,case_id TEXT REFERENCES applications(id),amount INTEGER NOT NULL CHECK(amount>0),reference TEXT NOT NULL UNIQUE,created TEXT NOT NULL,admin_id TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS stories(id TEXT PRIMARY KEY,data TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
'''

def now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def uid(): return secrets.token_hex(12)
def digest(s): return hashlib.sha256(s.encode()).hexdigest()
@contextmanager
def db():
    c = sqlite3.connect(DATA / 'twin-care.sqlite3', timeout=20)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def initialize():
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    with db() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript(SCHEMA)
    os.chmod(DATA / 'twin-care.sqlite3', 0o600)

def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    hashed = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return salt + ':' + hashed

def password_matches(password, encoded):
    return hmac.compare_digest(password_hash(password, encoded.split(':')[0]), encoded)

class APIError(Exception):
    def __init__(self, status, message): self.status, self.message = status, message

def require(ok, message, status=400):
    if not ok: raise APIError(status, message)

def field(d,k,maximum=200):
    v = d.get(k,'')
    require(isinstance(v,str) and 0 < len(v.strip()) <= maximum, 'Invalid or missing field: '+k)
    return v.strip()

def email_value(d,k):
    v=field(d,k,254).lower(); require(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',v), 'Enter a valid email address'); return v

def phone_value(d,k):
    v=re.sub(r'[\s()-]','',field(d,k,30));require(re.fullmatch(r'\+[1-9]\d{7,14}',v),'Use international phone format, e.g. +94771234567');return v

def integer(d,k,low,high):
    v=d.get(k);require(str(v).isdigit(),'Invalid number: '+k);v=int(v);require(low<=v<=high,'Out of range: '+k);return v

def audit(c,u,text): c.execute('INSERT INTO audit(actor,action,created) VALUES(?,?,?)',(u['id'],text,now()))
def limited(c,key,n,seconds):
    t=int(time.time());c.execute('DELETE FROM limits WHERE until<?',(t,))
    c.execute('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',(key,t+seconds))
    count=c.execute('SELECT count FROM limits WHERE key=?',(key,)).fetchone()[0]
    c.commit()
    require(count<=n,'Too many requests. Please try again later.',429)

def session(c,e):
    cookies=SimpleCookie()
    try: cookies.load(e.get('HTTP_COOKIE',''))
    except Exception: return None
    v=cookies.get('tcf_session')
    if not v: return None
    r=c.execute('SELECT u.*,s.csrf,s.token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND expires>?',(digest(v.value),int(time.time()))).fetchone()
    return dict(r) if r else None

def user_required(u,admin=False):
    require(u is not None,'Please log in first.',401)
    require(not admin or u['role']=='admin','Admin access required.',403)

def new_session(c,u):
    token=secrets.token_urlsafe(40); csrf=secrets.token_urlsafe(32)
    c.execute('DELETE FROM sessions WHERE expires<?',(int(time.time()),))
    c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(digest(token),u['id'],csrf,int(time.time())+43200))
    secure='; Secure' if PRODUCTION else ''
    return csrf, ('Set-Cookie',f'tcf_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200{secure}')

def upload_parts(e):
    length=int(e.get('CONTENT_LENGTH') or 0)
    require(0<length<=MAX_BODY,'Request is empty or exceeds 16 MB.',413)
    body=e['wsgi.input'].read(length);ct=e.get('CONTENT_TYPE','')
    if ct.startswith('application/json'):
        try: d=json.loads(body)
        except Exception: raise APIError(400,'Invalid JSON')
        require(isinstance(d,dict),'Expected an object');return d,{}
    require(ct.startswith('multipart/form-data'),'Use JSON or form data.',415)
    msg=BytesParser(policy=default).parsebytes(('Content-Type: '+ct+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+body)
    require(msg.is_multipart(),'Invalid multipart form')
    d={};files={}
    for part in msg.iter_parts():
        key=part.get_param('name',header='content-disposition');b=part.get_payload(decode=True) or b''
        require(key and key not in d and key not in files,'Duplicate or unnamed form field')
        if part.get_filename() is not None:
            require(0<len(b)<=5*1024*1024,'Each file must be 1 byte to 5 MB.')
            mime='application/pdf' if b.startswith(b'%PDF-') else 'image/png' if b.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if b.startswith(b'\xff\xd8\xff') else None
            require(mime is not None,'Only PDF, PNG and JPEG files are accepted.')
            files[key]=(mime,b)
        else:
            require(len(b)<=20000,'Field too long');d[key]=b.decode('utf-8')
    return d,files

def save_files(c,u,case_id,files,keys):
    ids=[]
    for k in keys:
        if k in files:
            i=uid();mime,b=files[k];c.execute('INSERT INTO documents VALUES(?,?,?,?,?,?)',(i,u['id'],case_id,k,mime,b));ids.append(i)
    return ids

def approval_list(c,i): return [r[0] for r in c.execute('SELECT admin_id FROM approvals WHERE case_id=?',(i,))]
def app_data(c,r,private=False):
    d=json.loads(r['data']);ap=approval_list(c,r['id'])
    donations=[{'label':'Direct support confirmed','amt':x['amount']/100,'d':x['created'][:10]} for x in c.execute('SELECT * FROM donations WHERE case_id=? ORDER BY created DESC',(r['id'],))]
    out={'id':r['id'],'name':d['a_public_name'],'age':d['a_age'],'district':d['a_district'],'disease':d['a_cond'],'urgency':{'Normal':'normal','Soon':'soon','Urgent':'high'}[d['a_urg']],'required':d['a_cost'],'raised':sum(x['amt'] for x in donations),'submitted':r['created'][:10],'hospital':d['a_hospital'],'treatment':d['a_treat'],'status':'live' if r['status']=='verified' else r['status'],'av':int(r['id'][:2],16)%6,'donors':donations,'vd':dict.fromkeys(['id','med','hosp','pub'],(r['published'] or '')[:10])}
    if private:
        out.update(name=d['a_name'],status=r['status'],submitted=r['created'][:10],checks=json.loads(r['checks']),approvals=ap,phone=d['a_phone'],email=d['a_email'],nic=d['a_nic'],reason=r['reason'],publicName=d['a_public_name'],documents=[dict(x) for x in c.execute('SELECT id,kind FROM documents WHERE case_id=?',(r['id'],))])
    return out

def route(c,e,method,path,u,headers):
    if method=='GET':
        if path=='/api/me': return {'user':{k:u[k] for k in ['id','name','email','role']} if u else None,'csrf':u['csrf'] if u else None,'contactEmail':os.environ.get('CONTACT_EMAIL',''),'districts':DISTRICTS}
        if path=='/api/health': c.execute('SELECT 1');return {'ok':True}
        if path=='/api/cases': return [app_data(c,r) for r in c.execute("SELECT * FROM applications WHERE status='verified' ORDER BY published DESC")]
        if path=='/api/stories': return [dict(json.loads(r['data']),id=r['id']) for r in c.execute('SELECT * FROM stories ORDER BY created DESC')]
        if path=='/api/applications':
            user_required(u);return [app_data(c,r,True) for r in c.execute('SELECT * FROM applications WHERE owner=? ORDER BY created DESC',(u['id'],))]
        if path.startswith('/api/contact/'):
            user_required(u);limited(c,'contact:'+u['id'],30,3600)
            r=c.execute("SELECT * FROM applications WHERE id=? AND status='verified'",(path.split('/')[-1],)).fetchone();require(r,'Case unavailable',404)
            d=json.loads(r['data']);require(d['a_contact_consent'], 'Contact sharing has not been authorized.',403)
            audit(c,u,'Viewed contact for '+r['id']);return {'phone':d['a_phone']}
        if path.startswith('/api/documents/'):
            user_required(u)
            r=c.execute('SELECT * FROM documents WHERE id=?',(path.split('/')[-1],)).fetchone();require(r,'Document not found',404)
            require(u['role']=='admin' or r['owner']==u['id'],'Access denied',403)
            audit(c,u,'Downloaded document '+r['id'])
            ext={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[r['mime']]
            return (r['body'],r['mime'],[('Content-Disposition',f'attachment; filename="document-{r["id"]}.{ext}"')])
        if path=='/api/admin':
            user_required(u,True)
            apps=[app_data(c,r,True) for r in c.execute('SELECT * FROM applications ORDER BY created DESC')]
            reports=[dict(json.loads(r['data']),id=r['id'],caseId=r['case_id'],status=r['status'],time=r['created'],by=r['by_name']) for r in c.execute('SELECT * FROM reports ORDER BY created DESC')]
            vols=[dict(json.loads(r['data']),date=r['created'][:10]) for r in c.execute('SELECT * FROM volunteers ORDER BY created DESC')]
            logs=[{'text':r['action'],'t':r['created']} for r in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 100')]
            return {'applications':apps,'reports':reports,'volunteers':vols,'activity':logs}
        raise APIError(404,'Not found')
    require(method=='POST','Method not allowed',405)
    require(e.get('HTTP_ORIGIN')==ORIGIN,'Request origin not allowed.',403)
    authpath=path in ['/api/register','/api/login','/api/admin/login']
    if not authpath:
        user_required(u);require(hmac.compare_digest(e.get('HTTP_X_CSRF_TOKEN',''),u['csrf']),'Session token expired. Reload the page.',403)
    d,files=upload_parts(e)
    if authpath:
        ip=e.get('HTTP_X_REAL_IP',e.get('REMOTE_ADDR','unknown')) if os.environ.get('TRUST_PROXY')=='1' else e.get('REMOTE_ADDR','unknown');limited(c,'auth-ip:'+ip,60,900)
        email=email_value(d,'email');limited(c,'auth-email:'+digest(email),12,900)
        password=field(d,'password',128)
        r=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        if path=='/api/register':
            require(len(password)>=12,'Use a password of at least 12 characters.')
            require(r is None,'Unable to register this email. Try logging in.',409)
            name=field(d,'name',100);ident=uid()
            c.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(ident,email,name,password_hash(password),'member',now()))
            r=c.execute('SELECT * FROM users WHERE id=?',(ident,)).fetchone()
        else:
            encoded=r['password'] if r else '0'*32+':'+'0'*128
            valid=password_matches(password,encoded);require(r is not None and valid,'Email or password is incorrect.',401)
        if path=='/api/admin/login':
            require(r['role']=='admin','This account does not have administrator access.',403)
        csrf,cookie=new_session(c,r);headers.append(cookie);return {'ok':True,'csrf':csrf}
    if path=='/api/logout':
        c.execute('DELETE FROM sessions WHERE token=?',(u['token'],));headers.append(('Set-Cookie','tcf_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+('; Secure' if PRODUCTION else '')));return {'ok':True}
    if path=='/api/password':
        require(password_matches(field(d,'current',128),u['password']),'Current password incorrect',403)
        p=field(d,'password',128);require(len(p)>=12,'Use at least 12 characters')
        c.execute('UPDATE users SET password=? WHERE id=?',(password_hash(p),u['id']));c.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],));return {'ok':True}
    if path=='/api/applications':
        limited(c,'apply:'+u['id'],5,86400)
        clean={k:field(d,k,2000 if k=='a_treat' else 150) for k in ['a_name','a_public_name','a_nic','a_district','a_cond','a_hospital','a_treat','a_urg']}
        require(re.fullmatch(r'(\d{9}[vVxX]|\d{12})',clean['a_nic']),'Enter a valid applicant/guardian NIC')
        require(clean['a_district'] in DISTRICTS and clean['a_cond'] in DISEASES and clean['a_urg'] in ['Normal','Soon','Urgent'],'Invalid selection')
        clean.update(a_phone=phone_value(d,'a_phone'),a_email=email_value(d,'a_email'),a_age=integer(d,'a_age',0,120),a_cost=integer(d,'a_cost',1,1000000000))
        for k in ['a_consent','a_public_consent','a_contact_consent']:
            require(d.get(k) in [True,'true'],'All consent boxes must be confirmed.');clean[k]=True
        require(all(k in files for k in ['a_report','a_letter','a_est']),'Upload all three medical documents.')
        i=uid();c.execute('INSERT INTO applications(id,owner,data,created) VALUES(?,?,?,?)',(i,u['id'],json.dumps(clean),now()))
        save_files(c,u,i,files,['a_report','a_letter','a_est']);audit(c,u,'Submitted application '+i);return {'id':i,'phone':clean['a_phone']}
    if path=='/api/reports':
        limited(c,'report:'+u['id'],5,86400)
        case=field(d,'r_case',24);require(c.execute("SELECT 1 FROM applications WHERE id=? AND status IN ('verified','suspended')",(case,)).fetchone(),'Case not found',404)
        require(d.get('r_consent') in [True,'true'],'Confirm good-faith reporting')
        clean={'name':field(d,'r_name',100),'contact':field(d,'r_contact',254),'reason':'Visitor report','detail':field(d,'r_desc',4000)}
        clean['documents']=save_files(c,u,None,files,['r_file'])
        c.execute('INSERT INTO reports(id,owner,case_id,data,created) VALUES(?,?,?,?,?)',(uid(),u['id'],case,json.dumps(clean),now()));audit(c,u,'Reported case '+case);return {'caseId':case}
    if path=='/api/volunteers':
        limited(c,'volunteer:'+u['id'],5,86400)
        require(d.get('v_consent') is True,'Confirm permission to store your volunteer information.')
        clean={'name':field(d,'v_name',100),'phone':phone_value(d,'v_phone'),'email':email_value(d,'v_email'),'district':field(d,'v_district'),'role':field(d,'v_role'),'skills':', '.join(k for k in ['Medical','Social media','IT','Field work'] if d.get('v_sk_'+k) is True),'motivation':str(d.get('v_motive',''))[:2000]}
        require(clean['district'] in DISTRICTS and clean['role'] in ['Field verification','Hospital liaison','Social media','IT support'],'Invalid selection')
        c.execute('INSERT INTO volunteers VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',(u['id'],json.dumps(clean),now()));return {'ok':True}
    user_required(u,True)
    # All approval/status changes are serialized, including duplicate/concurrent approvals.
    c.execute('BEGIN IMMEDIATE')
    if path=='/api/admin/case':
        i=field(d,'id',24);r=c.execute('SELECT * FROM applications WHERE id=?',(i,)).fetchone();require(r,'Application not found',404)
        action=field(d,'action',30)
        if action=='review':
            require(r['status']=='pending','Only pending applications can enter review',409);c.execute("UPDATE applications SET status='review' WHERE id=?",(i,))
        elif action=='checks':
            require(r['status']=='review','Case must be under review',409)
            checks=d.get('checks');require(isinstance(checks,list) and len(checks)==4 and all(type(v) is bool for v in checks),'Invalid checklist')
            c.execute('UPDATE applications SET checks=? WHERE id=?',(json.dumps(checks),i));c.execute('DELETE FROM approvals WHERE case_id=?',(i,))
        elif action=='approve':
            require(r['status']=='review' and all(json.loads(r['checks'])),'Complete verification before approval.',409)
            require(u['id']!=r['owner'],'You cannot approve your own application.',403)
            require(u['id'] not in approval_list(c,i),'You already approved. Another admin must approve.',409)
            require(len(approval_list(c,i))<2,'Two approvals are already recorded.',409)
            c.execute('INSERT INTO approvals VALUES(?,?,?)',(i,u['id'],now()))
        elif action=='publish':
            require(r['status']=='review' and all(json.loads(r['checks'])) and len(approval_list(c,i))>=2,'Two distinct approvals are required before publication.',409)
            require(u['id']!=r['owner'],'You cannot publish your own application.',403)
            c.execute("UPDATE applications SET status='verified',published=?,reason='' WHERE id=?",(now(),i))
        elif action=='reject':
            require(r['status'] in ['pending','review'],'Cannot reject a published case',409)
            reason=field(d,'reason',1000);c.execute("UPDATE applications SET status='rejected',reason=? WHERE id=?",(reason,i));c.execute('DELETE FROM approvals WHERE case_id=?',(i,))
        elif action=='suspend':
            require(r['status']=='verified','Case is not live',409);reason=field(d,'reason',1000);c.execute("UPDATE applications SET status='suspended',reason=? WHERE id=?",(reason,i))
        elif action=='reopen':
            require(r['status']=='suspended','Case is not suspended',409)
            c.execute("UPDATE applications SET status='review',checks='[false,false,false,false]' WHERE id=?",(i,));c.execute('DELETE FROM approvals WHERE case_id=?',(i,))
        else: raise APIError(400,'Unknown action')
        audit(c,u,action+' case '+i);return {'ok':True}
    if path=='/api/admin/report':
        i=field(d,'id',24);r=c.execute('SELECT * FROM reports WHERE id=?',(i,)).fetchone();require(r and r['status']=='new','Report already resolved or missing',409)
        action=field(d,'action');require(action in ['dismissed','suspended'],'Invalid action')
        c.execute('UPDATE reports SET status=?,by_name=? WHERE id=?',(action,u['name'],i))
        if action=='suspended': c.execute("UPDATE applications SET status='suspended',reason='Suspended during report investigation' WHERE id=? AND status='verified'",(r['case_id'],))
        audit(c,u,action+' report '+i);return {'ok':True}
    if path=='/api/admin/donation':
        i=field(d,'id',24);require(c.execute("SELECT 1 FROM applications WHERE id=? AND status='verified'",(i,)).fetchone(),'Live case required')
        amount=integer(d,'amount',1,100000000000);reference=field(d,'reference',150)
        require(not c.execute('SELECT 1 FROM donations WHERE reference=?',(reference,)).fetchone(),'This receipt reference was already recorded.',409)
        c.execute('INSERT INTO donations VALUES(?,?,?,?,?,?)',(uid(),i,amount,reference,now(),u['id']));audit(c,u,'Recorded direct support for '+i);return {'ok':True}
    if path=='/api/admin/story':
        require(d.get('consent') is True,'Confirm consent for publication')
        clean={k:field(d,k,3000 if k=='quote' else 150) for k in ['name','district','quote']};clean.update(amt=integer(d,'amt',0,1000000000),av=0)
        c.execute('INSERT INTO stories VALUES(?,?,?)',(uid(),json.dumps(clean),now()));audit(c,u,'Published success story');return {'ok':True}
    if path=='/api/admin/story-delete':
        c.execute('DELETE FROM stories WHERE id=?',(field(d,'id',24),));audit(c,u,'Removed success story');return {'ok':True}
    raise APIError(404,'Not found')

initialize()
MEDIA={'/hero.mp4':'video/mp4','/hero.jpg':'image/jpeg'}
def application(e,start_response):
    headers=[('X-Content-Type-Options','nosniff'),('X-Frame-Options','DENY'),('Referrer-Policy','same-origin'),('Cache-Control','no-store'),('Permissions-Policy','camera=(), microphone=(), geolocation=()'),('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")]
    if PRODUCTION: headers.append(('Strict-Transport-Security','max-age=31536000'))
    status=200;mime='application/json; charset=utf-8'
    try:
        path=e.get('PATH_INFO','/');method=e.get('REQUEST_METHOD','GET')
        if path in MEDIA and method in ('GET','HEAD'):
            data=(ROOT/'public'/path[1:]).read_bytes();mime=MEDIA[path];size=len(data);body=data
            headers[:]=[h for h in headers if h[0]!='Cache-Control']+[('Cache-Control','public, max-age=86400'),('Accept-Ranges','bytes')]
            m=re.fullmatch(r'bytes=(\d*)-(\d*)',e.get('HTTP_RANGE','').strip())
            if m and (m.group(1) or m.group(2)):
                if m.group(1): a=int(m.group(1));b=int(m.group(2)) if m.group(2) else size-1
                else: a=max(size-int(m.group(2)),0);b=size-1
                b=min(b,size-1)
                if a>b or a>=size: headers.append(('Content-Range',f'bytes */{size}'))
                require(a<=b and a<size,'Range not satisfiable',416)
                status=206;body=data[a:b+1];headers.append(('Content-Range',f'bytes {a}-{b}/{size}'))
        elif path in ['/','/admin','/admin/','/app.js','/style.css'] and method=='GET':
            name={'/':'index.html','/admin':'index.html','/admin/':'index.html','/app.js':'app.js','/style.css':'style.css'}[path]
            body=(ROOT/'public'/name).read_bytes();mime={'/':'text/html; charset=utf-8','/admin':'text/html; charset=utf-8','/admin/':'text/html; charset=utf-8','/app.js':'application/javascript; charset=utf-8','/style.css':'text/css; charset=utf-8'}[path]
        else:
            require(path.startswith('/api/'),'Not found',404)
            with db() as c:
                u=session(c,e);result=route(c,e,method,path,u,headers)
                if isinstance(result,tuple): body,mime,extra=result;headers.extend(extra)
                else: body=json.dumps(result).encode()
    except APIError as ex: status=ex.status;body=json.dumps({'error':ex.message}).encode()
    except (ValueError,UnicodeError): status=400;body=b'{"error":"Invalid request"}'
    except Exception:
        logging.exception('Request failed');status=500;body=b'{"error":"Unable to complete request. Please try again."}'
    headers.extend([('Content-Type',mime),('Content-Length',str(len(body)))])
    from http import HTTPStatus
    start_response(f'{status} {HTTPStatus(status).phrase}',headers)
    return [body]

if __name__=='__main__':
    from wsgiref.simple_server import make_server
    print('Local development: '+ORIGIN)
    make_server('127.0.0.1',8000,application).serve_forever()
