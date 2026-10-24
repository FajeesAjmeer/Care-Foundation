"""Server-owner operations. Passwords are prompted, never passed as arguments."""
import argparse, getpass, json, sqlite3, os
from pathlib import Path
import server

p=argparse.ArgumentParser(description=__doc__)
s=p.add_subparsers(dest='command',required=True)
a=s.add_parser('create-admin');a.add_argument('email');a.add_argument('--name',required=True)
a=s.add_parser('reset-password');a.add_argument('email')
a=s.add_parser('revoke-admin');a.add_argument('email')
a=s.add_parser('backup');a.add_argument('output')
a=s.add_parser('delete-application');a.add_argument('case_id');a.add_argument('--confirm',required=True,help='Repeat the case ID after identity verification and retention review')
args=p.parse_args()
if args.command=='backup':
    target=Path(args.output)
    if target.exists(): p.error('Backup destination already exists; use a new filename')
    target.parent.mkdir(parents=True,exist_ok=True)
    with server.db() as source, sqlite3.connect(target) as dest: source.backup(dest)
    os.chmod(target,0o600); print('Consistent database + document backup created. Encrypt and store off-site.')
elif args.command=='delete-application':
    if args.confirm!=args.case_id:p.error('Confirmation does not match')
    with server.db() as c:
        c.execute('BEGIN IMMEDIATE')
        if not c.execute('SELECT 1 FROM applications WHERE id=?',(args.case_id,)).fetchone():p.error('Case not found')
        for r in c.execute('SELECT data FROM reports WHERE case_id=?',(args.case_id,)).fetchall():
            for doc in json.loads(r['data']).get('documents',[]):c.execute('DELETE FROM documents WHERE id=?',(doc,))
        for table,column in [('approvals','case_id'),('documents','case_id'),('donations','case_id'),('reports','case_id'),('applications','id')]:c.execute(f'DELETE FROM {table} WHERE {column}=?',(args.case_id,))
        server.audit(c,{'id':'server-owner'},'Deleted application '+args.case_id)
    print('Application and associated records deleted from active database. Apply your backup expiry policy too.')
else:
    email=server.email_value({'email':args.email},'email')
    with server.db() as c:
        u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        if args.command=='create-admin':
            if u:p.error('Email already exists. Use a separate new admin account; public signup cannot grant admin access.')
        elif not u:p.error('Account not found')
        if args.command=='revoke-admin':
            c.execute("UPDATE users SET role='member' WHERE id=?",(u['id'],));c.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],));server.audit(c,{'id':'server-owner'},'Revoked admin '+u['id']);print('Admin access revoked; sessions invalidated.')
        else:
            pw=getpass.getpass('New password (12+ characters): ')
            if len(pw)<12 or len(pw)>128:p.error('Password must be 12–128 characters')
            if pw!=getpass.getpass('Repeat password: '):p.error('Passwords do not match')
            if args.command=='create-admin':
                c.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(server.uid(),email,args.name,server.password_hash(pw),'admin',server.now()))
                server.audit(c,{'id':'server-owner'},'Created administrator')
            else:
                c.execute('UPDATE users SET password=? WHERE id=?',(server.password_hash(pw),u['id']));c.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],));server.audit(c,{'id':'server-owner'},'Reset password for '+u['id'])
            print('Account updated.')
