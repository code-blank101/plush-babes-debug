// GLOBAL AUTH GUARD for plushbabesgh.netlify.app
// Put this on EVERY page after Supabase CDN

const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supaGuard = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROTECTED = ['wishlist.html','bag.html','account.html']; // pages that need login
const LOGIN_PAGE = 'marketplace-auth-final.html';

function isProtectedPage(){
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return PROTECTED.some(p => path.includes(p)) || path === '' || path === 'index.html';
}

async function initGlobalGuard(){
  const { data:{session} } = await supaGuard.auth.getSession();
  const isLogged = !!session;

  // 1. Update menu: Login vs Logout
  const menuContent = document.getElementById('menuContent');
  if(menuContent){
    if(isLogged){
      menuContent.innerHTML = `
        <a href="/" class="menu-item">Home</a>
        <button class="menu-item" data-go="overview">My Plush Account</button>
        <button class="menu-item" data-go="orders">Orders</button>
        <button class="menu-item" data-go="wishlist">Wishlist</button>
        <button class="menu-item" data-go="address">Address Book</button>
        <div class="menu-divider"></div>
        <button class="menu-item" style="color:#DC2626;" onclick="globalLogout()">Logout (${session.user.email})</button>
      `;
    } else {
      menuContent.innerHTML = `
        <a href="/" class="menu-item">Home</a>
        <button class="menu-item" onclick="window.location.href='${LOGIN_PAGE}'">Login / Sign Up</button>
        <div class="menu-divider"></div>
        <p class="px-3 py-2 text-[11px] text-black/40">Login to see Wishlist, Bag & Account</p>
      `;
    }
    // re-bind hamburger panel clicks
    menuContent.querySelectorAll('[data-go]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        goToPanel(btn.dataset.go);
        document.getElementById('menuDropdown')?.classList.remove('is-open');
        history.replaceState(null,null,'#'+btn.dataset.go);
      });
    });
  }

  // 2. Header icons - if not logged, go straight to login
  document.querySelectorAll('a[href="wishlist.html"], a[href="bag.html"], a[href^="account.html"]').forEach(a=>{
    const target = a.getAttribute('href');
    a.addEventListener('click', async (e)=>{
      e.preventDefault();
      const { data:{session: s} } = await supaGuard.auth.getSession();
      if(!s){
        window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent(target)}`;
      } else {
        window.location.href = target;
      }
    });
  });

  // 3. HARD GATE for homepage if you want early access - COMMENT OUT if you want browsing without login
  // If you want plushbabesgh.netlify.app to REQUIRE login, uncomment next 4 lines:
  /*
  const path = window.location.pathname.split('/').pop();
  if(!isLogged && (path === '' || path === 'index.html' || path === 'plushbabesgh.netlify.app')){
    window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent('/')}`;
    return;
  }
  */

  // 4. If on protected page and not logged, kick to login
  const current = window.location.pathname.split('/').pop();
  if(!isLogged && PROTECTED.some(p => current.includes(p))){
    window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent(current + window.location.hash)}`;
  }
}

async function globalLogout(){
  await supaGuard.auth.signOut();
  localStorage.removeItem('pb_redirect_after_login');
  window.location.href = LOGIN_PAGE;
}

function goToPanel(name){
  document.querySelectorAll('.acct-panel').forEach(el=>el.classList.toggle('is-active', el.dataset.panel===name));
}

document.addEventListener('DOMContentLoaded', initGlobalGuard);
window.globalLogout = globalLogout;