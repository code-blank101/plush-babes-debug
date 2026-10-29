// components/search.js - Claude Search Logic with Skeleton
(function(){
  const CATEGORIES = ["Women clothing","Kids & Baby","Beauty","Shoes","Bags & Luggage","Jewelry & Accessories","Home & Living","Electronics","Phones & Accessories","Sports & Fitness","Health & Personal Care","Toys & Games","Stationery & School","Pet Supplies","Automotive","Travel","Party & Events","Wedding","Groceries & Food","Tools & DIY","Outdoor & Garden","Office Supplies","Furniture","New Arrivals","Trending","Best Sellers","Flash Sale","Kitchen essentials","Room decoration items"];
  const AREAS = ["East Legon","Osu","Cantonments","Labone","Madina","Adenta","Spintex","Tema","Dansoman","Achimota","Lapaz"];
  
  let PRODUCTS = [];
  let state = { query: '', cats: new Set(), region: 'all', min: '', max: '', sort: 'newest' };
  let wished = new Set();
  let initialized = false;
  let emptyAction = ()=>{};

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(n){ return 'GH₵ ' + Number(n).toLocaleString(); }

  function showSearchSkeleton(){
    var sk = document.getElementById('ssGridSkeleton');
    var grid = document.getElementById('ssGrid');
    var empty = document.getElementById('ssEmpty');
    if(sk) sk.classList.remove('hidden');
    if(grid) grid.classList.add('hidden');
    if(empty){ empty.classList.add('hidden'); empty.classList.remove('flex'); }
  }
  function hideSearchSkeleton(){
    var sk = document.getElementById('ssGridSkeleton');
    if(sk) sk.classList.add('hidden');
  }

  function syncRealProducts(){
    var src = window.allApprovedProducts || [];
    if(!src.length && window._plushProductsFallback) src = window._plushProductsFallback;
    if(!src.length) return;
    PRODUCTS = src.map(function(p,i){
      return {
        id: p.id || i,
        name: p.title || p.name || 'Product',
        price: Number(p.price)||0,
        cat: p.category || 'Other',
        vendor: p.store_name || p.vendor || (p.vendor_applications && p.vendor_applications.store_name) || 'Store',
        area: p.area || p.city || p.region || 'Accra',
        rating: Number(p.rating)||4.5,
        added: p.created_at ? new Date(p.created_at).getTime() : Date.now() - i*1000,
        image: (p.images && p.images[0]) || p.image_url || p.image || '',
        raw: p
      };
    });
  }

  function filterPanelHTML(){
    var catsHtml = CATEGORIES.map(function(c){ return '<label class="flex items-center gap-2 py-1.5 text-[13px] cursor-pointer"><input type="checkbox" data-f="cat" value="'+esc(c)+'" class="w-4 h-4 accent-black" />'+esc(c)+'</label>'; }).join('');
    var areasHtml = AREAS.map(function(a){ return '<option value="'+esc(a)+'">'+esc(a)+'</option>'; }).join('');
    return '<div class="hidden lg:flex items-center justify-between mb-4"><p class="font-black text-[13px]">Filters</p><button data-action="clear" class="sc-link" type="button">Clear all</button></div><div class="mb-6"><p class="sc-label">Category</p><div class="space-y-0.5 max-h-[240px] overflow-y-auto pr-1 scrollbar-none">'+catsHtml+'</div></div><div class="mb-6"><p class="sc-label">Area · Accra</p><select data-f="region" class="sc-input"><option value="all">All areas</option>'+areasHtml+'</select></div><div class="mb-2"><p class="sc-label">Price (GH₵)</p><div class="grid grid-cols-2 gap-2"><input data-f="min" type="number" min="0" inputmode="numeric" placeholder="Min" class="sc-input" /><input data-f="max" type="number" min="0" inputmode="numeric" placeholder="Max" class="sc-input" /></div></div>';
  }

  function syncFilterControls(){
    document.querySelectorAll('[data-f="cat"]').forEach(function(el){ el.checked = state.cats.has(el.value); });
    document.querySelectorAll('[data-f="region"]').forEach(function(el){ el.value = state.region; });
    document.querySelectorAll('[data-f="min"]').forEach(function(el){ if(document.activeElement!==el) el.value = state.min; });
    document.querySelectorAll('[data-f="max"]').forEach(function(el){ if(document.activeElement!==el) el.value = state.max; });
    var ssSort = document.getElementById('ssSort');
    if(ssSort) ssSort.value = state.sort;
  }

  function getResults(){
    var q = state.query.trim().toLowerCase();
    var min = state.min === '' ? null : Number(state.min);
    var max = state.max === '' ? null : Number(state.max);
    var list = PRODUCTS.filter(function(p){
      if(q && (p.name+' '+p.cat+' '+p.vendor+' '+p.area).toLowerCase().indexOf(q)===-1) return false;
      if(state.cats.size && !state.cats.has(p.cat)) return false;
      if(state.region !== 'all' && p.area.toLowerCase().indexOf(state.region.toLowerCase())===-1) return false;
      if(min !== null && p.price < min) return false;
      if(max !== null && p.price > max) return false;
      return true;
    });
    var sorters = {
      'newest': function(a,b){ return b.added-a.added; },
      'price-low': function(a,b){ return a.price-b.price; },
      'price-high': function(a,b){ return b.price-a.price; },
      'rating-high': function(a,b){ return b.rating-a.rating; }
    };
    return list.sort(sorters[state.sort] || sorters['newest']);
  }

  function activeFilterCount(){
    return state.cats.size + (state.region !== 'all' ? 1 : 0) + (state.min !== '' || state.max !== '' ? 1 : 0);
  }

  function clearFilters(){
    showSearchSkeleton();
    state.cats.clear(); state.region='all'; state.min=''; state.max='';
    syncFilterControls();
    setTimeout(function(){ renderResults(); }, 250);
  }

  function productCardHTML(p){
    var isWished = wished.has(String(p.id));
    var img = p.image ? '<img src="'+esc(p.image)+'" alt="" class="w-full h-full object-cover" loading="lazy" />' : '<div class="w-full h-full bg-[#F2F2F2] flex items-center justify-center"><span class="text-[10px] font-bold text-black/30">NO IMG</span></div>';
    var link = 'product.html?id='+p.id;
    var heartFill = isWished ? 'currentColor' : 'none';
    var heartClass = isWished ? 'text-black' : 'text-black/40';
    return '<article class="bg-white border border-black/10 rounded-[14px] overflow-hidden hover:border-black/20 transition-colors"><a href="'+link+'" class="relative aspect-square bg-[#F2F2F2] flex items-center justify-center overflow-hidden block">'+img+'<button data-wish="'+p.id+'" type="button" aria-label="Save" class="absolute top-2 right-2 w-8 h-8 rounded-[9px] bg-white/95 flex items-center justify-center '+heartClass+' hover:scale-105 transition-transform"><svg width="15" height="15" viewBox="0 0 24 24" fill="'+heartFill+'" stroke="currentColor" stroke-width="1.8"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button></a><div class="p-3"><a href="'+link+'" class="text-[12.5px] font-semibold leading-snug line-clamp-2 min-h-[34px] hover:underline block">'+esc(p.name)+'</a><p class="font-black text-[14px] mt-1.5">'+money(p.price)+'</p><p class="text-[11px] text-black/45 mt-1 truncate">'+esc(p.vendor)+' · '+esc(p.area)+'</p><p class="text-[11px] font-semibold mt-1">★ '+Number(p.rating).toFixed(1)+'</p></div></article>';
  }

  function renderChips(){
    var chips=[];
    if(state.query.trim()) chips.push({label:'“'+state.query.trim()+'”',type:'query'});
    state.cats.forEach(function(c){ chips.push({label:c,type:'cat',val:c}); });
    if(state.region!=='all') chips.push({label:state.region,type:'region'});
    if(state.min!==''||state.max!==''){ chips.push({label:(state.min!==''?money(state.min):'Any')+' – '+(state.max!==''?money(state.max):'Any'),type:'price'}); }
    var el=document.getElementById('ssChips');
    if(!el) return;
    var html = chips.map(function(c){ return '<span class="sc-chip">'+esc(c.label)+'<button data-chip-type="'+c.type+'" data-chip-val="'+esc(c.val||'')+'" type="button"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>'; }).join('') + (chips.length>1?'<button data-action="clear-all-chips" type="button" class="sc-link shrink-0 ml-1">Clear all</button>':'');
    el.innerHTML = html;
  }

  function renderResults(){
    syncRealProducts();
    hideSearchSkeleton();
    var gridEl = document.getElementById('ssGrid');
    var emptyEl = document.getElementById('ssEmpty');
    if(!gridEl || !emptyEl) return;
    var results = getResults();
    var n = results.length;
    var filtersOn = activeFilterCount();
    
    var ssTitle = document.getElementById('ssTitle');
    var ssSub = document.getElementById('ssSub');
    if(ssTitle) ssTitle.textContent = state.query.trim() ? 'Results for "'+state.query.trim()+'"' : 'All products';
    if(ssSub) ssSub.textContent = n+' product'+(n===1?'':'s')+' found • '+(state.region==='all'?'Accra':state.region);
    
    var badge = document.getElementById('ssFilterBadge');
    if(badge){
      badge.textContent = filtersOn;
      if(filtersOn===0){ badge.classList.add('hidden'); badge.classList.remove('flex'); }
      else { badge.classList.remove('hidden'); badge.classList.add('flex'); }
    }
    var applyBtn = document.getElementById('ssSheetApply');
    if(applyBtn) applyBtn.textContent = 'Show '+n+' result'+(n===1?'':'s');
    
    renderChips();
    
    if(n>0){
      gridEl.classList.remove('hidden');
      emptyEl.classList.add('hidden'); emptyEl.classList.remove('flex');
      gridEl.innerHTML = results.map(productCardHTML).join('');
      return;
    }
    gridEl.classList.add('hidden'); gridEl.innerHTML='';
    emptyEl.classList.remove('hidden'); emptyEl.classList.add('flex');
    var title=document.getElementById('ssEmptyTitle');
    var text=document.getElementById('ssEmptyText');
    var btn=document.getElementById('ssEmptyBtn');
    if(!title||!text||!btn) return;
    if(PRODUCTS.length===0){
      title.textContent='No products yet';
      text.textContent='We are loading products from Supabase. If this persists, check approved vendor_products.';
      btn.textContent='Reload';
      emptyAction=function(){ window.location.reload(); };
    } else {
      title.textContent = state.query.trim() ? 'No results for "'+state.query.trim()+'"' : 'No products match these filters';
      text.textContent='Try different keywords or clear your filters.';
      btn.textContent = filtersOn ? 'Clear filters' : 'Show all products';
      emptyAction=function(){ state.query=''; clearFilters(); };
    }
  }

  function initComponent(){
    if(initialized) return;
    var filterDesktop = document.getElementById('ssFilterDesktop');
    var filterMobile = document.getElementById('ssFilterMobile');
    if(!filterDesktop || !filterMobile) {
      setTimeout(initComponent, 200);
      return;
    }
    
    filterDesktop.innerHTML = filterPanelHTML();
    filterMobile.innerHTML = filterPanelHTML();
    initialized = true;
    syncRealProducts();
    if(PRODUCTS.length===0) showSearchSkeleton();
    syncFilterControls();
    setTimeout(function(){ renderResults(); }, 300);
    
    document.getElementById('ssEmptyBtn').addEventListener('click', function(){ emptyAction(); });
    
    document.addEventListener('input', function(e){
      var f = e.target.dataset && e.target.dataset.f;
      if(!f) return;
      if(f==='cat'){ if(e.target.checked) state.cats.add(e.target.value); else state.cats.delete(e.target.value); }
      if(f==='region') state.region = e.target.value;
      if(f==='min') state.min = e.target.value;
      if(f==='max') state.max = e.target.value;
      syncFilterControls();
      showSearchSkeleton();
      setTimeout(function(){ renderResults(); }, 250);
    });
    
    document.getElementById('ssSort').addEventListener('change', function(e){ 
      showSearchSkeleton();
      state.sort = e.target.value; 
      setTimeout(function(){ renderResults(); }, 200);
    });
    
    document.addEventListener('click', function(e){
      var wish = e.target.closest('[data-wish]');
      if(wish){
        e.preventDefault(); e.stopPropagation();
        var id = String(wish.dataset.wish);
        if(wished.has(id)) wished.delete(id); else wished.add(id);
        renderResults();
        return;
      }
      var chip = e.target.closest('[data-chip-type]');
      if(chip){
        var type=chip.dataset.chipType;
        if(type==='query') state.query='';
        if(type==='cat') state.cats.delete(chip.dataset.chipVal);
        if(type==='region') state.region='all';
        if(type==='price'){ state.min=''; state.max=''; }
        syncFilterControls(); 
        showSearchSkeleton();
        setTimeout(function(){ renderResults(); }, 200);
        return;
      }
      if(e.target.closest('[data-action="clear"]') || e.target.closest('#ssSheetClear')){ clearFilters(); return; }
      if(e.target.closest('[data-action="clear-all-chips"]')){ state.query=''; clearFilters(); return; }
    });

    var sheetEl = document.getElementById('ssSheet');
    var openSheet = function(){
      if(!sheetEl) return;
      sheetEl.classList.remove('hidden');
      requestAnimationFrame(function(){ sheetEl.classList.add('is-open'); });
    };
    var closeSheet = function(){
      if(!sheetEl) return;
      sheetEl.classList.remove('is-open');
      setTimeout(function(){ sheetEl.classList.add('hidden'); },240);
    };
    
    document.getElementById('ssOpenSheet').addEventListener('click', openSheet);
    document.getElementById('ssSheetApply').addEventListener('click', closeSheet);
    document.getElementById('ssSheetBackdrop').addEventListener('click', closeSheet);
    document.getElementById('ssSheetClear').addEventListener('click', clearFilters);
    
    var searchScreenEl = document.getElementById('searchScreen');
    
    function updateTopOffset(){
      var header = document.getElementById('siteHeader');
      if(header && searchScreenEl){
        var h = header.offsetHeight || 124;
        searchScreenEl.style.top = h + 'px';
      }
    }
    
    window.openSearchScreen = function(query){
      updateTopOffset();
      if(PRODUCTS.length===0) showSearchSkeleton();
      syncRealProducts();
      state.query = query || '';
      syncFilterControls();
      if(searchScreenEl){
        searchScreenEl.classList.remove('hidden');
        searchScreenEl.scrollTop = 0;
      }
      document.body.style.overflow='hidden';
      // Update URL for shareability but don't reload
      try{
        if(query){
          var url = new URL(window.location);
          url.searchParams.set('search', query);
          window.history.replaceState({}, '', url);
        }
      }catch(e){}
      setTimeout(function(){ renderResults(); }, PRODUCTS.length===0 ? 500 : 0);
    };
    
    window.closeSearchScreen = function(clear){
      // clear search when X is clicked (default true)
      var shouldClear = clear !== false;
      if(shouldClear){
        state.query = '';
        var mainInput = document.getElementById('searchInput');
        var mobileInput = document.getElementById('mobileSearchInput');
        if(mainInput) mainInput.value = '';
        if(mobileInput) mobileInput.value = '';
        try{ if(window.currentSearch !== undefined) window.currentSearch = ''; }catch(e){}
        try{ if(typeof currentSearch !== 'undefined') currentSearch = ''; }catch(e){}
        syncFilterControls();
        try{
          var url = new URL(window.location);
          url.searchParams.delete('search');
          url.searchParams.delete('q');
          window.history.replaceState({}, '', url);
        }catch(e){}
      }
      var el = document.getElementById('searchScreen');
      if(el) el.classList.add('hidden');
      closeSheet();
      document.body.style.overflow='';
      if(shouldClear){
        showSearchSkeleton();
        setTimeout(function(){ renderResults(); }, 150);
      }
    };
    
    document.getElementById('ssClose').addEventListener('click', function(){ window.closeSearchScreen(true); });
    // X in filter sheet also clears search
    document.getElementById('ssSheetClose').addEventListener('click', function(){ 
      state.query = '';
      var mainInput = document.getElementById('searchInput');
      var mobileInput = document.getElementById('mobileSearchInput');
      if(mainInput) mainInput.value = '';
      if(mobileInput) mobileInput.value = '';
      try{ if(typeof currentSearch !== 'undefined') currentSearch = ''; }catch(e){}
      try{ if(window.currentSearch !== undefined) window.currentSearch = ''; }catch(e){}
      syncFilterControls();
      showSearchSkeleton();
      setTimeout(function(){ renderResults(); closeSheet(); }, 150);
    });
    
    document.addEventListener('keydown', function(e){
      if(e.key!=='Escape') return;
      var sheet = document.getElementById('ssSheet');
      if(sheet && sheet.classList.contains('is-open')) closeSheet();
      else if(window.closeSearchScreen) window.closeSearchScreen();
    });
    
    updateTopOffset();
    window.addEventListener('resize', updateTopOffset);
    
    // Auto-open from URL ?search= param (when coming from other pages)
    try{
      var params = new URLSearchParams(window.location.search);
      var qParam = params.get('search') || params.get('q');
      if(qParam){
        setTimeout(function(){
          if(window.openSearchScreen) window.openSearchScreen(qParam);
        }, 400);
      }
    }catch(e){}
  }

  window.syncRealProducts = syncRealProducts;
  window.renderClaudeSearch = renderResults;
  window.initClaudeSearch = initComponent;
  window.showSearchSkeleton = showSearchSkeleton;

  document.addEventListener('plushComponentsLoaded', initComponent);
  document.addEventListener('plushProductsLoaded', function(){ syncRealProducts(); renderResults(); });
  
  if(document.getElementById('ssFilterDesktop')) initComponent();
  
  setTimeout(initComponent, 300);
  
  var checkProductsInterval = setInterval(function(){
    if(window.allApprovedProducts && window.allApprovedProducts.length && PRODUCTS.length===0){
      syncRealProducts();
      renderResults();
      if(PRODUCTS.length>0) clearInterval(checkProductsInterval);
    }
  }, 500);
  setTimeout(function(){ clearInterval(checkProductsInterval); }, 10000);
})();
