const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showPage(id){ document.querySelectorAll('.auth-card').forEach(c=>c.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function showError(msg){ const el=document.getElementById('vs-error')||document.getElementById('vl-error'); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); }
function hideError(){ document.querySelectorAll('.error').forEach(e=>e.classList.add('hidden')); }
function showToast(m){ const t=document.getElementById('toast'); if(!t) return; t.textContent=m; t.classList.add('is-show'); setTimeout(()=>t.classList.remove('is-show'),2500); }

// EYE TOGGLE - lucide icons only, no emoji
function toggleEye(targetId, btn){
  const input = document.getElementById(targetId);
  if(!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  input.focus();
  // lucide icons
  if(isHidden){
    btn.innerHTML = '<i data-lucide="eye-off" style="width:18px;height:18px;"></i>';
    btn.setAttribute('aria-label','Hide password');
  } else {
    btn.innerHTML = '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
    btn.setAttribute('aria-label','Show password');
  }
  if(window.lucide && window.lucide.createIcons){
    window.lucide.createIcons();
  }
}

function initEyeButtons(){
  if(window.__eyeDelegated) return;
  window.__eyeDelegated = true;
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.eye-btn');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const targetId = btn.dataset.target;
    if(!targetId) return;
    toggleEye(targetId, btn);
  });
  // set initial lucide icons
  document.querySelectorAll('.eye-btn').forEach(b=>{
    if(!b.querySelector('[data-lucide]')){
      b.innerHTML = '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
    }
  });
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();
}
document.addEventListener('DOMContentLoaded', initEyeButtons);
initEyeButtons();
// re-init after step change
const origSetStep = window.setStep;


document.getElementById('to-v-signup')?.addEventListener('click', ()=> showPage('v-signup-page'));
document.getElementById('to-v-login-1')?.addEventListener('click', ()=> showPage('v-login-page'));
document.getElementById('v-logout-pending')?.addEventListener('click', async ()=>{ await supa.auth.signOut(); showPage('v-login-page'); });

function setStep(n){
  document.querySelectorAll('[id^="v-step-"]').forEach(el=>el.classList.add('hidden'));
  document.getElementById(`v-step-${n}`)?.classList.remove('hidden');
  document.querySelectorAll('.vendor-step').forEach((el,i)=>{
    el.classList.remove('is-active','is-done');
    if(i+1 < n) el.classList.add('is-done');
    if(i+1 === n) el.classList.add('is-active');
  });
  setTimeout(initEyeButtons, 100);
}
document.getElementById('to-step-2')?.addEventListener('click', ()=>{
  hideError();
  if(!document.getElementById('vo-name').value || !document.getElementById('vo-email').value || !document.getElementById('vo-ghana-id').value){ showError('Fill owner name, email, Ghana Card number'); return; }
  const pw=document.getElementById('vo-password').value, cp=document.getElementById('vo-confirm').value;
  if(pw.length<8){ showError('Password min 8'); return; }
  if(pw!==cp){ showError('Passwords no match'); return; }
  setStep(2);
});
document.getElementById('back-to-1')?.addEventListener('click', ()=> setStep(1));
document.getElementById('to-step-3')?.addEventListener('click', ()=>{
  hideError();
  if(!document.getElementById('vs-name').value || !document.getElementById('vs-region').value || !document.getElementById('vs-city').value){ showError('Fill store name, region, city'); return; }
  setStep(3);
});
document.getElementById('back-to-2')?.addEventListener('click', ()=> setStep(2));
document.getElementById('to-step-4')?.addEventListener('click', ()=>{
  hideError();
  const front=document.getElementById('vu-front').files[0];
  const back=document.getElementById('vu-back').files[0];
  if(!front || !back){ showError('Upload Ghana Card front and back (selfie is optional now)'); return; }
  const hasSelfie = !!document.getElementById('vu-selfie')?.files[0];
  let catDisplay = document.getElementById('vs-category')?.value || '';
  if(catDisplay === 'Others'){
    catDisplay = document.getElementById('vs-category-other')?.value.trim() || 'Others';
  }
  const review = `
    <b>Owner:</b> ${document.getElementById('vo-name').value} (${document.getElementById('vo-ghana-id').value})<br/>
    <b>Email:</b> ${document.getElementById('vo-email').value} | ${document.getElementById('vo-phone').value}<br/>
    <b>Store:</b> ${document.getElementById('vs-name').value} — ${catDisplay}<br/>
    <b>Location:</b> ${document.getElementById('vs-region').value}, ${document.getElementById('vs-city').value}<br/>${document.getElementById('vs-address').value}<br/>
    <b>MoMo:</b> ${document.getElementById('vs-momo').value}<br/>
    <b>GPS:</b> ${document.getElementById('vs-gps').value||'Not pinned'}<br/>
    <b>Docs:</b> Front ✓ Back ✓ ${hasSelfie ? 'Selfie ✓' : 'Selfie skipped (optional)'}
  `;
  document.getElementById('v-review-box').innerHTML = review;
  setStep(4);
});
document.getElementById('back-to-3')?.addEventListener('click', ()=> setStep(3));

document.getElementById('vs-pin-btn')?.addEventListener('click', ()=>{
  if(!navigator.geolocation){ showError('Geolocation not supported'); return; }
  document.getElementById('vs-pin-btn').textContent='📍 Locating...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude.toFixed(6), lng=pos.coords.longitude.toFixed(6);
    document.getElementById('vs-gps').value = `${lat}, ${lng} | https://maps.google.com/?q=${lat},${lng}`;
    document.getElementById('vs-pin-btn').textContent='✅ Pinned';
    showToast('Location pinned');
  }, err=>{
    showError('Could not get location: '+err.message);
    document.getElementById('vs-pin-btn').textContent='📍 Pin my location';
  });
});

function bindPreview(inputId, previewId){
  const input = document.getElementById(inputId);
  if(!input) return;
  const box = input.closest('.upload-box');
  input.addEventListener('change', e=>{
    const file=e.target.files[0];
    const img=document.getElementById(previewId);
    if(!file){
      if(img){ img.src=''; img.classList.remove('is-show'); }
      if(box) box.classList.remove('has-image');
      return;
    }
    const url=URL.createObjectURL(file);
    if(img){ img.src=url; img.classList.add('is-show'); }
    if(box) box.classList.add('has-image');
    hideError();
  });
}
bindPreview('vu-front','vu-front-preview');
bindPreview('vu-back','vu-back-preview');
bindPreview('vu-selfie','vu-selfie-preview');

(function injectFixes(){
  if(document.getElementById('vendor-auth-fixes')) return;
  const s=document.createElement('style');
  s.id='vendor-auth-fixes';
  s.textContent=`
    .upload-box{ position:relative; min-height:110px; }
    .upload-box.has-image{ border-style:solid !important; border-color:#000 !important; background:#F9F9F9 !important; padding:0 !important; overflow:hidden; }
    .upload-box.has-image .upload-placeholder,
    .upload-box.has-image > span{ display:none !important; }
    .upload-box.has-image .upload-preview.is-show{ display:block !important; width:100%; height:160px; object-fit:cover; }
    .upload-box.has-image::after{ content:'Tap to change'; position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.75); color:#fff; font-size:9px; font-weight:700; padding:4px 8px; border-radius:20px; z-index:3; pointer-events:none; }
    .password-wrap{ position:relative; display:flex; align-items:center; }
    .password-wrap .input{ padding-right:40px !important; width:100%; }
    .eye-btn{ position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:#000; opacity:0.6; z-index:5; }
    .eye-btn:hover{ opacity:1; }
    #vs-category-other-wrap.hidden{ display:none !important; }
    #vs-category-other-wrap{ margin-top:8px; }
  `;
  document.head.appendChild(s);
})();

function initOthersCategory(){
  const cat = document.getElementById('vs-category');
  const otherWrap = document.getElementById('vs-category-other-wrap');
  if(!cat) return;
  cat.addEventListener('change', ()=>{
    if(cat.value === 'Others'){
      otherWrap?.classList.remove('hidden');
      document.getElementById('vs-category-other')?.focus();
    } else {
      otherWrap?.classList.add('hidden');
    }
  });
}
document.addEventListener('DOMContentLoaded', initOthersCategory);
initOthersCategory();

async function uploadFile(file, path){
  if(!file) return null;
  const { data, error } = await supa.storage.from('vendor-kyc').upload(path, file, { upsert:true });
  if(error) throw error;
  const { data:pub } = supa.storage.from('vendor-kyc').getPublicUrl(path);
  return pub.publicUrl;
}

document.getElementById('v-login-btn')?.addEventListener('click', async ()=>{
  hideError();
  const email=document.getElementById('vl-email').value.trim();
  const pw=document.getElementById('vl-password').value;
  if(!email||!pw){ showError('Enter email & password'); return; }
  const { data, error } = await supa.auth.signInWithPassword({ email, password:pw });
  if(error){ showError(error.message); return; }
  const { data:app } = await supa.from('vendor_applications').select('*').eq('user_id', data.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(!app){ showPage('v-signup-page'); setStep(1); showToast('No vendor application found, apply now'); return; }
  window.location.href='index.html';
});

document.getElementById('v-submit-btn')?.addEventListener('click', async ()=>{
  hideError();
  if(!document.getElementById('v-terms').checked){ showError('Accept terms'); return; }
  const btn=document.getElementById('v-submit-btn');
  btn.textContent='Submitting...'; btn.disabled=true;
  const ownerName=document.getElementById('vo-name').value.trim();
  const email=document.getElementById('vo-email').value.trim();
  const phone=document.getElementById('vo-phone').value.trim();
  const ghanaId=document.getElementById('vo-ghana-id').value.trim();
  const password=document.getElementById('vo-password').value;
try{
    let userId;
    let { data:{session} } = await supa.auth.getSession();
    if(session){ userId = session.user.id; } else {
      const { data:signupData, error:signupErr } = await supa.auth.signUp({ email, password, options:{ data:{ full_name:ownerName, role:'vendor' } } });
      if(signupErr && !signupErr.message.includes('already registered')){ throw signupErr; }
      const { data:loginData, error:loginErr } = await supa.auth.signInWithPassword({ email, password });
      if(loginErr){ userId = signupData?.user?.id; } else { userId = loginData.user.id; }
    }
    if(!userId){ const { data:{user} } = await supa.auth.getUser(); userId = user?.id; }
    if(!userId) throw new Error('Could not get user id. Disable email confirm in Supabase Auth settings.');
    const frontFile=document.getElementById('vu-front').files[0];
    const backFile=document.getElementById('vu-back').files[0];
    const selfieFile=document.getElementById('vu-selfie')?.files[0] || null;
    const shopFile=document.getElementById('vu-shop')?.files[0] || null;
    if(!frontFile || !backFile) throw new Error('Front and Back Ghana Card required');
    const basePath = `${userId}/${Date.now()}`;
    const frontUrl = await uploadFile(frontFile, `${basePath}/ghana-front.jpg`);
    const backUrl = await uploadFile(backFile, `${basePath}/ghana-back.jpg`);
    let selfieUrl = null; if(selfieFile) selfieUrl = await uploadFile(selfieFile, `${basePath}/selfie.jpg`);
    let shopUrl = null; if(shopFile) shopUrl = await uploadFile(shopFile, `${basePath}/shop.jpg`);
    let storeCategory = document.getElementById('vs-category').value;
    if(storeCategory === 'Others'){
      const otherVal = document.getElementById('vs-category-other')?.value.trim();
      if(otherVal) storeCategory = otherVal;
    }
    const payload = {
      user_id: userId, owner_name: ownerName, email, phone, ghana_card_number: ghanaId,
      ghana_card_front_url: frontUrl, ghana_card_back_url: backUrl, selfie_url: selfieUrl, shop_photo_url: shopUrl,
      store_name: document.getElementById('vs-name').value.trim(),
      store_category: storeCategory,
      store_description: document.getElementById('vs-desc').value.trim(),
      region: document.getElementById('vs-region').value,
      city: document.getElementById('vs-city').value.trim(),
      address: document.getElementById('vs-address').value.trim(),
      gps: document.getElementById('vs-gps').value.trim(),
      momo_number: document.getElementById('vs-momo').value.trim(),
      momo_name: ownerName, status: 'pending'
    };
    const { error:insErr } = await supa.from('vendor_applications').insert(payload);
    if(insErr) throw insErr;
    try{ await supa.from('vendor_notifications').insert({ user_id: userId, title: 'Application received', message: `We got your store ${payload.store_name}`, type: 'info' }); }catch(e){}
    window.location.href = 'index.html'; showToast('Application submitted');
  }catch(err){ showError(err.message); } finally { btn.textContent='Submit for review →'; btn.disabled=false; }
});

(async()=>{
  const { data:{session} } = await supa.auth.getSession();
  if(session){
    const { data:app } = await supa.from('vendor_applications').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(app && app.status){ window.location.href='index.html'; }
  }
})();
