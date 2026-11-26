import io,json,os,tempfile,unittest,sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
TMP=tempfile.TemporaryDirectory();os.environ.update(DATA_DIR=TMP.name,APP_ORIGIN='http://localhost:8000',APP_ENV='test')
import server
class Client:
 def __init__(self):self.cookie='';self.csrf=''
 def request(self,path,data=None,files=None,origin=True,token=True):
  result={};body=b'';ct='application/json'
  if files is not None:
   boundary='tcftestboundary';parts=[]
   for k,v in data.items():
    value=str(v).lower() if type(v) is bool else str(v)
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{value}\r\n'.encode())
   for k,b in files.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()+b+b'\r\n')
   parts.append(f'--{boundary}--\r\n'.encode());body=b''.join(parts);ct='multipart/form-data; boundary='+boundary
  elif data is not None:body=json.dumps(data).encode()
  e={'PATH_INFO':path,'REQUEST_METHOD':'POST' if data is not None else 'GET','CONTENT_LENGTH':str(len(body)),'CONTENT_TYPE':ct,'wsgi.input':io.BytesIO(body),'HTTP_COOKIE':self.cookie,'REMOTE_ADDR':'test:'+str(id(self))}
  if origin:e['HTTP_ORIGIN']=server.ORIGIN
  if token:e['HTTP_X_CSRF_TOKEN']=self.csrf
  def start(s,h):result.update(status=int(s.split()[0]),headers=dict(h))
  raw=b''.join(server.application(e,start));cookie=result['headers'].get('Set-Cookie')
  if cookie:self.cookie=cookie.split(';')[0]
  if result['headers']['Content-Type'].startswith('application/json'):
   out=json.loads(raw)
   if isinstance(out,dict) and out.get('csrf'):self.csrf=out['csrf']
  else:out=raw
  return result['status'],out
 def register(self,email='member@example.org'):
  result=self.request('/api/register',{'email':email,'name':'Member','password':'a-long-test-password'});assert result[0]==200,result
 def admin(self,email):
  with server.db() as c:c.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(server.uid(),email,'Admin',server.password_hash('a-long-test-password'),'admin',server.now()))
  result=self.request('/api/login',{'email':email,'password':'a-long-test-password'});assert result[0]==200,result
FORM={'a_name':'Patient Full Name','a_public_name':'Patient','a_age':'12','a_nic':'123456789V','a_email':'guardian@example.org','a_phone':'+94771234567','a_district':'Colombo','a_cond':'Heart Surgery','a_hospital':'Verified Hospital','a_treat':'Treatment description','a_cost':'100000','a_urg':'Urgent','a_consent':True,'a_public_consent':True,'a_contact_consent':True}
FILES={k:b'%PDF-1.4\nTest medical file' for k in ['a_report','a_letter','a_est']}
class PlatformTests(unittest.TestCase):
 def setUp(self):
  with server.db() as c:
   for table in ['sessions','approvals','documents','reports','volunteers','donations','stories','applications','users','audit','limits']:c.execute('DELETE FROM '+table)
  self.member=Client();self.member.register();self.admin1=Client();self.admin1.admin('a@example.org');self.admin2=Client();self.admin2.admin('b@example.org')
 def submit(self):
  status,data=self.member.request('/api/applications',FORM,FILES);self.assertEqual(status,200,data);return data['id']
 def review(self,i):
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'review'})[0],200)
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'checks','checks':[True]*4})[0],200)
 def publish(self):
  i=self.submit();self.review(i)
  for a in [self.admin1,self.admin2]:self.assertEqual(a.request('/api/admin/case',{'id':i,'action':'approve'})[0],200)
  self.assertEqual(self.admin2.request('/api/admin/case',{'id':i,'action':'publish'})[0],200)
  return i
 def test_persistence_private_documents(self):
  i=self.submit();out=self.member.request('/api/applications')[1][0];self.assertEqual(out['id'],i)
  doc=out['documents'][0]['id'];anon=Client();other=Client();other.register('other@example.org')
  self.assertEqual(anon.request('/api/documents/'+doc)[0],401);self.assertEqual(other.request('/api/documents/'+doc)[0],403)
  for c in [self.member,self.admin1]:self.assertTrue(c.request('/api/documents/'+doc)[1].startswith(b'%PDF'))
  self.assertEqual(anon.request('/api/cases')[1],[]);self.assertEqual(other.request('/api/applications')[1],[])
 def test_two_admins_and_public_privacy(self):
  i=self.submit();self.review(i);self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'publish'})[0],409);self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})[0],200)
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})[0],409);self.assertEqual(Client().request('/api/cases')[1],[])
  self.assertEqual(self.admin2.request('/api/admin/case',{'id':i,'action':'approve'})[0],200)
  self.assertEqual(Client().request('/api/cases')[1],[])
  self.assertEqual(self.admin2.request('/api/admin/case',{'id':i,'action':'publish'})[0],200)
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'publish'})[0],409)
  case=Client().request('/api/cases')[1][0];self.assertEqual(case['name'],'Patient')
  for k in ['nic','phone','email','documents']:self.assertNotIn(k,case)
 def test_concurrent_duplicate_approval(self):
  i=self.submit();self.review(i)
  with ThreadPoolExecutor(2) as pool:r=list(pool.map(lambda _:self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})[0],[1,2]))
  self.assertEqual(sorted(r),[200,409]);self.assertEqual(Client().request('/api/cases')[1],[])
 def test_checklist_resets_approvals(self):
  i=self.submit();self.review(i);self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})
  self.admin2.request('/api/admin/case',{'id':i,'action':'checks','checks':[True,False,True,True]})
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})[0],409)
  self.assertEqual(self.admin1.request('/api/admin')[1]['applications'][0]['approvals'],[])
 def test_roles_csrf_logout(self):
  self.assertEqual(self.member.request('/api/admin')[0],403);self.assertEqual(self.member.request('/api/admin/case',{'id':'fake','action':'approve'})[0],403)
  self.assertEqual(self.member.request('/api/logout',{},origin=False)[0],403);self.assertEqual(self.member.request('/api/logout',{},token=False)[0],403)
  self.assertEqual(self.member.request('/api/logout',{})[0],200);self.assertEqual(self.member.request('/api/me')[1]['user'],None)
 def test_upload_validation_atomicity(self):
  self.assertEqual(self.member.request('/api/applications',FORM,dict(FILES,a_report=b'<html>bad</html>'))[0],400)
  self.assertEqual(self.member.request('/api/applications',FORM,{'a_report':FILES['a_report']})[0],400)
  self.assertEqual(self.member.request('/api/applications')[1],[])
  self.assertEqual(self.member.request('/api/applications',dict(FORM,a_cost='-20'),FILES)[0],400)
 def test_all_consent_required(self):
  for k in ['a_consent','a_public_consent','a_contact_consent']:self.assertEqual(self.member.request('/api/applications',dict(FORM,**{k:False}),FILES)[0],400)
 def test_report_investigation_and_reapproval(self):
  i=self.publish();data={'r_case':i,'r_name':'Reporter','r_contact':'r@example.org','r_desc':'Please investigate','r_consent':True}
  self.assertEqual(self.member.request('/api/reports',data,{'r_file':b'%PDF-1.4 evidence'})[0],200);self.assertEqual(len(Client().request('/api/cases')[1]),1)
  r=self.admin1.request('/api/admin')[1]['reports'][0];self.assertEqual(self.admin1.request('/api/admin/report',{'id':r['id'],'action':'suspended'})[0],200)
  self.assertEqual(Client().request('/api/cases')[1],[]);self.assertEqual(self.member.request('/api/contact/'+i)[0],404)
  self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'reopen'})[0],200);self.assertEqual(self.admin1.request('/api/admin')[1]['applications'][0]['approvals'],[])
 def test_contact_and_receipt_deduplication(self):
  i=self.publish();self.assertEqual(Client().request('/api/contact/'+i)[0],401);self.assertEqual(self.member.request('/api/contact/'+i)[1]['phone'],FORM['a_phone'])
  d={'id':i,'amount':250050,'reference':'receipt-unique'};self.assertEqual(self.admin1.request('/api/admin/donation',d)[0],200);self.assertEqual(self.admin2.request('/api/admin/donation',d)[0],409)
  self.assertEqual(Client().request('/api/cases')[1][0]['raised'],2500.50)
 def test_volunteer_story_password_static(self):
  v={'v_name':'Volunteer','v_phone':'+94771234567','v_email':'v@example.org','v_district':'Kandy','v_role':'IT support','v_consent':True,'v_sk_IT':True}
  self.assertEqual(self.member.request('/api/volunteers',v)[0],200);self.assertEqual(self.admin1.request('/api/admin')[1]['volunteers'][0]['skills'],'IT')
  story={'name':'Consenting person','district':'Colombo','quote':'A real authorized story','amt':'1000','consent':True}
  self.assertEqual(self.admin1.request('/api/admin/story',story)[0],200);sid=Client().request('/api/stories')[1][0]['id'];self.admin1.request('/api/admin/story-delete',{'id':sid});self.assertEqual(Client().request('/api/stories')[1],[])
  self.assertEqual(self.member.request('/api/password',{'current':'a-long-test-password','password':'new-long-password'})[0],200);self.assertEqual(self.member.request('/api/me')[1]['user'],None)
  self.assertEqual(Client().request('/')[0],200);self.assertEqual(Client().request('/server.py')[0],404)
 def test_hero_video_range_requests(self):
  def get(path,rng=None):
   out={};e={'PATH_INFO':path,'REQUEST_METHOD':'GET','CONTENT_LENGTH':'0','wsgi.input':io.BytesIO(b''),'REMOTE_ADDR':'test:media'}
   if rng:e['HTTP_RANGE']=rng
   def start(s,h):out.update(status=int(s.split()[0]),headers=dict(h))
   out['body']=b''.join(server.application(e,start));return out
  full=get('/hero.mp4');size=len(full['body']);self.assertGreater(size,1000);self.assertEqual(full['status'],200);self.assertEqual(full['headers']['Content-Type'],'video/mp4');self.assertEqual(full['headers']['Accept-Ranges'],'bytes');self.assertIn('max-age',full['headers']['Cache-Control'])
  part=get('/hero.mp4','bytes=0-99');self.assertEqual(part['status'],206);self.assertEqual(part['body'],full['body'][:100]);self.assertEqual(part['headers']['Content-Range'],f'bytes 0-99/{size}')
  tail=get('/hero.mp4','bytes=-50');self.assertEqual(tail['status'],206);self.assertEqual(tail['body'],full['body'][-50:])
  self.assertEqual(get('/hero.mp4',f'bytes={size+10}-')['status'],416);self.assertEqual(get('/hero.jpg')['headers']['Content-Type'],'image/jpeg');self.assertEqual(get('/hero.png')['status'],404)
 def test_no_self_approval(self):
  status,out=self.admin1.request('/api/applications',FORM,FILES);self.assertEqual(status,200);i=out['id'];self.review(i);self.assertEqual(self.admin1.request('/api/admin/case',{'id':i,'action':'approve'})[0],403)
 def test_separate_admin_login(self):
  visitor=Client()
  status,out=visitor.request('/api/admin/login',{'email':'member@example.org','password':'a-long-test-password'})
  self.assertEqual(status,403);self.assertEqual(visitor.request('/api/me')[1]['user'],None)
  self.assertEqual(visitor.request('/api/admin')[0],401)
  status,out=visitor.request('/api/admin/login',{'email':'a@example.org','password':'a-long-test-password'})
  self.assertEqual(status,200,out);self.assertEqual(visitor.request('/api/me')[1]['user']['role'],'admin')
  self.assertEqual(visitor.request('/api/admin')[0],200)
 def test_admin_entry_routes_and_signup_cannot_escalate(self):
  visitor=Client()
  for path in ['/admin','/admin/']:
   status,out=visitor.request(path);self.assertEqual(status,200);self.assertIn(b'/app.js',out)
  status,out=visitor.request('/api/register',{'email':'try@example.org','name':'Test','password':'long-enough-password','role':'admin'})
  self.assertEqual(status,200,out);self.assertEqual(visitor.request('/api/me')[1]['user']['role'],'member')
  self.assertEqual(visitor.request('/api/admin')[0],403)
 def test_login_throttle(self):
  bad=Client();codes=[bad.request('/api/login',{'email':'missing@example.org','password':'bad-password'})[0] for _ in range(13)];self.assertEqual(codes[-1],429)
if __name__=='__main__':unittest.main()
