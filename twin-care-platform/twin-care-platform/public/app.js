
(function(){
'use strict';
const isAdminPortal = /^\/admin\/?$/.test(location.pathname);

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => 'LKR ' + Number(n).toLocaleString('en-US');
const today = () => new Date().toISOString().slice(0,10);
const stamp = () => new Date().toISOString().slice(0,16).replace('T',' ');
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  check:'M5 12.5l4.5 4.5L19 7.5',
  shield:'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  doc:'M7 3h7l4 4v14H7z M14 3v4h4 M9.5 12h5 M9.5 16h5',
  user:'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c1-4 4-6 8-6s7 2 8 6',
  medical:'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  hospital:'M4 21V8l8-5 8 5v13z M9 21v-6h6v6 M12 9v4 M10 11h4',
  chat:'M4 20l1.6-4.6A8 8 0 1112 20a8 8 0 01-3.6-.9z M9 10c.5 2 2 3.5 4 4',
  phone:'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z',
  share:'M18 8a3 3 0 100-6 3 3 0 000 6z M6 15a3 3 0 100-6 3 3 0 000 6z M18 22a3 3 0 100-6 3 3 0 000 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  search:'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.3-4.3',
  lock:'M6 11V8a6 6 0 0112 0v3 M5 11h14v10H5z',
  people:'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M2 20c.8-3.5 3.5-5 7-5s6.2 1.5 7 5 M17 11a3 3 0 100-6 M18 15c2.2.4 3.6 1.9 4 5',
  upload:'M12 16V4 M7 9l5-5 5 5 M4 20h16',
  left:'M15 5l-7 7 7 7', right:'M9 5l7 7-7 7',
  copy:'M9 9h11v11H9z M5 15V4h11',
  cert:'M12 15a6 6 0 100-12 6 6 0 000 12z M8.5 14l-1.5 7 5-3 5 3-1.5-7',
  flag:'M5 21V4 M5 4h11l-2 4 2 4H5',
  grid:'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  clock:'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2',
  cog:'M12 15a3 3 0 100-6 3 3 0 000 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  arrow:'M5 12h14 M13 6l6 6-6 6'
};
const ic = (n,s) => `<svg class="ic" viewBox="0 0 24 24" width="${s||20}" height="${s||20}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const LOGO = '<svg viewBox="0 0 36 34" width="38" height="36" aria-hidden="true"><path d="M18 31S3 22.5 3 12.5A7.5 7.5 0 0118 9a7.5 7.5 0 0115 3.5C33 22.5 18 31 18 31z" fill="var(--teal)"/><path d="M17 12h2v4h4v2h-4v4h-2v-4h-4v-2h4z" fill="#fff"/></svg>';

const SKIN = ['#E8B58F','#C98B62','#A8683F','#8A5230','#D9A07A'];
const SHIRT = ['#2A7F9E','#B8506B','#4B8F5A','#C28A2C','#6B5BA8','#3E6FA8'];
const BGS = ['#DCEBF3','#F3E3E8','#E1F0E4','#F5EBD3','#E6E2F3','#DDE7F4'];
function avatar(i){
  const s = SKIN[i % 5], sh = SHIRT[i % 6], bg = BGS[(i + 2) % 6];
  return `<svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="80" height="80" fill="${bg}"/><path d="M10 80c2-19 15-27 30-27s28 8 30 27z" fill="${sh}"/><rect x="34" y="42" width="12" height="12" rx="4" fill="${s}"/><circle cx="40" cy="34" r="14" fill="${s}"/><path d="M26 33c0-11 6-17 14-17s14 6 14 17c-4-7-8-9-14-9s-10 2-14 9z" fill="#2B2B2B" opacity=".88"/></svg>`;
}

/* ---------- data (all sample) ---------- */
const DISEASES = ['Heart Surgery','Renal Care','Cancer Treatment','Eye Surgery','Orthopaedic Surgery','Neurological Care','Liver Disease'];
const DISTRICTS = ['Colombo','Gampaha','Kalutara','Kandy','Galle','Matara','Jaffna','Batticaloa','Trincomalee','Kurunegala','Anuradhapura','Badulla','Ratnapura','Nuwara Eliya'];
const URG = {normal:'Normal',soon:'Soon',high:'Urgent'};
const TREAT = {'Heart Surgery':'open heart surgery','Renal Care':'kidney treatment and dialysis support','Cancer Treatment':'a full course of cancer treatment','Eye Surgery':'eye surgery','Orthopaedic Surgery':'bone and joint surgery','Neurological Care':'neurological treatment','Liver Disease':'liver treatment'};
const dt = n => '2026-09-' + String(n).padStart(2,'0');
const vdates = i => { const d = 1 + (i % 8); return {id:dt(d), med:dt(d+2), hosp:dt(d+4), pub:dt(d+5)}; };
const cases=[], stories=[], testimonials=[], adminApps=[],reports=[],volunteers=[],activity=[];
const CHECKS=['Medical report matches the hospital letter','Applicant/guardian identity checked','Hospital independently confirmed treatment and cost','Contact and publication consent confirmed'];
let currentUser=null, csrf='', contactEmail='', busy=false;
const fileObjects={};
const state = {
  view:'home', caseId:null, q:'', fD:'', fS:'', fU:'',
  f:{}, files:{}, errors:{}, step:0, done:null, reportDone:null, volDone:false,
  revealed:{}, storyIdx:0, admin:'', adm:'overview'
};
const getCase = id => cases.find(c => c.id === id);
const getApp = id => adminApps.find(a => a.id === id);
const pct = c => Math.min(100, Math.round(c.raised / c.required * 100));
const summary = c => `${c.name} is ${c.age} years old and lives in ${c.district}. ${c.name} needs ${c.treatment || TREAT[c.disease]}. Two admins approved the case and the hospital confirmed the cost.`;
const medicalSummary = c => `${c.disease}. ${c.name} was referred by a treating doctor, and the hospital has given a written cost estimate of ${money(c.required)}. Our team checked the medical report, the doctor's letter and the hospital estimate against each other. Only redacted previews are shown here. The full documents stay private.`;

let toastTimer;
function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}
const log = text => activity.unshift({t:stamp(), text});

/* ---------- shared fragments ---------- */
const urgTag = u => u === 'high' ? `<span class="tag bad">Urgent</span>` : u === 'soon' ? `<span class="tag warn">Soon</span>` : `<span class="tag info">Normal</span>`;
const vTag = l => `<span class="tag ok">${ic('check',12)} ${l}</span>`;

function caseCard(c, full){
  const p = pct(c);
  const flag = c.status !== 'live' ? `<span class="tag warn">${c.status === 'suspended' ? 'Suspended' : 'Under review'}</span>` : urgTag(c.urgency);
  return `<article class="ccard">
    <div class="cc-top"><div class="cc-av">${avatar(c.av)}</div>
      <div><div class="cc-id">Case ID <strong>${c.id}</strong></div><div class="cc-name">${esc(c.name)}, ${c.age}</div></div>
      <div class="cc-tag">${flag}</div></div>
    <dl class="cc-meta"><div><dt>District</dt><dd>${esc(c.district)}</dd></div><div><dt>Disease</dt><dd>${esc(c.disease)}</dd></div><div><dt>Required amount</dt><dd>${money(c.required)}</dd></div></dl>
    ${full ? `<p class="cc-sum">${esc(summary(c))}</p>` : ''}
    <div class="prog" role="img" aria-label="${p}% funded"><i style="width:${p}%"></i></div>
    <div class="prog-l"><span>${money(c.raised)} raised</span><span>${p}%</span></div>
    <div class="tags">${vTag('Identity')}${vTag('Medical')}${vTag('Hospital')}</div>
    <div class="cc-act">${full ? `<button class="btn btn-outline sm" data-act="share" data-id="${c.id}">${ic('share',16)} Share case</button>` : ''}<button class="btn btn-navy sm" data-act="open-case" data-id="${c.id}">View case</button></div>
  </article>`;
}

function storyCard(s){
  return `<div class="story">
    <div class="ba"><figure class="before"><div style="width:100%;height:100%">${avatar(s.av)}</div><figcaption>Before</figcaption></figure>
      <span class="arrow">${ic('right',16)}</span>
      <figure><div style="width:100%;height:100%">${avatar(s.av)}</div><figcaption>After</figcaption></figure></div>
    <p><q>${esc(s.quote)}</q></p>
    <div class="by"><span><strong>${esc(s.name)}</strong>, ${esc(s.district)}</span><span class="tag ok">${money(s.amt)} raised</span></div>
  </div>`;
}

/* ---------- forms ---------- */
const MSG = {
  a_nic:'Enter a valid NIC: 9 digits and V, or 12 digits.', a_email:'Enter a valid email address.', a_phone:'Enter a valid phone number.',
  a_consent:'Please tick this box to continue.', r_consent:'Please tick this box to continue.', r_contact:'Enter a phone number or email address.',
  v_email:'Enter a valid email address.', v_phone:'Enter a valid phone number.'
};
const VAL = {
  a_nic:v => /^(\d{9}[vVxX]|\d{12})$/.test(v.trim()),
  a_email:v => /^\S+@\S+\.\S+$/.test(v.trim()),
  a_phone:v => /^[+\d][\d\s-]{8,}$/.test(v.trim()),
  v_email:v => /^\S+@\S+\.\S+$/.test(v.trim()),
  v_phone:v => /^[+\d][\d\s-]{8,}$/.test(v.trim())
};
const errText = k => MSG[k] || 'Please fill in this field.';
function fld(key,label,o){
  o = o || {};
  const type = o.type || 'text', v = state.f[key] == null ? '' : state.f[key];
  const err = state.errors[key] ? `<div class="err" id="e-${key}">${errText(key)}</div>` : '';
  const d = state.errors[key] ? ` aria-invalid="true" aria-describedby="e-${key}"` : '';
  let ctl;
  if(type === 'select') ctl = `<select id="f-${key}" data-field="${key}"${d}><option value="">${o.ph || 'Choose'}</option>${o.opts.map(x => `<option${v === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  else if(type === 'textarea') ctl = `<textarea id="f-${key}" data-field="${key}" rows="${o.rows || 4}"${d}>${esc(v)}</textarea>`;
  else if(type === 'file') ctl = `<input id="f-${key}" type="file" accept="application/pdf,image/png,image/jpeg" data-file="${key}"><div class="fname">${esc(state.files[key] || 'No file chosen')}</div>`;
  else ctl = `<input id="f-${key}" data-field="${key}" type="${type}" value="${esc(v)}" ${o.attr || ''}${d}>`;
  return `<div class="field"><label for="f-${key}">${label}</label>${ctl}${err}</div>`;
}
function chk(key,label){
  const err = state.errors[key] ? `<div class="err">${errText(key)}</div>` : '';
  return `<div class="field"><label class="check"><input type="checkbox" data-field="${key}" ${state.f[key] ? 'checked' : ''}><span>${label}</span></label>${err}</div>`;
}
function need(keys){
  state.errors = {};
  keys.forEach(k => {
    const v = state.f[k];
    if(!v || (typeof v === 'string' && !v.trim())) state.errors[k] = true;
    else if(VAL[k] && !VAL[k](String(v))) state.errors[k] = true;
  });
  const bad = keys.find(k => state.errors[k]);
  if(bad){ render(); const f = document.getElementById('f-' + bad); if(f) f.focus(); return false; }
  return true;
}

/* ---------- views ---------- */
function header(){
 const nav=[['home','Home'],['cases','Verified Cases'],['stories','Success Stories'],['volunteer','Volunteer'],['report','Report Fraud']];
 if(currentUser) nav.push(['account','My applications']);

 return `<div class="demo-bar">Together We Bring Hope • Connect directly with families. Twin Care does not collect donations.</div><header class="site-h"><div class="wrap"><button class="brand" data-act="go" data-view="home">${LOGO}<span><b>Twin Care</b><small>Foundation</small></span></button><nav class="nav" aria-label="Main">${nav.map(([v,t])=>`<button data-act="go" data-view="${v}" ${state.view===v?'aria-current="page"':''}>${t}</button>`).join('')}</nav><div class="hdr-act"><button class="btn btn-outline sm" data-act="${currentUser?'logout':'login'}">${currentUser?'Log out':'Log in'}</button><button class="btn btn-teal sm" data-act="go" data-view="apply">Apply for Help</button></div></div></header>`;
}
function footer(){return `<footer class="site-f"><div class="wrap"><div class="f-grid"><div class="brand">${LOGO}<span><b>Twin Care</b><small>Together We Bring Hope</small></span></div><div><h3>Platform</h3><button class="lnk" data-act="go" data-view="cases">Verified Cases</button><button class="lnk" data-act="go" data-view="stories">Success Stories</button></div><div><h3>Get involved</h3><button class="lnk" data-act="go" data-view="apply">Apply for Help</button><button class="lnk" data-act="go" data-view="volunteer">Volunteer</button></div><div><h3>Trust</h3><button class="lnk" data-act="go" data-view="privacy">Privacy notice</button><button class="lnk" data-act="go" data-view="report">Report a concern</button></div></div><p class="copy">${new Date().getFullYear()} Twin Care Foundation. Direct assistance connections; no payments are collected through this platform.</p></div></footer>`;}

function home(){
  const steps = [['doc','Step 1: Apply','A patient or family submits medical documents and the hospital estimate.'],['shield','Step 2: Verify','Two admins check identity, medical records and the hospital cost.'],['people','Step 3: Connect donors','Donors see the verified case and give directly. Confirmed direct support can be recorded by the team.']];
  const tl = [['Case submitted','Private application'],['Medical docs verified','Hospital checks'],['Identity confirmed','Authorized review'],['Case published','Two distinct approvals']];
  return `
  <section class="hero"><svg class="pat" aria-hidden="true"><defs><pattern id="plus" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M24 16h4v8h8v4h-8v8h-4v-8h-8v-4h8z" fill="#fff"/></pattern></defs><rect width="100%" height="100%" fill="url(#plus)"/></svg>
    <div class="hero-in"><h1>Verified Medical Help Platform</h1><p>Direct Patient Support Without Middlemen</p>
      <div class="btns"><button class="btn btn-navy" data-act="go" data-view="apply">Apply for Help</button><button class="btn btn-teal" data-act="go" data-view="cases">View Verified Cases</button></div></div></section>
  <div class="wrap"><div class="trust">
    <div><span class="ic-wrap">${ic('doc',22)}</span>Document Verification</div>
    <div><span class="ic-wrap">${ic('shield',22)}</span>Direct Support</div>
    <div><span class="ic-wrap">${ic('cert',22)}</span>Two-Admin Review</div></div></div>

  <section class="sec"><div class="wrap">
    <div class="sec-h"><div><h2>Live cases</h2><p class="sub">Each case passed identity, medical and hospital checks before it appeared here.</p></div></div>
    <div class="grid3">${cases.length ? cases.slice(0,6).map(c => caseCard(c,false)).join('') : '<p class="empty">No verified cases published yet.</p>'}</div>
    <div class="more"><button class="btn btn-outline" data-act="go" data-view="cases">Show more</button></div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>How it works</h2>
    <div class="steps3" style="margin-top:22px">${steps.map(s => `<div class="step-card"><div class="step-ic">${ic(s[0],34)}</div><h3>${s[1]}</h3><p>${s[2]}</p></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>Transparency</h2><p class="sub">Every case has a timeline you can read before you give.</p>
    <div class="tl">${tl.map(r => `<div class="tl-row"><div class="l">${r[0]}</div><div class="mid"><span class="d">${ic('check',14)}</span></div><div class="r">${r[1]}</div></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>Impact so far</h2><p class="sub">Current published cases and confirmed direct support.</p>
    <div class="stats" style="margin-top:22px"><div class="stat"><b>${cases.length}</b><span>Published cases</span></div><div class="stat"><b>${money(cases.reduce((sum,c)=>sum+c.raised,0))}</b><span>Confirmed direct support</span></div><div class="stat"><b>${new Set(cases.map(c=>c.district)).size}</b><span>Districts represented</span></div></div>
  </div></section>

  <section class="sec"><div class="wrap">
    <h2>Success stories</h2>
    <div class="grid2c" style="margin-top:22px">${stories.length ? stories.slice(0,2).map(storyCard).join('') : '<p class="empty">Success stories will appear after consent and review.</p>'}</div>
    <div class="more"><button class="btn btn-outline" data-act="go" data-view="stories">Show more</button></div>
  </div></section>`;
}

function casesPage(){
  const opt = (arr,val) => arr.map(x => `<option${val === x ? ' selected' : ''}>${x}</option>`).join('');
  return `<div class="wrap page"><h1>Verified Cases</h1><p class="sub">Every case here passed identity, medical and hospital checks.</p>
    <div class="search">${ic('search',18)}<input id="q" type="search" placeholder="Search by name, case ID, district or disease" value="${esc(state.q)}" aria-label="Search cases"></div>
    <div class="filters">
      <div class="field" style="margin:0"><label for="fD">District</label><select id="fD"><option value="">All districts</option>${opt(DISTRICTS,state.fD)}</select></div>
      <div class="field" style="margin:0"><label for="fS">Disease type</label><select id="fS"><option value="">All diseases</option>${opt(DISEASES,state.fS)}</select></div>
      <fieldset class="urg"><legend>Urgency level</legend>${[['','Any'],['normal','Normal'],['soon','Soon'],['high','Urgent']].map(u => `<label><input type="radio" name="urg" value="${u[0]}" ${state.fU === u[0] ? 'checked' : ''}> ${u[1]}</label>`).join('')}</fieldset>
    </div>
    <p class="count" id="count" aria-live="polite"></p>
    <div class="grid3" id="caseGrid"></div></div>`;
}
function updateList(){
  const q = state.q.trim().toLowerCase();
  const list = cases.filter(c => (!state.fD || c.district === state.fD) && (!state.fS || c.disease === state.fS) && (!state.fU || c.urgency === state.fU)
    && (!q || (c.name + ' ' + c.id + ' ' + c.disease + ' ' + c.district).toLowerCase().includes(q)));
  const g = $('#caseGrid'); if(!g) return;
  g.innerHTML = list.length ? list.map(c => caseCard(c,true)).join('') : `<div class="empty"><p><strong>No cases match these filters.</strong></p><p class="meta" style="margin:6px 0 12px">Try a different district or clear the filters.</p><button class="btn btn-outline sm" data-act="clear">Clear filters</button></div>`;
  $('#count').textContent = list.length + (list.length === 1 ? ' case' : ' cases');
}

function caseView(){
 const c=getCase(state.caseId);if(!c)return `<div class="wrap page"><h1>Case unavailable</h1><p>This case may be under review or no longer published.</p></div>`;
 return `<div class="wrap page"><div class="crumbs"><button data-act="go" data-view="cases">Verified Cases</button> / ${c.id}</div><div class="cd-grid"><div><section class="card"><div class="pat"><div class="av-lg">${avatar(c.av)}</div><div><h1>${esc(c.name)}, ${c.age}</h1><div class="meta">Case ${c.id}</div>${urgTag(c.urgency)}</div></div><dl class="dl">${[['District',c.district],['Disease',c.disease],['Hospital',c.hospital],['Required amount',money(c.required)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section><section class="card"><h2>Verification badges</h2>${['Identity','Medical records','Hospital cost'].map(v=>`<div class="vb"><span class="vi">${ic('shield',20)}</span><div><strong>${v} checked</strong><div class="meta">Published ${esc(c.vd.pub)}</div></div><span class="ok-c">${ic('check',22)}</span></div>`).join('')}</section><section class="card"><h2>Medical summary</h2><p>${esc(c.treatment)}</p></section><section class="card"><h2>Medical documents</h2><p>Original records were reviewed by the team. Medical documents and identity details remain private and are not published.</p></section></div><aside class="cd-side"><section class="card"><h2>Direct support</h2><div class="big">${money(c.raised)}</div><p class="meta">confirmed against ${money(c.required)} required</p><div class="prog" style="margin:12px 0"><i style="width:${pct(c)}%"></i></div><div class="contact"><button class="btn btn-wa" data-act="contact" data-how="WhatsApp">${ic('chat',18)} WhatsApp</button><button class="btn btn-navy" data-act="contact" data-how="Call">${ic('phone',18)} Call</button></div><p class="note">Contact is available to signed-in supporters with the family's consent.</p><button class="linkbtn" data-act="share" data-id="${c.id}">Share case</button> · <button class="linkbtn" data-act="report-case" data-id="${c.id}">Report this case</button></section><section class="card bank"><h2>How to help</h2><p>Contact the family to coordinate support directly with the hospital. Confirm the recipient and cost with the hospital before transferring money.</p><p class="note">Twin Care does not collect, hold or process donations.</p></section><section class="card"><h2>Confirmed support tracker</h2>${c.donors.length?c.donors.map(d=>`<div class="tr-row"><span>${esc(d.label)}</span><span class="amt">${money(d.amt)}<small>${esc(d.d)}</small></span></div>`).join(''):'<p class="meta">No direct support recorded yet.</p>'}<p class="note">Entries are manually verified by admins; bank transfers are not automatically tracked.</p></section></aside></div></div>`;
}

function applyView(){
  if(state.done){
    const a = state.done;
    return `<div class="wrap page"><div class="form-card" style="margin-top:0">
      <span class="tag ok">${ic('check',12)} Application received</span>
      <h1 style="margin-top:14px;font-size:1.7rem">Thank you. We have your application.</h1>
      <p style="margin-top:12px">Your reference is <strong>${esc(a.id)}</strong>. We will contact you on <strong>${esc(a.phone)}</strong> if we need anything.</p>
      <ol class="stepper" style="margin-top:24px"><li class="past">Submitted</li><li>Under review</li><li>Verified</li><li>Published</li></ol>
      <p class="note">Your application is stored securely for review. Track its status in My applications.</p>
      <div class="actions" style="justify-content:flex-start"><button class="btn btn-navy" data-act="my-apps">My applications</button></div></div></div>`;
  }
  const s = state.step, names = ['Personal info','Medical details','Documents','Consent'];
  let body = '';
  if(s === 0) body = fld('a_name','Patient full name') + fld('a_public_name','Public display name (first name or alias)') + fld('a_age','Patient age',{type:'number',attr:'min="0" max="120"'}) + `<div class="grid2">${fld('a_nic','Applicant or guardian NIC number',{attr:'autocomplete="off"'})}${fld('a_email','Email',{type:'email'})}</div><div class="grid2">${fld('a_district','District',{type:'select',opts:DISTRICTS,ph:'Choose a district'})}${fld('a_phone','Contact number',{type:'tel'})}</div>`;
  if(s === 1) body = fld('a_cond','Medical condition',{type:'select',opts:DISEASES,ph:'Choose a condition'}) + fld('a_hospital','Hospital') + fld('a_treat','Treatment needed') + `<div class="grid2">${fld('a_cost','Estimated cost (LKR)',{type:'number',attr:'min="1"'})}${fld('a_urg','Urgency',{type:'select',opts:['Normal','Soon','Urgent'],ph:'Choose urgency'})}</div>`;
  if(s === 2) body = fld('a_report','Medical report',{type:'file'}) + fld('a_letter','Doctor letter',{type:'file'}) + fld('a_est','Hospital estimate',{type:'file'}) + `<p class="note">PDF, PNG or JPEG, maximum 5 MB each. All three documents are required. Only you and authorized admins can download them.</p>`;
  if(s === 3) body = `<div class="info-box"><h3>Before you submit</h3><p>Two admins will check your identity, medical documents and the hospital cost. Donations are paid to the hospital account confirmed during this check.</p></div><div style="margin-top:18px">${chk('a_consent','I am the patient or authorized guardian. I consent to identity and medical verification.')}${chk('a_public_consent','I consent to publishing the display name, age, district, condition, treatment and required amount after approval.')}${chk('a_contact_consent','I consent to sharing my contact number with signed-in supporters for this case.')}<p class="note">Read our <button class="linkbtn" data-act="go" data-view="privacy">privacy notice</button> before submitting.</p></div>`;
  return `<div class="wrap page"><h1>Apply for Help</h1><p class="sub">Takes about ten minutes. Keep your medical reports and hospital letter ready.</p>
    <div class="form-card">
      <ol class="stepper">${names.map((n,i) => `<li class="${i === s ? 'on' : i < s ? 'past' : ''}"${i === s ? ' aria-current="step"' : ''}>${n}</li>`).join('')}</ol>
      ${body}
      <div class="actions">${s > 0 ? `<button class="btn btn-outline" data-act="apply-back">Back</button>` : ''}<button class="btn btn-blue" data-act="${s < 3 ? 'apply-next' : 'apply-submit'}">${s < 3 ? 'Next step' : 'Submit application'}</button></div>
    </div></div>`;
}

function storiesView(){return `<div class="wrap page"><h1>Success Stories</h1><p class="sub">Shared with permission by the people we support.</p><div class="grid2c" style="margin-top:24px">${stories.length?stories.map(storyCard).join(''):'<p class="empty">No success stories published yet.</p>'}</div></div>`;}

function reportView(){
  if(state.reportDone){
    const r = state.reportDone;
    return `<div class="wrap page"><div class="form-card" style="margin-top:0;text-align:center"><div class="center-icon">${ic('check',26)}</div>
      <h1 style="font-size:1.6rem">Report received</h1>
      <p style="margin-top:10px">Your report about case <strong>${esc(r.caseId)}</strong> is saved. An admin will investigate and decide whether to suspend the case.</p>
      <div class="actions" style="justify-content:center"><button class="btn btn-outline" data-act="go" data-view="cases">Back to cases</button></div></div></div>`;
  }
  return `<div class="wrap page"><div style="text-align:center"><div class="center-icon">${ic('flag',26)}</div><h1>Report Fraud</h1><p class="sub" style="margin-inline:auto">Report a medical case you believe is false or misleading. An admin reviews every report.</p></div>
    <div class="form-card">
      ${fld('r_name','Your name')}${fld('r_contact','Contact info (phone or email)')}${fld('r_case','Reported case ID',{attr:'placeholder="Paste the case ID"'})}
      ${fld('r_desc','Description of the fraudulent activity',{type:'textarea',rows:5})}${fld('r_file','Upload evidence (max 5 MB)',{type:'file'})}
      ${chk('r_consent','I confirm this report is made in good faith.')}
      <div class="actions"><button class="btn btn-blue block" data-act="report-send">Submit report</button></div>
    </div></div>`;
}

function volunteerView(){
  if(state.volDone) return `<div class="wrap page"><div class="form-card" style="margin-top:0;text-align:center"><div class="center-icon">${ic('check',26)}</div><h1 style="font-size:1.6rem">Thank you for volunteering</h1><p style="margin-top:10px">Your registration is with the team. A coordinator will contact you.</p><div class="actions" style="justify-content:center"><button class="btn btn-outline" data-act="go" data-view="home">Back to home</button></div></div></div>`;
  const chip = d => `<button type="button" class="chip" data-act="vol-district" data-d="${d}" aria-pressed="${state.f.v_district === d}">${d}</button>`;
  const skill = k => `<label class="check"><input type="checkbox" data-field="v_sk_${k}" ${state.f['v_sk_' + k] ? 'checked' : ''}><span>${k}</span></label>`;
  return `<div class="wrap page"><div style="text-align:center"><div class="center-icon">${ic('people',26)}</div><h1>Volunteer Registration</h1><p class="sub" style="margin-inline:auto">Help verify cases, visit hospitals or support the platform.</p></div>
    <div class="form-card">
      ${fld('v_name','Full name')}<div class="grid2">${fld('v_phone','Phone',{type:'tel'})}${fld('v_email','Email',{type:'email'})}</div>
      ${fld('v_role','Preferred role',{type:'select',opts:['Field verification','Hospital liaison','Social media','IT support'],ph:'Choose a role'})}
      <div class="field"><span class="lbl" id="dl">District</span><div class="chips" role="group" aria-labelledby="dl">${DISTRICTS.map(chip).join('')}</div>${state.errors.v_district ? `<div class="err">Please choose a district.</div>` : ''}</div>
      <div class="field"><span class="lbl">Skills</span>${['Medical','Social media','IT','Field work'].map(skill).join('')}</div>
      ${fld('v_motive','Motivation statement',{type:'textarea',rows:4})}${chk('v_consent','I consent to storing these details so the team can contact me about volunteering.')}
      <div class="actions"><button class="btn btn-blue block" data-act="vol-send">Submit</button></div>
    </div></div>`;
}

/* ---------- authenticated platform ---------- */
async function api(path, data){
 const options={credentials:'same-origin',headers:{}};
 if(data!==undefined){options.method='POST';options.headers['X-CSRF-Token']=csrf;if(data instanceof FormData)options.body=data;else{options.headers['Content-Type']='application/json';options.body=JSON.stringify(data);}}
 const r=await fetch('/api'+path,options);let result;
 try{result=await r.json();}catch{throw Error('Server response could not be read. Please try again.');}
 if(!r.ok){if(r.status===401){currentUser=null;csrf='';state.returnTo=state.view;state.view='login';render();}throw Error(result.error||'Request failed');}
 return result;
}
function fill(arr,values){arr.splice(0,arr.length,...values);}
async function refresh(){
 const me=await api('/me');currentUser=me.user;csrf=me.csrf||'';contactEmail=me.contactEmail;fill(DISTRICTS,me.districts);state.admin=currentUser?.name||'';
 const [cc,ss]=await Promise.all([api('/cases'),api('/stories')]);fill(cases,cc);fill(stories,ss);
 if(currentUser){state.myApps=await api('/applications');}
 else {state.myApps=[];fill(adminApps,[]);fill(reports,[]);fill(volunteers,[]);fill(activity,[]);}
 if(isAdminPortal && currentUser?.role==='admin'){
  const a=await api('/admin');fill(adminApps,a.applications);fill(reports,a.reports);fill(volunteers,a.volunteers);fill(activity,a.activity);
 } else {fill(adminApps,[]);fill(reports,[]);fill(volunteers,[]);fill(activity,[]);}
}
function loginView(){
 if(isAdminPortal)return adminLoginView();
 const register=state.authMode==='register';
 return `<div class="wrap page"><div class="card auth-box"><h1>${register?'Create your account':'Welcome back'}</h1><p class="sub">${register?'Use an email address you own.':'Log in to apply, track your application or support a family.'}</p><form id="auth-form" style="margin-top:20px">${register?'<div class="field"><label for="auth-name">Your name</label><input id="auth-name" name="name" required maxlength="100" autocomplete="name"></div>':''}<div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" required type="email" autocomplete="email"></div><div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" required type="password" minlength="12" maxlength="128" autocomplete="${register?'new-password':'current-password'}"></div><p class="note">At least 12 characters. Never reuse your email password.</p><button class="btn btn-blue block" style="margin:16px 0" type="submit">${register?'Create account':'Log in'}</button></form><button class="linkbtn" data-act="auth-mode">${register?'Already have an account? Log in':'New here? Create an account'}</button><p class="note">Forgot your password? ${contactEmail?`Contact ${esc(contactEmail)} for identity-checked recovery.`:'Contact the foundation administrator for identity-checked account recovery.'}</p></div></div>`;
}
function accountView(){return `<div class="wrap page"><h1>My applications</h1><p class="sub">Signed in as ${esc(currentUser.name)}. Status reflects the latest saved review.</p><div style="margin-top:24px">${(state.myApps||[]).map(a=>`<section class="card"><h2>${esc(a.name)} — ${esc(a.disease)}</h2><p>Reference: <strong>${a.id}</strong></p><p>Status: <span class="tag info">${esc(a.status)}</span> · ${a.approvals.length} of 2 approvals</p>${a.reason?`<p class="notice">${esc(a.reason)}</p>`:''}<div class="admin-docs">${a.documents.map(d=>`<a class="btn btn-outline sm" href="/api/documents/${d.id}">Download ${esc(d.kind.replace('a_',''))}</a>`).join('')}</div></section>`).join('')||'<div class="empty">No applications yet. Use Apply for Help to begin.</div>'}</div><section class="card auth-box"><h2>Change password</h2><form id="password-form"><div class="field"><label for="current-password">Current password</label><input id="current-password" name="current" type="password" autocomplete="current-password" required></div><div class="field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></div><button class="btn btn-outline">Change password and log out</button></form></section></div>`;}
function privacyView(){return `<div class="wrap page"><h1>Privacy notice</h1><section class="card" style="margin-top:24px"><h2>What we collect</h2><p>Account name and email; patient/guardian details, NIC, phone, medical information and documents; volunteer information; fraud reports. We use these to verify requests, coordinate assistance, review reports and secure accounts.</p><h2 style="margin-top:24px">What becomes public</h2><p>Only after two independent admin approvals: your chosen public name, age, district, medical condition, treatment, hospital, estimated cost and confirmed support amounts. Contact numbers are shared only with signed-in supporters after your consent. Original documents, NIC, full name and email are not in public case responses.</p><h2 style="margin-top:24px">Who can access private information</h2><p>You can access your applications and documents. Authorized foundation admins review records and handle volunteer registrations and reports. Site hosting and backup operators administer storage. This platform does not process payments.</p><h2 style="margin-top:24px">Corrections, withdrawal and deletion</h2><p>Contact ${contactEmail?esc(contactEmail):'the foundation administrator'} to request corrections, withdraw publication/contact consent or request deletion. An admin can suspend a published case while the request is handled. The team must review ongoing verification needs before removing associated records and backups.</p><h2 style="margin-top:24px">Account security</h2><p>Session cookies are required for login. Sessions expire after 12 hours. No advertising trackers are included. Google Fonts is requested to display the design font. Email ownership is not automatically verified; staff must independently verify applicant identity.</p></section></div>`;}
function reviewCard(a){return `<section class="rv"><div class="rv-h"><div><strong>${esc(a.name)}, ${a.age}</strong><div class="meta">Case ${a.id} · ${esc(a.district)} · ${esc(a.disease)}</div></div>${urgTag(a.urgency)}</div><p>${esc(a.hospital)} · ${money(a.required)}</p><p class="meta">Public name: ${esc(a.publicName)} · Contact: ${esc(a.phone)} · ${esc(a.email)}</p><details><summary>Private identity details</summary><p>Applicant/guardian NIC: ${esc(a.nic)}</p></details><p>${esc(a.treatment)}</p><div class="admin-docs">${a.documents.map(d=>`<a class="btn btn-outline sm" href="/api/documents/${d.id}">Download ${esc(d.kind.replace('a_',''))}</a>`).join('')}</div><div>${CHECKS.map((label,i)=>`<label class="check"><input type="checkbox" data-check="${i}" data-id="${a.id}" ${a.checks[i]?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="note">Changing the checklist resets existing approvals. Verify the hospital independently before approving.</p><p>${a.approvals.length} of 2 independent approvals</p><div class="rv-act"><button class="btn btn-teal" data-act="approve" data-id="${a.id}" ${!a.checks.every(Boolean)||a.approvals.includes(currentUser.id)?'disabled':''}>${a.approvals.includes(currentUser.id)?'Your approval recorded':'Approve'}</button><input id="rj-${a.id}" aria-label="Rejection reason" placeholder="Reason required to reject" maxlength="1000"><button class="btn btn-danger" data-act="reject" data-id="${a.id}">Reject</button></div></section>`;}
function adminView(){
 const pending=adminApps.filter(a=>a.status==='pending'),review=adminApps.filter(a=>a.status==='review'),verified=adminApps.filter(a=>['verified','suspended'].includes(a.status));
 const nav=[['overview','Overview'],['pending','Pending Cases'],['review','Under Review'],['verified','Verified Cases'],['reports','Fraud Reports'],['volunteers','Volunteers'],['stories','Success Stories'],['settings','Settings']];let main='';
 if(state.adm==='overview') main=`<div class="stat4">${[[cases.length,'Live cases'],[pending.length,'Pending'],[review.length,'Under review'],[reports.filter(r=>r.status==='new').length,'Open reports']].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('')}</div><section class="card"><h2>Recent activity (UTC)</h2><ul class="act-list">${activity.map(a=>`<li>${esc(a.text)}<time>${esc(a.t)}</time></li>`).join('')||'<li>No activity yet.</li>'}</ul></section>`;
 if(state.adm==='pending')main=pending.map(a=>`<section class="card"><h2>${esc(a.name)} · ${esc(a.disease)}</h2><p>${a.id} · ${esc(a.district)} · ${money(a.required)}</p><button class="btn btn-outline" data-act="start-review" data-id="${a.id}">Start review</button></section>`).join('')||'<div class="empty">No pending applications.</div>';
 if(state.adm==='review')main=review.map(reviewCard).join('')||'<div class="empty">No cases under review.</div>';
 if(state.adm==='verified')main=verified.map(a=>`<section class="card"><h2>${esc(a.name)} · ${a.id}</h2><p>${esc(a.status)} · ${money(a.raised)} confirmed of ${money(a.required)}</p>${a.status==='verified'?`<form class="donation-form" data-id="${a.id}" style="margin-top:12px"><div class="grid2"><div class="field"><label>Confirmed direct support (LKR)<input name="amount" type="number" min="0.01" step="0.01" required></label></div><div class="field"><label>Unique verified receipt reference<input name="reference" maxlength="150" required></label></div></div><button class="btn btn-outline">Record verified direct support</button></form><div class="field" style="margin-top:20px"><label>Suspension reason<input id="suspend-${a.id}" maxlength="1000"></label></div><button class="btn btn-danger" data-act="suspend" data-id="${a.id}">Suspend public case</button>`:`<p>${esc(a.reason)}</p><button class="btn btn-outline" data-act="reopen" data-id="${a.id}">Reopen for two new approvals</button>`}</section>`).join('')||'<div class="empty">No verified cases.</div>';
 if(state.adm==='reports')main=reports.map(r=>`<section class="card"><h2>Case ${esc(r.caseId)} · ${esc(r.status)}</h2><p>${esc(r.name)} · ${esc(r.contact)}</p><p>${esc(r.detail)}</p><div class="admin-docs">${(r.documents||[]).map(id=>`<a class="btn btn-outline" href="/api/documents/${id}">Download evidence</a>`).join('')}</div>${r.status==='new'?`<button class="btn btn-outline" data-act="rep-dismiss" data-id="${r.id}">Dismiss report</button> <button class="btn btn-danger" data-act="rep-suspend" data-id="${r.id}">Suspend case</button>`:`<p class="meta">Handled by ${esc(r.by)}</p>`}</section>`).join('')||'<div class="empty">No reports.</div>';
 if(state.adm==='volunteers')main=volunteers.map(v=>`<section class="card"><h2>${esc(v.name)}</h2><p>${esc(v.role)} · ${esc(v.district)}</p><p>${esc(v.phone)} · ${esc(v.email)}</p><p>${esc(v.skills)}</p><p>${esc(v.motivation)}</p></section>`).join('')||'<div class="empty">No volunteer registrations.</div>';
 if(state.adm==='stories')main=`<section class="card"><h2>Publish a success story</h2><form id="story-form">${[['name','Public name'],['district','District'],['quote','Story in the participant’s words'],['amt','Confirmed support (LKR)']].map(([n,l])=>`<div class="field"><label>${l}<input name="${n}" ${n==='amt'?'type="number" min="0" step="1"':'maxlength="'+(n==='quote'?3000:150)+'"'} required></label></div>`).join('')}<label class="check"><input name="consent" type="checkbox" required><span>Publication consent obtained and recorded by the team.</span></label><button class="btn btn-teal">Publish story</button></form></section>${stories.map(s=>`<section class="card"><h2>${esc(s.name)}</h2><p>${esc(s.quote)}</p><button class="btn btn-danger" data-act="delete-story" data-id="${s.id}">Unpublish</button></section>`).join('')}`;
 if(state.adm==='settings')main=`<section class="card"><h2>Access and operation</h2><p>Admin: ${esc(currentUser.name)} (${esc(currentUser.email)})</p><p>Two distinct admins must approve every case. There is no role-switching shortcut. Admin accounts are provisioned by the server owner using manage.py.</p><p>Confirmed direct support entries are an audit trail, not a payment processor. Verify receipts before recording them.</p><p>Contact: ${esc(contactEmail||'Not configured — set CONTACT_EMAIL before launch.')}</p></section><section class="card"><h2>Rejected applications</h2>${adminApps.filter(a=>a.status==='rejected').map(a=>`<p>${a.id} · ${esc(a.name)}: ${esc(a.reason)}</p>`).join('')||'<p>None.</p>'}</section>`;
 return `<div class="adm"><nav class="adm-side" aria-label="Admin sections">${nav.map(([v,t])=>`<button data-act="adm-go" data-sec="${v}" ${v===state.adm?'aria-current="true"':''}>${t}</button>`).join('')}</nav><div class="adm-main"><div class="adm-top"><div><p class="meta">FOUNDATION WORKSPACE</p><h1>${nav.find(n=>n[0]===state.adm)?.[1]||'Overview'}</h1></div><span class="tag ok">Authorized administrator</span></div>${main}</div></div>`;
}
const protectedViews=['apply','volunteer','report','account','admin'];
function adminHeader(){return `<header class="staff-header"><a class="brand" href="/admin">${LOGO}<span><b>Twin Care</b><small>Administration</small></span></a><div class="staff-actions"><a class="btn btn-outline sm" href="/" target="_blank" rel="noopener">Open public website</a>${currentUser?.role==='admin'?`<span class="staff-user">${esc(currentUser.name)}</span><button class="btn btn-outline sm" data-act="logout">Log out</button>`:''}</div></header>`;}
function adminLoginView(){return `<div class="staff-login"><div class="staff-intro"><span class="tag info">TEAM ACCESS</span><h1>Care starts with<br>careful verification.</h1><p>Review applications, verify medical documents and coordinate support from one dedicated workspace.</p><div class="staff-principles"><p>${ic('shield',20)} Two independent approvals</p><p>${ic('lock',20)} Private patient records</p><p>${ic('clock',20)} Recorded review activity</p></div></div><section class="card staff-login-card"><h2>Admin sign in</h2><p class="sub">For foundation owners and authorized administrators.</p>${currentUser&&currentUser.role!=='admin'?'<p class="notice" style="margin:16px 0">You are signed in with a patient/supporter account. Enter an administrator account below to access this workspace.</p>':''}<form id="auth-form" style="margin-top:24px"><div class="field"><label for="auth-email">Admin email</label><input id="auth-email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required maxlength="128"></div><button class="btn btn-navy block" type="submit">Sign in to admin panel</button></form><p class="note">Admin accounts are created by the platform owner. Public registration does not grant admin access.</p><a class="linkbtn" href="/" style="display:inline-block;margin-top:20px">Patient or supporter? Go to the public website</a></section></div>`;}
function render(){
 document.title=isAdminPortal?'Twin Care | Administration':'Twin Care Foundation';
 document.body.classList.toggle('staff-portal',isAdminPortal);
 if(isAdminPortal){
  const allowed=currentUser?.role==='admin';state.view=allowed?'admin':'login';
  $('#app').innerHTML=adminHeader()+`<main id="main">${allowed?adminView():adminLoginView()}</main>`;
  return;
 }
 if(state.view==='admin'){
  $('#app').innerHTML=header()+`<main id="main"><div class="wrap page"><h1>Separate admin workspace</h1><p>The foundation team manages cases in its dedicated portal.</p><a class="btn btn-navy" href="/admin">Open admin portal</a></div></main>`+footer();return;
 }
 if(protectedViews.includes(state.view)&&!currentUser){state.returnTo=state.view;state.view='login';}
 const views={home,cases:casesPage,case:caseView,apply:applyView,stories:storiesView,report:reportView,volunteer:volunteerView,login:loginView,account:accountView,privacy:privacyView};
 $('#app').innerHTML=header()+`<main id="main">${(views[state.view]||home)()}</main>`+footer();
 if(state.view==='cases')updateList();
}
function go(view,extra={}){state.view=view;state.errors={};Object.assign(state,extra);history.replaceState(null,'',view==='case'?'#case/'+encodeURIComponent(state.caseId):'#'+view);render();window.scrollTo(0,0);const h=document.querySelector('main h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){toast(e.message);}finally{busy=false;render();}}
function multipart(keys){const f=new FormData();Object.entries(state.f).forEach(([k,v])=>f.append(k,String(v)));keys.forEach(k=>{if(fileObjects[k])f.append(k,fileObjects[k]);});return f;}
function clearForm(){state.f={};state.files={};Object.keys(fileObjects).forEach(k=>delete fileObjects[k]);state.errors={};}
async function adminAction(id,action,extra={}){await api('/admin/case',{id,action,...extra});await refresh();render();}
const STEP_KEYS=[['a_name','a_public_name','a_age','a_nic','a_email','a_district','a_phone'],['a_cond','a_hospital','a_treat','a_cost','a_urg'],[],['a_consent','a_public_consent','a_contact_consent']];
const actions={
 go:el=>go(el.dataset.view,el.dataset.view==='apply'?{done:null}:el.dataset.view==='report'?{reportDone:null}:el.dataset.view==='volunteer'?{volDone:false}:{}),
 login:()=>go('login'),
 logout:async()=>{await api('/logout',{});clearForm();await refresh();go('home');},
 'auth-mode':()=>{state.authMode=state.authMode==='register'?'login':'register';render();},
 'my-apps':()=>go('account'),
 'open-case':el=>go('case',{caseId:el.dataset.id}),
 share:async el=>{const url=location.origin+'/#case/'+el.dataset.id;await navigator.clipboard.writeText(url);toast('Case link copied.');},
 contact:async el=>{if(!currentUser){state.returnTo='case';go('login');return;}const c=await api('/contact/'+state.caseId);location.href=el.dataset.how==='Call'?'tel:'+c.phone:'https://wa.me/'+c.phone.replace('+','');},
 'report-case':el=>go('report',{reportDone:null,f:{r_case:el.dataset.id}}),
 clear:()=>{state.q='';state.fD='';state.fS='';state.fU='';render();},
 'apply-next':()=>{if(!need(STEP_KEYS[state.step]))return;if(state.step===2&&!['a_report','a_letter','a_est'].every(k=>fileObjects[k]))throw Error('Please select all three documents.');state.step++;render();window.scrollTo(0,0);},
 'apply-back':()=>{state.step=Math.max(0,state.step-1);render();},
 'apply-submit':async()=>{if(!need(STEP_KEYS[3]))return;state.done=await api('/applications',multipart(['a_report','a_letter','a_est']));state.step=0;clearForm();await refresh();render();},
 'report-send':async()=>{if(!need(['r_name','r_contact','r_case','r_desc','r_consent']))return;state.reportDone=await api('/reports',multipart(['r_file']));clearForm();render();},
 'vol-district':el=>{state.f.v_district=el.dataset.d;render();},
 'vol-send':async()=>{if(!need(['v_name','v_phone','v_email','v_role','v_district','v_consent']))return;await api('/volunteers',state.f);state.volDone=true;clearForm();render();},
 'adm-go':async el=>{state.adm=el.dataset.sec;history.replaceState(null,'','#'+state.adm);await refresh();render();},
 'start-review':async el=>{await adminAction(el.dataset.id,'review');state.adm='review';render();},
 approve:async el=>{await adminAction(el.dataset.id,'approve');toast('Approval recorded. Two distinct approvals are required to publish.');},
 reject:async el=>adminAction(el.dataset.id,'reject',{reason:$('#rj-'+el.dataset.id).value}),
 suspend:async el=>adminAction(el.dataset.id,'suspend',{reason:$('#suspend-'+el.dataset.id).value}),
 reopen:async el=>adminAction(el.dataset.id,'reopen'),
 'rep-dismiss':async el=>{await api('/admin/report',{id:el.dataset.id,action:'dismissed'});await refresh();},
 'rep-suspend':async el=>{await api('/admin/report',{id:el.dataset.id,action:'suspended'});await refresh();},
 'delete-story':async el=>{await api('/admin/story-delete',{id:el.dataset.id});await refresh();}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const fn=actions[el.dataset.act];if(fn)run(()=>fn(el));});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='q'){state.q=el.value;updateList();return;}if(el.dataset.field&&el.type!=='checkbox'){state.f[el.dataset.field]=el.value;delete state.errors[el.dataset.field];}});
document.addEventListener('change',e=>{
 const el=e.target;if(el.id==='fD'){state.fD=el.value;updateList();return;}if(el.id==='fS'){state.fS=el.value;updateList();return;}if(el.name==='urg'){state.fU=el.value;updateList();return;}
 if(el.dataset.file){const k=el.dataset.file,f=el.files?.[0];if(f&&f.size>5*1024*1024){el.value='';delete fileObjects[k];delete state.files[k];toast('File exceeds 5 MB.');return;}if(f){fileObjects[k]=f;state.files[k]=f.name;}else{delete fileObjects[k];delete state.files[k];}el.parentNode.querySelector('.fname').textContent=f?.name||'No file chosen';return;}
 if(el.dataset.check!==undefined){const a=getApp(el.dataset.id),checks=[...a.checks];checks[+el.dataset.check]=el.checked;run(()=>adminAction(a.id,'checks',{checks}));return;}
 if(el.dataset.field)state.f[el.dataset.field]=el.type==='checkbox'?el.checked:el.value;
});
document.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form));
 if(form.id==='auth-form')run(async()=>{await api(isAdminPortal?'/admin/login':state.authMode==='register'?'/register':'/login',d);await refresh();const v=isAdminPortal?'admin':state.returnTo||'account';state.returnTo=null;go(v);});
 if(form.id==='password-form')run(async()=>{await api('/password',d);await refresh();go('login');toast('Password updated. Please log in again.');});
 if(form.classList.contains('donation-form'))run(async()=>{await api('/admin/donation',{id:form.dataset.id,amount:Math.round(Number(d.amount)*100),reference:d.reference});await refresh();toast('Verified direct support recorded.');});
 if(form.id==='story-form')run(async()=>{await api('/admin/story',{...d,consent:d.consent==='on'});await refresh();toast('Success story published.');});
});
function readHash(){const parts=location.hash.slice(1).split('/');state.view=isAdminPortal?'admin':parts[0]||'home';if(isAdminPortal&&['overview','pending','review','verified','reports','volunteers','stories','settings'].includes(parts[0]))state.adm=parts[0];if(state.view==='case')state.caseId=parts[1]||'';}
window.addEventListener('hashchange',()=>{readHash();render();});
readHash();
refresh().then(render).catch(()=>{$('#app').innerHTML='<div class="wrap page"><h1>Connection unavailable</h1><p>The platform could not connect to its server. Reload this page to retry.</p></div>';});
})();
