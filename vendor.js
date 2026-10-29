
// =============================================
// PLUSH BABES Vendor Dashboard v5.4 - CLEAN BUILD
// - No minification
// - Fixed notifications spill (CSS now hides .notif-dropdown by default)
// - Fixed 0 products (RLS)
// - Fixed viewed_at fallback
// - Fixed empty states, banner, X buttons, double-push, image fill
// - performance stats only
// - Full storefront editor
// =============================================

const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supa = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// -------------------- STATE --------------------
let products = JSON.parse(localStorage.getItem('pb_vendor_products') || '[]');
let materialsLibrary = new Set(JSON.parse(localStorage.getItem('pb_materials') || '["Cotton","Linen","Chiffon","Faux Leather"]'));
let categoryRequests = JSON.parse(localStorage.getItem('pb_cat_requests') || '[]');
let orders = []; // Real orders only - fetched from Supabase
let payouts = []; // Real payouts only
let balances = {"available":0,"pending":0,"total":0};
let shopSettings = JSON.parse(localStorage.getItem('pb_shop_settings') || '{"name":"My Plush Shop","whatsapp":"","momo":"","bio":"","region":"","city":"","address":""}');

let productImages = Array(8).fill(null);
let colors = [];
let sizes = [];
let materials = [];
let details = [""];
let colorIdCounter = 1;
let currentSearch = "";
let currentSort = "newest";

let vendorApp = null;
let vendorStatus = 'pending';
let notifications = [];
let editHistory = [];

let editingIndex = null;
let editingId = null;
let originalSnapshot = null;

let storefrontData = {
 logo_url: '',
 cover_url: '',
 display_name: '',
 tagline: '',
 bio: '',
 instagram: '',
 tiktok: '',
 website: '',
 whatsapp: '',
 show_followers: true,
 show_rating: true,
 show_sales: false,
 allow_follow: true,
 custom_badge: ''
};
let storefrontFollowersCount = 0;
window.pendingLogoFile = null;
window.pendingCoverFile = null;

// -------------------- HELPERS --------------------
function saveAll() {
 localStorage.setItem('pb_vendor_products', JSON.stringify(products));
 localStorage.setItem('pb_materials', JSON.stringify([...materialsLibrary]));
 localStorage.setItem('pb_cat_requests', JSON.stringify(categoryRequests));
 localStorage.setItem('pb_orders', JSON.stringify(orders));
 localStorage.setItem('pb_payouts', JSON.stringify(payouts));
 localStorage.setItem('pb_balances', JSON.stringify(balances));
 localStorage.setItem('pb_shop_settings', JSON.stringify(shopSettings));
}

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function refreshIcons() {
 setTimeout(() => {
  if (window.lucide) window.lucide.createIcons();
 }, 50);
}

function showToast(msg) {
 const t = $('toast');
 if (!t) return;
 const span = t.querySelector('span');
 if (span) span.textContent = msg;
 else t.textContent = msg;
 t.classList.add('show');
 setTimeout(() => t.classList.remove('show'), 3000);
}

function showPage(name) {
 $$('.page').forEach(p => p.classList.add('hidden'));
 const page = $(`page-${name}`);
 if (page) page.classList.remove('hidden');
 $$('.nav-btn').forEach(b => b.classList.remove('active'));
 const nav = $(`nav-${name}`);
 if (nav) nav.classList.add('active');
 $('sidebar')?.classList.remove('open');
 $('sidebar-overlay')?.classList.remove('show');
 refreshIcons();
 window.scrollTo(0, 0);
}

// -------------------- AUTH --------------------
async function checkVendorSession() {
 if (!supa) {
  console.warn('Supabase not loaded');
  return null;
 }
 const { data: { session } } = await supa.auth.getSession();
 if (!session) {
  window.location.href = 'vendor-auth.html';
  return null;
 }
 return session;
}

async function fetchVendorApp(userId) {
 try {
  const { data, error } = await supa
   .from('vendor_applications')
   .select('*')
   .eq('user_id', userId)
   .order('created_at', { ascending: false })
   .limit(1)
   .maybeSingle();
  if (error) {
   console.error('vendor_applications error', error.message);
   return null;
  }
  return data;
 } catch (e) {
  console.error(e);
  return null;
 }
}

function isValidUUID(str) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
}

// -------------------- BANNER --------------------
let dismissedBanners = JSON.parse(localStorage.getItem('pb_dismissed_banners') || '{}');

function dismissBanner(key) {
 dismissedBanners[key] = Date.now();
 localStorage.setItem('pb_dismissed_banners', JSON.stringify(dismissedBanners));
 renderStatusBanner();
}

function isDismissed(key) {
 const t = dismissedBanners[key];
 if (!t) return false;
 return (Date.now() - t) < 7 * 24 * 60 * 60 * 1000;
}

function renderStatusBanner() {
 const area = $('status-banner-area');
 const badge = $('store-status-badge');
 if (!area) return;
 if (!vendorApp) {
  area.innerHTML = '';
  return;
 }
 vendorStatus = vendorApp.status || 'pending';

 if (badge) {
  badge.style.display = 'inline-block';
  badge.textContent = vendorStatus.toUpperCase();
  if (vendorStatus === 'approved') {
   badge.style.background = '#ECFDF5';
   badge.style.borderColor = '#A7F3D0';
  } else if (vendorStatus === 'rejected') {
   badge.style.background = '#FEF2F2';
   badge.style.borderColor = '#FECACA';
  } else {
   badge.style.background = '#FFF7ED';
   badge.style.borderColor = '#FED7AA';
  }
 }

 const storeBtn = $('view-storefront-btn');
 if (storeBtn && vendorApp) {
  storeBtn.style.display = 'inline-flex';
  // Fix href for both /vendor/index.html and root - detect path
  const inVendorFolder = window.location.pathname.includes('/vendor/');
  const base = inVendorFolder ? 'storefront.html' : 'vendor-storefront.html';
  storeBtn.href = `${base}?id=${vendorApp.id}`;
  // Also update the editor's View Live link
  const liveLink = document.getElementById('storefront-view-live');
  if (liveLink) liveLink.href = `${base}?id=${vendorApp.id}`;
 }

 let html = '';
 if (vendorStatus === 'pending') {
  html = `
   <div style="background:#FFF7ED;border:1px solid #FED7AA;padding:14px 16px;border-radius:12px;margin-bottom:16px;font-size:12px;line-height:1.5;">
    <div style="display:flex;justify-content:space-between;gap:12px;">
     <div>
      <b>⏳ Under review</b> — ${vendorApp.store_name} is being verified (24h). You can save drafts now.<br>
      <span style="font-size:11px;color:#92400E;">If you see 0 products but have them in Supabase, run supabase-fixed-final.sql</span>
     </div>
     <button onclick="dismissBanner('pending_${vendorApp.id}')" style="background:none;border:none;font-weight:800;cursor:pointer;">✕</button>
    </div>
   </div>`;
  if (isDismissed('pending_' + vendorApp.id)) html = '';
 } else if (vendorStatus === 'approved') {
  if (!isDismissed('approved_' + vendorApp.id)) {
   html = `
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:12px;display:flex;justify-content:space-between;align-items:center;">
     <div><b>✅ Approved — You're live!</b> ${vendorApp.store_name} is verified and visible in marketplace.</div>
     <button onclick="dismissBanner('approved_${vendorApp.id}')" style="background:none;border:none;font-weight:800;cursor:pointer;">✕</button>
    </div>`;
  }
 } else if (vendorStatus === 'rejected') {
  html = `
   <div style="background:#FEF2F2;border:1px solid #FECACA;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
    <div><b>❌ Rejected</b> — ${vendorApp.rejection_reason || 'Documents unclear. Please resubmit clearer photos.'}</div>
    <button onclick="openReapply()" style="background:#111;color:#FFF;border:none;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:600;">Fix & resubmit →</button>
   </div>`;
 }

 // pending edit banner
 const hasPendingEdit = editHistory.some(e => e.status === 'pending');
 if (hasPendingEdit && vendorStatus === 'approved') {
  html += `<div style="background:#EFF6FF;border:1px solid #BFDBFE;padding:10px 14px;border-radius:10px;margin-bottom:12px;font-size:11px;">Shop info edit pending review</div>`;
 }

 area.innerHTML = html;

 const welcome = $('dashboard-welcome');
 if (welcome) welcome.textContent = `Welcome back, ${vendorApp.owner_name?.split(' ')[0] || 'Vendor'}`;
 const sub = $('dashboard-subtitle');
 if (sub) sub.textContent = `${vendorApp.store_name} — ${vendorStatus} • ${vendorApp.city || ''}`;

 const mini = $('vendor-mini-profile');
 if (mini && vendorApp) {
  mini.style.display = 'block';
  mini.innerHTML = `<b>${vendorApp.store_name}</b><br>${vendorApp.owner_name}<br><small>${vendorApp.city || ''}</small>`;
 }
}

// -------------------- NOTIFICATIONS - FIXED SPILL --------------------
async function fetchNotifications(userId) {
 try {
  console.log('fetchNotifications for', userId);
  const { data, error } = await supa
   .from('vendor_notifications')
   .select('*')
   .eq('user_id', userId)
   .order('created_at', { ascending: false })
   .limit(20);
  if (error) throw error;
  if (data && data.length) {
   notifications = data;
   localStorage.setItem('pb_vendor_notifs', JSON.stringify(notifications));
  } else {
   notifications = JSON.parse(localStorage.getItem('pb_vendor_notifs') || '[]');
  }
 } catch (e) {
  console.log('notif fetch error', e.message);
  notifications = JSON.parse(localStorage.getItem('pb_vendor_notifs') || '[]');
 }
 renderNotifications();
 console.log('notifications count', notifications.length);
}

function renderNotifications() {
 const count = notifications.filter(n => !n.read).length;
 const badge = $('notif-count');
 if (badge) {
  badge.style.display = count > 0 ? 'grid' : 'none';
  badge.textContent = count > 9 ? '9+' : count;
 }
 const list = $('notif-list');
 if (!list) return;
 if (!notifications.length) {
  list.innerHTML = `<div style="padding:32px;text-align:center;color:#999;font-size:12px;">No notifications yet</div>`;
  return;
 }
 list.innerHTML = notifications.map(n => `
  <div style="padding:12px 14px;border-bottom:1px solid #F0F0F0;">
   <div style="font-size:12px;font-weight:700;">${n.title}</div>
   <div style="font-size:11px;color:#555;margin-top:2px;line-height:1.4;">${n.message}</div>
   <div style="font-size:10px;color:#999;margin-top:6px;">${new Date(n.created_at).toLocaleString()}</div>
  </div>
 `).join('');
}

function addNotification(title, message) {
 notifications.unshift({
  id: Date.now(),
  title,
  message,
  read: false,
  created_at: new Date().toISOString()
 });
 localStorage.setItem('pb_vendor_notifs', JSON.stringify(notifications));
 renderNotifications();
 showToast(title);
}

// -------------------- EDITS --------------------
async function fetchEdits(userId) {
 try {
  const { data } = await supa
   .from('vendor_edits')
   .select('*')
   .eq('user_id', userId)
   .order('created_at', { ascending: false })
   .limit(20);
  if (data) editHistory = data;
 } catch (e) {
  editHistory = JSON.parse(localStorage.getItem('pb_vendor_edits') || '[]');
 }
 renderEditHistory();
}

function renderEditHistory() {
 const el = $('edit-history');
 if (!el) return;
 if (!editHistory.length) {
  el.innerHTML = ''; // Don't show No edits yet - cleaner
  return;
 }
 // Dedupe by day and status to avoid spam like in screenshot (4x approved)
 const seen = new Set();
 const filtered = [];
 for (const ed of editHistory) {
   const key = (ed.status||'') + '_' + new Date(ed.created_at).toDateString();
   if (!seen.has(key)) { seen.add(key); filtered.push(ed); }
 }
 // If all approved, don't show in settings - it's noise
 const allApproved = filtered.every(e => (e.status||'').toLowerCase()==='approved');
 if (allApproved) { el.innerHTML = ''; return; }
 
 el.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:8px;opacity:0.6;">Recent Activity</div>` + filtered.slice(0,3).map(ed => `
  <div style="padding:8px 0;border-bottom:1px solid #EEE;font-size:11px;display:flex;justify-content:space-between;">
   <b style="text-transform:capitalize;">${ed.status}</b>
   <span style="color:#888;">${new Date(ed.created_at).toLocaleDateString()}</span>
  </div>
 `).join('');
}

// -------------------- PRODUCTS - FIXED 0 BUG + VIEWED_AT --------------------
async function fetchMyProducts(userId) {
 console.log('fetchMyProducts for', userId);
 if (!supa) {
  console.warn('supa missing');
  renderProducts();
  updateDashboard();
  return;
 }

 try {
  const { data, error } = await supa
   .from('vendor_products')
   .select('*')
   .eq('user_id', userId)
   .order('created_at', { ascending: false });

  if (error) {
   console.error('vendor_products fetch error', error);
   if (error.message.includes('RLS') || error.code === '42501') {
    showToast('RLS blocked — run supabase-fixed-final.sql');
   }
   renderProducts();
   updateDashboard();
   return;
  }

  console.log('Supabase returned', data?.length, 'rows');

  if (!data || data.length === 0) {
   console.log('0 DB rows, keeping local', products.length);
   renderProducts();
   updateDashboard();
   return;
  }

  // Dedup by id to prevent double-push
  const byId = new Map();
  data.forEach(row => {
   if (!byId.has(row.id)) byId.set(row.id, row);
  });

  const mapped = [...byId.values()].map(db => ({
   id: db.id,
   db_id: db.id,
   title: db.title || 'Untitled',
   price: db.price || 0,
   comparePrice: db.compare_price,
   category: db.category || 'Bags & Luggage',
   description: db.description || '',
   images: db.images || [],
   colors: db.colors || [],
   sizes: db.sizes || [],
   materials: db.materials || [],
   details: db.details || [],
   totalStock: db.total_stock || 0,
   status: db.status === 'approved' ? 'Approved' : db.status === 'pending' ? 'Pending' : db.status === 'draft' ? 'Draft' : db.status === 'rejected' ? 'Rejected' : db.status,
   db_status: db.status,
   views_count: db.views_count || 0,
   wishlist_count: db.wishlist_count || 0,
   sales_count: db.sales_count || 0,
   rating_avg: parseFloat(db.rating_avg || 0),
   rating_count: db.rating_count || 0,
   created_at: db.created_at
  }));

  const localOnly = products.filter(p => p.db_id == null && typeof p.id === 'number');
  products = [...mapped, ...localOnly];
  saveAll();
  console.log(`Synced ${mapped.length} from DB + ${localOnly.length} local = ${products.length} total`);
  renderProducts();
  updateDashboard();

  // Fetch view counts from product_views (handles viewed_at missing)
  try {
   const ids = mapped.map(p => p.db_id).filter(Boolean);
   if (ids.length) {
    let views = null;
    try {
     const r = await supa.from('product_views').select('product_id').in('product_id', ids);
     if (r.data) views = r.data;
    } catch (e) {
     console.log('product_views count error', e.message);
    }
    if (views && views.length) {
     const counts = {};
     views.forEach(v => {
      counts[v.product_id] = (counts[v.product_id] || 0) + 1;
     });
     Object.keys(counts).forEach(pid => {
      const prod = products.find(p => p.db_id === pid);
      if (prod) prod.views_count = Math.max(prod.views_count || 0, counts[pid]);
     });
     saveAll();
     renderProducts();
     updateDashboard();
    }
   }
  } catch (e) {
   console.log('stats error', e.message);
  }

 } catch (e) {
  console.error('fetchMyProducts exception', e);
  renderProducts();
  updateDashboard();
 }
}


// -------------------- ORDERS - REAL ONLY --------------------
async function fetchRealOrders(userId) {
  try {
    if (!supa) { orders = []; renderOrders(); updateDashboard(); return; }
    // Try vendor_orders table, fallback to orders table
    let data = null;
    try {
      const r = await supa.from('vendor_orders').select('*').eq('vendor_user_id', userId).order('created_at', {ascending:false}).limit(50);
      if (r.data && r.data.length) data = r.data;
    } catch(e) {}
    if (!data) {
      try {
        const r2 = await supa.from('orders').select('*').eq('vendor_id', userId).order('created_at', {ascending:false}).limit(50);
        if (r2.data && r2.data.length) data = r2.data;
      } catch(e) {}
    }
    orders = data || [];
    renderOrders();
    updateDashboard();
    console.log('Real orders:', orders.length);
  } catch(e) {
    console.log('fetch orders error', e.message);
    orders = [];
    renderOrders();
    updateDashboard();
  }
}

function renderOrders() {
  const empty = document.getElementById('orders-empty');
  const tableWrap = document.getElementById('orders-table');
  const tbody = document.getElementById('orders-tbody');
  if (!empty || !tableWrap) return;
  
  if (!orders.length) {
    empty.classList.remove('hidden');
    tableWrap.classList.add('hidden');
    empty.innerHTML = `<div class="empty-icon"><i data-lucide="inbox"></i></div><div class="empty-title">No orders yet</div><div class="empty-text" style="font-size:11px;color:#888;margin-top:6px;">When customers buy your products, orders will appear here</div>`;
  } else {
    empty.classList.add('hidden');
    tableWrap.classList.remove('hidden');
    if (tbody) {
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td style="font-size:11px;font-weight:600;">${(o.id||'').toString().slice(0,8)}</td>
          <td style="font-size:11px;">${o.product_title||o.title||'-'}</td>
          <td style="font-size:11px;">${o.customer_name||o.customer||'-'}</td>
          <td style="font-size:11px;">${o.quantity||1} pcs</td>
          <td style="font-size:11px;">${o.groupay?'Groupay':''}</td>
          <td><span style="font-size:10px;background:#F5F5F5;padding:3px 8px;border-radius:20px;">${o.status||'Pending'}</span></td>
        </tr>
      `).join('');
    }
  }
  refreshIcons();
}

// -------------------- SHOP SETTINGS - REAL DATA --------------------
function populateShopSettings() {
  if (!vendorApp) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('setting-shop-name', vendorApp.store_name || shopSettings.name || '');
  setVal('setting-whatsapp', vendorApp.phone || shopSettings.whatsapp || '');
  setVal('setting-momo', vendorApp.momo_number || shopSettings.momo || '');
  setVal('setting-region', vendorApp.region || shopSettings.region || '');
  setVal('setting-city', vendorApp.city || shopSettings.city || '');
  setVal('setting-address', vendorApp.address || shopSettings.address || '');
  setVal('setting-bio', vendorApp.store_description || shopSettings.bio || '');
  
  // Ghana card info
  const ghanaInfo = document.getElementById('ghana-card-info');
  if (ghanaInfo && vendorApp.ghana_card_number) {
    ghanaInfo.innerHTML = `<div style="background:#ECFDF5;border:1px solid #A7F3D0;padding:10px;border-radius:8px;font-size:11px;"><b>✓ Verified</b> — Ghana Card ${vendorApp.ghana_card_number.slice(0,6)}***<br>Owner: ${vendorApp.owner_name||''}</div>`;
  }
  
  // Materials library - hide if not needed or show clean
  const matLib = document.getElementById('materials-library');
  if (matLib) {
    if (materialsLibrary.size > 0) {
      matLib.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:6px;">Your Materials Library</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${[...materialsLibrary].map(m=>`<span style="font-size:10px;background:#F5F5F5;border:1px solid #EEE;padding:3px 8px;border-radius:20px;">${m}</span>`).join('')}</div>`;
    } else {
      matLib.innerHTML = '';
    }
  }
  
  // Edit history - clean it, don't show spam
  const editHist = document.getElementById('edit-history');
  if (editHist) {
    if (!editHistory.length) {
      editHist.innerHTML = '';
    } else {
      // Dedupe
      const uniq = [...new Map(editHistory.map(e=>[e.id||e.created_at, e])).values()].slice(0,5);
      editHist.innerHTML = `<div style="font-size:11px;font-weight:700;margin-bottom:6px;">Recent Edits</div>` + uniq.map(ed => `
        <div style="padding:8px 0;border-bottom:1px solid #EEE;font-size:11px;display:flex;justify-content:space-between;">
          <b style="text-transform:capitalize;">${ed.status}</b>
          <span style="color:#888;">${new Date(ed.created_at).toLocaleDateString()}</span>
        </div>
      `).join('');
    }
  }
  
  const catReq = document.getElementById('category-requests-list');
  if (catReq) catReq.innerHTML = categoryRequests.length ? `<div style="font-size:11px;">${categoryRequests.length} category requests</div>` : '';
}


// -------------------- DASHBOARD --------------------
function updateDashboard() {
 if ($('stat-products')) $('stat-products').textContent = products.length;
 if ($('stat-orders')) $('stat-orders').textContent = orders.length;
 if ($('stat-sales')) $('stat-sales').textContent = `GHS ${balances.total.toFixed(2)}`;
 if ($('products-count-badge')) $('products-count-badge').textContent = products.length;
 if ($('stat-pending-orders')) $('stat-pending-orders').textContent = orders.length;

 let totalViews = 0;
 let totalWishes = 0;
 let low = 0;
 products.forEach(p => {
  totalViews += p.views_count || 0;
  totalWishes += p.wishlist_count || 0;
  if ((p.totalStock || 0) < 5) low++;
 });
 if ($('stat-total-views')) $('stat-total-views').textContent = totalViews;
 if ($('stat-total-wishlist')) $('stat-total-wishlist').textContent = totalWishes;
 if ($('stat-low-stock')) $('stat-low-stock').textContent = low;
}

function getFilteredProducts() {
 let filtered = [...products];
 if (currentSearch) {
  const q = currentSearch.toLowerCase();
  filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
 }
 switch (currentSort) {
  case 'oldest':
   filtered.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
   break;
  case 'price-low':
   filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
   break;
  case 'price-high':
   filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
   break;
  case 'stock-low':
   filtered.sort((a, b) => (a.totalStock || 0) - (b.totalStock || 0));
   break;
  default:
   filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
   break;
 }
 return filtered;
}

function renderProducts() {
 const grid = $('products-grid');
 const empty = $('products-empty');
 const toolbar = $('products-toolbar');
 if (!grid || !empty) {
  console.warn('products-grid or empty not found');
  return;
 }

 const filtered = getFilteredProducts();
 const countEl = $('products-count');
 if (countEl) countEl.textContent = `${filtered.length} of ${products.length} products`;

 console.log('renderProducts total', products.length, 'filtered', filtered.length);

 if (products.length === 0) {
  grid.classList.add('hidden');
  empty.classList.remove('hidden');
  if (toolbar) toolbar.classList.add('hidden');
 } else {
  empty.classList.add('hidden');
  if (toolbar) toolbar.classList.remove('hidden');
  grid.classList.remove('hidden');

  if (filtered.length === 0) {
   grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;font-size:12px;color:#999;">No products match "${currentSearch}"</div>`;
  } else {
   grid.innerHTML = filtered.map(p => {
    const pid = (p.db_id || p.id).toString();
    const origIdx = products.findIndex(prod => {
     if (prod.db_id && p.db_id) return prod.db_id === p.db_id;
     return prod.id === p.id;
    });
    const isLive = p.db_status === 'approved';
    const isDraft = p.db_status === 'draft';

    return `
     <div class="product-card" style="${isLive ? 'border-color:#A7F3D0;' : isDraft ? 'border-style:dashed;' : ''}">
      <div class="product-card-img">
       <img src="${(p.images && p.images[0]) || 'https://via.placeholder.com/400x400/F5F5F5/999?text=No+Image'}" alt="${p.title}" loading="lazy" />
       <span style="position:absolute;top:8px;left:8px;background:#FFF;padding:3px 8px;border-radius:20px;font-size:9px;font-weight:700;border:1px solid #EEE;z-index:2;">${p.status}</span>
       ${isLive ? `<span style="position:absolute;top:8px;right:8px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-size:8px;font-weight:800;padding:3px 7px;border-radius:20px;z-index:2;">LIVE</span>` : ''}
       <div style="position:absolute;bottom:8px;right:8px;display:flex;gap:6px;z-index:2;">
        <button onclick="editProductById('${pid}')" title="Edit" style="width:30px;height:30px;border-radius:50%;background:#111;color:#FFF;border:none;display:grid;place-items:center;font-size:12px;">✎</button>
        <button onclick="deleteProduct(${origIdx})" title="Delete" style="width:30px;height:30px;border-radius:50%;background:#FEE2E2;color:#DC2626;border:none;display:grid;place-items:center;font-size:12px;">✕</button>
       </div>
      </div>
      <div class="product-card-body">
       <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
       <div style="font-size:13px;font-weight:900;margin-top:2px;">GHS ${p.price}</div>
       <div style="display:flex;gap:8px;margin-top:6px;font-size:10px;color:#888;">
        <span>👁 ${p.views_count || 0}</span>
        <span>♡ ${p.wishlist_count || 0}</span>
        <span>★ ${(p.rating_avg || 0).toFixed(1)}</span>
       </div>
       <button onclick="viewProductStats('${p.db_id || p.id}')" style="margin-top:10px;width:100%;padding:8px;background:#111;color:#FFF;border-radius:8px;border:none;font-size:11px;font-weight:600;cursor:pointer;">View Performance →</button>
      </div>
     </div>
    `;
   }).join('');
  }
 }
 updateDashboard();
 refreshIcons();
}

// -------------------- EDIT / DELETE --------------------
function editProduct(idx) {
 const p = products[idx];
 if (!p) return;
 editingIndex = idx;
 editingId = p.db_id || p.id;
 openProductModal();

 if ($('product-title')) $('product-title').value = p.title || '';
 if ($('product-price')) $('product-price').value = p.price || '';
 if ($('product-compare-price')) $('product-compare-price').value = p.comparePrice || '';
 if ($('product-desc')) $('product-desc').value = p.description || '';
 if ($('product-category')) $('product-category').value = p.category || 'Bags & Luggage';

 productImages = [...(p.images || []), ...Array(8 - (p.images || []).length).fill(null)].slice(0, 8);
 colors = [...(p.colors || [])];
 sizes = [...(p.sizes || [])];
 materials = [...(p.materials || [])];
 details = [...(p.details || [''])];
 const stockInput = $('stock-single-input');
 if (stockInput) stockInput.value = p.totalStock || 0;

 renderImageSlots();
 renderColors();
 renderSizes();
 renderMaterials();
 renderDetails();
 updatePreview();

 setTimeout(() => {
  originalSnapshot = getFormSnapshot();
  checkDirty();
 }, 200);
}

function editProductById(id) {
 const idx = products.findIndex(p => (p.db_id && p.db_id.toString() === id.toString()) || p.id.toString() === id.toString());
 if (idx === -1) {
  console.warn('editProductById not found', id);
  return;
 }
 editProduct(idx);
}

function deleteProduct(idx) {
 const p = products[idx];
 if (!p) return;
 if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
 if (p.db_id && supa) {
  supa.from('vendor_products').delete().eq('id', p.db_id).then(({ error }) => {
   if (error) console.log('delete error', error.message);
  });
 }
 products.splice(idx, 1);
 saveAll();
 renderProducts();
 showToast('Deleted');
}

// -------------------- FORM RENDERERS --------------------
function renderImageSlots() {
 const container = $('image-slots');
 if (!container) return;
 container.innerHTML = productImages.map((img, i) => `
  <div class="image-slot ${img ? 'has-image' : ''}" onclick="document.getElementById('img-input-${i}').click()">
   ${img ? `<img src="${img}" alt="image ${i}" />` : `<div style="font-size:10px;color:#999;text-align:center;">${i === 0 ? 'Primary<br>+ Upload' : 'Add<br>+'} </div>`}
   <input id="img-input-${i}" type="file" accept="image/*" style="display:none;" onchange="handleImageUpload(${i}, this)" />
  </div>
 `).join('');
}

function handleImageUpload(idx, input) {
 const file = input.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (e) => {
  productImages[idx] = e.target.result;
  renderImageSlots();
  updatePreview();
  checkDirty();
 };
 reader.readAsDataURL(file);
}

function addColor() {
 colors.push({ id: colorIdCounter++, name: '', hex: '#000000' });
 renderColors();
 checkDirty();
}

function renderColors() {
 const c = $('colors-list');
 if (!c) return;
 if (!colors.length) {
  c.innerHTML = `<div style="font-size:11px;color:#999;padding:6px;">No colors — Add if variant</div>`;
  return;
 }
 c.innerHTML = colors.map((col, idx) => `
  <div style="display:flex;gap:6px;align-items:center;background:#FFF;border:1px solid #EEE;padding:6px;border-radius:8px;">
   <input type="color" value="${col.hex}" onchange="updateColor(${idx},'hex',this.value)" style="width:28px;height:28px;border:none;cursor:pointer;" />
   <input type="text" placeholder="Color name (e.g. Black)" value="${col.name}" oninput="updateColor(${idx},'name',this.value)" style="flex:1;padding:6px;border:1px solid #EEE;border-radius:6px;font-size:11px;" />
   <button onclick="removeColor(${idx})" style="width:24px;height:24px;border-radius:50%;background:#F3F4F6;border:none;cursor:pointer;">✕</button>
  </div>
 `).join('');
}

function updateColor(idx, key, val) {
 colors[idx][key] = val;
 checkDirty();
 updatePreview();
}

function removeColor(idx) {
 colors.splice(idx, 1);
 renderColors();
 checkDirty();
}

function toggleNoSizes() {
 const checked = $('no-sizes-check')?.checked;
 const wrap = $('sizes-wrap');
 if (wrap) wrap.classList.toggle('hidden', !!checked);
 checkDirty();
}

function addSize() {
 const input = $('size-input');
 const val = input?.value.trim();
 if (!val) return;
 sizes.push(val);
 input.value = '';
 renderSizes();
 checkDirty();
}

function renderSizes() {
 const container = $('sizes-pills');
 if (!container) return;
 container.innerHTML = sizes.map((s, i) => `
  <span style="background:#111;color:#FFF;padding:4px 10px;border-radius:20px;font-size:11px;display:inline-flex;align-items:center;gap:6px;margin:2px;">
   ${s} <button onclick="removeSize(${i})" style="background:none;border:none;color:#FFF;cursor:pointer;">✕</button>
  </span>
 `).join('');
}

function removeSize(i) {
 sizes.splice(i, 1);
 renderSizes();
 checkDirty();
}

function addMaterialFromInput(e) {
 if (e.key === 'Enter') {
  e.preventDefault();
  const val = e.target.value.trim();
  if (!val) return;
  materials.push(val);
  materialsLibrary.add(val);
  e.target.value = '';
  renderMaterials();
  checkDirty();
  saveAll();
 }
}

function renderMaterials() {
 const container = $('materials-pills');
 if (!container) return;
 container.innerHTML = materials.map((m, i) => `
  <span style="background:#FFF;border:1px solid #EEE;padding:4px 10px;border-radius:20px;font-size:11px;margin:2px;display:inline-flex;align-items:center;gap:4px;">
   ${m} <button onclick="removeMaterial(${i})" style="background:none;border:none;cursor:pointer;">✕</button>
  </span>
 `).join('');
}

function removeMaterial(i) {
 materials.splice(i, 1);
 renderMaterials();
 checkDirty();
}

function addDetail() {
 details.push('');
 renderDetails();
}

function renderDetails() {
 const container = $('details-list');
 if (!container) return;
 container.innerHTML = details.map((d, i) => `
  <div style="display:flex;gap:6px;align-items:center;">
   <input type="text" placeholder="Bullet point (e.g. 100% cotton)" value="${d}" oninput="updateDetail(${i}, this.value)" style="flex:1;padding:8px;border:1px solid #EEE;border-radius:8px;font-size:11px;" />
   <button onclick="removeDetail(${i})" style="width:28px;height:28px;border-radius:50%;background:#F3F4F6;border:none;cursor:pointer;">✕</button>
  </div>
 `).join('');
}

function updateDetail(i, val) {
 details[i] = val;
 checkDirty();
}

function removeDetail(i) {
 details.splice(i, 1);
 renderDetails();
 checkDirty();
}

function handleCategoryChange() {
 const sel = $('product-category')?.value;
 const otherWrap = $('category-other-wrap');
 if (otherWrap) otherWrap.classList.toggle('hidden', sel !== 'Other');
}

function updatePreview() {
 const title = $('product-title')?.value || 'Your Product Title';
 const price = $('product-price')?.value || '0.00';
 const img = productImages.find(Boolean);

 const cardTitle = $('preview-card-title');
 if (cardTitle) cardTitle.textContent = title;
 const cardPrice = $('preview-card-price');
 if (cardPrice) cardPrice.textContent = `GHS ${price}`;
 const cardImg = $('preview-card-img');
 if (cardImg && img) cardImg.src = img;

 const pageTitle = $('preview-page-title');
 if (pageTitle) pageTitle.textContent = title;
 const pagePrice = $('preview-page-price');
 if (pagePrice) pagePrice.textContent = `GHS ${price}`;
}

function setPreviewMode(mode) {
 $('preview-card-view')?.classList.toggle('hidden', mode !== 'card');
 $('preview-page-view')?.classList.toggle('hidden', mode !== 'page');
}

// -------------------- DIRTY CHECK --------------------
function getFormSnapshot() {
 return JSON.stringify({
  title: ($('product-title')?.value || '').trim(),
  price: ($('product-price')?.value || '').trim(),
  category: ($('product-category')?.value || '').trim(),
  images: productImages.filter(Boolean).join('|'),
  colors: JSON.stringify(colors),
  sizes: JSON.stringify(sizes)
 });
}

function checkDirty() {
 const btn = $('submit-product-btn');
 if (!btn) return;
 if (editingId === null && editingIndex === null) {
  const hasTitle = ($('product-title')?.value || '').trim().length > 0;
  const hasImg = productImages.some(Boolean);
  btn.disabled = !(hasTitle && hasImg);
  btn.classList.toggle('btn-disabled', btn.disabled);
  return;
 }
 if (originalSnapshot === null) return;
 const cur = getFormSnapshot();
 const dirty = cur !== originalSnapshot;
 btn.disabled = !dirty;
 btn.classList.toggle('btn-disabled', !dirty);
}

function buildInventory() {
 const total = parseInt($('stock-single-input')?.value) || 0;
 return { inventory: [], totalStock: total };
}

// -------------------- SUBMIT --------------------
async function submitProduct(isDraft = false) {
 const title = ($('product-title')?.value || '').trim();
 if (!title) { showToast('Add product title'); return; }
 if (!productImages.some(Boolean)) { showToast('Add at least one image'); return; }
 if (vendorStatus !== 'approved' && !isDraft) {
  isDraft = true;
  showToast('Pending review: saved as draft');
 }

 const { totalStock } = buildInventory();

 let existing = null;
 let existingIndex = -1;
 if (editingId !== null) {
  existingIndex = products.findIndex(p => p.db_id && p.db_id.toString() === editingId.toString());
  if (existingIndex !== -1) existing = products[existingIndex];
 }
 const isEditing = !!existing;

 const newProduct = {
  id: existing?.db_id || Date.now(),
  db_id: existing?.db_id || null,
  title,
  price: $('product-price')?.value || '0',
  comparePrice: $('product-compare-price')?.value || '',
  category: $('product-category')?.value || 'Bags & Luggage',
  description: $('product-desc')?.value || '',
  images: productImages.filter(Boolean),
  colors: [...colors],
  sizes: $('no-sizes-check')?.checked ? [] : [...sizes],
  materials: [...materials],
  details: details.filter(Boolean),
  totalStock,
  status: isDraft ? 'Draft' : (vendorStatus === 'approved' ? 'Pending' : 'Draft'),
  db_status: isDraft ? 'draft' : 'pending',
  views_count: existing?.views_count || 0,
  wishlist_count: existing?.wishlist_count || 0,
  sales_count: existing?.sales_count || 0,
  rating_avg: existing?.rating_avg || 0,
  rating_count: existing?.rating_count || 0,
  created_at: existing?.created_at || new Date().toISOString()
 };

 try {
  if (supa && vendorApp?.user_id) {
   const payload = {
    user_id: vendorApp.user_id,
    vendor_application_id: isValidUUID(vendorApp.id) ? vendorApp.id : null,
    title: newProduct.title,
    description: newProduct.description,
    price: parseFloat(newProduct.price) || 0,
    compare_price: parseFloat(newProduct.comparePrice) || null,
    category: newProduct.category,
    images: newProduct.images,
    colors: newProduct.colors,
    sizes: newProduct.sizes,
    materials: newProduct.materials,
    details: newProduct.details,
    total_stock: newProduct.totalStock,
    status: isDraft ? 'draft' : 'pending'
   };
   if (isEditing && existing?.db_id) {
    const { error } = await supa.from('vendor_products').update(payload).eq('id', existing.db_id);
    if (error) { showToast('Update error: ' + error.message); console.error(error); }
   } else {
    const { data, error } = await supa.from('vendor_products').insert(payload).select();
    if (error) { showToast('Insert error: ' + error.message); console.error(error); }
    else if (data?.[0]?.id) {
     newProduct.db_id = data[0].id;
     newProduct.id = data[0].id;
    }
   }
  }
 } catch (e) {
  console.error('submit exception', e);
 }

 if (isEditing && existingIndex !== -1) {
  products[existingIndex] = newProduct;
 } else {
  products.push(newProduct);
 }

 editingId = null;
 editingIndex = null;
 originalSnapshot = null;
 saveAll();
 renderProducts();
 closeProductModal();
 showToast(isDraft ? 'Draft saved ✓' : 'Submitted for review ✓');
 showPage('products');
}

// -------------------- PERFORMANCE - REAL DATA ONLY, NO FAKE --------------------
async function viewProductStats(productId) {
 const p = products.find(x => (x.db_id == productId || x.id == productId));
 if (!p) { showToast('Product not found'); return; }
 showPage('performance');

 const hero = $('perf-product-hero');
 if (hero) {
  hero.innerHTML = `
   <div style="display:flex;gap:14px;align-items:center;">
    <img src="${p.images[0] || ''}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;background:#F5F5F5;" />
    <div>
     <div style="font-weight:900;font-size:15px;">${p.title}</div>
     <div style="font-size:11px;color:#888;margin-top:2px;">${p.category} • ${p.status} • GHS ${p.price}</div>
     <div style="font-size:11px;margin-top:6px;display:flex;gap:10px;">
      <span>👁 ${p.views_count || 0}</span>
      <span>♡ ${p.wishlist_count || 0}</span>
      <span>★ ${(p.rating_avg || 0).toFixed(1)}</span>
     </div>
    </div>
   </div>`;
 }

 let viewRows = [];
 let wishlistRows = [];
 let reviewRows = [];

 try {
  if (supa) {
   let vRes = await supa.from('product_views').select('viewed_at, created_at, viewer_id').eq('product_id', p.db_id || p.id).order('created_at', { ascending: false }).limit(200);
   if (vRes.error && vRes.error.message.includes('viewed_at')) {
    vRes = await supa.from('product_views').select('created_at, viewer_id').eq('product_id', p.db_id || p.id).order('created_at', { ascending: false }).limit(200);
   }
   viewRows = vRes.data || [];

   try {
    const wRes = await supa.from('wishlists').select('created_at').eq('product_id', p.db_id || p.id).limit(100);
    if (wRes.data && wRes.data.length) wishlistRows = wRes.data;
    else {
     const w2 = await supa.from('product_wishlists').select('created_at').eq('product_id', p.db_id || p.id).limit(100);
     if (w2.data) wishlistRows = w2.data;
    }
   } catch (e) {}

   const rRes = await supa.from('product_reviews').select('*').eq('product_id', p.db_id || p.id).order('created_at', { ascending: false }).limit(30);
   if (rRes.data) reviewRows = rRes.data;
  }
 } catch (e) {
  console.log('perf fetch error', e.message);
 }

 const kpis = $('perf-kpis');
 if (kpis) {
  const views = viewRows.length || p.views_count || 0;
  const wishes = wishlistRows.length || p.wishlist_count || 0;
  const avgRating = reviewRows.length ? (reviewRows.reduce((a, b) => a + (b.rating || 0), 0) / reviewRows.length).toFixed(1) : (p.rating_avg || 0).toFixed(1);
  kpis.innerHTML = `
   <div style="background:#FFF;border:1px solid #EEE;border-radius:14px;padding:14px;">
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#888;">Views</div>
    <div style="font-size:24px;font-weight:900;margin-top:4px;">${views}</div>
    <div style="font-size:11px;color:#666;margin-top:4px;">${viewRows.length} records</div>
   </div>
   <div style="background:#FFF;border:1px solid #EEE;border-radius:14px;padding:14px;">
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#888;">Saves</div>
    <div style="font-size:24px;font-weight:900;margin-top:4px;">${wishes}</div>
    <div style="font-size:11px;color:#666;margin-top:4px;">${wishlistRows.length} saves</div>
   </div>
   <div style="background:#FFF;border:1px solid #EEE;border-radius:14px;padding:14px;">
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#888;">Rating</div>
    <div style="font-size:24px;font-weight:900;margin-top:4px;">${avgRating}★</div>
    <div style="font-size:11px;color:#666;">${reviewRows.length || p.rating_count || 0} reviews</div>
   </div>
   <div style="background:#FFF;border:1px solid #EEE;border-radius:14px;padding:14px;">
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#888;">Stock</div>
    <div style="font-size:24px;font-weight:900;margin-top:4px;">${p.totalStock || 0}</div>
    <div style="font-size:11px;color:${(p.totalStock || 0) < 5 ? '#DC2626' : '#666'};">${(p.totalStock || 0) < 5 ? 'Low stock' : 'In stock'}</div>
   </div>
  `;
 }

 // Charts - real data
 try {
  const days = {};
  for(let i=29;i>=0;i--){
   const d = new Date(); d.setDate(d.getDate()-i);
   const key = d.toISOString().slice(0,10);
   days[key]=0;
  }
  (viewRows||[]).forEach(v=>{
   const k = new Date(v.viewed_at||v.created_at).toISOString().slice(0,10);
   if(days[k]!==undefined) days[k]++;
  });
  const labels = Object.keys(days).map(l=>l.slice(5));
  const vals = Object.values(days);

  const viewsCanvas = document.getElementById('perf-views-chart');
  if (viewsCanvas && window.Chart) {
   if (viewsCanvas._chart) viewsCanvas._chart.destroy();
   const ctx = viewsCanvas.getContext('2d');
   viewsCanvas._chart = new Chart(ctx, {
    type:'line',
    data:{labels:labels, datasets:[{label:'Views', data:vals, borderColor:'#111', backgroundColor:'rgba(0,0,0,0.05)', fill:true, tension:0.4, pointRadius:2}]},
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{stepSize:1, precision:0}}, x:{grid:{display:false}}}}
   });
   const trendEl = document.getElementById('perf-views-trend');
   if (trendEl) trendEl.textContent = vals.reduce((a,b)=>a+b,0) + ' total';
  }

  const salesCanvas = document.getElementById('perf-sales-chart');
  if (salesCanvas && window.Chart) {
   if (salesCanvas._chart) salesCanvas._chart.destroy();
   const ctx2 = salesCanvas.getContext('2d');
   salesCanvas._chart = new Chart(ctx2, {
    type:'bar',
    data:{labels:['Sales'], datasets:[{label:'Revenue', data:[0], backgroundColor:'#FF8EBA'}]},
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
   });
   const salesTrend = document.getElementById('perf-sales-trend');
   if (salesTrend) salesTrend.textContent = 'No sales yet';
  }

  const convCanvas = document.getElementById('perf-conversion-chart');
  if (convCanvas && window.Chart) {
   if (convCanvas._chart) convCanvas._chart.destroy();
   const vCount = viewRows.length || p.views_count || 0;
   const wCount = wishlistRows.length || p.wishlist_count || 0;
   const ctx3 = convCanvas.getContext('2d');
   if (vCount===0 && wCount===0) {
    convCanvas.parentElement.innerHTML = '<div style="padding:40px;text-align:center;font-size:11px;color:#999;">No views or saves yet<br>Share your product link</div>';
   } else {
    convCanvas._chart = new Chart(ctx3, {
     type:'doughnut',
     data:{labels:['Views','Saves'], datasets:[{data:[vCount,wCount], backgroundColor:['#111','#FF8EBA'], borderWidth:0}]},
     options:{responsive:true, plugins:{legend:{position:'bottom', labels:{font:{size:11}, boxWidth:12}}}}
    });
   }
  }

  const stockCanvas = document.getElementById('perf-stock-chart');
  if (stockCanvas && window.Chart) {
   if (stockCanvas._chart) stockCanvas._chart.destroy();
   const ctx4 = stockCanvas.getContext('2d');
   stockCanvas._chart = new Chart(ctx4, {
    type:'bar',
    data:{labels:['Stock'], datasets:[{label:'Units', data:[p.totalStock||0], backgroundColor:(p.totalStock||0)<5?'#FECACA':'#111', borderRadius:6}]},
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
   });
  }
 } catch(e){ console.log('chart error', e.message, e.stack); }

 const viewsList = $('perf-views-list');
 if (viewsList) {
  if (!viewRows.length) {
   viewsList.innerHTML = `<div style="font-size:11px;color:#999;line-height:1.6;">No views yet for<br><code style="background:#F5F5F5;padding:2px 6px;border-radius:4px;font-size:10px;">${p.db_id || p.id}</code><br><br>Total: ${p.views_count || 0}<br><span style="font-size:10px;">Share your store link to get your first view</span></div>`;
  } else {
   viewsList.innerHTML = viewRows.slice(0, 20).map(v => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F5F5F5;font-size:11px;"><span>${v.viewer_id ? 'User ' + v.viewer_id.slice(0, 6) : 'Anon'}</span><span style="color:#888;">${new Date(v.viewed_at || v.created_at).toLocaleString()}</span></div>`).join('') + `<div style="font-size:10px;color:#666;margin-top:10px;">Showing ${Math.min(20, viewRows.length)} of ${viewRows.length}</div>`;
  }
 }

 const reviewsList = $('perf-reviews-list');
 if (reviewsList) {
  if (!reviewRows.length) {
   reviewsList.innerHTML = `<div style="font-size:11px;color:#999;">No reviews yet — ask buyers to leave a review</div>`;
  } else {
   reviewsList.innerHTML = reviewRows.map(r => `<div style="padding:10px 0;border-bottom:1px solid #F5F5F5;"><div style="font-size:11px;font-weight:600;">${'★'.repeat(r.rating || 5)} ${r.rating || 5}</div><div style="font-size:11px;margin-top:4px;line-height:1.4;">${r.comment || 'No comment'}</div><div style="font-size:10px;color:#888;margin-top:4px;">${new Date(r.created_at).toLocaleDateString()}</div></div>`).join('');
  }
 }

 const insights = $('perf-insights');
 if (insights) {
  const list = [];
  if ((viewRows.length || p.views_count || 0) === 0) list.push('No views yet — share your product link to get your first view.');
  if ((viewRows.length || 0) > 0 && (reviewRows.length || 0) === 0) list.push(`${viewRows.length} views but 0 reviews — ask buyers to leave a review.`);
  if ((p.totalStock || 0) < 5) list.push(`Low stock: ${p.totalStock} left — restock soon.`);
  if ((p.images || []).length < 3) list.push(`Only ${p.images.length} image(s) — add more for better conversion.`);
  if (!list.length) list.push(`Healthy: ${viewRows.length} views, ${wishlistRows.length} saves, ${reviewRows.length} reviews`);
  insights.innerHTML = list.map(t => `<div style="padding:10px 0;border-bottom:1px solid #F3F3F3;font-size:11px;line-height:1.5;display:flex;gap:8px;"><span>💡</span><span>${t}</span></div>`).join('');
 }

 refreshIcons();
}



// -------------------- STOREFRONT --------------------
async function fetchStorefront() {
 if (!vendorApp) return;
 try {
  let data = null;
  try {
   const { data: sf } = await supa.from('vendor_storefronts').select('*').eq('vendor_application_id', vendorApp.id).maybeSingle();
   if (sf) data = sf;
  } catch (e) {}
  if (!data) {
   try {
    const { data: sf2 } = await supa.from('vendor_storefronts').select('*').eq('user_id', vendorApp.user_id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (sf2) data = sf2;
   } catch (e) {}
  }

  if (data) {
   storefrontData = {
    logo_url: data.logo_url || '',
    cover_url: data.cover_url || '',
    display_name: data.display_name || vendorApp.store_name || '',
    tagline: data.tagline || '',
    bio: data.bio || '',
    instagram: data.instagram_url || '',
    tiktok: data.tiktok_url || '',
    website: data.website_url || '',
    whatsapp: data.whatsapp || '',
    show_followers: data.show_follower_count !== false,
    show_rating: data.show_rating !== false,
    show_sales: !!data.show_sales,
    allow_follow: data.allow_follow !== false,
    custom_badge: data.custom_badge || ''
   };
   if (data.follower_count) storefrontFollowersCount = data.follower_count;
  } else {
   const local = JSON.parse(localStorage.getItem('pb_storefront_' + vendorApp.id) || '{}');
   storefrontData.display_name = local.display_name || vendorApp.store_name || '';
   storefrontData.bio = local.bio || '';
   storefrontData.logo_url = local.logo_url || '';
   storefrontData.cover_url = local.cover_url || '';
   storefrontData.tagline = local.tagline || '';
   storefrontData.instagram = local.instagram || '';
   storefrontData.tiktok = local.tiktok || '';
   storefrontData.website = local.website || '';
   storefrontData.whatsapp = local.whatsapp || '';
  }

  try {
   const { count } = await supa.from('vendor_followers').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorApp.id);
   if (count !== null) storefrontFollowersCount = count;
  } catch (e) {}

  fillStorefrontForm();
  renderStorefrontPreview();
  updateStorefrontLink();
 } catch (e) {
  console.log('fetchStorefront error', e.message);
  fillStorefrontForm();
  renderStorefrontPreview();
 }
}

function fillStorefrontForm() {
 if ($('sf-display-name')) $('sf-display-name').value = storefrontData.display_name || '';
 if ($('sf-tagline')) $('sf-tagline').value = storefrontData.tagline || '';
 if ($('sf-bio')) $('sf-bio').value = storefrontData.bio || '';
 if ($('sf-instagram')) $('sf-instagram').value = storefrontData.instagram || '';
 if ($('sf-tiktok')) $('sf-tiktok').value = storefrontData.tiktok || '';
 if ($('sf-website')) $('sf-website').value = storefrontData.website || '';
 if ($('sf-whatsapp')) $('sf-whatsapp').value = storefrontData.whatsapp || '';
 if ($('sf-show-followers')) $('sf-show-followers').checked = !!storefrontData.show_followers;
 if ($('sf-show-rating')) $('sf-show-rating').checked = !!storefrontData.show_rating;
 if ($('sf-show-sales')) $('sf-show-sales').checked = !!storefrontData.show_sales;
 if ($('sf-allow-follow')) $('sf-allow-follow').checked = !!storefrontData.allow_follow;
 if ($('sf-custom-badge')) $('sf-custom-badge').value = storefrontData.custom_badge || '';

 const logoImg = $('logo-preview-img');
 const logoSpan = $('logo-preview')?.querySelector('span');
 const delLogoBtn = $('delete-logo-btn');
 if (storefrontData.logo_url) {
  if (logoImg) { logoImg.src = storefrontData.logo_url; logoImg.style.display = 'block'; }
  if (logoSpan) logoSpan.style.display = 'none';
  if (delLogoBtn) delLogoBtn.style.display = 'inline-flex';
 } else {
  if (logoImg) { logoImg.src = ''; logoImg.style.display = 'none'; }
  if (logoSpan) logoSpan.style.display = 'grid';
  if (delLogoBtn) delLogoBtn.style.display = 'none';
 }

 const coverImg = $('cover-preview-img');
 const coverSpan = $('cover-preview')?.querySelector('span');
 const delCoverBtn = $('delete-cover-btn');
 if (storefrontData.cover_url) {
  if (coverImg) { coverImg.src = storefrontData.cover_url; coverImg.style.display = 'block'; }
  if (coverSpan) coverSpan.style.display = 'none';
  if (delCoverBtn) delCoverBtn.style.display = 'inline-flex';
 } else {
  if (coverImg) { coverImg.src = ''; coverImg.style.display = 'none'; }
  if (coverSpan) coverSpan.style.display = 'grid';
  if (delCoverBtn) delCoverBtn.style.display = 'none';
 }
}

function deleteLogo() {
 if (!confirm('Delete logo?')) return;
 storefrontData.logo_url = '';
 window.pendingLogoFile = null;
 const logoInput = $('store-logo-input');
 if (logoInput) logoInput.value = '';
 const logoImg = $('logo-preview-img');
 if (logoImg) { logoImg.src=''; logoImg.style.display='none'; }
 const span = $('logo-preview')?.querySelector('span');
 if (span) span.style.display='grid';
 const delBtn = $('delete-logo-btn');
 if (delBtn) delBtn.style.display='none';
 // Clear from storage if needed
 try { supa.storage.from('vendor-storefronts').remove([`${vendorApp.user_id}/storefront/logo-*`]); } catch(e){}
 renderStorefrontPreview();
 showToast('Logo removed — save to confirm');
}

function deleteCover() {
 if (!confirm('Delete cover?')) return;
 storefrontData.cover_url = '';
 window.pendingCoverFile = null;
 const coverInput = $('store-cover-input');
 if (coverInput) coverInput.value = '';
 const coverImg = $('cover-preview-img');
 if (coverImg) { coverImg.src=''; coverImg.style.display='none'; }
 const span = $('cover-preview')?.querySelector('span');
 if (span) span.style.display='grid';
 const delBtn = $('delete-cover-btn');
 if (delBtn) delBtn.style.display='none';
 renderStorefrontPreview();
 showToast('Cover removed — save to confirm');
}


function collectStorefrontForm() {
 storefrontData.display_name = $('sf-display-name')?.value.trim() || vendorApp.store_name;
 storefrontData.tagline = $('sf-tagline')?.value.trim() || '';
 storefrontData.bio = $('sf-bio')?.value.trim() || '';
 storefrontData.instagram = $('sf-instagram')?.value.trim() || '';
 storefrontData.tiktok = $('sf-tiktok')?.value.trim() || '';
 storefrontData.website = $('sf-website')?.value.trim() || '';
 storefrontData.whatsapp = $('sf-whatsapp')?.value.trim() || '';
 storefrontData.show_followers = $('sf-show-followers')?.checked;
 storefrontData.show_rating = $('sf-show-rating')?.checked;
 storefrontData.show_sales = $('sf-show-sales')?.checked;
 storefrontData.allow_follow = $('sf-allow-follow')?.checked;
 storefrontData.custom_badge = $('sf-custom-badge')?.value.trim() || '';
}

function renderStorefrontPreview() {
 const preview = $('storefront-preview');
 if (!preview) return;
 collectStorefrontForm();
 const name = storefrontData.display_name || vendorApp?.store_name || 'My Store';
 const tagline = storefrontData.tagline || `${vendorApp?.city||'Accra'} • ${vendorApp?.store_category||'Fashion'}`;
 const bio = storefrontData.bio || vendorApp?.store_description || `Welcome to ${name}!`;
 const totalViews = products.reduce((s, p) => s + (p.views_count || 0), 0);
 const totalSaves = products.reduce((s, p) => s + (p.wishlist_count || 0), 0);
 const totalSales = products.reduce((s, p) => s + (p.sales_count || 0), 0);
 const avgRating = products.length ? (products.reduce((s,p)=>s+(p.rating_avg||0),0)/products.length).toFixed(1) : '0.0';
 const ratingCount = products.reduce((s,p)=>s+(p.rating_count||0),0);
 const verified = vendorApp?.status === 'approved';
 const location = `${vendorApp?.city||''}, ${vendorApp?.region||'Greater Accra'}`.trim() || 'Accra, Ghana';
 const logo = storefrontData.logo_url || '';
 const cover = storefrontData.cover_url || '';
 const customBadge = storefrontData.custom_badge || '';
 const followerCount = storefrontFollowersCount;
 const showFollowers = storefrontData.show_followers !== false;
 const showRating = storefrontData.show_rating !== false;
 const showSales = storefrontData.show_sales === true;
 const allowFollow = storefrontData.allow_follow !== false;

 preview.innerHTML = `
  <div style="background:#FAFAFA; font-family:'Inter',sans-serif; border-radius:16px; overflow:hidden;">
    <div style="background:#FFF; border-radius:16px; border:1px solid rgba(0,0,0,0.05); overflow:hidden;">
      <div style="height:160px; background:#F5F5F5; position:relative; overflow:hidden;">
        ${cover ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#FF8EBA 0%,#111 100%);display:grid;place-items:center;color:#FFF;font-weight:900;font-size:12px;letter-spacing:1px;">${name.toUpperCase()}</div>`}
      </div>
      <div style="padding:0 16px 16px;">
        <div style="display:flex; gap:14px; margin-top:-38px; position:relative; z-index:2;">
          <div style="width:76px;height:76px;border-radius:50%;background:#FFF;border:3px solid #FFF;box-shadow:0 4px 16px rgba(0,0,0,0.12);overflow:hidden;display:grid;place-items:center;font-weight:900;font-size:17px;flex-shrink:0;">
            ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:cover;" />` : `${name.slice(0,2).toUpperCase()}`}
          </div>
          <div style="padding-top:44px; flex:1; min-width:0;">
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <h2 style="font-size:17px;font-weight:900;margin:0;letter-spacing:-0.2px;">${name}</h2>
              ${verified ? `<span style="font-size:8px;font-weight:800;padding:2px 7px;border-radius:20px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;">VERIFIED</span>` : ''}
              ${customBadge ? `<span style="font-size:8px;font-weight:800;padding:2px 7px;border-radius:20px;background:#F3F4F6;border:1px solid #E5E7EB;">${customBadge.toUpperCase()}</span>` : ''}
            </div>
            <div style="font-size:11px;color:rgba(0,0,0,0.5);margin-top:3px;font-weight:500;">${tagline}</div>
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:7px; font-size:10px; color:rgba(0,0,0,0.6);">
              <span>${location}</span>
              ${showFollowers ? `<span><b style="color:#000;">${followerCount}</b> followers</span>` : ''}
              ${showRating ? `<span><b style="color:#000;">${avgRating}</b> (${ratingCount})</span>` : ''}
              <span>${products.length} products</span>
              ${showSales ? `<span><b style="color:#000;">${totalSales}</b> sales</span>` : ''}
            </div>
            <p style="font-size:11px;line-height:1.5;color:rgba(0,0,0,0.6);margin-top:8px;white-space:pre-wrap;max-width:640px;">${bio}</p>
            ${(storefrontData.instagram || storefrontData.tiktok || storefrontData.website || storefrontData.whatsapp) ? `
            <div style="display:flex; gap:5px; margin-top:9px; flex-wrap:wrap;">
              ${storefrontData.instagram ? `<a href="${storefrontData.instagram}" target="_blank" style="font-size:10px;font-weight:700;padding:5px 10px;border-radius:20px;background:#000;color:#FFF;text-decoration:none;">Instagram</a>` : ''}
              ${storefrontData.tiktok ? `<a href="${storefrontData.tiktok}" target="_blank" style="font-size:10px;font-weight:700;padding:5px 10px;border-radius:20px;background:#000;color:#FFF;text-decoration:none;">TikTok</a>` : ''}
              ${storefrontData.website ? `<a href="${storefrontData.website}" target="_blank" style="font-size:10px;font-weight:700;padding:5px 10px;border-radius:20px;background:#FFF;border:1px solid #EEE;color:#000;text-decoration:none;">Website</a>` : ''}
              ${storefrontData.whatsapp ? `<a href="https://wa.me/${storefrontData.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" style="font-size:10px;font-weight:700;padding:5px 10px;border-radius:20px;background:#25D366;color:#FFF;text-decoration:none;">WhatsApp</a>` : ''}
            </div>` : ''}
          </div>
          ${allowFollow ? `<div style="padding-top:44px;"><button style="height:30px;padding:0 14px;border-radius:20px;background:#000;color:#FFF;font-size:10px;font-weight:700;border:none;cursor:pointer;">Follow</button></div>` : ''}
        </div>
      </div>
    </div>

    <div style="background:#FFF; border-radius:12px; border:1px solid rgba(0,0,0,0.05); padding:8px; display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin-top:10px;">
      <div style="text-align:center; padding:5px 0;"><div style="font-size:15px;font-weight:900;">${totalViews}</div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:rgba(0,0,0,0.4);letter-spacing:0.6px;margin-top:1px;">Views</div></div>
      <div style="text-align:center; padding:5px 0; border-left:1px solid rgba(0,0,0,0.05);"><div style="font-size:15px;font-weight:900;">${totalSaves}</div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:rgba(0,0,0,0.4);letter-spacing:0.6px;margin-top:1px;">Saves</div></div>
      <div style="text-align:center; padding:5px 0; border-left:1px solid rgba(0,0,0,0.05);"><div style="font-size:15px;font-weight:900;">${products.length}</div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:rgba(0,0,0,0.4);letter-spacing:0.6px;margin-top:1px;">Products</div></div>
    </div>

    <div style="background:#FFF; border-radius:12px; border:1px solid rgba(0,0,0,0.05); padding:8px; display:flex; gap:6px; margin-top:8px; overflow:auto;">
      <button onclick="document.getElementById('preview-tab-products').style.display='grid';document.getElementById('preview-tab-reviews').style.display='none';document.getElementById('preview-tab-about').style.display='none'" style="height:28px;padding:0 12px;border-radius:20px;background:#000;color:#FFF;font-size:10px;font-weight:700;border:none;white-space:nowrap;">Products (${products.length})</button>
      <button onclick="document.getElementById('preview-tab-products').style.display='none';document.getElementById('preview-tab-reviews').style.display='block';document.getElementById('preview-tab-about').style.display='none'" style="height:28px;padding:0 12px;border-radius:20px;background:#FFF;border:1px solid #EEE;color:#000;font-size:10px;font-weight:700;white-space:nowrap;">Reviews (${ratingCount})</button>
      <button onclick="document.getElementById('preview-tab-products').style.display='none';document.getElementById('preview-tab-reviews').style.display='none';document.getElementById('preview-tab-about').style.display='block'" style="height:28px;padding:0 12px;border-radius:20px;background:#FFF;border:1px solid #EEE;color:#000;font-size:10px;font-weight:700;white-space:nowrap;">About</button>
    </div>

    <!-- EXACT SAME AS VENDOR MY PRODUCTS - from vendor.css -->
    <style>
      .preview-products-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:10px}
      .preview-products-grid .product-card{background:#FFF;border:1px solid rgba(0,0,0,0.08);border-radius:12px;overflow:hidden;position:relative;display:flex;flex-direction:column}
      .preview-products-grid .product-card-img{aspect-ratio:1/1;background:#F5F5F5;position:relative;overflow:hidden;width:100%}
      .preview-products-grid .product-card-img img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;padding:0}
      .preview-products-grid .product-card-body{padding:10px 12px 12px}
    </style>
    <div id="preview-tab-products" class="preview-products-grid">
      ${products.slice(0,6).map(p=>`
        <div class="product-card">
          <div class="product-card-img">
            <img src="${p.images[0]||''}" />
            <span style="position:absolute;top:8px;left:8px;background:#FFF;padding:4px 8px;border-radius:20px;font-size:9px;font-weight:700;border:1px solid #EEE;z-index:2">${p.category||'Product'}</span>
          </div>
          <div class="product-card-body">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.title}</div>
            <div style="font-size:13px;font-weight:900;margin-top:2px">GHS ${p.price}</div>
            <div style="display:flex;gap:8px;margin-top:6px;font-size:10px;color:#888"><span>👁 ${p.views_count||0}</span><span>♡ ${p.wishlist_count||0}</span><span>★ ${(p.rating_avg||0).toFixed(1)}</span></div>
          </div>
        </div>
      `).join('') || `<div style="grid-column:1/-1;background:#FFF;border:1px dashed rgba(0,0,0,0.1);border-radius:12px;padding:24px;text-align:center"><div style="font-weight:700;font-size:12px">No products yet</div></div>`}
    </div>

    <!-- REVIEWS LIKE SOCIAL MEDIA COMMENTS -->
    <div id="preview-tab-reviews" style="display:none; margin-top:10px;">
      <div style="background:#FFF; border-radius:12px; border:1px solid rgba(0,0,0,0.05); padding:12px;">
        <div style="font-weight:800;font-size:12px;margin-bottom:10px;">Reviews • ${avgRating} avg (${ratingCount})</div>
        <div id="preview-reviews-list">
          <div style="text-align:center;padding:24px 12px;color:#999;">
            <div style="font-size:20px;margin-bottom:6px;">💬</div>
            <div style="font-size:11px;font-weight:600;">No reviews yet</div>
            <div style="font-size:10px;margin-top:3px;">Reviews from customers will show here like comments</div>
          </div>
        </div>
      </div>
    </div>

    <div id="preview-tab-about" style="display:none; margin-top:10px; background:#FFF; border-radius:12px; border:1px solid rgba(0,0,0,0.05); padding:12px;">
      <div style="display:flex; gap:10px; align-items:center;">
        <div style="width:36px;height:36px;border-radius:50%;background:#F5F5F5;display:grid;place-items:center;font-weight:800;font-size:11px;">${name.slice(0,2).toUpperCase()}</div>
        <div><div style="font-weight:800;font-size:12px;">${name}</div><div style="font-size:10px;color:#888;">${vendorApp?.owner_name||''}</div></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; font-size:10px;">
        <div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;">Location</div><div style="margin-top:3px;">${location}</div></div>
        <div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;">MoMo</div><div style="margin-top:3px;">${vendorApp?.momo_number||vendorApp?.phone||'-'}</div></div>
        ${showFollowers ? `<div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;">Followers</div><div style="margin-top:3px;font-weight:700;">${followerCount}</div></div>` : ''}
        <div><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;">Ghana Card</div><div style="margin-top:3px;">Verified</div></div>
      </div>
      <div style="margin-top:12px;"><div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;">Bio</div><div style="font-size:11px;color:rgba(0,0,0,0.6);margin-top:4px;line-height:1.5;">${bio}</div></div>
    </div>
  </div>
 `;
 // Load real reviews into preview
 setTimeout(()=>{ loadPreviewReviews(); }, 100);
}

async function loadPreviewReviews(){
  try{
    if(!vendorApp) return;
    const { data } = await supa.from('product_reviews').select('*, vendor_products!inner(vendor_application_id)').eq('vendor_products.vendor_application_id', vendorApp.id).order('created_at',{ascending:false}).limit(15);
    const el = document.getElementById('preview-reviews-list');
    if(!el) return;
    if(!data || !data.length){
      el.innerHTML = `<div style="text-align:center;padding:24px 12px;color:#999;"><div style="font-size:20px;margin-bottom:6px;">💬</div><div style="font-size:11px;font-weight:600;">No reviews yet</div></div>`;
      return;
    }
    const ids = data.map(r=>r.id);
    let likesMap={}, repliesMap={};
    try{
      const {data:likes}=await supa.from('product_review_likes').select('review_id, user_id').in('review_id',ids);
      if(likes) likes.forEach(l=>{if(!likesMap[l.review_id]) likesMap[l.review_id]=[]; likesMap[l.review_id].push(l.user_id)});
    }catch(e){}
    try{
      const {data:reps}=await supa.from('product_review_replies').select('*').in('review_id',ids).order('created_at',{ascending:true});
      if(reps) reps.forEach(rp=>{if(!repliesMap[rp.review_id]) repliesMap[rp.review_id]=[]; repliesMap[rp.review_id].push(rp)});
    }catch(e){}
    const {data:{user}}=await supa.auth.getUser().catch(()=>({data:{user:null}}));
    const curUid = user?.id;
    el.innerHTML = data.map(r=>{
      const likes = likesMap[r.id]||[];
      const isLiked = curUid && likes.includes(curUid);
      const replies = repliesMap[r.id]||[];
      return `
      <div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #F5F5F5;">
        <div style="width:36px;height:36px;border-radius:50%;background:#111;color:#FFF;display:grid;place-items:center;font-weight:800;font-size:11px;flex-shrink:0;">${(r.user_id||'A').toString().slice(0,1).toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div style="background:#F8F8F8;border-radius:14px;padding:8px 12px;">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:11px;">${r.user_name||'User'}</span>
              <span style="font-size:10px;">${'★'.repeat(r.rating||5)}</span>
              <span style="font-size:9px;color:#888;">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <div style="font-size:11px;margin-top:4px;line-height:1.4;color:#222;white-space:pre-wrap;">${r.comment||'Great product!'}</div>
          </div>
          <div style="display:flex;gap:14px;margin-top:6px;padding-left:12px;align-items:center;">
            <button onclick="togglePreviewReviewLike('${r.id}')" style="font-size:10px;font-weight:700;color:${isLiked?'#FF3B30':'#888'};background:none;border:none;cursor:pointer">${isLiked?'❤️':'🤍'} Like ${likes.length?`(${likes.length})`:''}</button>
            <button onclick="document.getElementById('preview-reply-box-${r.id}').style.display=document.getElementById('preview-reply-box-${r.id}').style.display==='none'?'block':'none'" style="font-size:10px;font-weight:600;color:#888;background:none;border:none;cursor:pointer">↩️ Reply ${replies.length?`(${replies.length})`:''}</button>
          </div>
          <div style="margin-top:6px;padding-left:12px">
            ${replies.map(rp=>`<div style="display:flex;gap:6px;margin-top:6px"><div style="width:20px;height:20px;border-radius:50%;background:#EEE;display:grid;place-items:center;font-size:9px;font-weight:700;flex-shrink:0">${(rp.user_id||'V').slice(0,1).toUpperCase()}</div><div style="background:#FFF;border:1px solid #EEE;border-radius:10px;padding:6px 10px;flex:1"><div style="font-size:10px;font-weight:700">${rp.user_name||'Vendor'}</div><div style="font-size:10px;margin-top:2px">${rp.comment}</div></div></div>`).join('')}
          </div>
          <div id="preview-reply-box-${r.id}" style="display:none;margin-top:6px;padding-left:12px"><div style="display:flex;gap:6px"><input id="preview-reply-input-${r.id}" placeholder="Reply..." style="flex:1;border:1px solid #E5E7EB;border-radius:20px;padding:6px 10px;font-size:10px"><button onclick="submitPreviewReply('${r.id}')" style="background:#000;color:#FFF;border:none;border-radius:20px;padding:6px 12px;font-size:10px;font-weight:700;cursor:pointer">Reply</button></div></div>
        </div>
      </div>
    `}).join('');

    window.togglePreviewReviewLike = async function(reviewId){
      const {data:{user}}=await supa.auth.getUser(); if(!user){showToast('Login to like');return}
      const likes = likesMap[reviewId]||[];
      const isLiked = likes.includes(user.id);
      try{
        if(isLiked){ await supa.from('product_review_likes').delete().eq('review_id',reviewId).eq('user_id',user.id) }
        else { await supa.from('product_review_likes').insert({review_id:reviewId,user_id:user.id}) }
        loadPreviewReviews();
      }catch(e){showToast('Like failed: '+e.message.slice(0,40))}
    };
    window.submitPreviewReply = async function(reviewId){
      const {data:{user}}=await supa.auth.getUser(); if(!user){showToast('Login to reply');return}
      const input=document.getElementById('preview-reply-input-'+reviewId); if(!input||!input.value.trim()) return;
      try{
        await supa.from('product_review_replies').insert({review_id:reviewId,user_id:user.id,user_name:vendorApp?.store_name||'Vendor',comment:input.value.trim()});
        showToast('Reply posted ✓'); loadPreviewReviews();
      }catch(e){showToast('Reply failed: '+e.message.slice(0,40))}
    };
  }catch(e){ console.log('preview reviews err', e.message); }
}










function updateStorefrontLink() {
 const inVendorFolder = window.location.pathname.includes('/vendor/');
 const base = inVendorFolder ? 'storefront.html' : 'vendor-storefront.html';
 const link = `${base}?id=${vendorApp?.id || ''}`;
 const a = $('storefront-view-live');
 if (a) a.href = link;
 const b = $('view-storefront-btn');
 if (b) b.href = link;
}

async function uploadImage(file, type) {
 if (!file) return null;
 try {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${vendorApp.user_id}/storefront/${type}-${Date.now()}.${ext}`;
  let bucket = 'vendor-storefronts';
  let { error } = await supa.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) {
   bucket = 'vendor-kyc';
   const r = await supa.storage.from(bucket).upload(path, file, { upsert: true });
   if (r.error) throw r.error;
  }
  const { data } = supa.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
 } catch (e) {
  console.log('upload fallback to base64', e.message);
  return await new Promise(res => {
   const r = new FileReader();
   r.onload = () => res(r.result);
   r.readAsDataURL(file);
  });
 }
}

async function saveStorefront() {
 const btn = $('save-storefront-btn');
 if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
 collectStorefrontForm();
 try {
  if (window.pendingLogoFile) {
   const url = await uploadImage(window.pendingLogoFile, 'logo');
   if (url) storefrontData.logo_url = url;
   window.pendingLogoFile = null;
  }
  if (window.pendingCoverFile) {
   const url = await uploadImage(window.pendingCoverFile, 'cover');
   if (url) storefrontData.cover_url = url;
   window.pendingCoverFile = null;
  }

  localStorage.setItem('pb_storefront_' + vendorApp.id, JSON.stringify(storefrontData));

  const { data: existing } = await supa.from('vendor_storefronts').select('id, status').eq('vendor_application_id', vendorApp.id).maybeSingle();
  
  let payload = {
   user_id: vendorApp.user_id,
   vendor_application_id: isValidUUID(vendorApp.id) ? vendorApp.id : null,
   logo_url: storefrontData.logo_url,
   cover_url: storefrontData.cover_url,
   display_name: storefrontData.display_name,
   tagline: storefrontData.tagline,
   bio: storefrontData.bio,
   instagram_url: storefrontData.instagram,
   tiktok_url: storefrontData.tiktok,
   website_url: storefrontData.website,
   whatsapp: storefrontData.whatsapp,
   show_follower_count: storefrontData.show_followers,
   show_rating: storefrontData.show_rating,
   show_sales: storefrontData.show_sales,
   allow_follow: storefrontData.allow_follow,
   custom_badge: storefrontData.custom_badge,
   updated_at: new Date().toISOString()
  };

  try {
   if (!existing) {
    // FIRST STOREFRONT EVER - auto approve so it works immediately
    payload.status = 'approved';
    const { error } = await supa.from('vendor_storefronts').insert(payload);
    if (error) throw error;
    
    await supa.from('vendor_edits').insert({
     user_id: vendorApp.user_id,
     vendor_application_id: isValidUUID(vendorApp.id) ? vendorApp.id : null,
     edit_type: 'storefront',
     changes: payload,
     status: 'approved',
     created_at: new Date().toISOString(),
     reviewed_at: new Date().toISOString()
    });
    
    addNotification('Storefront live!', 'Your storefront is now live on marketplace');
    showToast('Storefront created ✓ Now live!');
   } else {
    // HAS EXISTING STOREFRONT - edits go to pending approval, don't overwrite live
    payload.status = 'pending';
    const { error: editErr } = await supa.from('vendor_edits').insert({
     user_id: vendorApp.user_id,
     vendor_application_id: isValidUUID(vendorApp.id) ? vendorApp.id : null,
     edit_type: 'storefront',
     changes: payload,
     status: 'pending',
     created_at: new Date().toISOString()
    });
    if (editErr) throw editErr;
    
    // Keep draft in vendor_storefronts as pending only if no approved exists? Actually keep live approved intact
    // Save pending draft to localStorage for preview, admin will approve later
    try {
     await supa.from('vendor_notifications').insert({
      user_id: vendorApp.user_id,
      vendor_application_id: isValidUUID(vendorApp.id) ? vendorApp.id : null,
      title: 'Storefront update pending',
      message: `Your storefront update "${payload.display_name}" is pending admin approval. Live version still shows old.`,
      type: 'storefront_review',
      read: false,
      created_at: new Date().toISOString()
     });
    } catch(e){}
    
    addNotification('Update pending approval', 'Admin will review your changes. Live storefront still shows old version.');
    showToast('Saved ✓ Pending approval - live shows old until approved');
   }
  } catch (e) {
   console.log('save error', e.message);
   showToast('Saved locally ✓ ' + e.message.slice(0,50));
  }

  renderStorefrontPreview();
  updateStorefrontLink();
 } catch (e) {
  showToast('Save failed: ' + e.message);
 } finally {
  if (btn) { btn.textContent = 'Save Storefront'; btn.disabled = false; }
 }
}




function setupStorefrontListeners() {
 const fields = ['sf-display-name','sf-tagline','sf-bio','sf-instagram','sf-tiktok','sf-website','sf-whatsapp','sf-show-followers','sf-show-rating','sf-show-sales','sf-allow-follow','sf-custom-badge'];
 fields.forEach(id => {
  const el = $(id);
  if (el && !el.dataset.bound) {
   el.addEventListener('input', () => { collectStorefrontForm(); renderStorefrontPreview(); });
   el.addEventListener('change', () => { collectStorefrontForm(); renderStorefrontPreview(); });
   el.dataset.bound = '1';
  }
 });

 const logoInput = $('store-logo-input');
 if (logoInput && !logoInput.dataset.bound) {
  logoInput.addEventListener('change', e => {
   const file = e.target.files[0];
   if (!file) return;
   window.pendingLogoFile = file;
   const url = URL.createObjectURL(file);
   const img = $('logo-preview-img');
   if (img) {
    img.src = url;
    img.style.display = 'block';
    const span = $('logo-preview')?.querySelector('span');
    if (span) span.style.display = 'none';
   }
   renderStorefrontPreview();
  });
  logoInput.dataset.bound = '1';
 }

 const coverInput = $('store-cover-input');
 if (coverInput && !coverInput.dataset.bound) {
  coverInput.addEventListener('change', e => {
   const file = e.target.files[0];
   if (!file) return;
   window.pendingCoverFile = file;
   const url = URL.createObjectURL(file);
   const img = $('cover-preview-img');
   if (img) {
    img.src = url;
    img.style.display = 'block';
    const span = $('cover-preview')?.querySelector('span');
    if (span) span.style.display = 'none';
   }
   renderStorefrontPreview();
  });
  coverInput.dataset.bound = '1';
 }

 const delLogoBtn = $('delete-logo-btn');
 if (delLogoBtn && !delLogoBtn.dataset.bound) {
  delLogoBtn.addEventListener('click', deleteLogo);
  delLogoBtn.dataset.bound='1';
 }
 const delCoverBtn = $('delete-cover-btn');
 if (delCoverBtn && !delCoverBtn.dataset.bound) {
  delCoverBtn.addEventListener('click', deleteCover);
  delCoverBtn.dataset.bound='1';
 }

 const saveBtn = $('save-storefront-btn');
 if (saveBtn && !saveBtn.dataset.bound) {
  saveBtn.addEventListener('click', saveStorefront);
  saveBtn.dataset.bound = '1';
 }
}

// -------------------- MODAL --------------------
function openProductModal() {
 const modal = $('product-modal');
 if (!modal) return;
 modal.classList.add('open');
 modal.classList.add('is-open');
 modal.style.display = 'flex';
 if (editingId === null && editingIndex === null) resetProductForm();
 refreshIcons();
}

function closeProductModal() {
 const modal = $('product-modal');
 if (!modal) return;
 const wasEditing = editingId !== null || editingIndex !== null;
 modal.classList.remove('open');
 modal.classList.remove('is-open');
 modal.style.display = 'none';
 editingId = null;
 editingIndex = null;
 originalSnapshot = null;
 resetProductForm();
 if (wasEditing) {
  console.log('Exited edit without save - refreshing');
  setTimeout(() => location.reload(), 150);
 }
}

function resetProductForm() {
 productImages = Array(8).fill(null);
 colors = [];
 sizes = [];
 materials = [];
 details = [''];
 colorIdCounter = 1;
 const form = $('product-form');
 if (form) form.reset();
 const noSizes = $('no-sizes-check');
 if (noSizes) noSizes.checked = true;
 const sizesWrap = $('sizes-wrap');
 if (sizesWrap) sizesWrap.classList.add('hidden');
 const otherWrap = $('category-other-wrap');
 if (otherWrap) otherWrap.classList.add('hidden');
 renderImageSlots();
 renderColors();
 renderSizes();
 renderMaterials();
 renderDetails();
 updatePreview();
}

function openReapply() {
 const m = $('reapply-modal');
 if (m) m.classList.add('is-open');
}
function closeReapply() {
 const m = $('reapply-modal');
 if (m) m.classList.remove('is-open');
}

async function handleReapplySubmit() {
 const btn = $('re-submit');
 if (btn) { btn.textContent = 'Resubmitting...'; btn.disabled = true; }
 try {
  const payload = {
   owner_name: $('re-owner-name')?.value.trim(),
   store_name: $('re-store-name')?.value.trim(),
   phone: $('re-phone')?.value.trim(),
   region: $('re-region')?.value.trim(),
   city: $('re-city')?.value.trim(),
   address: $('re-address')?.value.trim(),
   status: 'pending',
   rejection_reason: null
  };
  const { error } = await supa.from('vendor_applications').update(payload).eq('id', vendorApp.id);
  if (error) throw error;
  vendorApp = { ...vendorApp, ...payload, status: 'pending' };
  renderStatusBanner();
  closeReapply();
  showToast('Resubmitted for review ✓');
 } catch (err) {
  showToast(err.message);
 } finally {
  if (btn) { btn.textContent = 'Resubmit for review'; btn.disabled = false; }
 }
}

function setupCloseHandlers() {
 $('close-modal-btn')?.addEventListener('click', closeProductModal);
 $('cancel-modal-btn')?.addEventListener('click', closeProductModal);
 $('product-modal')?.addEventListener('click', e => { if (e.target.id === 'product-modal') closeProductModal(); });
 $('close-reapply')?.addEventListener('click', closeReapply);
 $('reapply-modal')?.addEventListener('click', e => { if (e.target.id === 'reapply-modal') closeReapply(); });
 $('perf-back-btn')?.addEventListener('click', () => showPage('products'));
 const toast = $('toast');
 if (toast && !toast.dataset.bound) {
  toast.addEventListener('click', function() { this.classList.remove('show'); });
  toast.dataset.bound = '1';
 }
}

// -------------------- INIT --------------------
document.addEventListener('DOMContentLoaded', async () => {
 if (window.lucide) window.lucide.createIcons();
 // Ensure notifications hidden on load - fix spill bug
 const _nd = document.getElementById('notif-dropdown');
 if (_nd) { _nd.style.display='none'; _nd.classList.remove('is-open'); }
 // Bell is now SVG, always visible
 setupCloseHandlers();

 const session = await checkVendorSession();
 if (!session) return;

 const app = await fetchVendorApp(session.user.id);
 if (!app) {
  window.location.href = 'vendor-auth.html';
  return;
 }

 vendorApp = app;
 vendorStatus = app.status || 'pending';

 // Clear fake data from old builds
 try {
   const oldOrders = JSON.parse(localStorage.getItem('pb_orders')||'[]');
   if (oldOrders.length > 0 && !oldOrders[0].vendor_user_id) {
     console.log('Clearing fake localStorage orders');
     localStorage.removeItem('pb_orders');
     localStorage.removeItem('pb_payouts');
     localStorage.removeItem('pb_balances');
     orders = [];
     payouts = [];
     balances = {available:0,pending:0,total:0};
   }
 } catch(e) {}

 renderStatusBanner();
 populateShopSettings(); // Fill settings from vendorApp immediately
 fetchNotifications(session.user.id);
 fetchEdits(session.user.id);
 await fetchMyProducts(session.user.id);
 await fetchStorefront();
 await fetchRealOrders(session.user.id); // Real orders only
 setupStorefrontListeners();
 populateShopSettings(); // Re-populate after products loaded


 // Nav
 $$('.nav-btn').forEach(btn => {
  if (btn.dataset.page) {
   btn.addEventListener('click', () => showPage(btn.dataset.page));
  }
 });

 // Add product buttons
 $('header-add-product-btn')?.addEventListener('click', () => { editingId = null; editingIndex = null; openProductModal(); });
 $('add-product-btn-2')?.addEventListener('click', () => { editingId = null; editingIndex = null; openProductModal(); });
 $('add-first-product-btn')?.addEventListener('click', () => { editingId = null; editingIndex = null; openProductModal(); });

 // Form
 ['product-title','product-price','product-desc'].forEach(id => {
  $(id)?.addEventListener('input', () => { updatePreview(); checkDirty(); });
 });
 $('product-category')?.addEventListener('change', handleCategoryChange);
 $('add-color-btn')?.addEventListener('click', addColor);
 $('no-sizes-check')?.addEventListener('change', toggleNoSizes);
 $('add-size-btn')?.addEventListener('click', addSize);
 $('size-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } });
 $('material-input')?.addEventListener('keydown', addMaterialFromInput);
 $('add-detail-btn')?.addEventListener('click', addDetail);
 $('preview-card-btn')?.addEventListener('click', () => setPreviewMode('card'));
 $('preview-page-btn')?.addEventListener('click', () => setPreviewMode('page'));
 $('save-shop-btn')?.addEventListener('click', async () => {
  shopSettings.name = $('setting-shop-name')?.value || shopSettings.name;
  saveAll();
  showToast('Shop settings saved');
 });

 // Mobile
 $('mobile-menu-btn')?.addEventListener('click', () => {
  $('sidebar')?.classList.toggle('open');
  $('sidebar-overlay')?.classList.toggle('show');
 });
 $('sidebar-overlay')?.addEventListener('click', () => {
  $('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('show');
 });

 // Product actions
 $('submit-product-btn')?.addEventListener('click', () => submitProduct(false));
 $('save-draft-btn')?.addEventListener('click', () => submitProduct(true));
 $('products-search')?.addEventListener('input', e => { currentSearch = e.target.value; renderProducts(); });
 $('products-sort')?.addEventListener('change', e => { currentSort = e.target.value; renderProducts(); });

 // Notifications - FIXED toggle
 const notifBtn = $('notif-btn');
 const notifDropdown = $('notif-dropdown');
 if (notifBtn && notifDropdown) {
  notifBtn.addEventListener('click', (e) => {
   e.stopPropagation();
   notifDropdown.classList.toggle('is-open');
  });
 }
 $('notif-mark-read')?.addEventListener('click', () => {
  notifications.forEach(n => n.read = true);
  localStorage.setItem('pb_vendor_notifs', JSON.stringify(notifications));
  renderNotifications();
 });
 document.addEventListener('click', (e) => {
  const d = $('notif-dropdown');
  const b = $('notif-btn');
  if (d && b && !d.contains(e.target) && !b.contains(e.target)) {
   d.classList.remove('is-open');
  }
 });

 $('re-submit')?.addEventListener('click', handleReapplySubmit);
 $('nav-logout')?.addEventListener('click', async () => {
  if (supa) await supa.auth.signOut();
  window.location.href = 'vendor-auth.html';
 });

 renderProducts();
 updateDashboard();
 showPage('dashboard');
 console.log('Vendor v5.4 CLEAN loaded — products', products.length, 'status', vendorStatus);
});

// Expose globals for inline onclick
window.editProduct = editProduct;
window.editProductById = editProductById;
window.deleteProduct = deleteProduct;
window.handleImageUpload = handleImageUpload;
window.addColor = addColor;
window.updateColor = updateColor;
window.removeColor = removeColor;
window.addSize = addSize;
window.removeSize = removeSize;
window.addMaterialFromInput = addMaterialFromInput;
window.removeMaterial = removeMaterial;
window.addDetail = addDetail;
window.updateDetail = updateDetail;
window.removeDetail = removeDetail;
window.setPreviewMode = setPreviewMode;
window.submitProduct = submitProduct;
window.viewProductStats = viewProductStats;
window.openReapply = openReapply;
window.dismissBanner = dismissBanner;
window.closeReapply = closeReapply;
