/* PLUSH BABES Admin — NEW FROM SCRATCH — clicks work, side panel for storefronts, supabase linked */
const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
let allVendors=[], filteredVendors=[], currentVendorFilter='pending', vendorSearch='';
let allStorefrontEdits=[], selectedStorefrontEdit=null;
let allProducts=[], currentProductFilter='pending', productSearch='';
let allEdits=[];
let allReviews=[], reviewSearch='', reviewSort='newest';

function showToast(msg){
  const t=$('toast'); if(!t) return;
  $('toast-msg').textContent=msg;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),3000);
}
function closeModal(){ $('detail-modal').classList.add('hidden'); }
function openModal(title, body, actions=''){
  $('modal-title').textContent=title;
  $('modal-body').innerHTML=body;
  $('modal-actions').innerHTML=actions;
  $('detail-modal').classList.remove('hidden');
  if(window.lucide) lucide.createIcons();
}

// AUTH
async function checkSession(){
  const {data:{session}} = await supa.auth.getSession();
  if(session){
    $('auth-screen').classList.add('hidden');
    $('admin-app').classList.remove('hidden');
    $('sidebar-user').textContent=session.user.email;
    await loadAll();
  }else{
    $('auth-screen').classList.remove('hidden');
    $('admin-app').classList.add('hidden');
  }
}

// LOAD ALL
async function loadAll(){
  $('header-pending-count').textContent='Loading...';
  await Promise.all([fetchVendors(), fetchStorefrontEdits(), fetchProducts(), fetchEdits(), fetchReviews(), fetchLiveStorefronts()]);
  renderCounts();
  renderDashboard();
  renderVendors();
  renderStorefronts();
  renderProducts();
  renderEdits();
  renderReviews();
  renderAllVendors();
  if(window.lucide) lucide.createIcons();
}

// COUNTS
function renderCounts(){
  const pv = allVendors.filter(v=>v.status==='pending').length;
  const ps = allStorefrontEdits.length;
  const pp = allProducts.filter(p=>p.status==='pending').length;
  const pe = allEdits.filter(e=>e.status==='pending' && e.edit_type!=='storefront').length;
  const total = pv+ps+pp+pe;
  $('header-pending-count').textContent = total+' pending';
  $('count-vendors').textContent=pv;
  $('count-storefronts').textContent=ps;
  $('count-products').textContent=pp;
  $('count-edits').textContent=pe;
  $('count-dashboard').textContent=total;
  $('count-reviews').textContent=allReviews.length;
  $('storefront-queue-count').textContent=ps+' pending';
}

function renderDashboard(){
  const statsEl=$('dashboard-stats'); if(!statsEl) return;
  const pv = allVendors.filter(v=>v.status==='pending').length;
  const ps = allStorefrontEdits.length;
  const pp = allProducts.filter(p=>p.status==='pending').length;
  const av = allVendors.filter(v=>v.status==='approved').length;
  statsEl.innerHTML = `
    <div class="card"><div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:700">Pending Vendors</div><div style="font-size:22px;font-weight:900;margin-top:4px">${pv}</div></div>
    <div class="card"><div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:700">Pending Storefronts</div><div style="font-size:22px;font-weight:900;margin-top:4px">${ps}</div></div>
    <div class="card"><div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:700">Pending Products</div><div style="font-size:22px;font-weight:900;margin-top:4px">${pp}</div></div>
    <div class="card"><div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:700">Approved Vendors</div><div style="font-size:22px;font-weight:900;margin-top:4px">${av}</div></div>
  `;
  const recentV = allVendors.filter(v=>v.status==='pending').slice(0,5);
  $('dash-recent-vendors').innerHTML = recentV.length ? recentV.map(v=>`<div class="row" data-vendor-id="${v.id}" style="padding:8px 10px"><div class="row-avatar" style="width:28px;height:28px;font-size:9px">${(v.store_name||'ST').slice(0,2).toUpperCase()}</div><div class="row-main"><div style="font-weight:700;font-size:12px">${v.store_name||'No name'}</div><div style="font-size:10px;color:#888">${v.owner_name||''} • ${v.city||''}</div></div><span class="badge pending">PENDING</span></div>`).join('') : '<div style="color:#999;font-size:11px;padding:8px">No pending vendors</div>';
  $('dash-recent-storefronts').innerHTML = allStorefrontEdits.slice(0,5).map(ed=>{
    const ch=ed.changes||{};
    return `<div class="row" data-storefront-id="${ed.id}" style="padding:8px 10px"><div class="row-avatar" style="width:28px;height:28px">${ch.logo_url?`<img src="${ch.logo_url}">`: (ch.display_name||'S').slice(0,1)}</div><div class="row-main"><div style="font-weight:700;font-size:12px">${ch.display_name||'Store'}</div><div style="font-size:10px;color:#888">${ed.vendor?.store_name||''}</div></div></div>`;
  }).join('') || '<div style="color:#999;font-size:11px;padding:8px">No pending</div>';
}

// FETCHERS
async function fetchVendors(){
  try{
    const {data,error}=await supa.from('vendor_applications').select('*').order('created_at',{ascending:false}).limit(300);
    if(error) throw error;
    allVendors=data||[];
  }catch(e){console.error('vendors',e.message); allVendors=[]}
}
async function fetchStorefrontEdits(){
  try{
    const {data,error}=await supa.from('vendor_edits').select('*').eq('edit_type','storefront').eq('status','pending').order('created_at',{ascending:false});
    if(error) throw error;
    allStorefrontEdits=data||[];
    for(let ed of allStorefrontEdits){
      try{
        const {data:v}=await supa.from('vendor_applications').select('store_name,owner_name,city').eq('id',ed.vendor_application_id).maybeSingle();
        if(v) ed.vendor=v;
      }catch{}
    }
  }catch(e){console.error('storefront edits',e.message); allStorefrontEdits=[]}
}
let liveStorefronts=[];
async function fetchLiveStorefronts(){
  try{
    const {data}=await supa.from('vendor_storefronts').select('*').eq('status','approved').order('updated_at',{ascending:false}).limit(30);
    liveStorefronts=data||[];
  }catch(e){liveStorefronts=[]}
}
async function fetchProducts(){
  try{
    const {data,error}=await supa.from('vendor_products').select('*').order('created_at',{ascending:false}).limit(300);
    if(error) throw error;
    allProducts=data||[];
  }catch(e){allProducts=[]}
}
async function fetchEdits(){
  try{
    const {data,error}=await supa.from('vendor_edits').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(error) throw error;
    allEdits=data||[];
    for(let ed of allEdits){
      try{
        const {data:v}=await supa.from('vendor_applications').select('store_name,owner_name').eq('id',ed.vendor_application_id).maybeSingle();
        if(v) ed.vendor=v;
      }catch{}
    }
  }catch(e){allEdits=[]}
}
async function fetchReviews(){
  try{
    const {data,error}=await supa.from('product_reviews').select('*, vendor_products(title)').order('created_at',{ascending:false}).limit(200);
    if(error) throw error;
    allReviews=data||[];
  }catch(e){console.error('reviews',e.message); allReviews=[]}
}

// RENDER VENDORS — clicks work via delegation
function renderVendors(){
  const list=$('vendors-list'); if(!list) return;
  let vendors = allVendors.filter(v=>v.status===currentVendorFilter);
  if(vendorSearch){
    vendors = vendors.filter(v=>(v.store_name||'').toLowerCase().includes(vendorSearch) || (v.owner_name||'').toLowerCase().includes(vendorSearch) || (v.email||'').toLowerCase().includes(vendorSearch));
  }
  if(!vendors.length){
    list.innerHTML=`<div style="padding:24px;text-align:center;color:#999;border:1px dashed #DDD;border-radius:12px">No ${currentVendorFilter} vendors</div>`;
    return;
  }
  list.innerHTML = vendors.map(v=>`
    <div class="row" data-vendor-id="${v.id}">
      <div class="row-avatar">${(v.store_name||'ST').slice(0,2).toUpperCase()}</div>
      <div class="row-main">
        <div class="row-title">${v.store_name||'Unnamed'} <span class="badge ${v.status}">${v.status.toUpperCase()}</span> <span style="font-size:10px;color:#999">${new Date(v.created_at).toLocaleDateString()}</span></div>
        <div class="row-sub">${v.owner_name||''} • ${v.email||''} • ${v.phone||''} • ${v.city||''}, ${v.region||''} • ${v.store_category||''}</div>
        <div class="row-sub">MoMo: ${v.momo_number||'-'} • Ghana: ${v.ghana_card_number||'-'}</div>
        ${v.store_description?`<div class="row-bio">${v.store_description.slice(0,160)}</div>`:''}
        <div class="row-actions">
          <button class="btn-white" data-action="view-vendor" data-id="${v.id}" style="font-size:11px">View Details</button>
          ${v.status!=='approved'?`<button class="btn-black" data-action="approve-vendor" data-id="${v.id}" style="font-size:11px;background:#059669">Approve</button>`:''}
          ${v.status!=='rejected'?`<button class="btn-white" data-action="reject-vendor" data-id="${v.id}" style="font-size:11px">Reject</button>`:''}
        </div>
      </div>
    </div>
  `).join('');
}

// RENDER STOREFRONTS WITH SIDE PANEL
function renderStorefronts(){
  const queue=$('storefront-queue'); if(!queue) return;
  if(!allStorefrontEdits.length){
    queue.innerHTML='<div style="padding:24px;text-align:center;color:#999;border:1px dashed #DDD;border-radius:12px">No pending storefronts</div>';
  }else{
    queue.innerHTML = allStorefrontEdits.map(ed=>{
      const ch=ed.changes||{}; const v=ed.vendor||{};
      const isSelected = selectedStorefrontEdit && selectedStorefrontEdit.id===ed.id;
      return `
        <div class="row ${isSelected?'selected':''}" data-storefront-id="${ed.id}" style="${isSelected?'border-color:#000;background:#FAFAFA':''}">
          <div class="row-avatar" style="width:56px;height:56px;border-radius:50%">${ch.logo_url?`<img src="${ch.logo_url}">`: (ch.display_name||'ST').slice(0,2).toUpperCase()}</div>
          <div class="row-main">
            <div class="row-title">${ch.display_name||'No name'} <span class="badge pending">PENDING</span></div>
            <div class="row-sub">${ch.tagline||''} • ${v.city||''} • ${v.store_name||''}</div>
            <div class="row-bio">${ch.bio||''}</div>
            <div style="font-size:10px;color:#999;margin-top:4px">${new Date(ed.created_at).toLocaleString()} • ${ed.id.slice(0,8)}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  // live
  const liveList=$('storefronts-live-list');
  if(liveList){
    liveList.innerHTML = liveStorefronts.map(sf=>`
      <div class="row" style="padding:10px"><div class="row-avatar" style="width:40px;height:40px">${sf.logo_url?`<img src="${sf.logo_url}">`:''}</div><div class="row-main"><div class="row-title">${sf.display_name||'Store'} <span class="badge approved">LIVE</span></div><div class="row-sub">${sf.tagline||''}</div></div></div>
    `).join('') || '<div style="color:#999;font-size:11px">No live storefronts</div>';
  }
}

function renderStorefrontSide(ed){
  const empty=$('storefront-side-empty');
  const content=$('storefront-side-content');
  if(!ed){ empty.classList.remove('hidden'); content.classList.add('hidden'); return; }
  const ch=ed.changes||{}; const v=ed.vendor||{};
  empty.classList.add('hidden');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="side-header"><div style="font-weight:800;font-size:13px">Preview: ${ch.display_name||'Store'}</div><span class="badge pending">PENDING EDIT</span></div>
    <div class="side-cover">${ch.cover_url?`<img src="${ch.cover_url}">`: '<div style="width:100%;height:100%;background:linear-gradient(135deg,#FF8EBA,#000);display:grid;place-items:center;color:#FFF;font-weight:800">COVER</div>'}</div>
    <div class="side-logo">${ch.logo_url?`<img src="${ch.logo_url}">`: (ch.display_name||'ST').slice(0,2).toUpperCase()}</div>
    <div class="side-body">
      <div style="font-weight:900;font-size:16px;margin-top:8px">${ch.display_name||'Unnamed'} ${ch.custom_badge?`<span style="font-size:9px;background:#000;color:#FFF;padding:2px 6px;border-radius:10px;margin-left:6px">${ch.custom_badge}</span>`:''}</div>
      <div style="font-size:11px;color:#666;margin-top:2px">${ch.tagline||''}</div>
      <div style="font-size:11px;color:#888;margin-top:4px">Vendor: ${v.store_name||ed.vendor_application_id?.slice(0,8)} • ${v.owner_name||''} • ${v.city||''}</div>
      <div style="margin-top:10px;font-size:11px;background:#FAFAFA;padding:10px;border-radius:8px;white-space:pre-wrap">${ch.bio||'No bio'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        ${ch.instagram_url?`<a href="${ch.instagram_url}" target="_blank" style="font-size:10px;background:#000;color:#FFF;padding:5px 10px;border-radius:20px;text-decoration:none">IG</a>`:''}
        ${ch.tiktok_url?`<a href="${ch.tiktok_url}" target="_blank" style="font-size:10px;background:#000;color:#FFF;padding:5px 10px;border-radius:20px;text-decoration:none">TikTok</a>`:''}
        ${ch.website_url?`<a href="${ch.website_url}" target="_blank" style="font-size:10px;border:1px solid #EEE;padding:5px 10px;border-radius:20px;text-decoration:none;color:#000">Website</a>`:''}
        ${ch.cover_url?`<a href="${ch.cover_url}" target="_blank" style="font-size:10px;border:1px solid #EEE;padding:5px 10px;border-radius:20px;text-decoration:none;color:#000">Cover</a>`:''}
        ${ch.logo_url?`<a href="${ch.logo_url}" target="_blank" style="font-size:10px;border:1px solid #EEE;padding:5px 10px;border-radius:20px;text-decoration:none;color:#000">Logo</a>`:''}
      </div>
      <div style="margin-top:12px;padding:10px;background:#FFF;border:1px solid #EEE;border-radius:8px"><div style="font-size:10px;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:6px">Raw JSON</div><pre style="font-size:10px;white-space:pre-wrap;max-height:200px;overflow:auto">${JSON.stringify(ch,null,2)}</pre></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn-black" data-action="approve-storefront" data-id="${ed.id}" style="flex:1;background:#059669;height:40px">Approve & Go Live</button>
        <button class="btn-white" data-action="reject-storefront" data-id="${ed.id}" style="flex:1;height:40px">Reject</button>
      </div>
      <div style="font-size:10px;color:#999;margin-top:8px">Edit ID: ${ed.id} • Created: ${new Date(ed.created_at).toLocaleString()}</div>
    </div>
  `;
  if(window.lucide) lucide.createIcons();
}

// PRODUCTS
function renderProducts(){
  const list=$('products-list'); if(!list) return;
  let products = allProducts.filter(p=>p.status===currentProductFilter);
  if(productSearch){
    products = products.filter(p=>(p.title||'').toLowerCase().includes(productSearch) || (p.category||'').toLowerCase().includes(productSearch));
  }
  if(!products.length){ list.innerHTML=`<div style="padding:24px;text-align:center;color:#999;border:1px dashed #DDD;border-radius:12px">No ${currentProductFilter} products</div>`; return; }
  list.innerHTML = products.map(p=>`
    <div class="row" data-product-id="${p.id}">
      <div class="row-avatar" style="width:56px;height:56px;border-radius:8px">${(p.images&&p.images[0])?`<img src="${p.images[0]}">`:'📦'}</div>
      <div class="row-main">
        <div class="row-title">${p.title||'Untitled'} <span class="badge ${p.status}">${(p.status||'pending').toUpperCase()}</span> <span style="font-size:11px;font-weight:800">GHS ${p.price||0}</span></div>
        <div class="row-sub">${p.category||''} • Stock: ${p.stock||0} • Vendor: ${p.vendor_application_id?.slice(0,8)||p.user_id?.slice(0,8)||''}</div>
        <div class="row-sub">${(p.description||'').slice(0,120)}</div>
        <div class="row-actions">
          <button class="btn-white" data-action="view-product" data-id="${p.id}" style="font-size:11px">View</button>
          ${p.status!=='approved'?`<button class="btn-black" data-action="approve-product" data-id="${p.id}" style="font-size:11px;background:#059669">Approve</button>`:''}
          ${p.status!=='rejected'?`<button class="btn-white" data-action="reject-product" data-id="${p.id}" style="font-size:11px">Reject</button>`:''}
        </div>
      </div>
    </div>
  `).join('');
}

// EDITS
function renderEdits(){
  const list=$('edits-list'); if(!list) return;
  const edits = allEdits.filter(e=>e.edit_type!=='storefront');
  if(!edits.length){ list.innerHTML='<div style="padding:24px;text-align:center;color:#999;border:1px dashed #DDD;border-radius:12px">No pending shop edits</div>'; return; }
  list.innerHTML = edits.map(ed=>{
    const ch=ed.changes||{};
    return `
      <div class="row" data-edit-id="${ed.id}">
        <div class="row-avatar">✏️</div>
        <div class="row-main">
          <div class="row-title">${ed.edit_type} <span class="badge pending">PENDING</span> <span style="font-size:10px;color:#999">${new Date(ed.created_at).toLocaleString()}</span></div>
          <div class="row-sub">Vendor: ${ed.vendor?.store_name||ed.vendor_application_id?.slice(0,8)||''} • ${ed.id.slice(0,8)}</div>
          <div class="row-bio">${JSON.stringify(ch).slice(0,400)}</div>
          <div class="row-actions">
            <button class="btn-black" data-action="approve-edit" data-id="${ed.id}" style="font-size:11px;background:#059669">Approve</button>
            <button class="btn-white" data-action="reject-edit" data-id="${ed.id}" style="font-size:11px">Reject</button>
            <button class="btn-white" data-action="view-edit" data-id="${ed.id}" style="font-size:11px">View JSON</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// REVIEWS
function renderReviews(){
  const list=$('reviews-list'); if(!list) return;
  let reviews=[...allReviews];
  if(reviewSearch){
    reviews = reviews.filter(r=>(r.comment||'').toLowerCase().includes(reviewSearch) || (r.user_name||'').toLowerCase().includes(reviewSearch) || (r.vendor_products?.title||'').toLowerCase().includes(reviewSearch));
  }
  if(reviewSort==='oldest') reviews.sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
  else if(reviewSort==='rating-high') reviews.sort((a,b)=> (b.rating||0)-(a.rating||0));
  else if(reviewSort==='rating-low') reviews.sort((a,b)=> (a.rating||0)-(b.rating||0));
  else reviews.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));

  if(!reviews.length){ list.innerHTML='<div style="padding:24px;text-align:center;color:#999;border:1px dashed #DDD;border-radius:12px">No reviews</div>'; return; }
  list.innerHTML = reviews.map(r=>`
    <div class="row" data-review-id="${r.id}" style="cursor:default">
      <div class="row-avatar" style="width:36px;height:36px;font-size:11px">${(r.user_name||r.user_id||'U').slice(0,1).toUpperCase()}</div>
      <div class="row-main">
        <div class="row-title">${r.user_name||'User'} <span style="font-size:11px">${'⭐'.repeat(r.rating||5)}</span> <span style="font-size:10px;color:#888">${new Date(r.created_at).toLocaleDateString()}</span> ${r.is_edited?'<span style="font-size:9px;background:#FFF7ED;border:1px solid #FDE68A;padding:2px 6px;border-radius:10px">EDITED</span>':''} ${r.edited_at?`<span style="font-size:9px;color:#999">${new Date(r.edited_at).toLocaleDateString()} edited</span>`:''}</div>
        <div style="font-size:12px;margin-top:4px;white-space:pre-wrap">${r.comment||''}</div>
        ${r.vendor_products?`<div style="font-size:10px;color:#888;margin-top:4px">Product: <b style="color:#000">${r.vendor_products.title||''}</b></div>`:''}
        <div class="row-actions">
          <button class="btn-white" data-action="delete-review" data-id="${r.id}" style="font-size:11px;color:#DC2626">Delete</button>
          <button class="btn-white" data-action="view-review" data-id="${r.id}" style="font-size:11px">View JSON</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderAllVendors(){
  const list=$('all-vendors-list'); if(!list) return;
  const vendors=allVendors.slice(0,200);
  if(!vendors.length){ list.innerHTML='<div style="color:#999">No vendors</div>'; return; }
  list.innerHTML = vendors.map(v=>`
    <div class="row" data-vendor-id="${v.id}"><div class="row-avatar">${(v.store_name||'ST').slice(0,2).toUpperCase()}</div><div class="row-main"><div class="row-title">${v.store_name||''} <span class="badge ${v.status}">${v.status}</span></div><div class="row-sub">${v.owner_name||''} • ${v.email||''} • ${v.city||''}</div></div><button class="btn-white" data-action="view-vendor" data-id="${v.id}" style="font-size:11px">View</button></div>
  `).join('');
}

// ACTION HANDLERS — delegation makes clicks work
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-action]');
  if(!btn) {
    // check row click for storefront preview
    const sfRow = e.target.closest('[data-storefront-id]');
    if(sfRow && !e.target.closest('button')){
      const id = sfRow.dataset.storefrontId;
      const ed = allStorefrontEdits.find(x=>x.id===id);
      if(ed){
        selectedStorefrontEdit=ed;
        document.querySelectorAll('[data-storefront-id]').forEach(el=>el.style.borderColor='rgba(0,0,0,0.08)');
        sfRow.style.borderColor='#000';
        renderStorefrontSide(ed);
        renderStorefronts(); // re-render to highlight
        renderStorefrontSide(ed); // keep side
        if(window.innerWidth<1000){
          $('storefront-side-panel')?.scrollIntoView({behavior:'smooth'});
        }
      }
    }
    return;
  }
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  e.stopPropagation();

  // VENDORS
  if(action==='view-vendor'){
    const v=allVendors.find(x=>x.id===id); if(!v) return;
    const body=`
      <div class="kv"><b>Store</b><span>${v.store_name||''}</span></div>
      <div class="kv"><b>Owner</b><span>${v.owner_name||''}</span></div>
      <div class="kv"><b>Email</b><span>${v.email||''} / ${v.phone||''}</span></div>
      <div class="kv"><b>Location</b><span>${v.city||''}, ${v.region||''} • ${v.address||''}</span></div>
      <div class="kv"><b>GPS</b><span>${v.gps||''}</span></div>
      <div class="kv"><b>MoMo</b><span>${v.momo_number||''} (${v.momo_name||''})</span></div>
      <div class="kv"><b>Category</b><span>${v.store_category||''}</span></div>
      <div class="kv"><b>Status</b><span><span class="badge ${v.status}">${v.status}</span></span></div>
      <div class="kv"><b>Description</b><span>${v.store_description||''}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        ${v.ghana_card_front_url?`<a href="${v.ghana_card_front_url}" target="_blank"><img src="${v.ghana_card_front_url}" style="width:100%;border-radius:8px;border:1px solid #EEE"></a>`:''}
        ${v.ghana_card_back_url?`<a href="${v.ghana_card_back_url}" target="_blank"><img src="${v.ghana_card_back_url}" style="width:100%;border-radius:8px;border:1px solid #EEE"></a>`:''}
        ${v.selfie_url?`<a href="${v.selfie_url}" target="_blank"><img src="${v.selfie_url}" style="width:100%;border-radius:8px;border:1px solid #EEE"></a>`:''}
        ${v.shop_photo_url?`<a href="${v.shop_photo_url}" target="_blank"><img src="${v.shop_photo_url}" style="width:100%;border-radius:8px;border:1px solid #EEE"></a>`:''}
      </div>
    `;
    openModal(`Vendor: ${v.store_name||''}`, body, `<button class="btn-white" onclick="closeModal()">Close</button><button class="btn-black" style="background:#059669" data-action="approve-vendor" data-id="${v.id}">Approve</button><button class="btn-white" data-action="reject-vendor" data-id="${v.id}">Reject</button>`);
  }
  if(action==='approve-vendor'){
    if(!confirm('Approve this vendor?')) return;
    try{
      await supa.from('vendor_applications').update({status:'approved', reviewed_at:new Date().toISOString()}).eq('id',id);
      const v=allVendors.find(x=>x.id===id);
      if(v){ try{ await supa.from('vendor_notifications').insert({user_id:v.user_id, vendor_application_id:v.id, title:'Vendor approved ✓', message:`Your store ${v.store_name} approved!`, type:'vendor_approved', read:false}); }catch{} }
      showToast('Vendor approved ✓'); await fetchVendors(); renderVendors(); renderCounts(); renderDashboard(); renderAllVendors();
    }catch(err){ showToast('Failed: '+err.message)}
  }
  if(action==='reject-vendor'){
    const reason=prompt('Reject reason?'); if(reason===null) return;
    try{
      await supa.from('vendor_applications').update({status:'rejected', reviewer_notes:reason, reviewed_at:new Date().toISOString()}).eq('id',id);
      showToast('Vendor rejected'); await fetchVendors(); renderVendors(); renderCounts();
    }catch(err){ showToast('Failed: '+err.message)}
  }

  // STOREFRONT
  if(action==='approve-storefront'){
    if(!confirm('Approve storefront? It will go live on marketplace.')) return;
    btn.textContent='Approving...'; btn.disabled=true;
    try{
      const {data:edit}=await supa.from('vendor_edits').select('*').eq('id',id).maybeSingle();
      if(!edit) throw new Error('Edit not found');
      const changes=edit.changes||{}; changes.status='approved'; changes.updated_at=new Date().toISOString();
      if(!changes.vendor_application_id) changes.vendor_application_id=edit.vendor_application_id;
      if(!changes.user_id) changes.user_id=edit.user_id;
      const {data:existing}=await supa.from('vendor_storefronts').select('id').eq('vendor_application_id',edit.vendor_application_id).maybeSingle();
      if(existing){ await supa.from('vendor_storefronts').update(changes).eq('id',existing.id); }
      else{ await supa.from('vendor_storefronts').insert(changes); }
      await supa.from('vendor_edits').update({status:'approved', reviewed_at:new Date().toISOString()}).eq('id',id);
      try{ await supa.from('vendor_notifications').insert({user_id:edit.user_id, vendor_application_id:edit.vendor_application_id, title:'Storefront approved ✓', message:`Your storefront ${changes.display_name||''} is live!`, type:'storefront_approved', read:false}); }catch{}
      showToast('Storefront live ✓'); await fetchStorefrontEdits(); await fetchLiveStorefronts(); selectedStorefrontEdit=null; renderStorefronts(); renderStorefrontSide(null); renderCounts();
    }catch(err){ showToast('Approve failed: '+err.message); btn.textContent='Approve & Go Live'; btn.disabled=false; }
  }
  if(action==='reject-storefront'){
    const reason=prompt('Reject reason?'); if(reason===null) return;
    try{
      await supa.from('vendor_edits').update({status:'rejected', reviewer_notes:reason, reviewed_at:new Date().toISOString()}).eq('id',id);
      showToast('Storefront rejected'); await fetchStorefrontEdits(); renderStorefronts(); renderCounts(); renderStorefrontSide(null);
    }catch(err){ showToast('Reject failed: '+err.message)}
  }

  // PRODUCTS
  if(action==='view-product'){
    const p=allProducts.find(x=>x.id===id); if(!p) return;
    const body=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">${(p.images||[]).map(img=>`<img src="${img}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;border:1px solid #EEE">`).join('')}</div><div class="kv"><b>Title</b><span>${p.title||''}</span></div><div class="kv"><b>Price</b><span>GHS ${p.price||0}</span></div><div class="kv"><b>Category</b><span>${p.category||''}</span></div><div class="kv"><b>Status</b><span><span class="badge ${p.status}">${p.status}</span></span></div><div class="kv"><b>Desc</b><span>${p.description||''}</span></div>`;
    openModal(p.title||'Product', body, `<button class="btn-white" onclick="closeModal()">Close</button><button class="btn-black" style="background:#059669" data-action="approve-product" data-id="${p.id}">Approve</button>`);
  }
  if(action==='approve-product'){
    if(!confirm('Approve product?')) return;
    try{ await supa.from('vendor_products').update({status:'approved', updated_at:new Date().toISOString()}).eq('id',id); showToast('Product approved ✓'); await fetchProducts(); renderProducts(); renderCounts(); }catch(err){ showToast('Failed: '+err.message)}
  }
  if(action==='reject-product'){
    const reason=prompt('Reject reason?'); if(reason===null) return;
    try{ await supa.from('vendor_products').update({status:'rejected', reviewer_notes:reason}).eq('id',id); showToast('Product rejected'); await fetchProducts(); renderProducts(); renderCounts(); }catch(err){ showToast('Failed: '+err.message)}
  }

  // EDITS
  if(action==='view-edit'){
    const ed=allEdits.find(x=>x.id===id); if(!ed) return;
    openModal(`${ed.edit_type} edit`, `<pre style="white-space:pre-wrap;font-size:11px;background:#FAFAFA;padding:12px;border-radius:8px">${JSON.stringify(ed,null,2)}</pre>`, `<button class="btn-white" onclick="closeModal()">Close</button>`);
  }
  if(action==='approve-edit'){
    if(!confirm('Approve this edit?')) return;
    try{
      const {data:ed}=await supa.from('vendor_edits').select('*').eq('id',id).maybeSingle();
      if(!ed) throw new Error('Not found');
      const ch=ed.changes||{};
      if(ed.edit_type==='shop_settings' || ed.edit_type==='settings'){
        await supa.from('vendor_applications').update({...ch, updated_at:new Date().toISOString()}).eq('id',ed.vendor_application_id);
      }
      await supa.from('vendor_edits').update({status:'approved', reviewed_at:new Date().toISOString()}).eq('id',id);
      showToast('Edit approved ✓'); await fetchEdits(); await fetchVendors(); renderEdits(); renderVendors(); renderCounts();
    }catch(err){ showToast('Failed: '+err.message)}
  }
  if(action==='reject-edit'){
    const reason=prompt('Reject reason?'); if(reason===null) return;
    try{ await supa.from('vendor_edits').update({status:'rejected', reviewer_notes:reason, reviewed_at:new Date().toISOString()}).eq('id',id); showToast('Edit rejected'); await fetchEdits(); renderEdits(); renderCounts(); }catch(err){ showToast('Failed: '+err.message)}
  }

  // REVIEWS
  if(action==='view-review'){
    const r=allReviews.find(x=>x.id===id); if(!r) return;
    openModal('Review JSON', `<pre style="white-space:pre-wrap;font-size:11px;background:#FAFAFA;padding:12px;border-radius:8px">${JSON.stringify(r,null,2)}</pre>`, `<button class="btn-white" onclick="closeModal()">Close</button>`);
  }
  if(action==='delete-review'){
    if(!confirm('Delete this review?')) return;
    try{ await supa.from('product_reviews').delete().eq('id',id); showToast('Review deleted'); await fetchReviews(); renderReviews(); renderCounts(); }catch(err){ showToast('Delete failed: '+err.message)}
  }
});

// FILTERS — working
document.addEventListener('click', (e)=>{
  const btn=e.target.closest('.filter-btn');
  if(!btn) return;
  const group = btn.closest('.filter-group');
  if(!group) return;
  group.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(group.dataset.filterGroup==='vendor'){
    currentVendorFilter=btn.dataset.filter;
    renderVendors();
  }
  if(btn.dataset.pfilter){
    currentProductFilter=btn.dataset.pfilter;
    renderProducts();
  }
});

$('vendor-search')?.addEventListener('input', (e)=>{ vendorSearch=e.target.value.toLowerCase(); renderVendors(); });
$('product-search')?.addEventListener('input', (e)=>{ productSearch=e.target.value.toLowerCase(); renderProducts(); });
$('review-search')?.addEventListener('input', (e)=>{ reviewSearch=e.target.value.toLowerCase(); renderReviews(); });
$('review-sort')?.addEventListener('change', (e)=>{ reviewSort=e.target.value; renderReviews(); });

// TABS
document.getElementById('sidebar-nav')?.addEventListener('click', (e)=>{
  const btn=e.target.closest('[data-tab]'); if(!btn) return;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const tab=btn.dataset.tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
});

$('modal-close')?.addEventListener('click', closeModal);
$('detail-modal')?.addEventListener('click', (e)=>{ if(e.target.id==='detail-modal') closeModal(); });
$('admin-login-btn')?.addEventListener('click', async ()=>{
  const email=$('admin-email').value.trim();
  const pass=$('admin-pass').value;
  const errEl=$('auth-error');
  if(!email||!pass){ errEl.textContent='Enter email & password'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');
  $('admin-login-btn').textContent='Logging in...';
  const {error}=await supa.auth.signInWithPassword({email,password:pass});
  $('admin-login-btn').textContent='Login to Admin';
  if(error){ errEl.textContent=error.message; errEl.classList.remove('hidden'); return; }
  await checkSession();
});
$('logout-btn')?.addEventListener('click', async ()=>{ await supa.auth.signOut(); location.reload(); });
$('refresh-btn')?.addEventListener('click', loadAll);
$('toggle-pass')?.addEventListener('click', ()=>{
  const inp=$('admin-pass'); inp.type = inp.type==='password'?'text':'password';
});

// INIT
document.addEventListener('DOMContentLoaded', ()=>{
  checkSession();
  if(window.lucide) lucide.createIcons();
});
