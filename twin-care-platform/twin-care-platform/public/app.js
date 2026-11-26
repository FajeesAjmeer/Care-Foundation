
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

const DISEASES = ['Heart Surgery','Renal Care','Cancer Treatment','Eye Surgery','Orthopaedic Surgery','Neurological Care','Liver Disease'];
const DISTRICTS = ['Colombo','Gampaha','Kalutara','Kandy','Galle','Matara','Jaffna','Batticaloa','Trincomalee','Kurunegala','Anuradhapura','Badulla','Ratnapura','Nuwara Eliya'];
const URG = {normal:'Normal',soon:'Soon',high:'Urgent'};
const cases=[], stories=[], testimonials=[], adminApps=[],reports=[],volunteers=[],activity=[];
const CHECKS=['Medical report matches the hospital letter','Applicant/guardian identity checked','Hospital independently confirmed treatment and cost','Contact and publication consent confirmed'];
let currentUser=null, csrf='', contactEmail='', busy=false;
const fileObjects={};
const state = {
  lang:'en', view:'home', caseId:null, q:'', fD:'', fS:'', fU:'',
  f:{}, files:{}, errors:{}, step:0, done:null, reportDone:null, volDone:false,
  revealed:{}, storyIdx:0, admin:'', adm:'overview'
};
const getCase = id => cases.find(c => c.id === id);
const getApp = id => adminApps.find(a => a.id === id);
const pct = c => Math.min(100, Math.round(c.raised / c.required * 100));

let toastTimer;
function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}
const log = text => activity.unshift({t:stamp(), text});

/* ---------- shared fragments ---------- */
const urgTag = u => u === 'high' ? `<span class="tag bad">Urgent</span>` : u === 'soon' ? `<span class="tag warn">Soon</span>` : `<span class="tag info">Normal</span>`;
const vTag = l => `<span class="tag ok">${ic('check',12)} ${l}</span>`;

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
const ICONS = {
  check:'<path d="M3.5 12.5l5 5 12-12"/>',
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 14l2 2 3.5-4.5"/>',
  shield:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  people:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15 14.5c3 0 6 1.6 6 5.5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  chat:'<path d="M4 20l1.4-4.2A8 8 0 1112 20a8 8 0 01-4-1z"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>',
  share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  heart:'<path d="M12 20S4 14.5 4 9a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 5.500-8 11-8 11z"/>'
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const PROTO_LOGO = '<svg viewBox="0 0 40 36" width="40" height="36" aria-hidden="true"><path d="M20 33S3 23 3 12.5C3 7 7 3.5 11.5 3.5c3.4 0 6.2 1.9 8.5 5 2.3-3.1 5.1-5 8.5-5C33 3.5 37 7 37 12.5 37 23 20 33 20 33z" fill="var(--teal)"/><path d="M20 12v11M14.5 17.5h11" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';


const SKIN = ['#8A5A3C','#B27A52','#6E4530','#C58D64','#9C6644'];
const CLOTH = ['#0F3B78','#1FA08F','#B4483E','#7A5C9E','#D19A2A','#3D6E8F'];
const BGS = ['#DCEBF7','#D8F1EC','#F6E7D8','#E6E1F2','#F3E0DC','#E1EEDD'];
function portrait(c){
  const i = c.av || 0, skin = SKIN[i % 5], cloth = CLOTH[i % 6], bg = BGS[i % 6];
  const hair = c.gray ? '#B9BCC2' : ['#1B1B1F','#2A2320','#3A2E28'][i % 3];
  const back = c.fem ? `<path d="M35 52c0-22 10-34 25-34s25 12 25 34v26H35z" fill="${hair}"/>` : '';
  return `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="120" fill="${bg}"/>${back}<path d="M12 122c0-27 21-42 48-42s48 15 48 42z" fill="${cloth}"/><rect x="52" y="66" width="16" height="18" rx="6" fill="${skin}"/><circle cx="60" cy="48" r="22" fill="${skin}"/><path d="M38 46c0-16 10-26 22-26s22 10 22 26c-6-8-14-12-22-12s-16 4-22 12z" fill="${hair}"/></svg>`;
}

/* ---------- state ---------- */

const T = {
  reportDetail:{en:'Tell us what you saw',ta:'நீங்கள் கண்டதைச் சொல்லுங்கள்',si:'ඔබ දුටු දේ කියන්න'},
  applyH:{en:'Apply for help',ta:'உதவிக்கு விண்ணப்பிக்க',si:'උදව් සඳහා අයදුම් කරන්න'},
  applyP:{en:'Takes about ten minutes. Keep your medical reports and hospital letter ready.',ta:'சுமார் பத்து நிமிடங்கள் ஆகும். மருத்துவ அறிக்கைகளையும் மருத்துவமனை கடிதத்தையும் தயாராக வைத்திருங்கள்.',si:'විනාඩි දහයක් පමණ ගත වේ. වෛද්‍ය වාර්තා සහ රෝහල් ලිපිය සූදානම් කර ගන්න.'},
  st0:{en:'Personal info',ta:'தனிப்பட்ட விவரங்கள்',si:'පෞද්ගලික තොරතුරු'},
  st1:{en:'Medical details',ta:'மருத்துவ விவரங்கள்',si:'වෛද්‍ය විස්තර'},
  st2:{en:'Documents',ta:'ஆவணங்கள்',si:'ලේඛන'},
  st3:{en:'Consent',ta:'ஒப்புதல்',si:'එකඟතාව'},
  fName:{en:'Full name',ta:'முழுப் பெயர்',si:'සම්පූර්ණ නම'},
  fAge:{en:'Age',ta:'வயது',si:'වයස'},
  fNic:{en:'NIC number',ta:'NIC எண்',si:'ජා.හැ.අ. අංකය'},
  fDistrict:{en:'District',ta:'மாவட்டம்',si:'දිස්ත්‍රික්කය'},
  fPhone:{en:'Contact number',ta:'தொடர்பு எண்',si:'සම්බන්ධ අංකය'},
  fCondition:{en:'Medical condition',ta:'மருத்துவ நிலை',si:'රෝග තත්ත්වය'},
  fHospital:{en:'Hospital',ta:'மருத்துவமனை',si:'රෝහල'},
  fTreatment:{en:'Treatment needed',ta:'தேவையான சிகிச்சை',si:'අවශ්‍ය ප්‍රතිකාර'},
  fCost:{en:'Estimated cost (LKR)',ta:'மதிப்பிடப்பட்ட செலவு (LKR)',si:'ඇස්තමේන්තුගත වියදම (LKR)'},
  prev:{en:'Back',ta:'பின்செல்',si:'ආපසු'},
  nextStep:{en:'Next step',ta:'அடுத்த படி',si:'ඊළඟ පියවර'},
  chooseDistrict:{en:'Choose a district',ta:'மாவட்டத்தைத் தேர்ந்தெடுக்கவும்',si:'දිස්ත්‍රික්කය තෝරන්න'},
  fraudH:{en:'Report fraud',ta:'மோசடியைப் புகாரளிக்கவும்',si:'වංචාව වාර්තා කරන්න'},
  fCaseId:{en:'Reported case',ta:'புகாரளிக்கப்படும் கோரிக்கை',si:'වාර්තා කරන ඉල්ලීම'},
  sendReport:{en:'Submit report',ta:'புகாரைச் சமர்ப்பி',si:'වාර්තාව ඉදිරිපත් කරන්න'},
  volH:{en:'Volunteer with us',ta:'எங்களுடன் தன்னார்வலராக இணையுங்கள்',si:'අප සමඟ ස්වේච්ඡා සේවකයෙකු වන්න'},
  fSkills:{en:'Skills',ta:'திறன்கள்',si:'කුසලතා'},
  workflow:{"en":"Verification process","ta":"சரிபார்ப்பு நடைமுறை","si":"තහවුරු කිරීමේ ක්‍රියාවලිය"},
  confirmed:{"en":"Confirmed direct support","ta":"உறுதிசெய்யப்பட்ட நேரடி உதவி","si":"තහවුරු කළ සෘජු සහාය"},
  unavailable:{"en":"This case is unavailable.","ta":"இந்தக் கோரிக்கை கிடைக்கவில்லை.","si":"මෙම ඉල්ලීම ලබාගත නොහැක."},
  supportNote:{"en":"Sign in to contact the family about direct support.","ta":"நேரடி உதவி பற்றி குடும்பத்தினரைத் தொடர்புகொள்ள உள்நுழைக.","si":"සෘජු සහාය ගැන පවුල සම්බන්ධ කර ගැනීමට පිවිසෙන්න."},
  privateDocs:{"en":"Original documents are private.","ta":"அசல் ஆவணங்கள் தனிப்பட்டவை.","si":"මුල් ලේඛන පෞද්ගලිකයි."},
  noStories:{"en":"No success stories published yet.","ta":"வெற்றிக் கதைகள் இன்னும் வெளியிடப்படவில்லை.","si":"සාර්ථක කතා තවම පළ කර නැත."},
  noCases:{"en":"No verified cases published yet.","ta":"சரிபார்க்கப்பட்ட கோரிக்கைகள் இன்னும் வெளியிடப்படவில்லை.","si":"තහවුරු කළ ඉල්ලීම් තවම පළ කර නැත."},
  privacy:{"en":"Privacy notice","ta":"தனியுரிமை அறிவிப்பு","si":"පෞද්ගලිකත්ව නිවේදනය"},
  signOut:{"en":"Log out","ta":"வெளியேறு","si":"පිටවන්න"},
  signIn:{"en":"Sign in","ta":"உள்நுழைக","si":"පිවිසෙන්න"},
  member:{"en":"My applications","ta":"என் விண்ணப்பங்கள்","si":"මගේ අයදුම්පත්"},
  navHome:{en:'Home',ta:'முகப்பு',si:'මුල් පිටුව'},
  navCases:{en:'Verified Cases',ta:'சரிபார்க்கப்பட்ட கோரிக்கைகள்',si:'සත්‍යාපිත ඉල්ලීම්'},
  navStories:{en:'Success Stories',ta:'வெற்றிக் கதைகள்',si:'සාර්ථක කතා'},
  navFraud:{en:'Report Fraud',ta:'மோசடியைப் புகாரளி',si:'වංචාව වාර්තා කරන්න'},
  navVolunteer:{en:'Volunteer',ta:'தன்னார்வலர்',si:'ස්වේච්ඡා සේවක'},
  login:{en:'Log in',ta:'உள்நுழை',si:'ඇතුල් වන්න'},
  apply:{en:'Apply for Help',ta:'உதவிக்கு விண்ணப்பிக்க',si:'උදව් සඳහා අයදුම් කරන්න'},
  heroH:{en:'Verified Medical Help Platform',ta:'சரிபார்க்கப்பட்ட மருத்துவ உதவித் தளம்',si:'සත්‍යාපිත වෛද්‍ය උපකාර වේදිකාව'},
  heroP:{en:'Direct Patient Support Without Middlemen',ta:'இடைத்தரகர்கள் இல்லாமல் நோயாளிகளுக்கு நேரடி உதவி',si:'මැදිහත්කරුවන් නොමැතිව රෝගීන්ට සෘජු සහාය'},
  ctaCases:{en:'View Verified Cases',ta:'சரிபார்க்கப்பட்ட கோரிக்கைகளைப் பார்க்க',si:'සත්‍යාපිත ඉල්ලීම් බලන්න'},
  tb1:{en:'Every case verified',ta:'ஒவ்வொரு கோரிக்கையும் சரிபார்ப்பு',si:'සෑම ඉල්ලීමක්ම සත්‍යාපිතයි'},
  tb2:{"en":"Private documents","ta":"தனிப்பட்ட ஆவணங்கள்","si":"පෞද්ගලික ලේඛන"},
  tb3:{"en":"Two-admin approval","ta":"இரண்டு நிர்வாகிகள் ஒப்புதல்","si":"පරිපාලකයන් දෙදෙනෙකුගේ අනුමැතිය"},
  stCases:{en:'Verified cases',ta:'சரிபார்க்கப்பட்ட கோரிக்கைகள்',si:'සත්‍යාපිත ඉල්ලීම්'},
  stRaised:{"en":"Confirmed direct support","ta":"உறுதிசெய்யப்பட்ட நேரடி உதவி","si":"තහවුරු කළ සෘජු සහාය"},
  stDistricts:{en:'Districts covered',ta:'உள்ளடக்கிய மாவட்டங்கள்',si:'ආවරණය වූ දිස්ත්‍රික්ක'},
  liveH:{en:'Live cases',ta:'நேரடி கோரிக்கைகள்',si:'සජීවී ඉල්ලීම්'},
  liveSub:{"en":"Browse verified assistance requests. Original documents stay private.","ta":"சரிபார்க்கப்பட்ட உதவிக் கோரிக்கைகளைப் பாருங்கள். அசல் ஆவணங்கள் தனிப்பட்டவை.","si":"තහවුරු කළ සහාය ඉල්ලීම් බලන්න. මුල් ලේඛන පෞද්ගලිකයි."},
  showMore:{en:'Show more',ta:'மேலும் காட்டு',si:'තවත් පෙන්වන්න'},
  caseId:{en:'Case ID',ta:'கோரிக்கை எண்',si:'ඉල්ලීම් අංකය'},
  district:{en:'District',ta:'மாவட்டம்',si:'දිස්ත්‍රික්කය'},
  disease:{en:'Condition',ta:'நோய்',si:'රෝගය'},
  required:{en:'Required',ta:'தேவை',si:'අවශ්‍ය'},
  raised:{en:'raised',ta:'திரட்டப்பட்டது',si:'එකතු වූ'},
  goal:{en:'Goal',ta:'இலக்கு',si:'ඉලක්කය'},
  viewCase:{en:'View case',ta:'கோரிக்கையைப் பார்',si:'ඉල්ලීම බලන්න'},
  share:{en:'Share',ta:'பகிர்',si:'බෙදාගන්න'},
  bIdentity:{en:'Identity',ta:'அடையாளம்',si:'අනන්‍යතාව'},
  bMedical:{en:'Medical',ta:'மருத்துவம்',si:'වෛද්‍ය'},
  bHospital:{en:'Hospital',ta:'மருத்துவமனை',si:'රෝහල'},
  urgency:{en:'Urgency',ta:'அவசரம்',si:'හදිසිතාව'},
  uHigh:{en:'High',ta:'உயர்',si:'ඉහළ'},
  uMedium:{en:'Medium',ta:'நடுத்தர',si:'මධ්‍යම'},
  uLow:{en:'Low',ta:'குறைவு',si:'අඩු'},
  all:{en:'All',ta:'அனைத்தும்',si:'සියල්ල'},
  suspended:{en:'Suspended',ta:'நிறுத்தப்பட்டது',si:'අත්හිටුවා ඇත'},
  age:{en:'Age',ta:'வயது',si:'වයස'},
  howH:{en:'How it works',ta:'எப்படி செயல்படுகிறது',si:'ක්‍රියා කරන ආකාරය'},
  step:{en:'Step',ta:'படி',si:'පියවර'},
  s1h:{en:'Apply',ta:'விண்ணப்பம்',si:'අයදුම් කරන්න'},
  s1p:{en:'A patient or family submits their documents online.',ta:'நோயாளி அல்லது குடும்பம் ஆவணங்களை இணையத்தில் சமர்ப்பிக்கிறது.',si:'රෝගියා හෝ පවුල ලේඛන මාර්ගගතව ඉදිරිපත් කරයි.'},
  s2h:{en:'Verify',ta:'சரிபார்ப்பு',si:'සත්‍යාපනය'},
  s2p:{en:'Two admins check the documents and confirm the cost with the hospital.',ta:'இரண்டு admin-கள் ஆவணங்களைச் சரிபார்த்து மருத்துவமனையுடன் செலவை உறுதிசெய்கிறார்கள்.',si:'පරිපාලකයන් දෙදෙනෙකු ලේඛන පරීක්ෂා කර රෝහල සමඟ වියදම තහවුරු කරයි.'},
  s3h:{en:'Connect donors',ta:'நன்கொடையாளர்களை இணை',si:'පරිත්‍යාගශීලීන් සම්බන්ධ කරන්න'},
  s3p:{"en":"Families receive support directly. The team records confirmed contributions.","ta":"குடும்பங்களுக்கு நேரடி உதவி கிடைக்கும். உறுதிசெய்யப்பட்ட உதவிகளை குழு பதிவு செய்யும்.","si":"පවුල්වලට සෘජුව සහාය ලැබේ. තහවුරු කළ දායකත්ව කණ්ඩායම වාර්තා කරයි."},
  transSub:{"en":"See the steps a case goes through before publication.","ta":"கோரிக்கை வெளியிடப்படும் முன் உள்ள படிகளைப் பாருங்கள்.","si":"ඉල්ලීම පළ කිරීමට පෙර පියවර බලන්න."},
  tr1:{en:'Case submitted',ta:'கோரிக்கை சமர்ப்பிக்கப்பட்டது',si:'ඉල්ලීම ඉදිරිපත් කළා'},
  tr2:{en:'Medical documents verified',ta:'மருத்துவ ஆவணங்கள் சரிபார்க்கப்பட்டன',si:'වෛද්‍ය ලේඛන සත්‍යාපනය කළා'},
  tr3:{en:'Hospital confirmed the cost',ta:'மருத்துவமனை செலவை உறுதிசெய்தது',si:'රෝහල වියදම තහවුරු කළා'},
  tr4:{en:'First admin approved',ta:'முதல் admin ஒப்புதல்',si:'පළමු පරිපාලක අනුමතය'},
  tr5:{en:'Second admin approved',ta:'இரண்டாம் admin ஒப்புதல்',si:'දෙවන පරිපාලක අනුමතය'},
  tr6:{en:'Case published',ta:'கோரிக்கை வெளியிடப்பட்டது',si:'ඉල්ලීම ප්‍රසිද්ධ කළා'},
  storiesH:{en:'Success stories',ta:'வெற்றிக் கதைகள்',si:'සාර්ථක කතා'},
  storiesSub:{"en":"Shared with permission by the people we support.","ta":"உதவி பெற்றவர்களின் அனுமதியுடன் பகிரப்படுகிறது.","si":"සහාය ලැබූවන්ගේ අවසරයෙන් බෙදා ගනී."},
  communityH:{en:'Community impact',ta:'சமூகத் தாக்கம்',si:'ප්‍රජා බලපෑම'},
  searchPh:{en:'Search by case ID, name or condition',ta:'கோரிக்கை எண், பெயர் அல்லது நோயால் தேடுங்கள்',si:'ඉල්ලීම් අංකය, නම හෝ රෝගය අනුව සොයන්න'},
  fDisease:{en:'Condition type',ta:'நோய் வகை',si:'රෝග වර්ගය'},
  allDistricts:{en:'All districts',ta:'அனைத்து மாவட்டங்கள்',si:'සියලු දිස්ත්‍රික්ක'},
  allTypes:{en:'All types',ta:'அனைத்து வகைகள்',si:'සියලු වර්ග'},
  casesShown:{en:'cases shown',ta:'கோரிக்கைகள் காட்டப்படுகின்றன',si:'ඉල්ලීම් පෙන්වයි'},
  noResults:{en:'No cases match. Clear a filter to see more.',ta:'பொருந்தும் கோரிக்கைகள் இல்லை. மேலும் காண ஒரு வடிகட்டியை நீக்குங்கள்.',si:'ගැළපෙන ඉල්ලීම් නැත. තවත් බැලීමට පෙරහනක් ඉවත් කරන්න.'},
  clearFilters:{en:'Clear filters',ta:'வடிகட்டிகளை நீக்கு',si:'පෙරහන් ඉවත් කරන්න'},
  backCases:{en:'Back to cases',ta:'கோரிக்கைகளுக்குத் திரும்பு',si:'ඉල්ලීම් වෙත ආපසු'},
  medSummary:{en:'Medical summary',ta:'மருத்துவ சுருக்கம்',si:'වෛද්‍ය සාරාංශය'},
  docsH:{"en":"Verification documents","ta":"சரிபார்ப்பு ஆவணங்கள்","si":"තහවුරු කිරීමේ ලේඛන"},
  dReport:{en:'Medical report',ta:'மருத்துவ அறிக்கை',si:'වෛද්‍ය වාර්තාව'},
  dLetter:{en:'Doctor letter',ta:'மருத்துவர் கடிதம்',si:'වෛද්‍ය ලිපිය'},
  dEst:{en:'Hospital estimate',ta:'மருத்துவமனை மதிப்பீடு',si:'රෝහල් ඇස්තමේන්තුව'},
  trailH:{en:'Verification log',ta:'சரிபார்ப்புப் பதிவு',si:'සත්‍යාපන ලඝු සටහන'},
  progressH:{en:'Required amount progress',ta:'தேவையான தொகையின் முன்னேற்றம்',si:'අවශ්‍ය මුදලේ ප්‍රගතිය'},
  verifH:{en:'Verification',ta:'சரிபார்ப்பு',si:'සත්‍යාපනය'},
  identityV:{en:'Identity verified',ta:'அடையாளம் சரிபார்க்கப்பட்டது',si:'අනන්‍යතාව සත්‍යාපිතයි'},
  medicalV:{en:'Medical verified',ta:'மருத்துவம் சரிபார்க்கப்பட்டது',si:'වෛද්‍ය සත්‍යාපිතයි'},
  hospitalV:{en:'Hospital verified',ta:'மருத்துவமனை சரிபார்க்கப்பட்டது',si:'රෝහල සත්‍යාපිතයි'},
  contactH:{en:'Ask about this case',ta:'இந்த கோரிக்கை பற்றி கேளுங்கள்',si:'මෙම ඉල්ලීම ගැන විමසන්න'},
  wa:{en:'WhatsApp',ta:'WhatsApp',si:'WhatsApp'},
  call:{en:'Call',ta:'அழை',si:'අමතන්න'},
  trackerH:{en:'Donation tracker',ta:'நன்கொடைப் பதிவு',si:'පරිත්‍යාග ලඝු සටහන'},
  noDonations:{en:'No donations logged yet.',ta:'இன்னும் நன்கொடைகள் பதிவாகவில்லை.',si:'තවම පරිත්‍යාග වාර්තා වී නැත.'},
  report:{en:'Report this case',ta:'இந்த கோரிக்கையைப் புகாரளி',si:'මෙම ඉල්ලීම වාර්තා කරන්න'},
  submit:{en:'Submit application',ta:'விண்ணப்பத்தைச் சமர்ப்பி',si:'අයදුම්පත ඉදිරිපත් කරන්න'},
  footTag:{"en":"Medical assistance coordination in Sri Lanka.","ta":"இலங்கையில் மருத்துவ உதவி ஒருங்கிணைப்பு.","si":"ශ්‍රී ලංකාවේ වෛද්‍ය සහාය සම්බන්ධීකරණය."},
  footExplore:{en:'Explore',ta:'ஆராய்க',si:'ගවේෂණය'},
  footGet:{en:'Get involved',ta:'பங்கேற்க',si:'සහභාගී වන්න'},
};
const t = k => (T[k] && (T[k][state.lang] || T[k].en)) || k;

const D = {
  Colombo:{ta:'கொழும்பு',si:'කොළඹ'}, Gampaha:{ta:'கம்பஹா',si:'ගම්පහ'}, Kalutara:{ta:'களுத்துறை',si:'කළුතර'},
  Kandy:{ta:'கண்டி',si:'මහනුවර'}, Galle:{ta:'காலி',si:'ගාල්ල'}, Matara:{ta:'மாத்தறை',si:'මාතර'},
  Jaffna:{ta:'யாழ்ப்பாணம்',si:'යාපනය'}, Batticaloa:{ta:'மட்டக்களப்பு',si:'මඩකලපුව'}, Trincomalee:{ta:'திருகோணமலை',si:'ත්‍රිකුණාමලය'},
  Kurunegala:{ta:'குருணாகலை',si:'කුරුණෑගල'}, Anuradhapura:{ta:'அனுராதபுரம்',si:'අනුරාධපුරය'}, Badulla:{ta:'பதுளை',si:'බදුල්ල'}
};

const dist = k => state.lang === 'en' ? k : ((D[k] && D[k][state.lang]) || k);

const PUBLIC_URGENCY = {high:'uHigh',soon:'uMedium',normal:'uLow'};
const TR = ['tr1','tr2','tr3','tr4','tr5','tr6'];
const emptyPublic = key => `<p class="empty">${t(key)}</p>`;

function badges(){
  return `<div class="bdgs">${['bIdentity','bMedical','bHospital'].map(b => `<span class="bdg">${ico('check')}${t(b)}</span>`).join('')}</div>`;
}
function trailHTML(events){
  return '<ol class="trail">' + TR.map(k => {
    const e = events.find(x => x.k === k);
    return `<li class="${e ? 'done' : ''}" data-done="${e ? 1 : 0}"><span class="dot">${ico('check')}</span><span class="label">${t(k)}</span><span class="date">${e ? e.d : ''}</span></li>`;
  }).join('') + '</ol>';
}
function caseCard(c){
  return `<a class="ccard" href="#case/${c.id}" data-act="open-case" data-id="${c.id}">
    <div class="ctop"><div class="av">${portrait(c)}</div>
      <div><div class="cid">${t('caseId')}</div><div class="cref">${esc(c.id)}</div></div></div>
    <dl class="cmeta">
      <div><dt>${t('district')}</dt><dd>${esc(dist(c.district))}</dd></div>
      <div><dt>${t('disease')}</dt><dd>${esc(c.disease)}</dd></div>
      <div><dt>${t('required')}</dt><dd>${money(c.required)}</dd></div>
    </dl>
    <div class="bar" role="img" aria-label="${pct(c)}%"><i style="width:${pct(c)}%"></i></div>
    <div class="bar-l"><span>${money(c.raised)} ${t('raised')}</span><span>${pct(c)}%</span></div>
    ${badges()}</a>`;
}
function bigCard(c){
  return `<article class="card bigc">
    <div class="av">${portrait(c)}</div><span class="urg u-${c.urgency}">${t(PUBLIC_URGENCY[c.urgency])}</span>
    <div class="bigc-body">
      <div class="cid">${t('caseId')} ${esc(c.id)}</div>
      <h3>${esc(c.name)}, ${c.age}</h3>
      <dl class="cmeta">
        <div><dt>${t('district')}</dt><dd>${esc(dist(c.district))}</dd></div>
        <div><dt>${t('disease')}</dt><dd>${esc(c.disease)}</dd></div>
      </dl>
      <div class="bar" role="img" aria-label="${pct(c)}%"><i style="width:${pct(c)}%"></i></div>
      <div class="bar-l"><span>${money(c.raised)} ${t('raised')}</span><span>${t('goal')} ${money(c.required)}</span></div>
      ${badges()}
      <div class="acts"><button class="btn btn-outline sm" data-act="share" data-id="${c.id}">${ico('share')} ${t('share')}</button><button class="btn btn-navy sm" data-act="open-case" data-id="${c.id}">${t('viewCase')}</button></div>
    </div></article>`;
}
function publicStoryCard(s){
  return `<article class="card story"><div class="sbody"><h3>${esc(s.name)}</h3><p class="meta">${esc(dist(s.district))}</p>
    <blockquote>${esc(s.quote)}</blockquote><div class="sfoot"><span class="meta">${t('confirmed')}</span><strong>${money(s.amt)}</strong></div></div></article>`;
}
function impactStats(){
  const raised = cases.reduce((s,c) => s + c.raised, 0);
  const districts = new Set(cases.map(c => c.district)).size;
  return `<div class="stats">
    <div class="stat"><b>${cases.length}</b><span>${t('stCases')}</span></div>
    <div class="stat"><b>${money(raised)}</b><span>${t('stRaised')}</span></div>
    <div class="stat"><b>${districts}</b><span>${t('stDistricts')}</span></div></div>`;
}

/* ---------- views ---------- */
function header(){
  const cur = v => (state.view === v || (v === 'cases' && state.view === 'case')) ? ' aria-current="page"' : '';
  const nav = [['home','navHome'],['cases','navCases'],['stories','navStories'],['report','navFraud'],['volunteer','navVolunteer']];
  const lb = (code,label) => `<button lang="${code}" data-act="lang" data-lang="${code}" aria-pressed="${state.lang === code}">${label}</button>`;
  return `<header class="site-h"><div class="wrap">
    <button class="brand" data-act="go" data-view="home">${PROTO_LOGO}<span><b>Twin Care</b><small>Foundation</small></span></button>
    <nav class="nav" aria-label="Main">${nav.map(n => `<button data-act="go" data-view="${n[0]}"${cur(n[0])}>${t(n[1])}</button>`).join('')}</nav>
    <div class="h-right">
      <div class="lang" role="group" aria-label="Language">${lb('en','EN')}${lb('ta','தமிழ்')}${lb('si','සිංහල')}</div>
      ${currentUser ? `<button class="btn btn-outline sm" data-act="my-apps">${t('member')}</button><button class="btn btn-outline sm" data-act="logout">${t('signOut')}</button>` : `<button class="btn btn-outline sm" data-act="login">${t('signIn')}</button>`}
      <button class="btn btn-teal sm" data-act="go" data-view="apply">${t('apply')}</button>
    </div>
  </div></header>`;
}
function footer(){
  const l = (v,k) => `<button data-act="go" data-view="${v}">${t(k)}</button>`;
  return `<footer class="site-f"><div class="wrap"><div class="f-grid">
    <div><div style="display:flex;align-items:center;gap:10px">${PROTO_LOGO}<b>Twin Care Foundation</b></div><p style="margin-top:10px">${t('footTag')}</p></div>
    <div><b>${t('footExplore')}</b>${l('home','navHome')}${l('cases','navCases')}${l('stories','navStories')}</div>
    <div><b>${t('footGet')}</b>${l('apply','apply')}${l('volunteer','navVolunteer')}${l('report','navFraud')}</div>
  </div><div class="copy">${l('privacy','privacy')}</div></div></footer>`;
}

function homeView(){
  const steps = [['doc','s1h','s1p'],['shield','s2h','s2p'],['people','s3h','s3p']];
  return `
  <section class="hero"><video class="hero-video" autoplay muted loop playsinline preload="auto" poster="/hero.jpg" aria-hidden="true" tabindex="-1" disablepictureinpicture><source src="/hero.mp4" type="video/mp4"></video><div class="hero-shade" aria-hidden="true"></div><div class="wrap hero-copy">
    <h1>${t('heroH')}</h1><p>${t('heroP')}</p>
    <div class="btns"><button class="btn btn-light" data-act="go" data-view="apply">${t('apply')}</button><button class="btn btn-tl" data-act="go" data-view="cases">${t('ctaCases')}</button></div>
  </div></section>
  <div class="wrap"><div class="trust">
    <div><span class="ib">${ico('doc')}</span>${t('tb1')}</div>
    <div><span class="ib">${ico('lock')}</span>${t('tb2')}</div>
    <div><span class="ib">${ico('shield')}</span>${t('tb3')}</div>
  </div>${impactStats()}</div>

  <section class="sec" id="live"><div class="wrap">
    <div class="sec-h"><div><h2>${t('liveH')}</h2><p class="sec-sub">${t('liveSub')}</p></div></div>
    <div class="grid3">${cases.slice(0,6).map(caseCard).join('') || emptyPublic('noCases')}</div>
    <div class="center"><button class="btn btn-outline" data-act="go" data-view="cases">${t('showMore')}</button></div>
  </div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-h"><h2>${t('howH')}</h2></div>
    <div class="how">${steps.map((s,i) => `<div class="card hstep"><div class="hi">${ico(s[0])}</div><small>${t('step')} ${i+1}</small><h3>${t(s[1])}</h3><p>${t(s[2])}</p></div>`).join('')}</div>
  </div></section>

  <section class="sec"><div class="wrap"><div class="card"><div class="tl-wrap">
    <div><h2 style="font-size:clamp(1.4rem,3vw,1.8rem);display:block">${t('workflow')}</h2><p class="sec-sub">${t('transSub')}</p></div>
    <div>${trailHTML([])}</div>
  </div></div></div></section>

  <section class="sec"><div class="wrap">
    <div class="sec-h"><div><h2>${t('storiesH')}</h2><p class="sec-sub">${t('storiesSub')}</p></div></div>
    <div class="grid3">${stories.slice(0,2).map(publicStoryCard).join('') || emptyPublic('noStories')}</div>
    <div class="center"><button class="btn btn-outline" data-act="go" data-view="stories">${t('showMore')}</button></div>
  </div></section>`;
}

function filtered(){
  const q = state.q.trim().toLowerCase();
  return cases.filter(c => {
    if(state.fD && c.district !== state.fD) return false;
    if(state.fS && c.disease !== state.fS) return false;
    if(state.fU && c.urgency !== state.fU) return false;
    if(q){
      const hay = [c.id, c.name, c.disease, c.district, dist(c.district)].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function gridHTML(){
  const list = filtered();
  if(!list.length) return `<p class="count">0 ${t('casesShown')}</p><div class="empty">${t('noResults')}<div style="margin-top:14px"><button class="btn btn-outline sm" data-act="clear">${t('clearFilters')}</button></div></div>`;
  return `<p class="count">${list.length} ${t('casesShown')}</p><div class="grid3">${list.map(bigCard).join('')}</div>`;
}
function updateList(){ const g = $('#caseGrid'); if(g) g.innerHTML = gridHTML(); }

function casesView(){
  const rad = (v,label) => `<label class="rad"><input type="radio" name="urg" data-filter="fU" value="${v}" ${state.fU === v ? 'checked' : ''}><span>${label}</span></label>`;
  return `<div class="wrap">
    <div class="page-h"><h1>${t('navCases')}</h1><p class="sec-sub">${t('liveSub')}</p></div>
    <div class="card"><div class="filters">
      <div class="field" style="margin:0"><label for="q">${t('searchPh')}</label><input id="q" type="search" data-filter="q" value="${esc(state.q)}" placeholder="${esc(t('searchPh'))}"></div>
      <div class="field" style="margin:0"><label for="fD">${t('district')}</label><select id="fD"><option value="">${t('allDistricts')}</option>${DISTRICTS.map(d => `<option value="${d}"${state.fD === d ? ' selected' : ''}>${esc(dist(d))}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label for="fS">${t('fDisease')}</label><select id="fS"><option value="">${t('allTypes')}</option>${DISEASES.map(k => `<option value="${k}"${state.fS === k ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <div><div class="lbl" style="font-weight:600;font-size:.95rem;margin-bottom:6px">${t('urgency')}</div><div class="urgrow" role="radiogroup" aria-label="${esc(t('urgency'))}">${rad('',t('all'))}${rad('high',t('uHigh'))}${rad('soon',t('uMedium'))}${rad('normal',t('uLow'))}</div></div>
    </div></div>
    <div id="caseGrid" style="padding-bottom:24px">${gridHTML()}</div></div>`;
}

function caseView(){
  const c = getCase(state.caseId);
  if (!c) return `<div class="wrap page">${emptyPublic('unavailable')}</div>`;
  const donors = c.donors.length
    ? c.donors.map(d => `<div class="donor"><span class="l"><span class="ib">${ico('user')}</span>${t('confirmed')}</span><span><strong>${money(d.amt)}</strong> <span class="meta">${esc(d.d)}</span></span></div>`).join('')
    : `<p class="meta">${t('noDonations')}</p>`;
  const docCard = k => `<div class="doc"><div class="ln"></div><div class="ln s"></div><div class="ln"></div><div class="ln s"></div><div class="cap">${ico('lock')} ${t(k)}</div></div>`;
  return `<div class="wrap">
    <button class="back" data-act="go" data-view="cases">${t('backCases')}</button>
    <div class="detail">
      <div class="dleft">
        <section class="card patient"><div class="av pav">${portrait(c)}</div>
          <div class="pinfo"><h1>${esc(c.name)}</h1><p class="meta">${t('age')} ${c.age}, ${esc(dist(c.district))}</p>
            <dl class="kv"><div><dt>${t('caseId')}</dt><dd>${esc(c.id)}</dd></div><div><dt>${t('district')}</dt><dd>${esc(dist(c.district))}</dd></div>
              <div><dt>${t('disease')}</dt><dd>${esc(c.disease)}</dd></div><div><dt>${t('required')}</dt><dd>${money(c.required)}</dd></div></dl></div></section>
        <section class="card"><h2>${t('medSummary')}</h2><p style="margin-bottom:14px">${esc(c.treatment)}</p>
          <table class="tbl money"><tbody><tr class="total"><td>${t('required')}</td><td>${money(c.required)}</td></tr></tbody></table></section>
        <section class="card"><h2>${t('docsH')}</h2><div class="docs">${docCard('dReport')}${docCard('dLetter')}${docCard('dEst')}</div><p class="note">${t('privateDocs')}</p></section>
        <section class="card"><h2>${t('trailH')}</h2>${trailHTML([{k:'tr1',d:c.submitted || ''},...TR.slice(1).map(k=>({k,d:k==='tr6' ? c.vd.pub : ''}))])}</section>
      </div>
      <aside class="dright">
        <section class="card"><h2>${t('progressH')}</h2>
          <div class="big">${money(c.raised)}</div><div class="meta" style="margin-bottom:10px">${t('raised')}, ${t('goal')} ${money(c.required)}</div>
          <div class="bar" role="img" aria-label="${pct(c)}%"><i style="width:${pct(c)}%"></i></div><div class="bar-l"><span></span><span>${pct(c)}%</span></div></section>
        <section class="card"><h2>${t('verifH')}</h2>
          ${['identityV','medicalV','hospitalV'].map(k => `<div class="vrow">${ico('shield')}${t(k)}<span class="tick">${ico('check')}</span></div>`).join('')}</section>
        <section class="card"><h2>${t('contactH')}</h2>
          <div class="two-btn"><button class="btn btn-teal" data-act="contact" data-how="WhatsApp">${ico('chat')} ${t('wa')}</button><button class="btn btn-navy" data-act="contact" data-how="Call">${ico('phone')} ${t('call')}</button></div>
          <p class="note">${t('supportNote')}</p></section>
        <section class="card"><h2>${t('trackerH')}</h2>${donors}</section>
        <div style="display:flex;gap:16px;flex-wrap:wrap"><button class="btn btn-outline sm" data-act="share" data-id="${c.id}">${ico('share')} ${t('share')}</button><button class="linkbtn" data-act="report-case" data-id="${c.id}">${t('report')}</button></div>
      </aside>
    </div></div>
`;
}

function storiesView(){
  return `<div class="wrap">
    <div class="page-h"><h1>${t('storiesH')}</h1><p class="sec-sub">${t('storiesSub')}</p></div>
    <div class="grid3">${stories.map(publicStoryCard).join('') || emptyPublic('noStories')}</div>
    <div class="sec-h" style="margin-top:48px;margin-bottom:0"><h2>${t('communityH')}</h2></div>
    ${impactStats()}</div>`;
}

/* ----- forms ----- */
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
  const s = state.step, names = ['st0','st1','st2','st3'].map(t);
  let body = '';
  if(s === 0) body = fld('a_name',t('fName')) + fld('a_public_name','Public display name (first name or alias)') + fld('a_age',t('fAge'),{type:'number',attr:'min="0" max="120"'}) + `<div class="grid2">${fld('a_nic',t('fNic'),{attr:'autocomplete="off"'})}${fld('a_email','Email',{type:'email'})}</div><div class="grid2">${fld('a_district',t('fDistrict'),{type:'select',opts:DISTRICTS,ph:t('chooseDistrict')})}${fld('a_phone',t('fPhone'),{type:'tel'})}</div>`;
  if(s === 1) body = fld('a_cond',t('fCondition'),{type:'select',opts:DISEASES,ph:'Choose a condition'}) + fld('a_hospital',t('fHospital')) + fld('a_treat',t('fTreatment')) + `<div class="grid2">${fld('a_cost',t('fCost'),{type:'number',attr:'min="1"'})}${fld('a_urg',t('urgency'),{type:'select',opts:['Normal','Soon','Urgent'],ph:'Choose urgency'})}</div>`;
  if(s === 2) body = fld('a_report',t('dReport'),{type:'file'}) + fld('a_letter',t('dLetter'),{type:'file'}) + fld('a_est',t('dEst'),{type:'file'}) + `<p class="note">PDF, PNG or JPEG, maximum 5 MB each. All three documents are required. Only you and authorized admins can download them.</p>`;
  if(s === 3) body = `<div class="info-box"><h3>Before you submit</h3><p>Two admins will check your identity, medical documents and the hospital cost. Supporters contact the family about direct support.</p></div><div style="margin-top:18px">${chk('a_consent','I am the patient or authorized guardian. I consent to identity and medical verification.')}${chk('a_public_consent','I consent to publishing the display name, age, district, condition, treatment and required amount after approval.')}${chk('a_contact_consent','I consent to sharing my contact number with signed-in supporters for this case.')}<p class="note">Read our <button class="linkbtn" data-act="go" data-view="privacy">privacy notice</button> before submitting.</p></div>`;
  return `<div class="wrap page"><h1>${t('applyH')}</h1><p class="sub">${t('applyP')}</p>
    <div class="card form-card">
      <ol class="stepper">${names.map((n,i) => `<li class="${i === s ? 'on' : i < s ? 'past' : ''}"${i === s ? ' aria-current="step"' : ''}><span class="sn" aria-hidden="true">${i + 1}</span>${n}</li>`).join('')}</ol>
      ${body}
      <div class="actions">${s > 0 ? `<button class="btn btn-outline" data-act="apply-back">${t('prev')}</button>` : ''}<button class="btn btn-navy" data-act="${s < 3 ? 'apply-next' : 'apply-submit'}">${s < 3 ? t('nextStep') : t('submit')}</button></div>
    </div></div>`;
}


function reportView(){
  if(state.reportDone){
    const r = state.reportDone;
    return `<div class="wrap page"><div class="form-card" style="margin-top:0;text-align:center"><div class="center-icon">${ic('check',26)}</div>
      <h1 style="font-size:1.6rem">Report received</h1>
      <p style="margin-top:10px">Your report about case <strong>${esc(r.caseId)}</strong> is saved. An admin will investigate and decide whether to suspend the case.</p>
      <div class="actions" style="justify-content:center"><button class="btn btn-outline" data-act="go" data-view="cases">Back to cases</button></div></div></div>`;
  }
  return `<div class="wrap page"><div style="text-align:center"><div class="center-icon">${ic('flag',26)}</div><h1>${t('fraudH')}</h1><p class="sub" style="margin-inline:auto">Report a medical case you believe is false or misleading. An admin reviews every report.</p></div>
    <div class="form-card">
      ${fld('r_name',t('fName'))}${fld('r_contact','Contact info (phone or email)')}${fld('r_case',t('fCaseId'),{attr:'placeholder="Paste the case ID"'})}
      ${fld('r_desc',t('reportDetail'),{type:'textarea',rows:5})}${fld('r_file','Upload evidence (max 5 MB)',{type:'file'})}
      ${chk('r_consent','I confirm this report is made in good faith.')}
      <div class="actions"><button class="btn btn-blue block" data-act="report-send">${t('sendReport')}</button></div>
    </div></div>`;
}

function volunteerView(){
  if(state.volDone) return `<div class="wrap page"><div class="form-card" style="margin-top:0;text-align:center"><div class="center-icon">${ic('check',26)}</div><h1 style="font-size:1.6rem">Thank you for volunteering</h1><p style="margin-top:10px">Your registration is with the team. A coordinator will contact you.</p><div class="actions" style="justify-content:center"><button class="btn btn-outline" data-act="go" data-view="home">Back to home</button></div></div></div>`;
  const chip = d => `<button type="button" class="chip" data-act="vol-district" data-d="${d}" aria-pressed="${state.f.v_district === d}">${d}</button>`;
  const skill = k => `<label class="check"><input type="checkbox" data-field="v_sk_${k}" ${state.f['v_sk_' + k] ? 'checked' : ''}><span>${k}</span></label>`;
  return `<div class="wrap page"><div style="text-align:center"><div class="center-icon">${ic('people',26)}</div><h1>${t('volH')}</h1><p class="sub" style="margin-inline:auto">Help verify cases, visit hospitals or support the platform.</p></div>
    <div class="form-card">
      ${fld('v_name',t('fName'))}<div class="grid2">${fld('v_phone','Phone',{type:'tel'})}${fld('v_email','Email',{type:'email'})}</div>
      ${fld('v_role','Preferred role',{type:'select',opts:['Field verification','Hospital liaison','Social media','IT support'],ph:'Choose a role'})}
      <div class="field"><span class="lbl" id="dl">${t('fDistrict')}</span><div class="chips" role="group" aria-labelledby="dl">${DISTRICTS.map(chip).join('')}</div>${state.errors.v_district ? `<div class="err">Please choose a district.</div>` : ''}</div>
      <div class="field"><span class="lbl">${t('fSkills')}</span>${['Medical','Social media','IT','Field work'].map(skill).join('')}</div>
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
function reviewCard(a){return `<section class="rv"><div class="rv-h"><div><strong>${esc(a.name)}, ${a.age}</strong><div class="meta">Case ${a.id} · ${esc(a.district)} · ${esc(a.disease)}</div></div>${urgTag(a.urgency)}</div><p>${esc(a.hospital)} · ${money(a.required)}</p><p class="meta">Public name: ${esc(a.publicName)} · Contact: ${esc(a.phone)} · ${esc(a.email)}</p><details><summary>Private identity details</summary><p>Applicant/guardian NIC: ${esc(a.nic)}</p></details><p>${esc(a.treatment)}</p><div class="admin-docs">${a.documents.map(d=>`<a class="btn btn-outline sm" href="/api/documents/${d.id}">Download ${esc(d.kind.replace('a_',''))}</a>`).join('')}</div><div>${CHECKS.map((label,i)=>`<label class="check"><input type="checkbox" data-check="${i}" data-id="${a.id}" ${a.checks[i]?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="note">Changing the checklist resets existing approvals. Verify the hospital independently before approving.</p><p>${a.approvals.length} of 2 independent approvals</p><div class="rv-act"><button class="btn btn-teal" data-act="approve" data-id="${a.id}" ${!a.checks.every(Boolean)||a.approvals.length>=2||a.approvals.includes(currentUser.id)?'disabled':''}>${a.approvals.includes(currentUser.id)?'Your approval recorded':'Approve'}</button>${a.approvals.length===2 ? `<button class="btn btn-navy" data-act="publish" data-id="${a.id}">Publish case</button>` : ''}<input id="rj-${a.id}" aria-label="Rejection reason" placeholder="Reason required to reject" maxlength="1000"><button class="btn btn-danger" data-act="reject" data-id="${a.id}">Reject</button></div></section>`;}
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
 if (document.documentElement) document.documentElement.lang = isAdminPortal ? 'en' : state.lang;
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
 const views={home:homeView,cases:casesView,case:caseView,apply:applyView,stories:storiesView,report:reportView,volunteer:volunteerView,login:loginView,account:accountView,privacy:privacyView};
 $('#app').innerHTML=header()+`<main id="main">${(views[state.view]||homeView)()}</main>`+footer();
 if(state.view==='cases')updateList();
}
function go(view,extra={}){state.view=view;state.errors={};Object.assign(state,extra);history.replaceState(null,'',view==='case'?'#case/'+encodeURIComponent(state.caseId):'#'+view);render();window.scrollTo(0,0);const h=document.querySelector('main h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){toast(e.message);}finally{busy=false;render();}}
function multipart(keys){const f=new FormData();Object.entries(state.f).forEach(([k,v])=>f.append(k,String(v)));keys.forEach(k=>{if(fileObjects[k])f.append(k,fileObjects[k]);});return f;}
function clearForm(){state.f={};state.files={};Object.keys(fileObjects).forEach(k=>delete fileObjects[k]);state.errors={};}
async function adminAction(id,action,extra={}){await api('/admin/case',{id,action,...extra});await refresh();render();}
const STEP_KEYS=[['a_name','a_public_name','a_age','a_nic','a_email','a_district','a_phone'],['a_cond','a_hospital','a_treat','a_cost','a_urg'],[],['a_consent','a_public_consent','a_contact_consent']];
const actions={
 lang:el=>{state.lang=el.dataset.lang;},
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
 approve:async el=>{await adminAction(el.dataset.id,'approve');toast('Approval recorded. Publish the case once both approvals are in.');},
 publish:async el=>{await adminAction(el.dataset.id,'publish');state.adm='verified';toast('Case published.');},
 reject:async el=>adminAction(el.dataset.id,'reject',{reason:$('#rj-'+el.dataset.id).value}),
 suspend:async el=>adminAction(el.dataset.id,'suspend',{reason:$('#suspend-'+el.dataset.id).value}),
 reopen:async el=>adminAction(el.dataset.id,'reopen'),
 'rep-dismiss':async el=>{await api('/admin/report',{id:el.dataset.id,action:'dismissed'});await refresh();},
 'rep-suspend':async el=>{await api('/admin/report',{id:el.dataset.id,action:'suspended'});await refresh();},
 'delete-story':async el=>{await api('/admin/story-delete',{id:el.dataset.id});await refresh();}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;if(el.tagName==='A')e.preventDefault();const fn=actions[el.dataset.act];if(fn)run(()=>fn(el));});
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
