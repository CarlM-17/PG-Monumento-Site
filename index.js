const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), 'campaign-leads.json');
const attempts = new Map();
let writeQueue = Promise.resolve();

function readLeads() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (error) { return []; }
}
function saveLeads(leads) {
  writeQueue = writeQueue.then(() => {
    const temporary = DATA_FILE + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(leads, null, 2));
    fs.renameSync(temporary, DATA_FILE);
  });
  return writeQueue;
}
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function bodyFrom(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 20000) { reject(new Error('too_large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('invalid_json')); } });
    req.on('error', reject);
  });
}
function clean(value, max) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max); }
function normalizePhone(value) { return String(value || '').replace(/[^0-9+]/g, '').replace(/^\+63/, '0'); }
function claimCode() { return 'PGM-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }
function authorized(req, url) { return Boolean(ADMIN_PIN) && (req.headers['x-admin-pin'] || url.searchParams.get('pin')) === ADMIN_PIN; }
function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), recent = (attempts.get(ip) || []).filter(t => now - t < 3600000);
  if (recent.length >= 8) return true;
  recent.push(now); attempts.set(ip, recent); return false;
}

const page = String.raw`<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#073f2c">
  <meta name="description" content="Register for the Puregold Monumento flyer offer and receive a gift pack with a minimum ₱500 qualifying purchase.">
  <meta property="og:title" content="Puregold Monumento — Register & Claim Your Gift Pack"><meta property="og:description" content="Register, visit Puregold Monumento, and make a minimum ₱500 qualifying purchase to claim your gift pack.">
  <meta property="og:image" content="https://upload.wikimedia.org/wikipedia/commons/3/3c/09288jfCaloocan_City_Buildings_Barangays_Roads_Landmarksfvf_10.jpg">
  <title>Puregold Monumento | Gift Pack Registration</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');
    :root{--ink:#073f2c;--green:#0b6745;--yellow:#ffd94d;--cream:#f7f3e8;--paper:#fffdf8;--muted:#66746d;--line:rgba(7,63,44,.14);--danger:#a43126}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--cream);font-family:'DM Sans',sans-serif;line-height:1.55}button,input,textarea{font:inherit}.wrap{width:min(1160px,calc(100% - 40px));margin:auto}.nav{height:74px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-family:'Manrope';font-weight:800;letter-spacing:-.03em}.brand-mark{width:38px;height:38px;border-radius:11px;background:var(--green);display:grid;place-items:center;color:var(--yellow);font-size:20px;transform:rotate(-3deg)}.brand small{display:block;font:600 10px 'DM Sans';letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.nav-note{font-size:13px;color:var(--muted)}
    .hero{background:var(--ink);color:white;border-radius:0 0 42px 42px;overflow:hidden;position:relative}.hero:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 20%,rgba(185,223,59,.24),transparent 32%),linear-gradient(105deg,rgba(3,33,23,.98) 0%,rgba(3,33,23,.9) 55%,rgba(3,33,23,.42)),url('https://upload.wikimedia.org/wikipedia/commons/3/3c/09288jfCaloocan_City_Buildings_Barangays_Roads_Landmarksfvf_10.jpg') center/cover}.hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:1.08fr .92fr;gap:64px;align-items:center;padding:72px 0 86px}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--yellow);font-weight:800;font-size:12px;letter-spacing:.13em;text-transform:uppercase}.eyebrow:before{content:"";width:26px;height:2px;background:currentColor}.hero h1{font:800 clamp(45px,6vw,78px)/1 'Manrope';letter-spacing:-.055em;margin:20px 0 22px}.hero h1 em{font-style:normal;color:var(--yellow)}.hero-copy{font-size:18px;color:rgba(255,255,255,.78);max-width:560px}.offer{display:flex;gap:11px;align-items:center;margin-top:28px;padding:16px 18px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:16px;width:max-content;max-width:100%}.offer strong{color:var(--yellow);font-size:22px}.offer span{font-size:13px;color:rgba(255,255,255,.72)}
    .form-card{background:var(--paper);color:var(--ink);border-radius:26px;padding:30px;box-shadow:0 28px 70px rgba(0,0,0,.27)}.form-head{display:flex;align-items:start;justify-content:space-between;gap:15px;margin-bottom:22px}.step{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--green)}.form-card h2{font:800 26px 'Manrope';letter-spacing:-.035em;margin:4px 0}.gift{font-size:30px}.field{margin:14px 0}.field label{display:block;font-weight:700;font-size:13px;margin-bottom:7px}.field input,.field textarea{display:block;width:100%;border:1px solid var(--line);border-radius:13px;background:white;color:var(--ink);padding:13px 14px;outline:none}.field input:focus,.field textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(11,103,69,.11)}.field textarea{min-height:72px;resize:vertical}.hint{font-size:11px;color:var(--muted);margin-top:5px}.check-row{display:flex;align-items:flex-start;gap:9px;font-size:11px;color:var(--muted);margin:14px 0}.check-row input{margin-top:3px;accent-color:var(--green)}.check-row a{color:var(--green)}.submit,.btn{width:100%;border:0;border-radius:999px;padding:15px 20px;background:var(--yellow);color:var(--ink);font-weight:800;cursor:pointer}.submit:disabled{opacity:.62;cursor:wait}.form-message{display:none;margin-top:13px;padding:11px 13px;border-radius:10px;font-size:12px}.form-message.error{display:block;background:#fbe9e5;color:var(--danger)}
    .success{display:none;text-align:center}.success.show{display:block}.success-icon{width:64px;height:64px;border-radius:50%;background:#e7f3c6;display:grid;place-items:center;font-size:30px;margin:0 auto 16px}.success h2{font:800 28px 'Manrope';margin:0 0 8px}.success p{color:var(--muted);font-size:14px}.claim{border:2px dashed var(--green);background:#f3f8e7;border-radius:16px;padding:18px;margin:20px 0}.claim small{display:block;text-transform:uppercase;letter-spacing:.13em;font-weight:800;color:var(--muted)}.claim strong{display:block;font:800 30px 'Manrope';letter-spacing:.08em;color:var(--green)}.success .btn{display:block;text-decoration:none;margin-top:10px;background:var(--ink);color:white}
    section{padding:88px 0}.section-head{text-align:center;max-width:710px;margin:0 auto 42px}.kicker{color:var(--green);font-size:12px;letter-spacing:.13em;text-transform:uppercase;font-weight:800}.section-head h2{font:800 clamp(34px,5vw,54px)/1.06 'Manrope';letter-spacing:-.045em;margin:10px 0}.section-head p{color:var(--muted)}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.step-card{background:var(--paper);border:1px solid var(--line);border-radius:23px;padding:28px}.step-card .num{width:42px;height:42px;border-radius:13px;background:var(--yellow);display:grid;place-items:center;font:800 17px 'Manrope';margin-bottom:25px}.step-card h3{font:800 22px 'Manrope';letter-spacing:-.03em;margin:0 0 8px}.step-card p{margin:0;color:var(--muted);font-size:14px}.details{background:#dfead3;border-radius:38px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:54px;align-items:center}.detail-grid h2{font:800 clamp(34px,5vw,55px)/1.06 'Manrope';letter-spacing:-.045em;margin:10px 0 18px}.detail-grid p{color:var(--muted)}.terms{background:var(--paper);border-radius:24px;padding:28px}.terms h3{font:800 20px 'Manrope';margin:0 0 14px}.terms ul{margin:0;padding-left:20px}.terms li{margin:10px 0;color:var(--muted);font-size:14px}.location{display:flex;gap:15px;align-items:center;margin-top:24px}.pin{width:47px;height:47px;flex:0 0 47px;border-radius:15px;background:var(--green);color:white;display:grid;place-items:center;font-size:21px}.location b,.location span{display:block}.location span{font-size:13px;color:var(--muted)}.map-link{display:inline-block;margin-top:22px;color:var(--green);font-weight:800;text-decoration:none}.privacy{padding:28px 0;font-size:12px;color:var(--muted);text-align:center}.privacy button{border:0;background:none;color:var(--green);font-weight:700;cursor:pointer}.modal{display:none;position:fixed;inset:0;background:rgba(3,33,23,.74);z-index:20;padding:20px;place-items:center}.modal.open{display:grid}.modal-card{background:var(--paper);border-radius:22px;padding:28px;width:min(560px,100%);max-height:85vh;overflow:auto}.modal-card h2{font:800 25px 'Manrope';margin-top:0}.modal-card p{color:var(--muted);font-size:14px}.close{float:right;border:0;background:none;font-size:24px;cursor:pointer}footer{background:var(--ink);color:white;padding:40px 0}.footer-row{display:flex;justify-content:space-between;gap:20px;align-items:center}.footer-row b{font:800 19px 'Manrope'}.footer-row span{font-size:12px;color:rgba(255,255,255,.58)}
    @media(max-width:820px){.wrap{width:min(100% - 28px,620px)}.nav-note{display:none}.hero{border-radius:0 0 28px 28px}.hero-grid{grid-template-columns:1fr;padding:58px 0 70px;gap:38px}.hero-copy{font-size:16px}.form-card{padding:23px}.steps,.detail-grid{grid-template-columns:1fr}.detail-grid{gap:28px}.footer-row{display:block}.footer-row span{display:block;margin-top:8px}section{padding:68px 0}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  </style>
</head><body>
  <header class="wrap nav"><a class="brand" href="#top"><span class="brand-mark">P</span><span>Puregold Monumento<small>Neighborhood gift offer</small></span></a><span class="nav-note">300 Samson Road, Caloocan City</span></header>
  <main id="top"><section class="hero"><div class="wrap hero-grid">
    <div><span class="eyebrow">Exclusive neighborhood offer</span><h1>Register. Shop ₱500. Get a <em>gift pack.</em></h1><p class="hero-copy">Scan, register, then visit Puregold Monumento. Make a minimum qualifying purchase of ₱500 and present your claim code to redeem your gift pack.</p><div class="offer"><strong>₱500</strong><span>minimum single-receipt purchase<br>to qualify for the gift pack</span></div></div>
    <div class="form-card" id="formCard"><form id="registrationForm"><div class="form-head"><div><span class="step">Step 1 of 3</span><h2>Reserve your gift</h2></div><span class="gift">🎁</span></div>
      <div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" maxlength="100" required placeholder="Juan Dela Cruz"></div>
      <div class="field"><label for="phone">Mobile number</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="16" required placeholder="09XX XXX XXXX"><div class="hint">We'll use this to verify your registration.</div></div>
      <div class="field"><label for="address">Complete address</label><textarea id="address" name="address" autocomplete="street-address" maxlength="240" required placeholder="House no., street, barangay, city"></textarea></div>
      <label class="check-row"><input type="checkbox" name="consent" required><span>I agree that my information may be collected and used to administer this gift-pack campaign and verify my redemption. I have read the <a href="#" id="privacyLink">privacy notice</a>.</span></label>
      <label class="check-row"><input type="checkbox" name="marketing"><span>Optional: I would like to receive future store offers on my mobile number.</span></label>
      <button class="submit" type="submit">Register & get claim code →</button><div class="form-message" id="message" role="alert"></div></form>
      <div class="success" id="success"><div class="success-icon">✓</div><span class="step">Registration complete</span><h2>Your gift is reserved!</h2><p>Screenshot this claim code and present it during your qualifying visit.</p><div class="claim"><small>Your claim code</small><strong id="claimCode"></strong></div><p><b>Next:</b> Visit Puregold Monumento and make a minimum ₱500 purchase in one receipt. Show this code at the campaign redemption area.</p><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=Puregold+Monumento%2C+300+Samson+Road%2C+Caloocan">Get directions →</a></div>
    </div></div></section>
    <section><div class="wrap"><div class="section-head"><span class="kicker">Simple as 1–2–3</span><h2>From flyer to free gift.</h2><p>Your registration takes about one minute.</p></div><div class="steps"><article class="step-card"><div class="num">1</div><h3>Register here</h3><p>Enter your details and save the claim code shown after registration.</p></article><article class="step-card"><div class="num">2</div><h3>Shop at Monumento</h3><p>Make a minimum ₱500 qualifying purchase on one receipt.</p></article><article class="step-card"><div class="num">3</div><h3>Claim your gift</h3><p>Present your claim code and qualifying receipt at the campaign redemption area.</p></article></div></div></section>
    <section class="details"><div class="wrap detail-grid"><div><span class="kicker">Where to claim</span><h2>See you at Puregold Monumento.</h2><p>Conveniently located near LRT-1 Yamaha–Monumento and the Monumento transport hub.</p><div class="location"><div class="pin">⌖</div><div><b>Puregold Price Club – Monumento</b><span>300 Samson Road, Caloocan City, Metro Manila</span></div></div><a class="map-link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=Puregold+Monumento%2C+300+Samson+Road%2C+Caloocan">Open live directions ↗</a></div><aside class="terms"><h3>Quick offer reminders</h3><ul><li>Registration must be completed before redemption.</li><li>A minimum ₱500 qualifying purchase must appear on one receipt.</li><li>One gift-pack redemption per registered mobile number.</li><li>Claim codes cannot be exchanged for cash.</li><li>Valid during the announced campaign period and while gift-pack supplies last.</li><li>The organizer may verify registration details and the qualifying receipt.</li></ul></aside></div></section>
    <div class="wrap privacy">Your information is used for campaign administration and redemption tracking. <button id="privacyButton">Read privacy notice</button></div>
  </main><footer><div class="wrap footer-row"><b>Puregold Monumento Neighborhood Offer</b><span>Campaign mechanics should be confirmed by the store before flyer distribution.</span></div></footer>
  <div class="modal" id="privacyModal" role="dialog" aria-modal="true" aria-labelledby="privacyTitle"><div class="modal-card"><button class="close" id="closeModal" aria-label="Close">×</button><h2 id="privacyTitle">Campaign privacy notice</h2><p>We collect your name, address, and mobile number to register you for this campaign, detect duplicate claims, contact you about this offer when needed, and record whether your gift was redeemed.</p><p>Marketing messages are optional and require the separate checkbox. Your information should be accessible only to authorized campaign staff and retained only as long as needed for campaign administration, reporting, and applicable legal requirements.</p><p>To request access, correction, or deletion of your campaign information, contact the campaign desk at Puregold Monumento. Deletion before redemption may cancel the corresponding claim because the store will no longer be able to verify it.</p></div></div>
  <script>
    const form=document.querySelector('#registrationForm'),success=document.querySelector('#success'),message=document.querySelector('#message');
    form.addEventListener('submit',async event=>{event.preventDefault();message.className='form-message';const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='Registering…';const data=Object.fromEntries(new FormData(form));data.consent=Boolean(data.consent);data.marketing=Boolean(data.marketing);try{const response=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Registration could not be completed.');document.querySelector('#claimCode').textContent=result.claimCode;form.style.display='none';success.classList.add('show');document.querySelector('#formCard').scrollIntoView({behavior:'smooth',block:'center'});}catch(error){message.textContent=error.message;message.className='form-message error';}finally{button.disabled=false;button.textContent='Register & get claim code →';}});
    const modal=document.querySelector('#privacyModal');function openPrivacy(event){event.preventDefault();modal.classList.add('open');document.querySelector('#closeModal').focus()}document.querySelector('#privacyLink').addEventListener('click',openPrivacy);document.querySelector('#privacyButton').addEventListener('click',openPrivacy);document.querySelector('#closeModal').addEventListener('click',()=>modal.classList.remove('open'));modal.addEventListener('click',event=>{if(event.target===modal)modal.classList.remove('open')});document.addEventListener('keydown',event=>{if(event.key==='Escape')modal.classList.remove('open')});
  </script>
</body></html>`;

const adminPage = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Campaign Records</title><style>body{font:15px system-ui;margin:0;background:#f4f6f1;color:#073f2c}.wrap{max-width:1100px;margin:auto;padding:30px}.login,.panel{background:white;padding:25px;border-radius:18px;box-shadow:0 10px 35px #073f2c18}.panel{display:none}.row{display:flex;gap:10px;flex-wrap:wrap;margin:15px 0}input,button{font:inherit;padding:11px 14px;border-radius:10px;border:1px solid #ccd6cf}button{background:#073f2c;color:white;font-weight:700;cursor:pointer}.export{background:#ffd94d;color:#073f2c}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid #e3e8e4;vertical-align:top}th{position:sticky;top:0;background:white}.table{overflow:auto;max-height:68vh}.badge{padding:4px 8px;border-radius:999px;background:#e6eddf;font-size:11px}.redeemed{background:#d9edcf}.muted{color:#6d776f}.stats{font-weight:700}h1{margin-top:0}@media(max-width:650px){.wrap{padding:15px}table{min-width:850px}}</style></head><body><div class="wrap"><div class="login" id="login"><h1>Campaign records</h1><p class="muted">Authorized campaign staff only.</p><div class="row"><input id="pin" type="password" placeholder="Admin PIN"><button id="enter">Open records</button></div><p id="error"></p></div><div class="panel" id="panel"><h1>Gift-pack registrations</h1><div class="row"><span class="stats" id="stats"></span><button class="export" id="export">Download CSV</button><button id="refresh">Refresh</button></div><div class="table"><table><thead><tr><th>Date</th><th>Claim code</th><th>Name</th><th>Mobile</th><th>Address</th><th>Marketing</th><th>Status</th><th>Action</th></tr></thead><tbody id="rows"></tbody></table></div></div></div><script>let pin='';async function load(){const r=await fetch('/api/leads',{headers:{'x-admin-pin':pin}});if(!r.ok)throw new Error('Incorrect PIN.');const data=await r.json();document.querySelector('#login').style.display='none';document.querySelector('#panel').style.display='block';document.querySelector('#stats').textContent=data.leads.length+' registered • '+data.leads.filter(x=>x.redeemedAt).length+' redeemed';const rows=document.querySelector('#rows');rows.innerHTML='';data.leads.forEach(x=>{const tr=document.createElement('tr');[new Date(x.createdAt).toLocaleString(),x.claimCode,x.name,x.phone,x.address,x.marketing?'Yes':'No'].forEach(value=>{const td=document.createElement('td');td.textContent=String(value??'');tr.appendChild(td)});const status=document.createElement('td');status.innerHTML=x.redeemedAt?'<span class="badge redeemed">Redeemed</span>':'<span class="badge">Pending</span>';tr.appendChild(status);const action=document.createElement('td');if(!x.redeemedAt){const b=document.createElement('button');b.textContent='Mark redeemed';b.onclick=async()=>{if(!confirm('Mark '+x.claimCode+' as redeemed?'))return;await fetch('/api/redeem',{method:'POST',headers:{'Content-Type':'application/json','x-admin-pin':pin},body:JSON.stringify({claimCode:x.claimCode})});load()};action.appendChild(b)}tr.appendChild(action);rows.appendChild(tr)})}document.querySelector('#enter').onclick=()=>{pin=document.querySelector('#pin').value;load().catch(e=>document.querySelector('#error').textContent=e.message)};document.querySelector('#refresh').onclick=load;document.querySelector('#export').onclick=async()=>{const r=await fetch('/api/export',{headers:{'x-admin-pin':pin}});if(!r.ok)return alert('Export failed.');const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='puregold-monumento-campaign.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};document.querySelector('#pin').addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#enter').click()});</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true });
    if (url.pathname === '/api/register' && req.method === 'POST') {
      if (rateLimited(req)) return json(res, 429, { error: 'Too many attempts. Please try again later.' });
      const input = await bodyFrom(req), name = clean(input.name, 100), address = clean(input.address, 240), phone = normalizePhone(input.phone);
      if (name.length < 3) return json(res, 400, { error: 'Please enter your complete name.' });
      if (address.length < 10) return json(res, 400, { error: 'Please enter your complete address.' });
      if (!/^09\d{9}$/.test(phone)) return json(res, 400, { error: 'Enter a valid Philippine mobile number beginning with 09.' });
      if (input.consent !== true) return json(res, 400, { error: 'Consent is required to register for this campaign.' });
      const leads = readLeads(), existing = leads.find(item => item.phone === phone);
      if (existing) return json(res, 409, { error: 'This mobile number is already registered. Your claim code is ' + existing.claimCode + '.' });
      const lead = { id: crypto.randomUUID(), claimCode: claimCode(), name, phone, address, marketing: input.marketing === true, createdAt: new Date().toISOString(), redeemedAt: null };
      leads.push(lead); await saveLeads(leads); return json(res, 201, { ok: true, claimCode: lead.claimCode });
    }
    if (url.pathname === '/api/leads') {
      if (!authorized(req, url)) return json(res, 401, { error: 'Unauthorized' });
      return json(res, 200, { leads: readLeads().sort((a,b) => b.createdAt.localeCompare(a.createdAt)) });
    }
    if (url.pathname === '/api/redeem' && req.method === 'POST') {
      if (!authorized(req, url)) return json(res, 401, { error: 'Unauthorized' });
      const input = await bodyFrom(req), code = clean(input.claimCode, 20).toUpperCase(), leads = readLeads(), lead = leads.find(item => item.claimCode === code);
      if (!lead) return json(res, 404, { error: 'Claim code not found.' });
      if (!lead.redeemedAt) { lead.redeemedAt = new Date().toISOString(); await saveLeads(leads); }
      return json(res, 200, { ok: true, redeemedAt: lead.redeemedAt });
    }
    if (url.pathname === '/api/export') {
      if (!authorized(req, url)) return json(res, 401, { error: 'Unauthorized' });
      const quote = value => { const safe = String(value ?? '').replace(/^([=+\-@])/, "'$1"); return '"' + safe.replace(/"/g, '""') + '"'; };
      const rows = [['Created','Claim Code','Name','Phone','Address','Marketing Opt-in','Redeemed At'], ...readLeads().map(x => [x.createdAt,x.claimCode,x.name,x.phone,x.address,x.marketing?'Yes':'No',x.redeemedAt||''])];
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="puregold-monumento-campaign.csv"', 'Cache-Control': 'no-store' });
      return res.end('\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n'));
    }
    if (url.pathname === '/admin') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(adminPage); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(page);
  } catch (error) { json(res, 500, { error: 'Something went wrong. Please try again.' }); }
});

server.listen(PORT, '0.0.0.0', () => console.log('Puregold Monumento campaign is ready on port ' + PORT));
