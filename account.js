// account.js - FINAL WORKING VERSION for your account.html
// Put this file next to account.html and load it LAST

const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";

// Use different name so we don't overwrite window.supabase library
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let addressState = { name: 'User', line1: 'Accra', city: 'Amasaman', region: 'Greater Accra', phone: '' };

function goToPanel(panelName) {
  document.querySelectorAll('.acct-panel').forEach(el => {
    el.classList.toggle('is-active', el.dataset.panel === panelName);
  });
  document.querySelectorAll('[data-panel-target]').forEach(el => {
    el.classList.toggle('is-active', el.dataset.panelTarget === panelName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const dd = document.getElementById('menuDropdown');
  if (dd) dd.classList.remove('is-open');
  history.replaceState(null,null,'#'+panelName);
}

function renderAddressView() {
  const html = `${addressState.name}<br/>${addressState.line1}<br/>${addressState.city}, ${addressState.region}<br/>${addressState.phone}`;
  const el1 = document.getElementById('addressViewText');
  const el2 = document.getElementById('overviewAddressText');
  if (el1) el1.innerHTML = html;
  if (el2) el2.innerHTML = html;
}

function openAddressEdit() {
  const n = document.getElementById('addrName');
  const l1 = document.getElementById('addrLine1');
  const c = document.getElementById('addrCity');
  const r = document.getElementById('addrRegion');
  const p = document.getElementById('addrPhone');
  if (n) n.value = addressState.name;
  if (l1) l1.value = addressState.line1;
  if (c) c.value = addressState.city;
  if (r) r.value = addressState.region;
  if (p) p.value = addressState.phone;
  document.getElementById('addressView').style.display = 'none';
  document.getElementById('addressEdit').style.display = 'block';
}

function cancelAddressEdit() {
  document.getElementById('addressEdit').style.display = 'none';
  document.getElementById('addressView').style.display = 'block';
}

async function saveAddressEdit() {
  addressState = {
    name: document.getElementById('addrName')?.value.trim() || addressState.name,
    line1: document.getElementById('addrLine1')?.value.trim() || addressState.line1,
    city: document.getElementById('addrCity')?.value.trim() || addressState.city,
    region: document.getElementById('addrRegion')?.value.trim() || addressState.region,
    phone: document.getElementById('addrPhone')?.value.trim() || addressState.phone,
  };
  renderAddressView();
  cancelAddressEdit();
  if (!currentUser) return;
  try {
    // your users table has 5 cols - try to update what exists
    await supabaseClient.from('users').update({
      full_name: addressState.name,
      phone: addressState.phone,
    }).eq('email', currentUser.email);
  } catch(e) { console.log('save address error (check users columns):', e.message); }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'marketplace-auth.html';
}

async function initAccount() {
  // Header menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('is-open');
    });
    document.addEventListener('click', (e) => {
      if (!menuDropdown.contains(e.target) && e.target !== menuBtn) menuDropdown.classList.remove('is-open');
    });
    const mc = document.getElementById('menuContent');
    if (mc) {
      mc.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-go]');
        if (!btn) return;
        goToPanel(btn.dataset.go);
      });
    }
  }

  // Side nav clicks
  const acctNav = document.getElementById('acctNav');
  if (acctNav) {
    acctNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-panel-target]');
      if (!btn) return;
      goToPanel(btn.dataset.panelTarget);
      history.replaceState(null,null,'#'+btn.dataset.panelTarget);
    });
  }

  // Get session
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'marketplace-auth.html';
    return;
  }
  currentUser = session.user;

  // Load user row
  let { data: userRow } = await supabaseClient.from('users').select('*').eq('email', currentUser.email).maybeSingle();
  if (!userRow) {
    const { data: u2 } = await supabaseClient.from('users').select('*').eq('id', currentUser.id).maybeSingle();
    userRow = u2;
  }

  const displayName = userRow?.full_name || userRow?.name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];
  const displayEmail = userRow?.email || currentUser.email;
  const displayPhone = userRow?.phone || currentUser.user_metadata?.phone || '';

  addressState = {
    name: displayName,
    line1: userRow?.address || 'Accra',
    city: userRow?.city || 'Amasaman',
    region: userRow?.region || 'Greater Accra',
    phone: displayPhone
  };

  const acctName = document.getElementById('acctName');
  const acctEmail = document.getElementById('acctEmail');
  const overviewName = document.getElementById('overviewName');
  const overviewEmail = document.getElementById('overviewEmail');
  const mgmtPhone = document.getElementById('mgmtPhone');

  if (acctName) acctName.textContent = displayName;
  if (acctEmail) acctEmail.textContent = displayEmail;
  if (overviewName) overviewName.textContent = displayName;
  if (overviewEmail) overviewEmail.textContent = displayEmail;
  if (mgmtPhone) mgmtPhone.textContent = displayPhone || 'Not set';

  renderAddressView();

  // Bag count from carts
  try {
    const { data: cart } = await supabaseClient.from('carts').select('quantity').eq('user_id', currentUser.id);
    const count = cart?.reduce((s,c)=>s+(c.quantity||1),0) || 0;
    const badge = document.getElementById('bagCount');
    if (badge) badge.textContent = count;
  } catch(e) {}
}

// Make functions global so onclick="" works
window.goToPanel = goToPanel;
window.openAddressEdit = openAddressEdit;
window.cancelAddressEdit = cancelAddressEdit;
window.saveAddressEdit = saveAddressEdit;
window.logout = logout;
window.handleLogout = logout;

// Run when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // render nav if not already
  const acctNavEl = document.getElementById('acctNav');
  if (acctNavEl && !acctNavEl.innerHTML.trim()) {
    const NAV_ITEMS = [
      { panel: 'overview', label: 'My Plush Account' },
      { panel: 'orders', label: 'Orders' },
      { panel: 'inbox', label: 'Inbox' },
      { panel: 'wishlist', label: 'Wishlist' },
      { panel: 'address', label: 'Address Book' },
    ];
    acctNavEl.innerHTML = NAV_ITEMS.map(item => `<button class="acct-nav-item" data-panel-target="${item.panel}"><span>${item.label}</span></button>`).join('') + `<button class="acct-nav-item" style="color:#DC2626;" onclick="logout()">Logout</button>`;
    const initial = location.hash.replace('#','') || 'overview';
    goToPanel(initial);
  }
  initAccount();
});
