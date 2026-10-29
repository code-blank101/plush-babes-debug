/* =====================================================================
PLUSH.JS - SINGLE FILE ALL COMPONENTS READ FROM
Put this in: plush-babes/public/js/plush.js
Then in EVERY HTML page, just add:
<script src="https://unpkg.com/lucide@latest"></script>
<script src="/public/js/plush.js"></script> at bottom before </body>
===================================================================== */
/* 0) SUPABASE CLIENT - real auth + real products */
const SUPABASE_URL = "https://nkrvaaiasynlsfupdszq.supabase.co";
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnZhYWlhc3lubHNmdXBkc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI2MjYsImV4cCI6MjEwMDAzODYyNn0.Ag0mZOMwMtSgbB2zW818X7fD0yOaqufls0ib2nCtlQI";
const supa = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
function $(id){ return document.getElementById(id); }
function showMainSkeleton(){
const sk = document.getElementById('productGridSkeleton');
const grid = document.getElementById('productGrid');
const bubbleSk = document.getElementById('bubbleSkeleton');
const bubbleCont = document.getElementById('bubbleContainer');
const initSk = document.getElementById('plush-initial-skeleton');
if(sk) sk.classList.remove('hidden');
if(grid) grid.classList.add('hidden');
if(bubbleSk) bubbleSk.classList.remove('hidden');
if(bubbleCont) bubbleCont.classList.add('hidden');
if(initSk) initSk.style.display='block';
const noProd = document.getElementById('noProductsSection');
if(noProd) noProd.classList.add('hidden');
}
function hideMainSkeleton(){
const sk = document.getElementById('productGridSkeleton');
const bubbleSk = document.getElementById('bubbleSkeleton');
const bubbleCont = document.getElementById('bubbleContainer');
const initSk = document.getElementById('plush-initial-skeleton');
const grid = document.getElementById('productGrid');
if(sk) sk.classList.add('hidden');
if(bubbleSk) bubbleSk.classList.add('hidden');
if(bubbleCont) bubbleCont.classList.remove('hidden');
if(initSk) initSk.style.display='none';
if(grid) grid.classList.remove('hidden');
}
function getWishlistItems(){
try{ return JSON.parse(localStorage.getItem('pb_wishlist')||'[]'); }catch{ return []; }
}
function saveWishlistItems(wl){
try{
localStorage.setItem('pb_wishlist', JSON.stringify(wl));
localStorage.setItem('pb_wishlist_items', JSON.stringify(wl));
}catch(e){}
}
function getWishlistGroups(){
try{ return JSON.parse(localStorage.getItem('pb_wishlist_groups')||'[]'); }catch{ return []; }
}
function saveWishlistGroups(g){
try{ localStorage.setItem('pb_wishlist_groups', JSON.stringify(g)); }catch(e){}
}
function dedupeTickers(){
try{
const vps=document.querySelectorAll('.ticker-viewport');
if(vps.length>1){ vps.forEach((el,i)=>{ if(i>0) el.remove(); }); }
}catch(e){}
}
function refreshLucide(){
try{
if(window.lucide && window.lucide.createIcons){
window.lucide.createIcons();
} else {
if(!document.querySelector('script[data-lucide]')){
const sc = document.createElement('script');
sc.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
sc.setAttribute('data-lucide','1');
sc.onload = () => { if(window.lucide) window.lucide.createIcons(); };
document.head.appendChild(sc);
}
}
}catch(e){}
}
/* =====================================================================
STATE - PRODUCTS (REAL, NO DUMMY)
===================================================================== */
let allApprovedProducts = [];
let filteredProducts = [];
let currentSearch = "";
let currentCategoryFilter = "";
let currentRegionFilter = "__all__"; // FIX: default Stores around me • Accra, not filtered
let currentPriceMin = "";
let currentPriceMax = "";
let currentSort = "newest";
let activeCategory = null;
let categoryFilterActive = false;
let activeBubbleEl = null;
let searchScreenEl, mainContentEl, searchScreenGridEl, searchScreenNoResultsEl, searchScreenTitleEl, searchScreenSubEl, searchScreenCountEl,
searchFilterCategoriesEl, searchFilterRegionsEl;
const GH_REGIONS = ["Accra - All Areas","East Legon","Osu / Oxford","Spintex / Sakumono","Tema","Madina / Adenta","Kaneshie / Circle","Achimota / Lapaz","Labone / Cantonments","Airport / Dzorwulu","Dansoman / Weija","Teshie / Nungua"];
const ACCRA_AREAS = GH_REGIONS;
const ACCRA_DEFAULT_LABEL = "Stores around me • Accra";
let wishlist = JSON.parse(localStorage.getItem('pb_wishlist')||'[]');
let bag = JSON.parse(localStorage.getItem('pb_bag')||'[]');
let allReviews = [];
let reviewsByProduct = {};
let vendorMap = {}; // vendor_application_id -> vendor
let vendorByUserId = {}; // user_id -> vendor
let userDetectedRegion = localStorage.getItem('pb_user_region') || 'Greater Accra';
/* =====================================================================
DATA
===================================================================== */
const CATEGORIES = [
"Women clothing", "Kids & Baby", "Beauty", "Shoes", "Bags & Luggage",
"Jewelry & Accessories", "Home & Living", "Electronics",
"Phones & Accessories", "Sports & Fitness", "Health & Personal Care",
"Toys & Games", "Stationery & School", "Pet Supplies", "Automotive",
"Travel", "Party & Events", "Wedding", "Groceries & Food", "Tools & DIY",
"Outdoor & Garden", "Office Supplies", "Furniture", "New Arrivals",
"Trending", "Best Sellers", "Flash Sale", "Kitchen essentials",
"Room decoration items", "Beauty Appliances", "Gifts"
];
const SUGGESTIONS = [
"Nails acrylic set", "Bags mini croc", "Shoes chunky heels",
"Wigs frontal lace", "Kids matching set", "Curve bodycon dress",
"Beachwear crochet coverup", "Dresses satin slip", "Jackets puffer"
];
const TYPING_WORDS = ["Nails", "Bags", "Shoes", "Wigs", "Kids", "Curve", "Beachwear"];
const TICKER_ITEMS = [
"EARLY ACCESS NOW OPEN", "WISHLIST GROUPS", "GROUPAY — SPLIT ANY ORDER",
"PINTEREST TAILORED FEED", "FOUNDING VENDOR APPLICATIONS OPEN",
"🇬🇭 MADE IN GHANA"
];
const CATEGORY_IMAGES = {};
function categoryImageMarkup(cat) {
const src = CATEGORY_IMAGES[cat];
if(src){
return `<img src="${src}" alt="${cat}" class="logo-cat-img" style="width:36px;height:36px;border-radius:8px;object-fit:cover;background:#F5F5F5;flex-shrink:0" />`;
}
// fallback: letter badge with category initial
const letter = (cat||'C').trim().slice(0,1).toUpperCase();
const colors = ['#FF8EBA','#111','#F5F5F5','#FFE4EF','#000'];
const idx = cat.length % colors.length;
return `<span class="logo-cat-imgbox" style="width:36px;height:36px;border-radius:8px;background:${colors[idx]==='#111'||colors[idx]==='#000' ? '#111' : '#F5F5F5'};color:${colors[idx]==='#111'||colors[idx]==='#000' ? '#FFF' : '#111'};display:grid;place-items:center;font-weight:800;font-size:12px;flex-shrink:0;border:1px solid rgba(0,0,0,0.06)">${letter}</span>`;
}
function buildCategoryCardList() {
const rows = CATEGORIES.map(cat => ` <button data-category="${cat}" class="logo-cat-item ${cat === activeCategory ? 'is-active' : ''}"> ${categoryImageMarkup(cat)} <span> <span class="logo-cat-name">${cat}</span> <span class="logo-cat-ads">0 ads</span> </span> </button> `).join('');
return rows + `<div class="logo-cat-scrollhint">Scroll to see more</div>`;
}
/* =====================================================================
REAL PRODUCT FETCH + RENDER (FIXES YOUR DUMMY VIEW/SALES ISSUE)
===================================================================== */
async function fetchApprovedProducts(){
showMainSkeleton();
if(!supa){
console.warn('Supabase not ready');
hideMainSkeleton();
showNoProductsYet();
return;
}
try{
const { data, error } = await supa.from('vendor_products').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(150);
if(error) throw error;
allApprovedProducts = data||[];
console.log(`REAL: Fetched ${allApprovedProducts.length} approved products`);
// FIX: re-render dropdown counts + ticker after real products load
try{ renderCategoriesDropdownPanel(); }catch(e){}
try{ renderTickerReal(); }catch(e){}
try{ renderCategories(); }catch(e){}
// Fetch vendors for storefront links
try{
const { data: vendors } = await supa.from('vendor_applications').select('id, store_name, city, region, owner_name, status').eq('status','approved').limit(200);
if(vendors){
vendors.forEach(v=>{ vendorMap[v.id]=v; });
}
const userIds = [...new Set(allApprovedProducts.map(p=>p.user_id).filter(Boolean))];
if(userIds.length){
const { data: byUser } = await supa.from('vendor_applications').select('id, store_name, city, region, owner_name, status, user_id').in('user_id',
userIds).eq('status','approved');
if(byUser) byUser.forEach(v=>{ vendorByUserId[v.user_id]=v; if(!vendorMap[v.id]) vendorMap[v.id]=v; });
}
// Fetch which vendors have storefronts (only show link if has storefront)
try{
const { data: sfs } = await supa.from('vendor_storefronts').select('vendor_application_id').eq('status','approved').limit(500);
if(sfs){
window.vendorsWithStorefront = new Set(sfs.map(s=>s.vendor_application_id));
console.log('Vendors with storefront:', window.vendorsWithStorefront.size);
}
}catch(e){ console.log('storefront check', e.message); }
}catch(e){ console.log('vendor fetch', e.message); }
updateCategoryAdCounts();
await fetchAllReviews();
populateRegionSelects();
detectUserRegion().then(()=>{});
updateHeaderCounts();
if(window.renderMobileCategories) window.renderMobileCategories();
if(window.updateMobileActiveFilters) window.updateMobileActiveFilters();
if(allApprovedProducts.length===0){
showNoProductsYet();
} else {
applyProductFilters();
}
renderTickerReal();
try{ document.dispatchEvent(new CustomEvent('plushProductsLoaded')); }catch(e){}
try{ if(window.renderClaudeSearch) window.renderClaudeSearch(); }catch(e){}
try{ if(window.syncRealProducts) window.syncRealProducts(); }catch(e){}
}catch(e){
console.error('Failed to fetch approved products:', e.message);
hideMainSkeleton();
showNoProductsYet();
}
}
function getVendorForProduct(p){
if(p.vendor_application_id && vendorMap[p.vendor_application_id]) return vendorMap[p.vendor_application_id];
if(p.user_id && vendorByUserId[p.user_id]) return vendorByUserId[p.user_id];
return null;
}
function updateCategoryAdCounts(){
// Count real products per category
const counts = {};
allApprovedProducts.forEach(p=>{
const cat = (p.category||'').toLowerCase();
counts[cat] = (counts[cat]||0)+1;
});
// Re-render dropdown with real counts
const panel = $('categoriesDropdownPanel');
if(panel && panel.innerHTML){
// Will be re-rendered on next open
}
}
// ===== REGIONS (default Stores around me • Accra) =====
async function detectUserRegion(){
try{
const res = await fetch('https://ipapi.co/json/');
const data = await res.json();
userDetectedRegion = "Accra";
localStorage.setItem('pb_user_region', userDetectedRegion);
localStorage.setItem('pb_user_city', data.city || 'Accra');
}catch(e){
userDetectedRegion = "Accra";
}
const label = document.getElementById('currentRegionLabel');
if(label) label.textContent = ACCRA_DEFAULT_LABEL;
const detectedLabel = document.getElementById('mobileDetectedRegion');
if(detectedLabel) detectedLabel.textContent = ACCRA_DEFAULT_LABEL;
populateRegionSelects();
return userDetectedRegion;
}
function populateRegionSelects(){
const total = allApprovedProducts.length || 0;
const baseLabel = total ? `Stores around me • Accra (${total})` : `Stores around me • Accra`;
const opts = [`<option value="__all__">${baseLabel}</option>`].concat(ACCRA_AREAS.map(r=>`<option value="${r}">${r}</option>`)).join('');
const sel1 = document.getElementById('filterRegionSelect');
const sel2 = document.getElementById('searchFilterRegions');
const sel3 = document.getElementById('mobileFilterRegion');
const sel4 = document.getElementById('mobileSearchFilterRegion');
[sel1,sel2,sel3,sel4].forEach(sel=>{
if(sel){
const prev = sel.value || '__all__';
sel.innerHTML = opts;
sel.value = ACCRA_AREAS.includes(prev) || prev==='__all__' ? prev : '__all__';
}
});
const label = document.getElementById('currentRegionLabel');
if(label) label.textContent = currentRegionFilter==='__all__' ? ACCRA_DEFAULT_LABEL : currentRegionFilter;
}
// ===== WISHLIST / BAG =====
function saveWishlist(arr){
if(arr && Array.isArray(arr)) wishlist = arr;
localStorage.setItem('pb_wishlist', JSON.stringify(wishlist));
try{ localStorage.setItem('pb_wishlist_items', JSON.stringify(wishlist)); }catch(e){}
updateHeaderCounts();
try{ document.dispatchEvent(new CustomEvent('wishlistUpdated', {detail: wishlist})); }catch(e){}
}
function saveBag(){ localStorage.setItem('pb_bag', JSON.stringify(bag)); updateHeaderCounts(); }
function updateHeaderCounts(){
const wc = document.getElementById('wishlistCount');
const bc = document.getElementById('bagCount');
const wCount = wishlist.length;
const bCount = bag.reduce((a,b)=>a+(b.qty||1),0);
if(wc){ wc.textContent = wCount; wc.classList.toggle('hidden', wCount===0); wc.style.display = wCount===0 ? 'none' : 'flex'; }
if(bc){ bc.textContent = bCount; bc.classList.toggle('hidden', bCount===0); bc.style.display = bCount===0 ? 'none' : 'flex'; }
}
function isWishlisted(id){ 
  try{
    if(!Array.isArray(wishlist)) return false;
    return wishlist.some(x=>{
      if(!x) return false;
      if(typeof x === 'string') return String(x)===String(id);
      if(typeof x === 'object' && x.id) return String(x.id)===String(id);
      return false;
    });
  }catch(e){ console.error('isWishlisted error', e); return false; }
}
function paintHeart(productId, isSaved){
document.querySelectorAll('.product-card[data-id]').forEach(card=>{
if(String(card.dataset.id)!==String(productId)) return;
card.querySelectorAll('button').forEach(button=>{
const icon = button.querySelector('.lucide-heart, [data-lucide="heart"]');
if(!icon) return;
icon.classList.toggle('fill-red-500', isSaved);
icon.classList.toggle('text-red-500', isSaved);
icon.classList.toggle('fill-[#FF3040]', isSaved);
icon.classList.toggle('text-[#FF3040]', isSaved);
icon.classList.toggle('text-black/60', !isSaved);
icon.classList.toggle('group-hover:text-black', !isSaved);
icon.classList.toggle('heart-pop', isSaved);
icon.style.fill = isSaved ? '#FF3040' : 'none';
icon.style.color = isSaved ? '#FF3040' : '';
icon.setAttribute('fill', isSaved ? '#FF3040' : 'none');
button.setAttribute('aria-pressed', String(isSaved));
});
});
}
async function syncWishlistToSupabase(productId, isAdding){
if(!supa) return;
try{
const { data: { session } } = await supa.auth.getSession();
if(!session) return; // anon stays local only
if(isAdding){
// try wishlists table, fallback to product_wishlists
let ok=false;
try{ const { error } = await supa.from('wishlists').insert({ product_id: productId, user_id: session.user.id }); if(!error) ok=true; }catch(e){}
if(!ok){ try{ await supa.from('product_wishlists').insert({ product_id: productId, user_id: session.user.id }); }catch(e){} }
try{
const { data: cur } = await supa.from('vendor_products').select('wishlist_count').eq('id', productId).single();
if(cur) await supa.from('vendor_products').update({ wishlist_count: (cur.wishlist_count||0)+1 }).eq('id', productId);
}catch(e){}
}else{
try{ await supa.from('wishlists').delete().eq('product_id', productId).eq('user_id', session.user.id); }catch(e){}
try{ await supa.from('product_wishlists').delete().eq('product_id', productId).eq('user_id', session.user.id); }catch(e){}
try{
const { data: cur } = await supa.from('vendor_products').select('wishlist_count').eq('id', productId).single();
if(cur) await supa.from('vendor_products').update({ wishlist_count: Math.max(0,(cur.wishlist_count||0)-1) }).eq('id', productId);
}catch(e){}
}
}catch(e){ console.log('wishlist sync', e.message); }
}
function toggleWishlistById(productId){
const product = allApprovedProducts.find(x=>x.id===productId);
if(!product) return;
let wl = getWishlistItems();
const exists = wl.find(x=>String(x.id)===String(productId));
const isAdding = !exists;
if(exists){ wl = wl.filter(x=>String(x.id)!==String(productId)); showToast('Removed from wishlist'); }
else { wl.push(product); showToast('Added to wishlist'); }
wishlist = wl;
saveWishlistItems(wl);
saveWishlist(wl);
try{ updateHeaderCounts(); }catch(e){}
paintHeart(productId, isAdding);
try{ renderSearchScreenResults(); }catch(e){}
try{ renderMobileSearchResultsReal(); }catch(e){}
try{ if(window.renderClaudeSearch) window.renderClaudeSearch(); }catch(e){}
try{ refreshLucide(); }catch(e){}
syncWishlistToSupabase(productId, isAdding);
}
function addToBagById(productId, qty=1){
const product = allApprovedProducts.find(x=>x.id===productId);
if(!product) return;
const found = bag.find(x=>x.id===productId);
if(found) found.qty = (found.qty||1)+qty; else bag.push({...product, qty});
saveBag(); showToast('Added to bag'); applyProductFilters(); renderSearchScreenResults(); renderMobileSearchResultsReal();
}
function showToast(msg){
let t = document.getElementById('toast');
if(!t){ t = document.createElement('div'); t.id='toast'; t.className='fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-bold px-4 py-2 rounded-full z-[700] hidden'; document.body.appendChild(t); }
t.textContent = msg;
t.style.zIndex = '700';
t.classList.remove('hidden');
clearTimeout(t.hideTimeout);
t.hideTimeout = setTimeout(()=>t.classList.add('hidden'),2500);
}
async function fetchAllReviews(){
if(!supa) return;
try{
const { data } = await supa.from('product_reviews').select('product_id, rating');
allReviews = data||[];
reviewsByProduct = {};
allReviews.forEach(r=>{ if(!reviewsByProduct[r.product_id]) reviewsByProduct[r.product_id]=[]; reviewsByProduct[r.product_id].push(r.rating); });
}catch(e){}
}
function getProductRating(productId){
const arr = reviewsByProduct[productId]||[];
if(!arr.length) return { avg:0, count:0 };
return { avg: arr.reduce((a,b)=>a+b,0)/arr.length, count: arr.length };
}
function renderStarsSmall(avg){
if(!avg) return '<span class="flex gap-[2px] text-black/20"><i data-lucide="star" class="w-3 h-3"></i><i data-lucide="star" class="w-3 h-3"></i><i data-lucide="star" class="w-3 h-3"></i><i data-lucide="star" class="w-3 h-3"></i><i data-lucide="star" class="w-3 h-3"></i></span>';
let s='<span class="flex gap-[2px]">'; for(let i=1;i<=5;i++) s+= i<=Math.round(avg) ? '<i data-lucide="star" class="w-3 h-3 fill-black text-black"></i>' :
'<i data-lucide="star" class="w-3 h-3 text-black/20"></i>'; s+='</span>'; return s;
}
function showNoProductsYet(){
hideMainSkeleton();
$('productGrid')?.classList.add('hidden');
$('noSearchResults')?.classList.add('hidden');
$('searchHeader')?.classList.add('hidden');
$('noProductsSection')?.classList.remove('hidden');
$('shopPlushLabel')?.classList.add('hidden');
}
function showProductGrid(products){
hideMainSkeleton();
const initSk = document.getElementById('plush-initial-skeleton');
if(initSk) initSk.style.display='none';
const sk = document.getElementById('productGridSkeleton');
const bubbleSk = document.getElementById('bubbleSkeleton');
const bubbleCont = document.getElementById('bubbleContainer');
if(sk) sk.classList.add('hidden');
if(bubbleSk) bubbleSk.classList.add('hidden');
if(bubbleCont) bubbleCont.classList.remove('hidden');
$('noProductsSection')?.classList.add('hidden');
const grid = $('productGrid');
if(!grid) return;
grid.classList.remove('hidden');
if(products.length===0){
if(allApprovedProducts.length===0){
grid.classList.add('hidden');
$('noProductsSection')?.classList.remove('hidden');
} else {
grid.innerHTML = '<div class="col-span-full py-12 text-center"><p class="font-bold">No products in this category yet</p><button onclick="clearCategoryFilter()" class="mt-3 h-9 px-5 rounded-full bg-black text-white text-[11px] font-bold">Show all</button></div>';
}
return;
}
grid.innerHTML = products.map(p=>{
const rating = getProductRating(p.id);
const wishlisted = isWishlisted(p.id);
const link = `product.html?id=${p.id}`;
const stock = p.total_stock;
const lowStock = stock!==undefined && stock<5 && stock>0;
const outStock = stock===0;
return ` <div class="product-card group relative border border-black/[0.06] rounded-[18px] bg-white overflow-hidden hover:border-black/12 hover:shadow-[0_12px_32px_rgba(0,0,0,0.07)] transition-all duration-300 flex flex-col" data-id="${p.id}"> <a href="${link}" class="product-card-img relative w-full aspect-[4/5] bg-[#F7F7F7] overflow-hidden block" onclick="handleProductClick('${p.id}')"> <img src="${(p.images&&p.images[0])||'https://via.placeholder.com/400x500/F5F5F5/999?text=No+Image'}" alt="${p.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500 ease-out" /> <div class="absolute inset-0 bg-gradient-to-t from-black/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div> ${p.is_groupay? `<span class="absolute top-3 left-3 bg-black text-white text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"><i data-lucide="users" class="w-3 h-3"></i> GROUPAY</span>`:''} <span class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-black text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-black/5 flex items-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><i data-lucide="map-pin" class="w-3 h-3"></i> Accra • Nearby</span> <button onclick="event.preventDefault(); event.stopPropagation(); window.openHeartModalById? window.openHeartModalById('${p.id}') : toggleWishlistById('${p.id}')" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all z-10 ${wishlisted?'bg-white border-red-100':''}" aria-label="Save"> <i data-lucide="${wishlisted ? 'check-circle' : 'heart'}" class="w-[18px] h-[18px] transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-black/60 group-hover:text-black'}"></i> </button> ${outStock ? `<span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full">SOLD OUT</span>` : ''} </a> <div class="p-3.5 flex flex-col flex-1 gap-1"> <div class="flex items-center justify-between"> <span class="text-[10px] font-bold tracking-widest uppercase text-black/35 truncate">${p.category||'General'}</span> ${rating.count>0 ? `<span class="flex items-center gap-1 text-[10px] text-black/50"><i data-lucide="star" class="w-3 h-3 fill-black text-black"></i>
${rating.avg.toFixed(1)}</span>` : `<span class="text-[10px] text-black/30">New</span>`} </div> <a href="${link}" class="font-bold text-[13.5px] leading-[1.25] line-clamp-2 min-h-[34px] hover:underline decoration-black/20 underline-offset-4" onclick="handleProductClick('${p.id}')">${p.title||'Untitled'}</a> <div class="flex items-center gap-1 mt-0.5">${renderStarsSmall(rating.avg)} <span class="text-[10px] text-black/35">(${rating.count})</span></div> <div class="flex items-center justify-between mt-2"> <span class="font-black text-[15px] tracking-tight">GHS ${parseFloat(p.price||0).toFixed(2)}</span> ${stock!==undefined ? `<span class="text-[10px] font-medium flex items-center gap-1 ${lowStock?'text-amber-600': outStock?'text-red-500':'text-black/35'}"><i data-lucide="${outStock?'x-circle': lowStock?'alert-circle':'package'}" class="w-3 h-3"></i> ${outStock?'Sold out':
lowStock?`Only ${stock} left`:`${stock} in stock`}</span>` : `<span class="text-[10px] text-black/35 flex items-center gap-1"><i data-lucide="truck" class="w-3 h-3"></i> Accra delivery</span>`} </div> ${(()=>{ const v=getVendorForProduct(p); if(!v) return ''; const hasSf = window.vendorsWithStorefront && window.vendorsWithStorefront.has(v.id); if(!hasSf) return `<span class="mt-2 text-[10px] text-black/30 flex items-center gap-1"><i data-lucide="store" class="w-3 h-3"></i> ${v.store_name} •
${v.city||'Accra'}</span>`; return `<a href="vendor-storefront.html?id=${v.id}" class="mt-2 text-[10px] font-bold text-black/40 hover:text-black flex items-center gap-1"><i data-lucide="store" class="w-3 h-3"></i> ${v.store_name} • ${v.city||'Accra'}</a>`; })()} <div class="mt-3.5 grid grid-cols-[1fr_38px] gap-2"> <button onclick="event.stopPropagation(); addToBagById('${p.id}')" class="h-9 rounded-full bg-black text-white text-[11px] font-bold tracking-wide flex items-center justify-center gap-1.5 hover:bg-[#111] active:scale-[0.98] transition"><i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Add to Bag</button> <button onclick="event.stopPropagation(); navigator.clipboard.writeText(window.location.origin + '/product.html?id=${p.id}'); showToast('Link copied!')" class="h-9 w-9 rounded-full border border-black/10 bg-white flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition" aria-label="Share"><i data-lucide="share-2" class="w-4 h-4"></i></button> </div> </div> </div> `;
}).join('');
refreshLucide();
}
function applyProductFilters(){
// SHOP PLUSH NEVER HANDLES SEARCH
let result = [...allApprovedProducts];
if(currentCategoryFilter){
const cat = currentCategoryFilter.toLowerCase();
result = result.filter(p=> (p.category||'').toLowerCase().includes(cat));
}
if(currentRegionFilter && currentRegionFilter!=='__all__'){
const reg = currentRegionFilter.toLowerCase().replace(' / ',' ').replace('/',' ');
if(!reg.includes('accra - all')){
result = result.filter(p=> {
const loc = `${p.region||''} ${p.city||''} ${p.location||''} ${p.area||''}`.toLowerCase();
return loc.includes(reg) || reg.split(' ').some(w=> w.length>3 && loc.includes(w));
});
}
}
filteredProducts = result;
showProductGrid(result);
}
function showNoSearchResults(){
hideMainSkeleton();
showProductGrid(allApprovedProducts);
}
function clearCategoryFilter(){
currentCategoryFilter = "";
activeCategory = null;
if(activeBubbleEl){ activeBubbleEl.classList.remove('is-active'); activeBubbleEl=null; }
document.querySelectorAll('.cat-bubble').forEach(b=>b.classList.remove('is-active'));
showProductGrid(allApprovedProducts);
}
function handleSearchFullScreen(query){
currentSearch = (query||'').trim();
// If searchScreen exists on this page (index.html), open it
const el = document.getElementById('searchScreen');
if(el || window.openSearchScreen){
if(window.openSearchScreen){
window.openSearchScreen(currentSearch);
return;
}
if(el){
el.classList.remove('hidden');
document.body.style.overflow='hidden';
if(window.syncRealProducts) window.syncRealProducts();
setTimeout(()=>{
if(window.openSearchScreen){
window.openSearchScreen(currentSearch);
} else if(window.renderClaudeSearch){
window.renderClaudeSearch();
}
}, 150);
return;
}
}
// If searchScreen NOT on this page (e.g. bag.html, product.html), go to index with search param
// That will load components/search.html overlay
if(currentSearch){
const isIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '/index.html';
if(!isIndex){
window.location.href = '/index.html?search=' + encodeURIComponent(currentSearch);
return;
}
}
// Fallback retry
setTimeout(()=>{ if(window.openSearchScreen) window.openSearchScreen(currentSearch); }, 500);
}
async function handleProductClick(productId){
try{
if(supa){
const { data: { session } } = await supa.auth.getSession();
// log view - try with viewer_id, fallback without if RLS blocks, insert both viewed_at and created_at for compatibility
const now = new Date().toISOString();
try{
await supa.from('product_views').insert({
product_id: productId,
viewer_id: session?.user?.id || null,
viewed_at: now,
created_at: now
});
}catch(e){
try{ await supa.from('product_views').insert({ product_id: productId, viewed_at: now, created_at: now }); }catch(e2){
try{ await supa.from('product_views').insert({ product_id: productId, created_at: now }); }catch(e3){
try{ await supa.from('product_views').insert({ product_id: productId, viewed_at: now }); }catch(e4){}
}
}
}
// increment counter on vendor_products for fast KPI
try{
const { data: cur } = await supa.from('vendor_products').select('views_count').eq('id', productId).single();
if(cur) await supa.from('vendor_products').update({ views_count: (cur.views_count||0)+1 }).eq('id', productId);
}catch(e){}
}
}catch(e){}
window.location.href = `product.html?id=${productId}`;
}
function renderMobileSearchResultsReal(){
const resultsEl = $('mobileSearchResults');
const noResEl = $('mobileNoResults');
if(!resultsEl) return;
let result = filteredProducts.length>0 ? filteredProducts : allApprovedProducts;
if(currentSearch){
const q = currentSearch.toLowerCase();
result = result.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q));
}
if(result.length===0 && (currentSearch||currentCategoryFilter)){
resultsEl.classList.add('hidden');
if(noResEl){
noResEl.classList.remove('hidden');
const qEl = $('mobileNoResultsQuery');
if(qEl) qEl.textContent = currentSearch||currentCategoryFilter;
}
} else {
if(noResEl) noResEl.classList.add('hidden');
resultsEl.classList.remove('hidden');
resultsEl.innerHTML = result.slice(0,8).map(p=>{
const wishlisted = isWishlisted(p.id);
return ` <div class="border border-black/[0.06] rounded-[16px] overflow-hidden bg-white cursor-pointer hover:border-black/10 transition" onclick="handleProductClick('${p.id}')"> <div class="aspect-[4/5] bg-[#F7F7F7] overflow-hidden relative"> <img src="${(p.images&&p.images[0])||''}" class="w-full h-full object-cover" /> <span class="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> Accra</span> <button onclick="event.stopPropagation(); window.openHeartModalById? window.openHeartModalById('${p.id}') : toggleWishlistById('${p.id}')" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-sm ${wishlisted?'border-red-100':''}"><i data-lucide="${wishlisted ? 'check-circle' : 'heart'}" class="w-4 h-4 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-black/60'}"></i></button> </div> <div class="p-2.5"><div class="text-[11px] font-bold truncate">${p.title}</div><div class="text-[11px] font-black">GHS ${parseFloat(p.price||0).toFixed(2)}</div></div> </div> `;
}).join('');
refreshLucide();
}
}
/* =====================================================================
HEADER.JS — CATEGORIES + SEARCH + MENU
===================================================================== */
let categoryScrollEl, catLeftBtn, catRightBtn, categoriesToggleBtn, categoriesAnchor, logoCategoriesToggleBtn, logoCategoriesAnchor,
categoriesDropdownPanel, categoryRowEl, headerEl;
function initHeaderEls(){
categoryScrollEl = $('categoryScroll');
catLeftBtn = $('catLeft');
catRightBtn = $('catRight');
categoriesToggleBtn = $('categoriesToggle');
categoriesAnchor = $('categoriesAnchor');
logoCategoriesToggleBtn = $('logoCategoriesToggle');
logoCategoriesAnchor = $('logoCategoriesAnchor');
categoriesDropdownPanel = $('categoriesDropdownPanel');
categoryRowEl = $('categoryRow');
headerEl = $('siteHeader');
}
function renderCategories() {
if(!categoryScrollEl) return;
categoryScrollEl.innerHTML = CATEGORIES.map(cat => ` <button data-category="${cat}" class="category-pill shrink-0 text-[13px] font-medium text-white/90 hover:text-white transition-colors ${cat===activeCategory?'font-bold underline underline-offset-4':''}">${cat}</button> `).join('');
}
function selectCategory(cat) {
if (activeCategory === cat) {
activeCategory = null;
categoryFilterActive = false;
currentCategoryFilter = "";
} else {
activeCategory = cat;
categoryFilterActive = true;
currentCategoryFilter = cat;
}
const searchInput = $('searchInput');
if(searchInput) searchInput.placeholder = categoryFilterActive ? `Search in ${cat}` : `Search products, bags, shoes...`;
document.querySelectorAll('.category-pill').forEach(el => {
el.classList.toggle('font-bold', el.dataset.category === activeCategory);
el.classList.toggle('underline', el.dataset.category === activeCategory);
});
document.querySelectorAll('.logo-cat-item').forEach(el => {
el.classList.toggle('is-active', el.dataset.category === activeCategory);
});
closeCategoriesDropdown();
applyProductFilters();
// re-render to show active styling and counts
renderCategoriesDropdownPanel();
}
function scrollCategories(direction) {
if(!categoryScrollEl) return;
categoryScrollEl.scrollBy({ left: direction * 300, behavior: 'smooth' });
}
function renderCategoriesDropdownPanel() {
if(!categoriesDropdownPanel) return;
// Build counts: exact lower + partial includes for better UX
const countsExact = {};
allApprovedProducts.forEach(p=>{
const c = (p.category||'').toLowerCase().trim();
if(c) countsExact[c] = (countsExact[c]||0)+1;
});
categoriesDropdownPanel.innerHTML = CATEGORIES.map(cat=>{
const lower = cat.toLowerCase().trim();
// count = exact match + includes (so Women clothing counts Women clothing products)
const exact = countsExact[lower]||0;
const partial = allApprovedProducts.filter(p=> {
const pc = (p.category||'').toLowerCase();
return pc.includes(lower) || lower.includes(pc);
}).length;
const count = Math.max(exact, partial);
const isActive = cat === activeCategory;
return ` <button data-category="${cat}" class="logo-cat-item ${isActive ? 'is-active' : ''}" style="display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:12px 16px; border-bottom:1px solid rgba(0,0,0,0.06); ${isActive ? 'background:#000;color:#FFF;' : 'background:#FFF;color:#000;'} transition:background 0.15s;"> ${categoryImageMarkup(cat)} <span style="flex:1;min-width:0"> <span class="logo-cat-name" style="display:block; font-weight:700; font-size:14px; color:${isActive?'#FFF':'#000'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat}</span> <span class="logo-cat-ads" style="display:block; font-size:11px; color:${isActive?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.45)'};">${count} ads</span> </span> ${isActive ? '<span style="margin-left:auto;font-size:10px;font-weight:800">✓</span>' : ''} </button> `;
}).join('') + `<div class="logo-cat-scrollhint" style="position:sticky; bottom:0; background:linear-gradient(to top, white 90%, transparent); text-align:center; font-size:11px; font-weight:600; color:rgba(0,0,0,0.4); padding:14px 0 10px; pointer-events:none;">Scroll to see more • ${CATEGORIES.length} categories</div>`;
}
function openCategoriesDropdown(anchorEl, toggleBtn) {
if(!categoriesDropdownPanel || !anchorEl) return;
anchorEl.appendChild(categoriesDropdownPanel);
categoriesDropdownPanel.classList.add('is-open');
if(categoriesToggleBtn) categoriesToggleBtn.classList.toggle('is-open', toggleBtn === categoriesToggleBtn);
if(logoCategoriesToggleBtn) logoCategoriesToggleBtn.classList.toggle('is-open', toggleBtn === logoCategoriesToggleBtn);
if (anchorEl === categoriesAnchor && categoryRowEl) categoryRowEl.style.overflow = 'visible';
}
function closeCategoriesDropdown() {
if(!categoriesDropdownPanel) return;
categoriesDropdownPanel.classList.remove('is-open');
if(categoriesToggleBtn) categoriesToggleBtn.classList.remove('is-open');
if(logoCategoriesToggleBtn) logoCategoriesToggleBtn.classList.remove('is-open');
if(categoryRowEl) categoryRowEl.style.overflow = '';
}
function isCategoriesDropdownOpenFor(anchorEl) {
return categoriesDropdownPanel && categoriesDropdownPanel.classList.contains('is-open') && categoriesDropdownPanel.parentElement === anchorEl;
}
/* Search suggestions */
let searchInput, suggestDropdown, suggestListEl;
function initSearchEls(){
searchInput = $('searchInput');
suggestDropdown = $('suggestDropdown');
suggestListEl = $('suggestList');
}
function normalizeText(str){
return (str||'').toLowerCase().trim().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
}
function getProductSuggestions(query){
const q = normalizeText(query);
if(!q) return { products: [], terms: SUGGESTIONS.slice(0,6), categories: [] };
const tokens = q.split(' ').filter(Boolean);
const scored = allApprovedProducts.map(p=>{
const title = normalizeText(p.title);
const cat = normalizeText(p.category);
const desc = normalizeText(p.description);
let score = 0;
if(title === q) score += 100;
if(title.includes(q)) score += 90;
tokens.forEach(tok=>{
if(tok.length < 2) return;
if(title.includes(tok)) score += 20;
if(cat.includes(tok)) score += 15;
if(desc.includes(tok)) score += 5;
if(title.split(' ').some(w=> w.startsWith(tok))) score += 10;
if(tok.length >=3){
const plural = tok + 'es';
const plural2 = tok + 's';
if(title.includes(plural) || title.includes(plural2) || cat.includes(plural) || cat.includes(plural2)) score += 12;
}
});
if(cat.includes(q)) score += 25;
return { product: p, score };
}).filter(x=> x.score > 0).sort((a,b)=> b.score - a.score);
const products = scored.slice(0,8).map(x=> x.product);
const termPool = [...SUGGESTIONS, ...CATEGORIES];
const terms = termPool.filter(s=>{
const ns = normalizeText(s);
return tokens.some(tok=> tok.length>=2 && ns.includes(tok)) || ns.includes(q);
}).slice(0,6);
const categories = CATEGORIES.filter(c=> normalizeText(c).includes(q)).slice(0,4);
return { products, terms, categories };
}
function renderSuggestions(query="") {
if(!suggestListEl) return;
const q = (query||'').trim();
const { products, terms, categories } = getProductSuggestions(q);
let html = '';
if(products.length > 0){
html += products.map(p=>` <button data-product-id="${p.id}" data-term="${p.title}" class="suggest-item w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3 transition-colors"> <span class="w-10 h-10 rounded-[8px] bg-[#F5F5F5] overflow-hidden shrink-0"> <img src="${(p.images&&p.images[0])||'https://via.placeholder.com/40x40/F5F5F5/999?text=No'}" class="w-full h-full object-cover" /> </span> <span class="flex-1 min-w-0"> <span class="block truncate font-medium">${p.title}</span> <span class="block text-[11px] text-black/40">GHS ${parseFloat(p.price||0).toFixed(2)} • ${p.category||'General'}</span> </span> </button> `).join('');
}
if(categories.length > 0){
html += `<div class="mt-2 pt-2 border-t border-black/5"><p class="text-[10px] font-bold tracking-widest text-black/30 px-3 py-1">CATEGORIES</p>` +
categories.map(cat=>` <button data-term="${cat}" data-category="${cat}" class="suggest-item w-full text-left px-3 py-2 text-[13px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3"> <span class="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px]">C</span> ${cat} </button> `).join('') + `</div>`;
}
let finalTerms = terms;
if(finalTerms.length === 0 && !q){
finalTerms = SUGGESTIONS.slice(0,6);
}
if(finalTerms.length > 0){
const filteredTerms = finalTerms.filter(t=> !products.find(p=> p.title.toLowerCase()===t.toLowerCase()));
if(filteredTerms.length > 0){
html += (products.length>0||categories.length>0 ? `<div class="mt-2 pt-2 border-t border-black/5">` : '') +
`<p class="text-[10px] font-bold tracking-widest text-black/30 px-3 py-1">SEARCHES</p>` +
filteredTerms.slice(0,5).map(term => ` <button data-term="${term}" class="suggest-item w-full text-left px-3 py-[10px] text-[13px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3 transition-colors"> <span class="w-6 h-6 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0"> <i data-lucide="search" class="w-3 h-3"></i> </span> ${term} </button> `).join('') + (products.length>0||categories.length>0 ? `</div>` : '');
}
}
if(!html){
html = SUGGESTIONS.slice(0,6).map(term => ` <button data-term="${term}" class="suggest-item w-full text-left px-3 py-[10px] text-[13px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3"> <span class="w-6 h-6 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0"><i data-lucide="search" class="w-3 h-3"></i></span> ${term} </button> `).join('');
}
suggestListEl.innerHTML = html;
refreshLucide();
}
function openSuggestions() { if(suggestDropdown) suggestDropdown.classList.add('is-open'); }
function closeSuggestions() { if(suggestDropdown) suggestDropdown.classList.remove('is-open'); }
function openSuggestions() { if(suggestDropdown) suggestDropdown.classList.add('is-open'); }
function closeSuggestions() { if(suggestDropdown) suggestDropdown.classList.remove('is-open'); }
/* Typing placeholder */
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const TYPE_SPEED = 110;
const DELETE_SPEED = 45;
const HOLD_TIME = 1200;
function tickTypingAnimation() {
const si = $('searchInput');
if (!si){ setTimeout(tickTypingAnimation, TYPE_SPEED); return; }
if (categoryFilterActive || currentSearch) { setTimeout(tickTypingAnimation, TYPE_SPEED); return; }
const word = TYPING_WORDS[wordIndex];
if (!isDeleting) {
charIndex++;
si.placeholder = 'Search ' + word.slice(0, charIndex);
if (charIndex === word.length) {
setTimeout(() => { isDeleting = true; tickTypingAnimation(); }, HOLD_TIME);
return;
}
} else {
charIndex--;
si.placeholder = 'Search ' + word.slice(0, charIndex);
if (charIndex === 0) {
isDeleting = false;
wordIndex = (wordIndex + 1) % TYPING_WORDS.length;
}
}
setTimeout(tickTypingAnimation, isDeleting ? DELETE_SPEED : TYPE_SPEED);
}
/* =====================================================================
ACCOUNT MENU
===================================================================== */
let isLoggedIn = false;
let userName = "";
let userEmail = "";
let unreadCount = 0;
const ICON_ACCOUNT = `<i data-lucide="user" class="w-4 h-4"></i>`;
const ICON_ORDERS = `<i data-lucide="package" class="w-4 h-4"></i>`;
const ICON_INBOX = `<i data-lucide="mail" class="w-4 h-4"></i>`;
const ICON_WISHLIST = `<i data-lucide="${wishlisted ? 'check-circle' : 'heart'}" class="w-4 h-4"></i>`;
const ICON_LOGOUT = `<i data-lucide="log-out" class="w-4 h-4"></i>`;
let menuBtn, menuDropdown, menuContent;
const MENU_LINKS = [
{ page: 'account', icon: ICON_ACCOUNT, label: 'My Account' },
{ page: 'orders', icon: ICON_ORDERS, label: 'Orders' },
{ page: 'inbox', icon: ICON_INBOX, label: 'Inbox' },
{ page: 'wishlist', icon: ICON_WISHLIST, label: 'Wishlist' },
];
function renderMenuLinks() {
return MENU_LINKS.map(({ page, icon, label }) => ` <button class="menu-item" data-action="${page}" style="display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:10px 14px; font-size:13px; font-weight:500;"> ${icon} <span class="menu-label" style="flex:1;">${label}</span> ${page === 'inbox' && unreadCount > 0 ? `<span class="unread-badge" style="background:#FF8EBA; color:white; font-size:10px; font-weight:700; min-width:18px; height:18px; border-radius:9999px; display:flex; align-items:center; justify-content:center; padding:0 5px;">${unreadCount}</span>` : ''} </button> `).join('');
}
function renderMenu() {
if(!menuContent) return;
if (isLoggedIn) {
menuContent.innerHTML = ` <div class="menu-header-name" style="padding:12px 14px 0; font-weight:700; font-size:13px;">Hi, ${userName}</div> <div class="menu-header-email" style="padding:2px 14px 10px; font-size:11px; color:rgba(0,0,0,0.45);">${userEmail}</div> <div style="border-top:1px solid rgba(0,0,0,0.08); margin:4px 0;"></div> ${renderMenuLinks()} <div style="border-top:1px solid rgba(0,0,0,0.08); margin:4px 0;"></div> <button class="menu-item" data-action="logout" style="display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:10px 14px; font-size:13px; font-weight:500;">${ICON_LOGOUT}<span class="menu-label">Logout</span></button> `;
} else {
menuContent.innerHTML = ` <div class="p-3 flex flex-col gap-2"> <button class="w-full bg-black text-white font-bold text-[13px] py-3 rounded-[10px]" data-action="login">Login</button> <button class="w-full bg-white text-black border-[1.5px] border-black font-bold text-[13px] py-3 rounded-[10px]" data-action="create-account">Create Account</button> </div> `;
}
refreshLucide();
}
async function initAuth(){
if(!supa) { renderMenu(); return; }
try{
const { data:{session} } = await supa.auth.getSession();
if(session){
isLoggedIn = true;
userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
userEmail = session.user.email;
} else {
isLoggedIn = false;
userName = "";
userEmail = "";
}
renderMenu();
}catch(e){ renderMenu(); }
}
function toggleMenu() { if(menuDropdown) menuDropdown.classList.toggle('is-open'); }
function closeMenu() { if(menuDropdown) menuDropdown.classList.remove('is-open'); }
/* =====================================================================
SCROLL BEHAVIOR
===================================================================== */
const COLLAPSE_AT = 60; // collapse categories after 60px
const FADE_DISTANCE = 350;
const MIN_OPACITY = 0.85; // transparent a little when scroll
function onScroll() {
if(!headerEl || !categoryRowEl) return;
const scrollY = window.scrollY || window.pageYOffset;
const shouldCollapse = scrollY > COLLAPSE_AT;
// Close dropdowns if collapsing
if (shouldCollapse && isCategoriesDropdownOpenFor(categoriesAnchor)) closeCategoriesDropdown();
if (shouldCollapse && isCategoriesDropdownOpenFor(logoCategoriesAnchor)) closeCategoriesDropdown();
// HEADER REMAINS FIXED - only categoryRow collapses
if(categoryRowEl) categoryRowEl.classList.toggle('is-collapsed', shouldCollapse);
document.body.classList.toggle('header-collapsed', shouldCollapse);
const placeholder = document.getElementById('plush-header');
if(placeholder) placeholder.style.height = shouldCollapse ? '68px' : '124px';
// Header becomes transparent a little
const progress = Math.min(scrollY / FADE_DISTANCE, 1);
const opacity = 1 - progress * (1 - MIN_OPACITY); // 1 -> 0.85
if(headerEl) headerEl.style.setProperty('--bg-opacity', opacity.toFixed(3));
if(headerEl) headerEl.classList.toggle('is-scrolled', scrollY > 4);
}
/* =====================================================================
TICKER + FADE-UP + SHARE
===================================================================== */
function renderTickerReal() {
const tickerTrackEl = $('tickerTrack');
if(!tickerTrackEl) return;
let items = TICKER_ITEMS;
if(allApprovedProducts.length>0){
const productTicker = allApprovedProducts.slice(0,6).map(p=> `${p.title} — GHS ${p.price}`.toUpperCase());
items = [...TICKER_ITEMS, ...productTicker];
}
const itemHtml = items.map(t => `<span class="px-6 flex items-center gap-6">${t}<span class="opacity-30">•</span></span>`).join('');
tickerTrackEl.innerHTML = itemHtml + itemHtml;
}
/* FADE-UP */
function initFadeUp(){
const fadeUpObserver = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
entry.target.classList.add('is-visible');
fadeUpObserver.unobserve(entry.target);
}
});
}, { threshold: 0.15 });
document.querySelectorAll('.fade-up').forEach(el => fadeUpObserver.observe(el));
}
/* =====================================================================
BUBBLE CATEGORY GRID (SEARCH BY CATEGORY) - REAL SEARCH
===================================================================== */
function initBubbleGrid(){
const container = $('bubbleContainer');
const fade = $('bubbleFade');
const btn = $('toggleBubblesBtn');
const label = $('toggleBubblesLabel');
const icon = $('toggleBubblesIcon');
if(!container || !btn) {
console.warn('bubbleContainer or toggle btn not found');
return;
}
// Reset expanded state stored on container
if(container.dataset.initBubbleBound === '1' && !container.dataset.forceReinit){
// Already bound, just re-check height and re-bind bubbles
} else {
container.dataset.initBubbleBound = '1';
let expanded = container.dataset.expanded === 'true';
function checkHeight() {
if (container.scrollHeight <= 420) {
if(fade) { fade.style.display = 'none'; }
// Keep button but change label to show all
if(label && container.scrollHeight <= 420){
// hide button if not needed
// btn.style.display = 'none';
}
} else {
if(fade) fade.style.display = '';
}
}
checkHeight();
// Remove old listener by cloning button
const newBtn = btn.cloneNode(true);
btn.parentNode.replaceChild(newBtn, btn);
const finalBtn = $('toggleBubblesBtn');
const finalLabel = $('toggleBubblesLabel');
const finalIcon = $('toggleBubblesIcon');
const finalFade = $('bubbleFade');
const finalContainer = $('bubbleContainer');
finalBtn.addEventListener('click', () => {
expanded = !expanded;
finalContainer.dataset.expanded = expanded ? 'true' : 'false';
if (expanded) {
finalContainer.classList.remove('max-h-[400px]');
finalContainer.style.maxHeight = finalContainer.scrollHeight + 'px';
setTimeout(() => { finalContainer.style.maxHeight = 'none'; }, 500);
if(finalFade) { finalFade.style.opacity = '0'; setTimeout(()=>{ finalFade.style.display='none'; },300); }
if(finalLabel) finalLabel.textContent = 'Show Less';
if(finalIcon) finalIcon.style.transform = 'rotate(180deg)';
} else {
if(finalFade) { finalFade.style.display=''; finalFade.style.opacity = '1'; }
finalContainer.style.maxHeight = finalContainer.scrollHeight + 'px';
void finalContainer.offsetWidth;
finalContainer.classList.add('max-h-[400px]');
finalContainer.style.maxHeight = '400px';
if(finalLabel) finalLabel.textContent = `View All Categories (${document.querySelectorAll('.cat-bubble').length})`;
if(finalIcon) finalIcon.style.transform = 'rotate(0deg)';
finalContainer.scrollIntoView({ behavior:'smooth', block:'center' });
}
});
}
// Bubble clicks -> REAL category filter - use event delegation for reliability
const grid = $('categoryBubbleGrid');
if(grid && !grid.dataset.bubbleClickBound){
grid.dataset.bubbleClickBound = '1';
grid.addEventListener('click', (e)=>{
const bubble = e.target.closest('.cat-bubble');
if(!bubble) return;
const cat = bubble.dataset.category;
if(!cat) return;
if(activeBubbleEl===bubble && currentCategoryFilter.toLowerCase()===cat.toLowerCase()){
bubble.classList.remove('is-active');
activeBubbleEl=null;
currentCategoryFilter="";
activeCategory=null;
categoryFilterActive=false;
} else {
document.querySelectorAll('.cat-bubble').forEach(b=>{ b.classList.remove('is-active'); });
bubble.classList.add('is-active');
activeBubbleEl=bubble;
currentCategoryFilter=cat;
activeCategory=cat;
categoryFilterActive=true;
}
applyProductFilters();
renderCategories(); // update header pills
$('productGrid')?.scrollIntoView({ behavior:'smooth', block:'start' });
});
}
console.log('✅ initBubbleGrid bound, bubbles:', document.querySelectorAll('.cat-bubble').length);
}
/* =====================================================================
MOBILE SEARCH SCREEN
===================================================================== */
function initDedicatedMobileSearch(){
const toggleBtn = document.getElementById('mobileFilterToggleBtn');
const panel = document.getElementById('mobileFiltersPanel');
const activeFiltersEl = document.getElementById('mobileActiveFilters');
const catContainer = document.getElementById('mobileFilterCategories');
const regionSelect = document.getElementById('mobileSearchFilterRegion');
const minMobile = document.getElementById('filterPriceMinMobile');
const maxMobile = document.getElementById('filterPriceMaxMobile');
const sortMobile = document.getElementById('mobileSort');
const applyBtn = document.getElementById('mobileApplyFiltersBtn');
const clearBtn = document.getElementById('mobileClearFiltersBtn');
const showAllBtn = document.getElementById('mobileShowAllBtn');
const resultsCount = document.getElementById('mobileResultsCount');
const mobileTitle = document.getElementById('mobileSearchTitle');
const mobileCount = document.getElementById('mobileSearchCount');
const mobileRegionLabel = document.getElementById('mobileRegionLabel');
const detectedLabel = document.getElementById('mobileDetectedRegion');
if(toggleBtn && panel){
toggleBtn.addEventListener('click', ()=>{
panel.classList.toggle('hidden');
toggleBtn.textContent = panel.classList.contains('hidden') ? 'Filters' : 'Close filters';
});
}
// Category chips for mobile
function renderMobileCategories(){
if(!catContainer) return;
const counts = {};
allApprovedProducts.forEach(p=>{ const c=p.category||'Other'; counts[c]=(counts[c]||0)+1; });
const cats = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).slice(0,12);
catContainer.innerHTML = `<button data-mobile-cat="__all__" class="px-3 py-1.5 rounded-full text-[11px] border ${!currentCategoryFilter?'bg-black text-white':'bg-white'}">All</button>` + cats.map(c=>{
const active = currentCategoryFilter.toLowerCase()===c.toLowerCase();
return `<button data-mobile-cat="${c}" class="px-3 py-1.5 rounded-full text-[11px] border ${active?'bg-black text-white':'bg-white'}">${c}</button>`;
}).join('');
catContainer.querySelectorAll('[data-mobile-cat]').forEach(btn=>{
btn.addEventListener('click', ()=>{
const cat = btn.dataset.mobileCat;
currentCategoryFilter = cat==='__all__' ? "" : cat;
renderMobileCategories();
renderSearchFilters();
renderSearchScreenResults();
applyProductFilters();
updateMobileActiveFilters();
});
});
}
function updateMobileActiveFilters(){
if(!activeFiltersEl) return;
const chips = [];
if(currentCategoryFilter) chips.push(`<span class="px-2 py-1 rounded-full bg-black text-white text-[10px] flex items-center gap-1">${currentCategoryFilter} <i data-lucide="x" class="w-3 h-3"></i></span>`);
if(currentRegionFilter && currentRegionFilter!=='__all__') chips.push(`<span class="px-2 py-1 rounded-full bg-[#FF8EBA] text-black text-[10px] flex items-center gap-1">${currentRegionFilter} <i data-lucide="x" class="w-3 h-3"></i></span>`);
if(currentSearch) chips.push(`<span class="px-2 py-1 rounded-full bg-white border text-[10px] flex items-center gap-1">"${currentSearch}" <i data-lucide="x" class="w-3 h-3"></i></span>`);
activeFiltersEl.innerHTML = chips.join('') || '<span class="text-[10px] text-black/30">Stores around me • Accra • All categories</span>';
if(mobileTitle) mobileTitle.textContent = currentSearch ? `Results for "${currentSearch}"` : currentCategoryFilter || (currentRegionFilter!=='__all__' ?
currentRegionFilter : 'All products');
if(mobileRegionLabel) mobileRegionLabel.textContent = currentRegionFilter==='__all__' ? ACCRA_DEFAULT_LABEL : currentRegionFilter;
if(detectedLabel) detectedLabel.textContent = userDetectedRegion;
const res = getFilteredForSearchScreen();
if(resultsCount) resultsCount.textContent = res.length;
if(mobileCount) mobileCount.textContent = res.length;
}
if(regionSelect){
regionSelect.addEventListener('change', (e)=>{
currentRegionFilter = e.target.value;
renderSearchFilters(); renderSearchScreenResults(); applyProductFilters(); updateMobileActiveFilters();
const mainSel = document.getElementById('filterRegionSelect'); if(mainSel) mainSel.value = currentRegionFilter;
const label = document.getElementById('currentRegionLabel'); if(label) label.textContent = currentRegionFilter==='__all__' ? 'Stores around me • Accra' :
currentRegionFilter;
});
}
if(minMobile) minMobile.addEventListener('input', ()=>{ renderSearchScreenResults(); updateMobileActiveFilters(); });
if(maxMobile) maxMobile.addEventListener('input', ()=>{ renderSearchScreenResults(); updateMobileActiveFilters(); });
if(sortMobile) sortMobile.addEventListener('change', (e)=>{ currentSort = e.target.value; document.getElementById('filterSort').value = e.target.value;
renderSearchScreenResults(); applyProductFilters(); });
if(clearBtn){
clearBtn.addEventListener('click', ()=>{
currentCategoryFilter=''; currentRegionFilter='__all__'; currentSearch=''; if(minMobile) minMobile.value=''; if(maxMobile) maxMobile.value='';
document.getElementById('searchInput').value=''; document.getElementById('mobileSearchInput').value='';
renderMobileCategories(); renderSearchFilters(); renderSearchScreenResults(); applyProductFilters(); updateMobileActiveFilters();
});
}
if(applyBtn){
applyBtn.addEventListener('click', ()=>{
panel.classList.add('hidden');
if(toggleBtn) toggleBtn.textContent='Filters';
});
}
if(showAllBtn){
showAllBtn.addEventListener('click', ()=>{
currentCategoryFilter=''; currentRegionFilter='__all__'; currentSearch=''; renderMobileCategories(); renderSearchFilters(); renderSearchScreenResults();
applyProductFilters(); updateMobileActiveFilters();
});
}
// Expose for global updates
window.renderMobileCategories = renderMobileCategories;
window.updateMobileActiveFilters = updateMobileActiveFilters;
renderMobileCategories();
updateMobileActiveFilters();
}
function ensureMobileSearchUI(){
try{
const header = document.getElementById('siteHeader');
const mainRow = document.getElementById('headerMainRow');
const iconGroup = header ? header.querySelector('.flex.items-center.gap-1') : null;
// Ensure mobileSearchBtn exists
let btn = document.getElementById('mobileSearchBtn');
if(!btn && iconGroup){
btn = document.createElement('button');
btn.id = 'mobileSearchBtn';
btn.className = 'icon-btn md:hidden';
btn.setAttribute('aria-label','Search');
btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
// Insert as first child of icon group
iconGroup.insertBefore(btn, iconGroup.firstChild);
}
// Ensure mobileHeaderSearch exists
let mobileHeaderSearch = document.getElementById('mobileHeaderSearch');
if(!mobileHeaderSearch && header){
const wrap = header.querySelector('.max-w-\[1280px\]') || header;
mobileHeaderSearch = document.createElement('div');
mobileHeaderSearch.id = 'mobileHeaderSearch';
mobileHeaderSearch.className = 'hidden absolute inset-x-0 top-0 h-[68px] bg-[#FF8EBA] z-30 flex items-center gap-2 px-4 md:hidden';
mobileHeaderSearch.innerHTML = ` <button id="mobileSearchBackInline" aria-label="Back" class="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg> </button> <div class="flex-1 h-[38px] bg-white rounded-full flex items-center px-4 gap-2"> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.2" class="opacity-40 shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> <input id="mobileSearchInput" placeholder="Search dresses, bags, shoes..." autocomplete="off" class="bg-transparent outline-none text-[13px] w-full placeholder:text-black/40" /> </div> `;
// Append inside header's inner container relative
const container = header.querySelector('.max-w-\[1280px\]') || header;
if(container) container.appendChild(mobileHeaderSearch);
}
// Ensure mobileSuggestDropdown exists
let dropdown = document.getElementById('mobileSuggestDropdown');
if(!dropdown && header){
const container = header.querySelector('.max-w-\[1280px\]') || header;
dropdown = document.createElement('div');
dropdown.id = 'mobileSuggestDropdown';
dropdown.className = 'hidden md:hidden absolute top-[68px] left-0 right-0 bg-white border-t border-black/5 max-h-[80vh] overflow-y-auto z-[99] shadow-[0_16px_40px_rgba(0,0,0,0.12)]';
dropdown.innerHTML = ` <div class="p-3"> <p class="text-[10px] font-bold tracking-widest text-black/40 px-2 py-2">SUGGESTIONS</p> <div id="mobileSuggestList"></div> </div> `;
if(container) container.appendChild(dropdown);
}
// Inject required CSS if not present
if(!document.getElementById('mobile-search-patch-style')){
const style = document.createElement('style');
style.id = 'mobile-search-patch-style';
style.textContent = ` #suggestDropdown.is-open{display:block !important;} #mobileSuggestDropdown.is-open{display:block !important;} #mobileHeaderSearch.is-open{display:flex !important;} #headerMainRow.is-hidden{opacity:0;pointer-events:none;} @media (min-width: 768px){#mobileSearchBtn{display:none !important;}} .suggest-item:hover{background:#FFF0F6;} `;
document.head.appendChild(style);
}
}catch(e){ console.warn('ensureMobileSearchUI', e); }
}
function initMobileSearch(){
ensureMobileSearchUI();
const mobileSearchBtn = $('mobileSearchBtn');
const mobileHeaderSearch = $('mobileHeaderSearch');
const mobileSearchInput = $('mobileSearchInput');
const mobileBackBtn = $('mobileSearchBackInline');
const mobileSuggestDropdown = $('mobileSuggestDropdown');
const mobileSuggestList = $('mobileSuggestList');
const headerMainRow = $('headerMainRow');
function openMobileHeaderSearch(){
if(mobileHeaderSearch){
mobileHeaderSearch.classList.add('is-open');
mobileHeaderSearch.classList.remove('hidden');
if(headerMainRow) headerMainRow.classList.add('is-hidden');
setTimeout(()=> { if(mobileSearchInput) { mobileSearchInput.focus(); renderMobileHeaderSuggestions(mobileSearchInput.value||''); } }, 80);
}
}
function closeMobileHeaderSearch(){
if(mobileHeaderSearch){
mobileHeaderSearch.classList.remove('is-open');
mobileHeaderSearch.classList.add('hidden');
if(headerMainRow) headerMainRow.classList.remove('is-hidden');
}
if(mobileSuggestDropdown){
mobileSuggestDropdown.classList.remove('is-open');
mobileSuggestDropdown.classList.add('hidden');
}
document.body.style.overflow = '';
}
function renderMobileHeaderSuggestions(query){
if(!mobileSuggestList) return;
const q = (query||'').trim();
const { products, terms, categories } = getProductSuggestions(q);
let html = '';
if(products.length > 0){
html += products.map(p=>` <button data-product-id="${p.id}" data-term="${p.title}" class="w-full text-left p-2.5 rounded-[12px] border border-black/5 hover:bg-[#FFF0F6] flex gap-3"> <span class="w-12 h-12 rounded-[8px] bg-[#F5F5F5] overflow-hidden shrink-0"><img src="${(p.images&&p.images[0])||''}" class="w-full h-full object-cover" /></span> <span class="flex-1 min-w-0 text-left"><span class="block font-bold text-[13px] truncate">${p.title}</span><span class="block text-[11px] text-black/40">${p.category||'General'} • GHS ${parseFloat(p.price||0).toFixed(2)}</span></span> </button> `).join('');
}
if(categories.length > 0){
html += `<div class="mt-2"><p class="text-[10px] font-bold tracking-widest text-black/30 px-2 py-1">CATEGORIES</p>` +
categories.map(c=> `<button data-term="${c}" data-category="${c}" class="w-full text-left px-2 py-2.5 text-[14px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3"><span class="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px]">C</span>${c}</button>`).join('') +
`</div>`;
}
let finalTerms = terms;
if(finalTerms.length===0 && !q) finalTerms = SUGGESTIONS.slice(0,6);
if(finalTerms.length>0){
const filtered = finalTerms.filter(t=> !products.find(p=> p.title.toLowerCase()===t.toLowerCase()));
html += `<div class="mt-2"><p class="text-[10px] font-bold tracking-widest text-black/30 px-2 py-1">SEARCHES</p>` +
filtered.slice(0,5).map(term=>`<button data-term="${term}" class="w-full text-left px-2 py-3 text-[14px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3"><span class="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0"><i data-lucide="search" class="w-3.5 h-3.5"></i></span><span class="truncate">${term}</span></button>`).join('') + `</div>`;
}
if(!html){
html = SUGGESTIONS.slice(0,6).map(term=>`<button data-term="${term}" class="w-full text-left px-2 py-3 text-[14px] hover:bg-[#FFF0F6] rounded-[10px] flex items-center gap-3"><span class="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0"><i data-lucide="search" class="w-3.5 h-3.5"></i></span>${term}</button>`).join('');
}
mobileSuggestList.innerHTML = html;
if(mobileSuggestDropdown){
mobileSuggestDropdown.classList.remove('hidden');
mobileSuggestDropdown.classList.add('is-open');
}
refreshLucide();
}
mobileSearchBtn?.addEventListener('click', (e)=>{
e.stopPropagation();
openMobileHeaderSearch();
});
mobileBackBtn?.addEventListener('click', closeMobileHeaderSearch);
mobileSearchInput?.addEventListener('input', (e)=>{
const val = e.target.value;
renderMobileHeaderSuggestions(val);
const si = $('searchInput');
if(si) si.value = val;
if(val.trim()){
renderSuggestions(val);
openSuggestions();
} else {
closeSuggestions();
}
});
mobileSearchInput?.addEventListener('keydown', (e)=>{
if(e.key==='Enter'){
currentSearch = e.target.value.trim();
closeMobileHeaderSearch();
handleSearchFullScreen(currentSearch);
}
if(e.key==='Escape'){
closeMobileHeaderSearch();
}
});
document.addEventListener('click', (e)=>{
const item = e.target.closest('#mobileSuggestList [data-term]');
if(!item) return;
const term = item.dataset.term;
if(mobileSearchInput) mobileSearchInput.value = term;
const si = $('searchInput');
if(si) si.value = term;
currentSearch = term;
closeMobileHeaderSearch();
handleSearchFullScreen(currentSearch);
});
document.addEventListener('click', (e)=>{
if(!mobileHeaderSearch) return;
if(mobileHeaderSearch.classList.contains('is-open')){
if(!e.target.closest('#mobileHeaderSearch') && !e.target.closest('#mobileSuggestDropdown') && !e.target.closest('#mobileSearchBtn')){
if(!e.target.closest('#mobileSuggestDropdown')) {
// keep open if typing, only close on outside
}
}
}
});
window.openMobileHeaderSearch = openMobileHeaderSearch;
window.closeMobileHeaderSearch = closeMobileHeaderSearch;
window.renderMobileHeaderSuggestions = renderMobileHeaderSuggestions;
}
/* =====================================================================
SEARCH INPUTS (DESKTOP)
===================================================================== */
function initDesktopSearch(){
const si = $('searchInput');
const sd = $('suggestDropdown');
const sl = $('suggestList');
if(!si) return;
si.addEventListener('input', (e)=>{
const val = e.target.value;
if(val.trim().length>0){
renderSuggestions(val);
if(sd) sd.classList.add('is-open');
} else {
if(sd) sd.classList.remove('is-open');
if(!currentCategoryFilter){
currentSearch="";
}
}
});
si.addEventListener('keydown', (e)=>{
if(e.key==='Enter'){
currentSearch = e.target.value.trim();
if(sd) sd.classList.remove('is-open');
handleSearchFullScreen(currentSearch);
}
});
si.addEventListener('focus', ()=>{
renderSuggestions(si.value);
if(sd) sd.classList.add('is-open');
});
sl?.addEventListener('mousedown', (e)=>{
const item = e.target.closest('[data-term]');
if (!item) return;
si.value = item.dataset.term;
currentSearch = item.dataset.term;
closeSuggestions();
handleSearchFullScreen(currentSearch);
});
document.addEventListener('click', (e)=>{
if(!si.contains(e.target) && !sd?.contains(e.target)){
closeSuggestions();
}
});
}
/* =====================================================================
CLEAR SEARCH
===================================================================== */
function initClearSearch(){
// old clearSearchBtn removed - now in search.html
$('clearSearchBtn')?.addEventListener('click', ()=>{ if(!$('searchHeader')) return;
currentSearch=""; currentCategoryFilter=""; activeCategory=null; categoryFilterActive=false;
const si = $('searchInput');
const mi = $('mobileSearchInput');
if(si) si.value=""; if(mi) mi.value="";
document.querySelectorAll('.cat-bubble').forEach(b=>b.classList.remove('is-active'));
activeBubbleEl=null;
applyProductFilters();
});
// old noResults removed
$('noResultsClearBtn')?.addEventListener('click', ()=>{ if(!$('productGrid')) return;
currentSearch=""; currentCategoryFilter="";
const si = $('searchInput'); if(si) si.value="";
applyProductFilters();
});
}
/* =====================================================================
HEADER ICONS AUTH GUARD
===================================================================== */
function initHeaderAuthGuard(){
try{
const LOGIN_PAGE = 'marketplace-auth.html';
async function isLoggedNow(){
try{
if(typeof isLoggedIn !== 'undefined' && isLoggedIn) return true;
if(typeof supa === 'undefined' || !supa) return false;
const { data:{session} } = await supa.auth.getSession();
if(session){
isLoggedIn = true;
userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
userEmail = session.user.email;
return true;
}
}catch(e){}
return false;
}
function bindGuards(){
try{
// header icons
document.querySelectorAll('a[href="wishlist.html"], a[href="bag.html"], a[href^="account.html"]').forEach(el=>{
if(el.id === 'menuBtn' || el.dataset.authGuardBound) return;
el.dataset.authGuardBound = '1';
el.addEventListener('click', async (e)=>{
const logged = await isLoggedNow();
if(logged) return;
e.preventDefault(); e.stopPropagation();
const target = el.getAttribute('href') || 'wishlist.html';
window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent(target)}`;
});
});
}catch(e){}
}
bindGuards();
document.addEventListener('plushComponentsLoaded', bindGuards);
setTimeout(bindGuards, 1200);
// HOME CARDS - wishlist heart buttons - use capture to block inline onclick
document.addEventListener('click', async (e)=>{
const btn = e.target.closest('.product-card button');
if(!btn) return;
const isHeart = btn.querySelector('[data-lucide="heart"]') || btn.innerHTML.includes('heart');
if(!isHeart) return;
// only guard heart, not bag/share
const logged = await isLoggedNow();
if(!logged){
e.preventDefault();
e.stopPropagation();
e.stopImmediatePropagation();
window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent('wishlist.html')}`;
}
}, true);
}catch(e){
console.error('initHeaderAuthGuard failed', e);
}
}
// Separate guard for heart - call AFTER products loaded, not inside initHeaderAuthGuard
function guardWishlistClicks(){
try{
const LOGIN_PAGE = 'marketplace-auth.html';
async function isLoggedNow(){
try{
if(window.isLoggedIn) return true;
if(!window.supa) return false;
const { data:{session} } = await window.supa.auth.getSession();
return !!session;
}catch{ return false; }
}
const origToggle = window.toggleWishlistById;
if(origToggle && !origToggle._guarded){
window.toggleWishlistById = async function(pid){
const logged = await isLoggedNow();
if(!logged){ window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent('wishlist.html')}`; return; }
return origToggle(pid);
};
window.toggleWishlistById._guarded = true;
}
const origHeart = window.openHeartModalById;
if(origHeart && !origHeart._guarded){
window.openHeartModalById = async function(pid){
const logged = await isLoggedNow();
if(!logged){ window.location.href = `${LOGIN_PAGE}?redirect=${encodeURIComponent('wishlist.html')}`; return; }
return origHeart(pid);
};
window.openHeartModalById._guarded = true;
}
}catch(e){ console.log('guardWishlistClicks', e.message); }
}
/* =====================================================================
INIT - FIXED ORDER (NO MORE UNDEFINED ERRORS)
===================================================================== */
/* =====================================================================
INIT - FIXED ORDER + WORKS WITH LOADER.JS (NEW NAMES)
===================================================================== */
let plushInitCount = 0;
async function initPlushApp(){
if(plushInitCount > 0) {
console.log('🔄 Re-init plush.js (components loaded)');
}
plushInitCount++;
initHeaderEls();
initSearchEls();
menuBtn = $('menuBtn');
menuDropdown = $('menuDropdown');
menuContent = $('menuContent');
renderCategories();
renderCategoriesDropdownPanel();
renderSuggestions();
initFadeUp();
// Bind header buttons
const catLeft = $('catLeft');
const catRight = $('catRight');
const catScroll = $('categoryScroll');
if(catLeft) catLeft.addEventListener('click', ()=> catScroll?.scrollBy({ left: -300, behavior: 'smooth' }));
if(catRight) catRight.addEventListener('click', ()=> catScroll?.scrollBy({ left: 300, behavior: 'smooth' }));
const ctBtn = $('categoriesToggle');
const lctBtn = $('logoCategoriesToggle');
const cAnchor = $('categoriesAnchor');
const lcAnchor = $('logoCategoriesAnchor');
const cdPanel = $('categoriesDropdownPanel');
if(ctBtn) ctBtn.addEventListener('click', (e)=>{
e.stopPropagation();
isCategoriesDropdownOpenFor(cAnchor) ? closeCategoriesDropdown() : openCategoriesDropdown(cAnchor, ctBtn);
});
if(lctBtn) lctBtn.addEventListener('click', (e)=>{
e.stopPropagation();
isCategoriesDropdownOpenFor(lcAnchor) ? closeCategoriesDropdown() : openCategoriesDropdown(lcAnchor, lctBtn);
});
if(cdPanel){
cdPanel.addEventListener('click', (e)=>{
const item = e.target.closest('[data-category]');
if(!item) return;
selectCategory(item.dataset.category);
});
}
document.addEventListener('click', (e)=>{
if(!cdPanel) return;
const clickedInsidePanel = cdPanel.contains(e.target);
const clickedAToggle = (ctBtn && ctBtn.contains(e.target)) || (lctBtn && lctBtn.contains(e.target));
if (!clickedInsidePanel && !clickedAToggle) closeCategoriesDropdown();
});
if(categoryScrollEl){
categoryScrollEl.addEventListener('click', (e)=>{
const btn = e.target.closest('[data-category]');
if(!btn) return;
selectCategory(btn.dataset.category);
});
}
const logoTextBtn = $('logoTextBtn');
if(logoTextBtn){
logoTextBtn.addEventListener('click', ()=>{
if(activeCategory) selectCategory(activeCategory);
const si = $('searchInput');
if(si) si.value='';
currentSearch="";
currentCategoryFilter="";
activeCategory=null;
categoryFilterActive=false;
closeSuggestions();
closeMenu();
applyProductFilters();
window.scrollTo({ top: 0, behavior: 'smooth' });
});
}
// Search
initDesktopSearch();
initMobileSearch();
initDedicatedMobileSearch();
initClearSearch();
initBubbleGrid();
// Menu
if(menuBtn) menuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMenu(); });
document.addEventListener('click', (e)=>{
if(!menuDropdown) return;
if(!menuDropdown.contains(e.target) && e.target!==menuBtn) closeMenu();
});
if(menuContent){
menuContent.addEventListener('click', async (e)=>{
const item = e.target.closest('[data-action]');
if (!item) return;
const action = item.dataset.action;
if(action === 'logout'){
if(supa) await supa.auth.signOut();
isLoggedIn = false;
window.location.href = 'marketplace-auth.html';
return;
}
if(action === 'login'){
closeMenu();
window.location.href = `marketplace-auth.html?redirect=${encodeURIComponent('/')}`;
return;
}
if(action === 'create-account'){
closeMenu();
window.location.href = `marketplace-auth.html?redirect=${encodeURIComponent('/')}&mode=signup`;
return;
}
if(!isLoggedIn){
window.location.href = `marketplace-auth.html?redirect=${encodeURIComponent(item.dataset.action+'.html')}`;
return;
}
closeMenu();
if(action === 'account') window.location.href = 'account.html#overview';
if(action === 'orders') window.location.href = 'account.html#orders';
if(action === 'inbox') window.location.href = 'account.html#inbox';
if(action === 'wishlist') window.location.href = 'wishlist.html';
});
}
// Scroll
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
tickTypingAnimation();
// Ticker, fade, signup, share
renderTickerReal();
const tickerTrackEl = $('tickerTrack');
// ticker already rendered above, but keep observer
const signupForm = $('signupForm');
if(signupForm){
signupForm.addEventListener('submit', (e)=>{
e.preventDefault();
alert("Thanks! We'll be in touch once your access is ready.");
e.target.reset();
});
}
const SHARE_URL = window.location.href;
const SHARE_TEXT = "Check out Plush Babes — early access is open!";
const shareWhatsapp = $('shareWhatsapp');
const shareX = $('shareX');
if(shareWhatsapp) shareWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`;
if(shareX) shareX.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
const copyLinkBtn = $('copyLinkBtn');
const copyLinkLabel = $('copyLinkLabel');
if(copyLinkBtn){
copyLinkBtn.addEventListener('click', async ()=>{
try{
await navigator.clipboard.writeText(SHARE_URL);
if(copyLinkLabel) copyLinkLabel.textContent = 'Copied!';
setTimeout(()=>{ if(copyLinkLabel) copyLinkLabel.textContent = 'Copy Link'; },2000);
}catch(err){
if(copyLinkLabel) copyLinkLabel.textContent = 'Press Ctrl+C';
}
});
}
const footerYearEl = $('footerYear');
if(footerYearEl) footerYearEl.textContent = new Date().getFullYear();
initFullScreenSearchEls();
document.getElementById('closeSearchScreenBtn')?.addEventListener('click', closeFullScreenSearch);
document.getElementById('clearSearchScreenBtn')?.addEventListener('click', ()=>{
currentSearch=""; currentCategoryFilter="";
const si=document.getElementById('searchInput'); if(si) si.value="";
const mi=document.getElementById('mobileSearchInput'); if(mi) mi.value="";
const minEl=document.getElementById('filterPriceMin'); if(minEl) minEl.value="";
const maxEl=document.getElementById('filterPriceMax'); if(maxEl) maxEl.value="";
renderSearchFilters(); renderSearchScreenResults(); closeFullScreenSearch();
});
document.getElementById('clearFiltersBtn')?.addEventListener('click', ()=>{
currentCategoryFilter="";
const minEl=document.getElementById('filterPriceMin'); if(minEl) minEl.value="";
const maxEl=document.getElementById('filterPriceMax'); if(maxEl) maxEl.value="";
const sortEl=document.getElementById('filterSort'); if(sortEl) sortEl.value="newest";
renderSearchFilters(); renderSearchScreenResults();
});
document.getElementById('filterPriceMin')?.addEventListener('input', renderSearchScreenResults);
document.getElementById('filterPriceMax')?.addEventListener('input', renderSearchScreenResults);
document.getElementById('filterSort')?.addEventListener('change', renderSearchScreenResults);
document.getElementById('searchScreenShowAllBtn')?.addEventListener('click', ()=>{
currentSearch=""; currentCategoryFilter=""; renderSearchFilters(); renderSearchScreenResults(); closeFullScreenSearch();
});
initHeaderAuthGuard();
await initAuth();
if(supa) supa.auth.onAuthStateChange(()=> initAuth());
// REAL PRODUCTS - THIS FIXES YOUR DUMMY VIEW/SALES
await fetchApprovedProducts();
window.allApprovedProducts = allApprovedProducts;
// Trigger new search component to sync
if(window.syncRealProducts) window.syncRealProducts();
document.dispatchEvent(new CustomEvent('plushProductsLoaded'));
console.log('✅ plush.js loaded - REAL PRODUCTS:', allApprovedProducts.length, 'CATEGORIES:', CATEGORIES.length);
console.log('✅ plush.js loaded - REAL PRODUCTS:', allApprovedProducts.length, 'CATEGORIES:', CATEGORIES.length, 'initCount:', plushInitCount);
}
// Run immediately if DOM already loaded (when loader.js injects plush.js AFTER components)
if(document.readyState === 'loading'){
document.addEventListener('DOMContentLoaded', initPlushApp);
} else {
initPlushApp();
}
// Also run when loader.js says components are ready
document.addEventListener('plushComponentsLoaded', initPlushApp);
// Expose for manual re-init
window.initPlushApp = initPlushApp;
/* =====================================================================
FULL SCREEN SEARCH - HEADER + FOOTER REMAIN, REST HIDES
===================================================================== */
function initFullScreenSearchEls(){
searchScreenEl = document.getElementById('searchScreen');
mainContentEl = document.getElementById('mainContent');
searchScreenGridEl = document.getElementById('searchScreenGrid');
searchScreenNoResultsEl = document.getElementById('searchScreenNoResults');
searchScreenTitleEl = document.getElementById('searchScreenTitle');
searchScreenSubEl = document.getElementById('searchScreenSub');
searchScreenCountEl = document.getElementById('searchScreenCount');
searchFilterCategoriesEl = document.getElementById('searchFilterCategories');
}
function openFullScreenSearch(){
// Delegate to Claude component if present
if(window.openSearchScreen && document.getElementById('ssGrid')){
window.openSearchScreen(currentSearch);
return;
}
if(!searchScreenEl) return;
// 1. If you wrapped middle content in #mainContent, hide it (best)
if(mainContentEl) mainContentEl.classList.add('hidden');
// 2. Fallback: hide EVERY section and ticker div between header and footer
// This covers SHOP PLUSH -> before footer
const allSections = document.querySelectorAll('body > section, body > div.ticker-viewport, body > div.bg-black, main, #heroSlides, #bubbleContainer');
allSections.forEach(el=>{
if(!el) return;
// Keep searchScreen and mobile search
if(el.id==='searchScreen' || el.id==='mobileSearchScreen') return;
// Keep mainContent wrapper check already done, but also hide its children if not wrapped
// Don't hide header/footer (they are not sections)
if(el.tagName==='HEADER' || el.tagName==='FOOTER') return;
// If it's the mainContent wrapper, we already hid it, skip children
if(el.id==='mainContent') return;
// Hide everything else from shop plush onwards
el.classList.add('hidden');
el.dataset.hiddenBySearch = '1';
});
// 3. Also specifically hide your known IDs (extra safety)
['heroSlides','bubbleContainer','categoryBubbleGrid','productGrid','noProductsSection','noSearchResults','shopPlushLabel','searchHeader','tickerTrack'].forEach(id=>{
const el = document.getElementById(id);
if(el){
const sec = el.closest('section') || el.closest('div');
if(sec && sec.id!=='searchScreen') {
sec.classList.add('hidden');
sec.dataset.hiddenBySearch = '1';
}
}
});
searchScreenEl.classList.remove('hidden');
window.scrollTo({ top: 0, behavior: 'smooth' });
renderSearchFilters();
renderSearchScreenResults();
}
function closeFullScreenSearch(){
if(window.closeSearchScreen && document.getElementById('ssGrid')){
window.closeSearchScreen();
// also restore hidden sections
document.querySelectorAll('[data-hidden-by-search="1"]').forEach(el=>{
el.classList.remove('hidden');
delete el.dataset.hiddenBySearch;
});
document.querySelectorAll('body > section, body > div.ticker-viewport, body > div.bg-black, main').forEach(el=>{
if(el.id!=='searchScreen' && el.id!=='mobileSearchScreen'){
el.classList.remove('hidden');
}
});
return;
}
if(!searchScreenEl) return;
searchScreenEl.classList.add('hidden');
if(mainContentEl) mainContentEl.classList.remove('hidden');
// Restore everything we hid
document.querySelectorAll('[data-hidden-by-search="1"]').forEach(el=>{
el.classList.remove('hidden');
delete el.dataset.hiddenBySearch;
});
// Also restore all sections (fallback)
document.querySelectorAll('body > section, body > div.ticker-viewport, body > div.bg-black, main').forEach(el=>{
if(el.id!=='searchScreen' && el.id!=='mobileSearchScreen'){
el.classList.remove('hidden');
}
});
currentSearch = "";
currentCategoryFilter = "";
const si=document.getElementById('searchInput'); if(si) si.value="";
const mi=document.getElementById('mobileSearchInput'); if(mi) mi.value="";
applyProductFilters();
}
function renderSearchFilters(){
if(searchFilterCategoriesEl){
const counts = {};
allApprovedProducts.forEach(p=>{
const cat = p.category || 'Other';
counts[cat] = (counts[cat]||0)+1;
});
const cats = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
const allCats = [...new Set([...cats, ...CATEGORIES])].slice(0,20);
searchFilterCategoriesEl.innerHTML = ` <button data-filter-cat="__all__" class="filter-cat-btn text-left px-3 py-2 rounded-full text-[12px] font-medium hover:bg-[#FFF0F6] ${!currentCategoryFilter?'bg-black text-white font-bold':''}">All (${allApprovedProducts.length})</button> ${allCats.map(cat=>{ const c = counts[cat]||0; const active = currentCategoryFilter.toLowerCase()===cat.toLowerCase(); return `<button data-filter-cat="${cat}" class="filter-cat-btn text-left px-3 py-2 rounded-full text-[12px] flex justify-between items-center hover:bg-[#FFF0F6] ${active?'bg-black text-white font-bold':''}"><span>${cat}</span><span class="text-[10px] opacity-60">${c}</span></button>`; }).join('')} `;
searchFilterCategoriesEl.querySelectorAll('.filter-cat-btn').forEach(btn=>{
btn.addEventListener('click', ()=>{
const cat = btn.dataset.filterCat;
currentCategoryFilter = cat==='__all__' ? "" : cat;
renderSearchFilters();
renderSearchScreenResults();
applyProductFilters();
});
});
}
// Regions filter
searchFilterRegionsEl = document.getElementById('searchFilterRegions') || document.getElementById('filterRegionSelect');
if(searchFilterRegionsEl){
const regionCounts = {};
allApprovedProducts.forEach(p=>{
const r = p.region || p.city || 'Accra';
regionCounts[r] = (regionCounts[r]||0)+1;
});
const accraTotal = allApprovedProducts.length;
const regionOptions = [`<option value="__all__">Stores around me • Accra (${accraTotal})</option>`].concat(ACCRA_AREAS.map(r=>{
const c = Object.keys(regionCounts).filter(k=>k.toLowerCase().includes(r.toLowerCase().split(' ')[0].toLowerCase())).reduce((a,k)=>a+regionCounts[k],0);
return `<option value="${r}" ${currentRegionFilter===r?'selected':''}>${r}${c?' ('+c+')':''}</option>`;
}));
// PATCHED: ONLY dropdown, no text buttons for regions
if(searchFilterRegionsEl.tagName==='SELECT'){
const prev = currentRegionFilter;
searchFilterRegionsEl.innerHTML = regionOptions.join('');
searchFilterRegionsEl.value = prev;
}
}
populateRegionSelects();
}
function getFilteredForSearchScreen(){
let result = [...allApprovedProducts];
if(currentCategoryFilter){
const cat = currentCategoryFilter.toLowerCase();
result = result.filter(p=> (p.category||'').toLowerCase().includes(cat));
}
// ACCRA-ONLY: if __all__ show all, else filter by area name
if(currentRegionFilter && currentRegionFilter!=='__all__'){
const reg = currentRegionFilter.toLowerCase().replace(' / ',' ').replace('/',' ');
if(!reg.includes('accra - all')){
result = result.filter(p=> {
const loc = `${p.region||''} ${p.city||''} ${p.location||''} ${p.area||''}`.toLowerCase();
return loc.includes(reg) || reg.split(' ').some(w=> w.length>3 && loc.includes(w));
});
}
}
if(currentSearch){
const q = currentSearch.toLowerCase();
result = result.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q) ||
(p.category||'').toLowerCase().includes(q));
}
const min = parseFloat(document.getElementById('filterPriceMin')?.value) || parseFloat(document.getElementById('filterPriceMinMobile')?.value);
const max = parseFloat(document.getElementById('filterPriceMax')?.value) || parseFloat(document.getElementById('filterPriceMaxMobile')?.value);
if(!isNaN(min)) result = result.filter(p=> parseFloat(p.price)>=min);
if(!isNaN(max)) result = result.filter(p=> parseFloat(p.price)<=max);
const sort = document.getElementById('filterSort')?.value || document.getElementById('mobileSort')?.value || currentSort;
if(sort==='price-low') result.sort((a,b)=> parseFloat(a.price)-parseFloat(b.price));
if(sort==='price-high') result.sort((a,b)=> parseFloat(b.price)-parseFloat(a.price));
if(sort==='newest') result.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
if(sort==='rating-high') result.sort((a,b)=> (getProductRating(b.id).avg||0)-(getProductRating(a.id).avg||0));
return result;
}
function renderSearchScreenResults(){
if(!searchScreenGridEl) return;
const result = getFilteredForSearchScreen();
if(searchScreenTitleEl){
if(currentSearch && currentCategoryFilter) searchScreenTitleEl.textContent = `"${currentSearch}" in ${currentCategoryFilter}`;
else if(currentSearch) searchScreenTitleEl.textContent = `Results for "${currentSearch}"`;
else if(currentCategoryFilter) searchScreenTitleEl.textContent = currentCategoryFilter;
else if(currentRegionFilter && currentRegionFilter!=='__all__') searchScreenTitleEl.textContent = currentRegionFilter;
else searchScreenTitleEl.textContent = `All products`;
}
if(searchScreenSubEl) searchScreenSubEl.textContent = `${result.length} product${result.length!==1?'s':''} found • ${currentRegionFilter==='__all__'? ACCRA_DEFAULT_LABEL : currentRegionFilter} • Accra`;
if(searchScreenCountEl) searchScreenCountEl.textContent = result.length;
if(result.length===0){
searchScreenGridEl.classList.add('hidden');
if(searchScreenNoResultsEl){
searchScreenNoResultsEl.classList.remove('hidden');
const qEl = document.getElementById('searchScreenQuery');
if(qEl) qEl.textContent = currentSearch || currentCategoryFilter || currentRegionFilter;
}
} else {
if(searchScreenNoResultsEl) searchScreenNoResultsEl.classList.add('hidden');
searchScreenGridEl.classList.remove('hidden');
searchScreenGridEl.innerHTML = result.map(p=>{
const rating = getProductRating(p.id);
const wishlisted = isWishlisted(p.id);
const link = `product.html?id=${p.id}`;
return ` <div class="group relative border border-black/[0.06] rounded-[18px] bg-white overflow-hidden hover:border-black/12 hover:shadow-[0_12px_32px_rgba(0,0,0,0.07)] transition-all duration-300 flex flex-col"> <a href="${link}" class="w-full aspect-[4/5] bg-[#F7F7F7] overflow-hidden block relative" onclick="handleProductClick('${p.id}')"> <img src="${(p.images&&p.images[0])||'https://via.placeholder.com/400x500/F5F5F5/999?text=No+Image'}" class="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500" loading="lazy" /> <span class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-black text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-black/5 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> Accra</span> <button onclick="event.preventDefault(); event.stopPropagation(); window.openHeartModalById? window.openHeartModalById('${p.id}') : toggleWishlistById('${p.id}')" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-10 ${wishlisted ? 'fill-[#FF3040] text-[#FF3040] heart-pop' : 'text-black/60 group-hover:text-black'}"></i></button> </a> <div class="p-3.5 flex flex-col flex-1"> <div class="text-[10px] font-bold tracking-widest uppercase text-black/35 truncate">${p.category||'General'}</div> <a href="${link}" class="font-bold text-[13.5px] leading-tight mt-1 line-clamp-2 min-h-[34px] hover:underline" onclick="handleProductClick('${p.id}')">${p.title}</a> <div class="flex items-center gap-1 mt-1">${renderStarsSmall(rating.avg)} <span class="text-[10px] text-black/35">(${rating.count})</span></div> <div class="font-black text-[15px] mt-2">GHS ${parseFloat(p.price||0).toFixed(2)}</div> <div class="mt-3 grid grid-cols-[1fr_38px] gap-2"><button onclick="addToBagById('${p.id}')" class="h-9 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center gap-1.5"><i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Add to Bag</button><button onclick="navigator.clipboard.writeText(window.location.origin + '/product.html?id=${p.id}'); showToast('Link copied!')" class="h-9 w-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition"><i data-lucide="share-2" class="w-4 h-4"></i></button></div> </div> </div> `;
}).join('');
refreshLucide();
}
// Also update mobile dedicated grid if exists
const mobileGrid = document.getElementById('mobileSearchResults');
if(mobileGrid){
mobileGrid.innerHTML = searchScreenGridEl.innerHTML;
refreshLucide();
}
}
function handleSearchFullScreen(query){
currentSearch = (query||'').trim();
// If searchScreen exists on this page (index.html), open it
const el = document.getElementById('searchScreen');
if(el || window.openSearchScreen){
if(window.openSearchScreen){
window.openSearchScreen(currentSearch);
return;
}
if(el){
el.classList.remove('hidden');
document.body.style.overflow='hidden';
if(window.syncRealProducts) window.syncRealProducts();
setTimeout(()=>{
if(window.openSearchScreen){
window.openSearchScreen(currentSearch);
} else if(window.renderClaudeSearch){
window.renderClaudeSearch();
}
}, 150);
return;
}
}
// If searchScreen NOT on this page (e.g. bag.html, product.html), go to index with search param
// That will load components/search.html overlay
if(currentSearch){
const isIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '/index.html';
if(!isIndex){
window.location.href = '/index.html?search=' + encodeURIComponent(currentSearch);
return;
}
}
// Fallback retry
setTimeout(()=>{ if(window.openSearchScreen) window.openSearchScreen(currentSearch); }, 500);
}
// ===== HEART TAP -> SHOW GROUPS / MOST RECENT GROUPS, CREATE NEW, ADD TO WISHLIST =====
function getWishlist(){
try{ return JSON.parse(localStorage.getItem('pb_wishlist')||'[]') }catch{ return [] }
}
function saveWishlist(wl){
localStorage.setItem('pb_wishlist', JSON.stringify(wl));
updateWishlistCount();
updateWishlistBtn();
}
function updateWishlistBtn(){
const btn = document.getElementById('wishlistBtn');
if(!btn || !currentProduct) return;
const exists = getWishlist().find(x => x.id === currentProduct.id);
btn.innerHTML = ''; // clear
const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('width','18');
svg.setAttribute('height','18');
svg.setAttribute('viewBox','0 0 24 24');
svg.setAttribute('stroke-width','1.7');
const path = document.createElementNS('http://www.w3.org/2000/svg','path');
path.setAttribute('d','M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
if(exists){
btn.classList.add('wishlist-active');
svg.setAttribute('fill','#FF3B5C');
svg.setAttribute('stroke','#FF3B5C');
} else {
btn.classList.remove('wishlist-active');
svg.setAttribute('fill','none');
svg.setAttribute('stroke','currentColor');
}
svg.appendChild(path);
btn.appendChild(svg);
}
let pendingHeartProduct = null;
window.productMap = window.productMap || {};
function ensureHeartModalExists(){
if(!document.getElementById('heartGroupsModal')) document.body.insertAdjacentHTML('beforeend', ` <div id="heartGroupsModal" class="fixed inset-0 bg-black/50 z-[400] hidden items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"> <div class="bg-white w-full md:max-w-[420px] rounded-t-[24px] md:rounded-[20px] max-h-[85vh] overflow-hidden flex flex-col"> <div class="p-5 border-b border-black/5 flex justify-between items-center"><h3 class="font-black text-[18px]">Save to</h3><button type="button" data-heart-action="close" aria-label="Close wishlist popup" class="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">✕</button></div> <div class="overflow-y-auto p-3 space-y-2 flex-1"> <button type="button" data-heart-action="general" class="w-full flex items-center gap-3 p-3 rounded-[14px] border border-black/10 hover:bg-[#FFF0F6] text-left"><span class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center"><i data-lucide="heart" class="w-5 h-5"></i></span><span><span class="font-bold text-[14px] block">General wishlist</span><span class="text-[12px] text-black/40">Save without group</span></span></button> <p class="text-[11px] font-bold uppercase text-black/30 px-2 pt-3">Recent groups</p> <div id="heartGroupsListGlobal"></div> <button type="button" data-heart-action="new-group" class="w-full h-11 rounded-full border border-dashed border-black/20 text-[13px] font-bold mt-3">+ Create new group</button> </div> <div id="heartProductPreviewGlobal" class="p-3 border-t border-black/5 bg-[#FAFAFA] flex gap-3"></div> </div> </div> <div id="createGroupModalGlobal" class="fixed inset-0 bg-black/50 z-[500] hidden items-center justify-center p-4"><div class="bg-white rounded-[20px] max-w-[400px] w-full p-6"><div class="flex justify-between items-center"><h3 class="font-black">New group</h3><button type="button" data-heart-action="close-new-group" aria-label="Close new group popup" class="w-8 h-8 rounded-full bg-black text-white">✕</button></div><input id="groupNameInputGlobal" placeholder="e.g. Birthday Glam" class="w-full mt-4 h-11 rounded-full border border-black/10 px-4"/><button type="button" data-heart-action="create-group" class="w-full h-11 rounded-full bg-black text-white font-bold mt-4">Create</button></div></div> <div id="removeWishlistModal" class="fixed inset-0 bg-black/50 z-[600] hidden items-center justify-center p-4"><div class="bg-white rounded-[20px] max-w-[360px] w-full p-6 text-center"><h3 class="font-black text-[18px]">Remove from wishlist?</h3><div id="removeWishlistPreview" class="mt-4 p-3 bg-[#FAFAFA] rounded-[12px] flex gap-3"></div><div class="flex gap-3 mt-6"><button type="button" data-heart-action="cancel-remove" class="flex-1 h-11 rounded-full border">Cancel</button><button type="button" data-heart-action="remove" class="flex-1 h-11 rounded-full bg-black text-white">Remove</button></div></div></div>`);
const heartModal = document.getElementById('heartGroupsModal');
if(heartModal && heartModal.dataset.handlersBound !== 'true'){
heartModal.dataset.handlersBound = 'true';
heartModal.addEventListener('click', e=>{
if(e.target === heartModal){ closeHeartModalGlobal(); return; }
const button = e.target.closest('[data-heart-action]');
if(!button) return;
const action = button.dataset.heartAction;
if(action === 'close') closeHeartModalGlobal();
if(action === 'general') addPendingToGeneralGlobal();
if(action === 'group') addPendingToGroupGlobal(button.dataset.groupId);
if(action === 'new-group'){
const modal = document.getElementById('createGroupModalGlobal');
modal.classList.remove('hidden');
modal.classList.add('flex');
document.getElementById('groupNameInputGlobal').focus();
}
});
}
const createGroupModal = document.getElementById('createGroupModalGlobal');
if(createGroupModal && createGroupModal.dataset.handlersBound !== 'true'){
createGroupModal.dataset.handlersBound = 'true';
createGroupModal.addEventListener('click', e=>{
if(e.target === createGroupModal || e.target.closest('[data-heart-action="close-new-group"]')){
closeCreateGroupModalGlobal();
}else if(e.target.closest('[data-heart-action="create-group"]')){
createGroupFromHeartGlobal();
}
});
}
const removeModal = document.getElementById('removeWishlistModal');
if(removeModal && removeModal.dataset.handlersBound !== 'true'){
removeModal.dataset.handlersBound = 'true';
removeModal.addEventListener('click', e=>{
if(e.target === removeModal || e.target.closest('[data-heart-action="cancel-remove"]')){
closeRemoveWishlistModalGlobal();
}else if(e.target.closest('[data-heart-action="remove"]')){
confirmRemoveWishlistGlobal();
}
});
}
refreshLucide();
}
function normalizeForModal(p){
if(!p) return null;
return {
id: p.id,
name: p.title || p.name || p.product_name || 'Product',
title: p.title || p.name || 'Product',
image: (p.images && p.images[0]) || p.image || p.thumbnail || p.main_image || '',
price: typeof p.price === 'string' ? p.price : (p.price ? `GHS ${p.price}` : ''),
raw: p
};
}
function openHeartModalById(id){
ensureHeartModalExists();
let raw = window.productMap[id] || allApprovedProducts.find(x=>String(x.id)==String(id)) || filteredProducts.find(x=>String(x.id)==String(id));
if(!raw){
const c=document.querySelector(`.product-card[data-id="${id}"]`);
if(c) raw={ id, title:c.querySelector('h3')?.textContent||'Product', images:[c.querySelector('img')?.src||''], price:c.dataset.price||'' };
}
if(!raw){ showToast('Product not ready'); return; }
let p = normalizeForModal(raw);
pendingHeartProduct = p.raw || raw;
window.productMap[id] = p.raw || raw;
window.productMap[id]._normalized = p; // cache
if(isWishlisted(id)){
document.getElementById('removeWishlistPreview').innerHTML=`<img src="${p.image}" class="w-12 h-12 rounded-[8px] object-cover bg-[#F5F5F5]"/><div class="flex-1 min-w-0"><p class="font-bold text-[13px] truncate">${p.name}</p><p class="text-[12px] text-black/40">${p.price}</p></div>`;
document.getElementById('removeWishlistModal').classList.remove('hidden');document.getElementById('removeWishlistModal').classList.add('flex');return;
}
const groups=getWishlistGroups();
document.getElementById('heartGroupsListGlobal').innerHTML=groups.length?groups.map(x=>`<button type="button" data-heart-action="group" data-group-id="${String(x.id).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}" class="w-full flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#FAFAFA] text-left"><span class="w-10 h-10 rounded-full bg-[#FFF0F6] flex items-center justify-center">📁</span><span><span class="font-bold text-[13px] block">${String(x.name).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</span><span class="text-[11px] text-black/40">${x.products.length} items</span></span></button>`).join(''):'<p class="text-[12px] text-black/30 px-2">No groups yet</p>';
document.getElementById('heartProductPreviewGlobal').innerHTML=`<img src="${p.image}" class="w-12 h-12 rounded-[8px] object-cover bg-[#F5F5F5]"/><div class="flex-1 min-w-0"><p class="font-bold text-[13px] truncate">${p.name}</p><p class="text-[12px] text-black/40">${p.price}</p></div>`;
document.getElementById('heartGroupsModal').classList.remove('hidden');document.getElementById('heartGroupsModal').classList.add('flex');refreshLucide();
}
function closeHeartModalGlobal(){
const m=document.getElementById('heartGroupsModal');
if(m){ m.classList.add('hidden'); m.classList.remove('flex'); }
}
function closeCreateGroupModalGlobal(){
const m=document.getElementById('createGroupModalGlobal');
if(m){ m.classList.add('hidden'); m.classList.remove('flex'); }
}
function closeRemoveWishlistModalGlobal(){
const m=document.getElementById('removeWishlistModal');
if(m){ m.classList.add('hidden'); m.classList.remove('flex'); }
}
function addPendingToGeneralGlobal(){
if(!pendingHeartProduct) return;
const pid = String(pendingHeartProduct.id);
let wl=getWishlistItems();
const already = wl.find(x=>String(x.id)==pid);
if(!already) wl.push(pendingHeartProduct);
wishlist=wl; saveWishlistItems(wl); saveWishlist(wl);
// close + toast FIRST so user sees it
closeHeartModalGlobal();
showToast(already ? 'Already in wishlist' : 'Added to wishlist');
paintHeart(pid, true);
const card=document.querySelector(`.product-card[data-id="${pid}"]`);
if(card){
card.style.transform='scale(0.98)'; card.style.opacity='0.7';
setTimeout(()=>{ card.style.transform=''; card.style.opacity=''; }, 120);
}
updateHeaderCounts();
if(!already) syncWishlistToSupabase(pid, true);
}
function addPendingToGroupGlobal(gid){
if(!pendingHeartProduct) return;
const pid=String(pendingHeartProduct.id);
let gs=getWishlistGroups(); const g=gs.find(x=>x.id==gid);
if(g && !g.products.find(x=>String(x.id)==pid)) g.products.push(pendingHeartProduct);
let wl=getWishlistItems(); if(!wl.find(x=>String(x.id)==pid)) wl.push(pendingHeartProduct);
wishlist=wl; saveWishlistItems(wl); saveWishlist(wl); saveWishlistGroups(gs);
closeHeartModalGlobal();
showToast(g ? 'Added to '+g.name : 'Added to wishlist');
paintHeart(pid, true);
const card=document.querySelector(`.product-card[data-id="${pid}"]`);
if(card){ card.style.transform='scale(0.98)'; setTimeout(()=>{ card.style.transform=''; }, 120); }
updateHeaderCounts();
syncWishlistToSupabase(pid, true);
}
function confirmRemoveWishlistGlobal(){
if(!pendingHeartProduct) return;
const pid=String(pendingHeartProduct.id);
let wl=getWishlistItems().filter(x=>String(x.id)!=pid); wishlist=wl; saveWishlistItems(wl); saveWishlist(wl);
let gs=getWishlistGroups(); gs.forEach(g=> g.products=g.products.filter(p=>String(p.id)!=pid)); saveWishlistGroups(gs);
closeRemoveWishlistModalGlobal();
showToast('Removed from wishlist');
paintHeart(pid, false);
const card=document.querySelector(`.product-card[data-id="${pid}"]`);
if(card){ card.style.transform='scale(0.98)'; setTimeout(()=>{ card.style.transform=''; }, 120); }
updateHeaderCounts();
syncWishlistToSupabase(pid, false);
}
function createGroupFromHeartGlobal(){
const name=document.getElementById('groupNameInputGlobal').value.trim(); if(!name){ showToast('Enter name'); return; }
let groups=getWishlistGroups(); const newGroup={id:'grp_'+Date.now(), name, description:'', products: pendingHeartProduct? [pendingHeartProduct] : [],
created_at:new Date().toISOString()};
groups.push(newGroup); saveWishlistGroups(groups);
if(pendingHeartProduct){
let wl=getWishlistItems();
if(!wl.find(x=>String(x.id)===String(pendingHeartProduct.id))){
wl.push(pendingHeartProduct);
wishlist = wl;
saveWishlistItems(wl);
saveWishlist(wl);
syncWishlistToSupabase(pendingHeartProduct.id, true);
}
}
closeCreateGroupModalGlobal();
document.getElementById('groupNameInputGlobal').value='';
closeHeartModalGlobal();
showToast('Group created: '+name);
if(pendingHeartProduct) paintHeart(pendingHeartProduct.id, true);
}
window.openHeartModalById = openHeartModalById;
window.addPendingToGroupGlobal = addPendingToGroupGlobal;