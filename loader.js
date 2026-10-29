async function loadPlushComponent(mountId, filePath) {
  const mount = document.getElementById(mountId);
  if (!mount) return false;
  try {
    const res = await fetch(filePath);
    let html = await res.text();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];
    mount.innerHTML = html;
    return true;
  } catch (e) { return false; }
}
async function loadAllPlushComponents() {
  await loadPlushComponent('plush-header', 'components/header.html');
  await loadPlushComponent('plush-search', 'components/search.html');
  await Promise.all([
    loadPlushComponent('plush-product-grid', 'components/product-grid.html'),
    loadPlushComponent('plush-footer', 'components/footer.html')
  ]);
  document.dispatchEvent(new CustomEvent('plushComponentsLoaded'));
  // If URL has ?search=, open search screen after components load
  try{
    var params = new URLSearchParams(window.location.search);
    var q = params.get('search') || params.get('q');
    if(q){
      setTimeout(function(){ if(window.openSearchScreen) window.openSearchScreen(q); }, 800);
    }
  }catch(e){}
  const initSk = document.getElementById('plush-initial-skeleton');
  if(initSk) setTimeout(()=>{ initSk.style.display='none'; }, 500);
  const searchScript = document.createElement('script');
  searchScript.src = 'components/search.js';
  document.body.appendChild(searchScript);
  const script = document.createElement('script');
  script.src = 'plush.js';
  script.onload = () => { 
    const init = document.getElementById('plush-initial-skeleton');
    if(init) init.style.display='none';
  };
  document.body.appendChild(script);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAllPlushComponents);
} else {
  loadAllPlushComponents();
}
