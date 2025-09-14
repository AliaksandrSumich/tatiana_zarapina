// Simple static i18n + gallery + lightbox + scroll reveal (no captions, no filters)
(function(){
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en','pl','ru'];
  const LS_LANG_KEY = 'tz_lang';
  const CONTACT_EMAIL = 'your-email@example.com'; // optional mailto for future use

  const state = {
    lang: DEFAULT_LANG,
    dict: {},
    artworks: [],
    lightboxIndex: -1,
    filteredIds: []
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  let io; // IntersectionObserver for reveals

  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Optional email link if present
    const emailLink = $('#contact-email');
    if (emailLink) {
      emailLink.textContent = CONTACT_EMAIL === 'your-email@example.com' ? 'your-email@example.com' : CONTACT_EMAIL;
      emailLink.href = 'mailto:'+CONTACT_EMAIL;
    }

    setupReveals();

    // language from storage or browser
    const saved = localStorage.getItem(LS_LANG_KEY);
    let initial = SUPPORTED.includes(saved) ? saved : (navigator.language||'en').slice(0,2);
    if(!SUPPORTED.includes(initial)) initial = DEFAULT_LANG;
    await setLanguage(initial);

    // language buttons
    $$('.lang-btn').forEach(btn=>btn.addEventListener('click', async e=>{
      const lng = e.currentTarget.getAttribute('data-lang');
      await setLanguage(lng);
    }));

    // lightbox controls
    const lb = $('#lightbox');
    if (lb) {
      const lbClose = $('#lightbox .lb-close');
      const lbPrev = $('#lightbox .lb-prev');
      const lbNext = $('#lightbox .lb-next');
      if (lbClose) lbClose.addEventListener('click', closeLightbox);
      if (lbPrev) lbPrev.addEventListener('click', ()=> stepLightbox(-1));
      if (lbNext) lbNext.addEventListener('click', ()=> stepLightbox(1));
      lb.addEventListener('click', (e)=>{ if(e.target.id === 'lightbox') closeLightbox(); });
      document.addEventListener('keydown', (e)=>{
        if(!$('#lightbox') || !$('#lightbox').classList.contains('open')) return;
        if(e.key === 'Escape') closeLightbox();
        if(e.key === 'ArrowLeft') stepLightbox(-1);
        if(e.key === 'ArrowRight') stepLightbox(1);
      });
    }

    // load artworks
    await loadArtworks();
    renderFeatured();
    renderGallery();
  }

  async function setLanguage(lng){
    if(!SUPPORTED.includes(lng)) lng = DEFAULT_LANG;
    const dict = await fetchJson(`locales/${lng}.json`);
    state.lang = lng;
    state.dict = dict;
    localStorage.setItem(LS_LANG_KEY, lng);
    updateLangButtons();
    applyTranslations();
    if (state.artworks && state.artworks.length) {
      renderFeatured();
      renderGallery();
    }
  }

  function updateLangButtons(){
    $$('.lang-btn').forEach(b=>{
      const active = b.getAttribute('data-lang') === state.lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function t(key, fallback=''){
    const parts = key.split('.');
    let ref = state.dict;
    for(const p of parts){
      if(ref && typeof ref === 'object' && p in ref){ ref = ref[p]; } else { return fallback; }
    }
    return (typeof ref === 'string') ? ref : fallback;
  }

  function applyTranslations(){
    $$('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, el.textContent);
    });
    $$('[data-i18n-html]').forEach(el=>{
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key, el.innerHTML);
    });
    $$('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key, el.getAttribute('placeholder')||''));
    });
  }

  async function loadArtworks(){
    const data = await fetchJson('data/artworks.json');
    state.artworks = data;
  }

  function renderFeatured(){
    const wrap = $('#featured-grid');
    if(!wrap) return;
    wrap.innerHTML = '';
    const items = state.artworks.filter(a=>a.featured).slice(0,8);
    items.forEach((art, i)=>{
      const card = document.createElement('a');
      card.href = 'gallery.html';
      card.className = 'featured-card reveal reveal-up';
      card.style.setProperty('--reveal-delay', `${i*60}ms`);
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = art.filename;
      img.alt = genericAlt();
      card.appendChild(img);
      wrap.appendChild(card);
    });
    const heading = $('#featured-heading');
    if (heading && heading.classList.contains('reveal')) observeReveal(heading);
    refreshReveals();
  }

  function renderGallery(){
    const wrap = $('#masonry');
    if(!wrap) return;
    wrap.innerHTML = '';
    const list = state.artworks.slice();
    state.filteredIds = list.map(a=>a.id);
    list.forEach((art, i)=>{
      const fig = document.createElement('figure');
      fig.className = 'masonry-item reveal reveal-up';
      fig.style.setProperty('--reveal-delay', `${i*30}ms`);
      fig.setAttribute('tabindex','0');
      fig.setAttribute('role','group');
      fig.dataset.id = art.id;

      const img = document.createElement('img');
      img.src = art.filename;
      img.alt = genericAlt();
      img.loading = 'lazy';
      img.decoding = 'async';

      fig.appendChild(img);

      fig.addEventListener('click', ()=> openLightboxById(art.id));
      fig.addEventListener('keypress', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); openLightboxById(art.id); }});

      wrap.appendChild(fig);
    });

    const gHeading = $('#gallery-heading');
    if (gHeading && gHeading.classList.contains('reveal')) observeReveal(gHeading);
    refreshReveals();
  }

  function genericAlt(){
    return 'Artwork by Tatyana Zarapina';
  }

  function openLightboxById(id){
    const lb = $('#lightbox');
    if (!lb) return;
    const idx = state.filteredIds.indexOf(id);
    if(idx === -1) return;
    state.lightboxIndex = idx;
    updateLightbox();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
  }

  function closeLightbox(){
    const lb = $('#lightbox');
    if (!lb) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    state.lightboxIndex = -1;
  }

  function stepLightbox(delta){
    if(state.lightboxIndex < 0) return;
    const n = state.filteredIds.length;
    state.lightboxIndex = (state.lightboxIndex + delta + n) % n;
    updateLightbox();
  }

  function updateLightbox(){
    const id = state.filteredIds[state.lightboxIndex];
    const art = state.artworks.find(a=>a.id===id);
    if(!art) return;
    const img = $('#lb-image');
    const cap = $('#lb-caption');
    if (!img || !cap) return;
    img.src = art.filename;
    img.alt = genericAlt();
    cap.textContent = '';
  }

  // Reveal animations
  function setupReveals(){
    io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    refreshReveals();
  }

  function observeReveal(el){ if (io && el) io.observe(el); }
  function refreshReveals(){
    if(!io) return;
    $$('.reveal').forEach(el=>{ if(!el.classList.contains('in')) observeReveal(el); });
  }

  async function fetchJson(url){
    const res = await fetch(url, {cache:'no-cache'});
    if(!res.ok) throw new Error('Failed to load '+url);
    return await res.json();
  }
})();
