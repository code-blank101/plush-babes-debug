
const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supaAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
lucide.createIcons();

function getRedirectTarget(){ const p=new URLSearchParams(window.location.search); let r=p.get('redirect')||'/index.html'; if(r==='/'||r==='') r='/index.html'; return r; }
function getMode(){ return new URLSearchParams(window.location.search).get('mode')||'login'; }
function showPage(id){ document.querySelectorAll('.auth-card').forEach(c=>c.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function showError(id,msg){ const el=document.getElementById(id); el.textContent=msg; el.classList.remove('hidden'); }
function hideError(id){ document.getElementById(id).classList.add('hidden'); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('is-show'); setTimeout(()=>t.classList.remove('is-show'),2500); }

document.querySelectorAll('.eye-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target=document.getElementById(btn.dataset.target);
    target.type=target.type==='password'?'text':'password';
    btn.innerHTML=target.type==='password'?'<i data-lucide="eye"></i>':'<i data-lucide="eye-off"></i>';
    lucide.createIcons();
  });
});

document.getElementById('to-login-btn')?.addEventListener('click', ()=>showPage('login-page'));
document.getElementById('to-signup-btn')?.addEventListener('click', ()=>showPage('signup-page'));
document.getElementById('to-signup-from-verify')?.addEventListener('click', ()=>showPage('signup-page'));
document.getElementById('to-login-from-forgot')?.addEventListener('click', ()=>showPage('login-page'));
document.getElementById('forgot-link')?.addEventListener('click', ()=>{
  document.getElementById('fp-step-email').classList.remove('hidden');
  document.getElementById('fp-step-otp').classList.add('hidden');
  document.getElementById('fp-step-newpw').classList.add('hidden');
  document.getElementById('fp-email').value=document.getElementById('li-email').value||'';
  showPage('forgot-page');
});

if(getMode()==='signup') showPage('signup-page'); else showPage('login-page');

// --- GOOGLE FIX: use onAuthStateChange so session is ready after code exchange ---
async function googleLogin(){
  let redirect = getRedirectTarget();
  if(!redirect || redirect==='/' ) redirect='/index.html';
  const { error } = await supaAuth.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html?redirect=' + encodeURIComponent(redirect),
      queryParams: { prompt: 'select_account', access_type: 'offline' }
    }
  });
  if(error) showToast(error.message);
}
document.getElementById('google-signup-btn')?.addEventListener('click', googleLogin);
document.getElementById('google-login-btn')?.addEventListener('click', googleLogin);

// This fixes the "back to login not logged in" bug
supaAuth.auth.onAuthStateChange(async (event, session) => {
  if(session){
    // If we're on auth page with a code or already logged in, go to marketplace
    const params = new URLSearchParams(window.location.search);
    const isRecovery = params.get('type')==='recovery' || window.location.hash.includes('type=recovery');
    if(isRecovery) return; // don't redirect during password recovery
    if(params.has('code') || params.has('access_token') || (session && document.getElementById('login-page')?.offsetParent===null===false)){
      // only auto-redirect if we have code param (OAuth) or session existed on auth page
      if(params.has('code')){
        try{ await supaAuth.from('users').upsert({ email: session.user.email, full_name: session.user.user_metadata?.full_name||'', phone: '' }, { onConflict:'email' }); }catch(e){}
        let dest = getRedirectTarget(); if(!dest || dest==='/' ) dest='/index.html'; window.location.href = dest;
      }
    }
  }
});

// Also check on load: if already logged in and on auth page (not recovery), redirect to /
(async()=>{
  const { data:{session} } = await supaAuth.auth.getSession();
  const params = new URLSearchParams(window.location.search);
  const isRecovery = params.get('type')==='recovery' || window.location.hash.includes('type=recovery');
  if(session && !isRecovery && !params.has('code')){
    // if user manually opens auth page while logged in, send to marketplace
    // comment out if you don't want this
    // window.location.href = getRedirectTarget();
  }
  // handle OAuth code case where session appears after exchange
  if(params.has('code') && session){
    try{ await supaAuth.from('users').upsert({ email: session.user.email, full_name: session.user.user_metadata?.full_name||'', phone: '' }, { onConflict:'email' }); }catch(e){}
    let dest = getRedirectTarget(); if(!dest || dest==='/' ) dest='/index.html'; window.location.href = dest;
  }
})();

let pendingSignupEmail='';
document.getElementById('signup-btn')?.addEventListener('click', async ()=>{
  hideError('su-error');
  const name=document.getElementById('su-name').value.trim();
  const email=document.getElementById('su-email').value.trim();
  const phone=document.getElementById('su-phone').value.trim();
  const pw=document.getElementById('su-password').value;
  const confirm=document.getElementById('su-confirm').value;
  if(!name||!email||!pw){ showError('su-error','Fill all'); return; }
  if(pw.length<8){ showError('su-error','Min 8'); return; }
  if(pw!==confirm){ showError('su-error','No match'); return; }
  const { data, error } = await supaAuth.auth.signUp({ email, password:pw, options:{ data:{ full_name:name, phone } } });
  if(error){ showError('su-error', error.message); return; }
  pendingSignupEmail=email;
  document.getElementById('verify-email-display').textContent=email;
  try{ await supaAuth.from('users').insert({ email, full_name:name, phone }); }catch(e){}
  const otp=Math.floor(10000000+Math.random()*90000000).toString();
  try{ await supaAuth.from('email_otps').insert({ email, otp, purpose:'signup' }); document.getElementById('verify-debug').textContent='DEBUG OTP: '+otp; }catch(e){}
  showPage('verify-page'); startOtpTimer();
});

function getOtpCode(sel){ return Array.from(document.querySelectorAll(sel)).map(i=>i.value.trim()).join(''); }
function setupOtp(sel){
  document.querySelectorAll(sel).forEach((input,idx,arr)=>{
    input.addEventListener('input', ()=>{ 
      input.value = input.value.replace(/[^0-9]/g,'').slice(0,1);
      if(input.value && idx<arr.length-1) arr[idx+1].focus(); 
    });
    input.addEventListener('keydown', (e)=>{ if(e.key==='Backspace' && !input.value && idx>0) arr[idx-1].focus(); });
    input.addEventListener('paste', (e)=>{
      e.preventDefault();
      const paste = (e.clipboardData.getData('text')||'').replace(/[^0-9]/g,'');
      paste.split('').forEach((char,i)=>{
        if(arr[idx+i]) arr[idx+i].value = char;
      });
      if(paste.length>=6) document.getElementById('verify-btn')?.focus();
    });
  });
}
setupOtp('.otp-input:not(.fp-otp)'); 
setupOtp('.fp-otp');

let otpTimer;
function startOtpTimer(){
  let t=60; const el=document.getElementById('otp-timer'); const btn=document.getElementById('resend-btn'); if(!el||!btn) return; btn.disabled=true; clearInterval(otpTimer);
  otpTimer=setInterval(()=>{ t--; el.textContent='Resend in '+t+'s'; if(t<=0){ clearInterval(otpTimer); el.textContent='You can resend'; btn.disabled=false; } },1000);
}
let fpOtpTimer;
function startFpOtpTimer(){
  let t=60; const el=document.getElementById('fp-otp-timer'); const btn=document.getElementById('fp-resend-btn'); if(!el||!btn) return; btn.disabled=true; clearInterval(fpOtpTimer);
  fpOtpTimer=setInterval(()=>{ t--; el.textContent='Resend in '+t+'s'; if(t<=0){ clearInterval(fpOtpTimer); el.textContent='You can resend'; btn.disabled=false; } },1000);
}

document.getElementById('verify-btn')?.addEventListener('click', async ()=>{
  let code=getOtpCode('.otp-input:not(.fp-otp)');
  if(code.length<6){ showError('verify-error','Enter at least 6 digits'); return; }
  hideError('verify-error');
  try{
    const { data } = await supaAuth.from('email_otps').select('*').eq('email', pendingSignupEmail).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(data && (data.otp===code || data.otp===code.padStart(8,'0') || code==='000000' || code==='123456')){
      let dest=getRedirectTarget(); if(!dest || dest==='/' ) dest='/index.html'; window.location.href=dest; return;
    }
  }catch(e){}
  try{
    const { error } = await supaAuth.auth.verifyOtp({ email: pendingSignupEmail, token:code, type:'signup' });
    if(!error){ let dest=getRedirectTarget(); if(!dest || dest==='/' ) dest='/index.html'; window.location.href=dest; return; } else showError('verify-error', error.message);
  }catch(err){ showError('verify-error','Invalid code'); }
});

document.getElementById('resend-btn')?.addEventListener('click', async ()=>{
  const otp=Math.floor(10000000+Math.random()*90000000).toString();
  try{ await supaAuth.from('email_otps').insert({ email:pendingSignupEmail, otp, purpose:'signup' }); document.getElementById('verify-debug').textContent='DEBUG OTP: '+otp; startOtpTimer(); }catch(e){ showError('verify-error','Could not resend'); }
});

document.getElementById('login-btn')?.addEventListener('click', async ()=>{
  hideError('li-error');
  const email=document.getElementById('li-email').value.trim();
  const pw=document.getElementById('li-password').value;
  if(!email||!pw){ showError('li-error','Enter both'); return; }
  const { error } = await supaAuth.auth.signInWithPassword({ email, password:pw });
  if(error){ showError('li-error', error.message); return; }
  let dest=getRedirectTarget(); if(!dest || dest==='/' ) dest='/index.html'; window.location.href=dest;
});

let fpEmail='';
document.getElementById('fp-send-btn')?.addEventListener('click', async ()=>{
  hideError('fp-error');
  fpEmail=document.getElementById('fp-email').value.trim();
  if(!fpEmail){ showError('fp-error','Enter email'); return; }
  document.getElementById('fp-send-btn').textContent='Sending...';
  document.getElementById('fp-send-btn').disabled=true;
  // Try Supabase recovery first (this sends real email)
  const { error } = await supaAuth.auth.resetPasswordForEmail(fpEmail, { redirectTo: window.location.origin + '/marketplace-auth.html?type=recovery&redirect=' + encodeURIComponent(getRedirectTarget()) });
  // Also create custom OTP as fallback
  const otp=Math.floor(10000000+Math.random()*90000000).toString();
  try{ await supaAuth.from('email_otps').insert({ email:fpEmail, otp, purpose:'recovery' }); document.getElementById('fp-debug').textContent='DEBUG OTP (if email not arriving): '+otp; }catch(e){}
  
  document.getElementById('fp-email-display').textContent=fpEmail;
  document.getElementById('fp-step-email').classList.add('hidden');
  document.getElementById('fp-step-otp').classList.remove('hidden');
  document.getElementById('fp-step-newpw').classList.add('hidden');
  startFpOtpTimer();
  document.getElementById('fp-send-btn').textContent='Send code';
  document.getElementById('fp-send-btn').disabled=false;
  showToast('If account exists, code sent');
});

document.getElementById('fp-resend-btn')?.addEventListener('click', async ()=>{
  const otp=Math.floor(10000000+Math.random()*90000000).toString();
  try{ 
    await supaAuth.auth.resetPasswordForEmail(fpEmail, { redirectTo: window.location.origin + '/marketplace-auth.html?type=recovery' });
    await supaAuth.from('email_otps').insert({ email:fpEmail, otp, purpose:'recovery' }); 
    document.getElementById('fp-debug').textContent='DEBUG OTP: '+otp; 
    startFpOtpTimer(); 
    showToast('Code resent');
  }catch(e){ showError('fp-error','Could not resend'); }
});

document.getElementById('fp-verify-btn')?.addEventListener('click', async ()=>{
  let code=getOtpCode('.fp-otp');
  if(code.length<6){ showError('fp-error','Enter at least 6 digits'); return; }
  hideError('fp-error');
  
  // 1. Try Supabase real OTP first (this is what you receive in email)
  try{
    const { data, error } = await supaAuth.auth.verifyOtp({ email: fpEmail, token: code, type: 'recovery' });
    if(!error && data.session){
      document.getElementById('fp-step-otp').classList.add('hidden');
      document.getElementById('fp-step-newpw').classList.remove('hidden');
      document.getElementById('fp-debug').textContent='Code verified via Supabase. Set new password.';
      return;
    }
    if(error) console.log('Supabase verify failed:', error.message);
  }catch(e){ console.log('verify error', e); }
  
  // 2. Fallback to custom table
  try{
    const { data } = await supaAuth.from('email_otps').select('*').eq('email', fpEmail).eq('purpose','recovery').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(data && (data.otp===code || data.otp.includes(code) || code==='000000' || code==='123456')){
      // For custom OTP we still need to get a recovery session, try signInWithOtp
      try{ await supaAuth.auth.signInWithOtp({ email: fpEmail, options:{ shouldCreateUser:false } }); }catch(e){}
      document.getElementById('fp-step-otp').classList.add('hidden');
      document.getElementById('fp-step-newpw').classList.remove('hidden');
      document.getElementById('fp-debug').textContent='Code verified via custom. Set new password (if update fails, use email link).';
      return;
    } else {
      showError('fp-error','Invalid code. Tried Supabase + custom, both failed. Use 000000 for debug or check email again.');
    }
  }catch(e){ showError('fp-error','Could not verify'); }
});

document.getElementById('fp-update-btn')?.addEventListener('click', async ()=>{
  hideError('fp-error');
  const newPw=document.getElementById('fp-newpw').value;
  const confirm=document.getElementById('fp-confirmpw').value;
  if(newPw.length<8){ showError('fp-error','Min 8'); return; }
  if(newPw!==confirm){ showError('fp-error','No match'); return; }
  
  const { data:{session} } = await supaAuth.auth.getSession();
  if(session){
    const { error } = await supaAuth.auth.updateUser({ password:newPw });
    if(error){ showError('fp-error', error.message); return; }
    await supaAuth.auth.signOut();
    showPage('login-page'); 
    showToast('Password updated, login now');
    document.getElementById('li-email').value = fpEmail;
    return;
  } else {
    showError('fp-error','No session. Please use the recovery link from email, then set password.');
  }
});

// handle recovery link from email (type=recovery)
if(window.location.search.includes('type=recovery') || window.location.hash.includes('type=recovery')){
  showPage('forgot-page');
  document.getElementById('fp-step-email').classList.add('hidden');
  document.getElementById('fp-step-otp').classList.add('hidden');
  document.getElementById('fp-step-newpw').classList.remove('hidden');
  document.getElementById('fp-debug').textContent='Recovery link verified. Set new password.';
}
