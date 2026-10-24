// DOM-stub regression tests. Not a substitute for browser/visual QA.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const original=fs.readFileSync('public/app.js','utf8');
const marker='readHash();\nrefresh().then(render)';assert(original.includes(marker));
function test(pathname,assertions){
 const nodes=new Map(),node=()=>({innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},focus(){},setAttribute(){},querySelector(){return node()}});
 const document={body:node(),querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(){return []},getElementById(s){return this.querySelector('#'+s)},addEventListener(){}};
 const code=original.slice(0,original.indexOf(marker))+assertions+'\n})();';
 vm.runInNewContext(code,{document,console,assert,window:{matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){}},location:{pathname,hash:'',origin:'http://localhost:8000'},history:{replaceState(){}},setTimeout,clearTimeout,FormData,fetch(){throw Error('Unexpected fetch')}});
}
test('/',`
 currentUser={id:'member',name:'Member',email:'m@example.org',role:'member'};
 for(const view of ['home','cases','case','apply','stories','report','volunteer','account','login','privacy']){state.view=view;render();assert(document.querySelector('#app').innerHTML.includes('<main'));}
 for(const step of [0,1,2,3]){state.view='apply';state.step=step;render();}
 currentUser={id:'admin1',name:'Admin',role:'admin'};state.view='home';render();
 assert(!header().includes('data-view="admin"'));assert(!header().includes('Administration'));
 state.view='admin';render();assert(document.querySelector('#app').innerHTML.includes('Open admin portal'));assert(!document.querySelector('#app').innerHTML.includes('Admin sections'));
 console.log('Public portal: 10 pages and 4 form steps render; no admin dashboard/navigation.');
`);
test('/admin',`
 currentUser=null;render();let html=document.querySelector('#app').innerHTML;
 assert(html.includes('Admin sign in'));assert(!html.includes('data-act="auth-mode"'));assert(!html.includes('Apply for Help'));assert(!html.includes('Admin sections'));
 currentUser={id:'member',name:'Member',role:'member'};render();assert(document.querySelector('#app').innerHTML.includes('patient/supporter account'));assert(!document.querySelector('#app').innerHTML.includes('Admin sections'));
 currentUser={id:'admin1',name:'Admin',email:'a@example.org',role:'admin'};
 const a={id:'abcdef123456789012345678',name:'Full Name',publicName:'Public Name',age:12,district:'Colombo',disease:'Heart Surgery',urgency:'high',required:100000,raised:0,hospital:'Hospital',treatment:'Treatment',status:'review',av:0,checks:[true,true,true,true],approvals:[],documents:[{id:'doc123',kind:'a_report'}],phone:'+94771234567',email:'a@example.org',nic:'123456789V',vd:{pub:'2026-10-15'},donors:[]};adminApps.push(a);
 for(const section of ['overview','pending','review','verified','reports','volunteers','stories','settings']){state.adm=section;render();html=document.querySelector('#app').innerHTML;assert(html.includes('Admin sections'));assert(!html.includes('Apply for Help'));assert(!html.includes('site-f'));}
 a.status='verified';state.adm='verified';render();assert(document.querySelector('#app').innerHTML.includes('Record verified direct support'));
 currentUser=null;render();assert(!document.querySelector('#app').innerHTML.includes('Admin sections'));
 console.log('Admin portal: dedicated login, member denied, 8 dashboard sections and logout gate pass.');
`);
