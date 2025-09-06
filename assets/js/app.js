// Simple static i18n + gallery + lightbox + scroll reveal
(function(){
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en','pl','ru'];
  const LS_LANG_KEY = 'tz_lang';
  const CONTACT_EMAIL = 'your-email@example.com'; // TODO: set your contact email

  const state = {
    lang: DEFAULT_LANG,
    dict: {},
    artworks: [],
    filter: 'all',
    lightboxIndex: -1,
    filteredIds: []
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  let io; // IntersectionObserver for reveals

  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    // year
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // email link
    const emailLink = $('#contact-email');
    if (emailLink) {
      emailLink.textContent = CONTACT_EMAIL === 'your-email@example.com' ? 'your-email@example.com' : CONTACT_EMAIL;
      emailLink.href = 'mailto:'+CONTACT_EMAIL;
    }

    // setup reveals for any pre-marked elements (e.g. headings)
    setupReveals();

    // language from storage or browser
    const saved = localStorage.getItem(LS_LANG_KEY);
    let initial = SUPPORTED.includes(saved) ? saved : (navigator.language||'en').slice(0,2);
    if(!SUPPORTED.includes(initial)) initial = DEFAULT_LANG;
    await setLanguage(initial);

    // listeners
    $$('.lang-btn').forEach(btn=>btn.addEventListener('click', async e=>{
      const lng = e.currentTarget.getAttribute('data-lang');
      await setLanguage(lng);
    }));

    $$('.filters .chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.filters .chip').forEach(b=>{ b.classList.remove('is-active'); b.setAttribute('aria-selected','false');});
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected','true');
        state.filter = btn.getAttribute('data-filter');
        renderGallery();
      });
    });

    const contactForm = $('#contact-form');
    if (contactForm) contactForm.addEventListener('submit', onSubmitContact);

    // lightbox controls (optional if present)
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
    // re-render dynamic content in the new language
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

  function t(key, fallback=''){ // dot notation
    const parts = key.split('.');
    let ref = state.dict;
    for(const p of parts){
      if(ref && typeof ref === 'object' && p in ref){ ref = ref[p]; } else { return fallback; }
    }
    return (typeof ref === 'string') ? ref : fallback;
  }

  function applyTranslations(){
    // textContent
    $$('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, el.textContent);
    });
    // innerHTML
    $$('[data-i18n-html]').forEach(el=>{
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key, el.innerHTML);
    });
    // placeholders
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
      img.alt = composeAlt(art);
      const cap = document.createElement('div');
      cap.className = 'featured-cap';
      cap.textContent = composeCaption(art);
      card.appendChild(img);
      card.appendChild(cap);
      wrap.appendChild(card);
    });
    // animate heading too if present
    const heading = $('#featured-heading');
    if (heading && heading.classList.contains('reveal')) observeReveal(heading);
    refreshReveals();
  }

  function renderGallery(){
    const wrap = $('#masonry');
    if(!wrap) return; // not on this page
    wrap.innerHTML = '';
    const list = state.artworks.filter(a=> state.filter==='all' ? true : a.category===state.filter);
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
      img.alt = composeAlt(art);
      img.loading = 'lazy';
      img.decoding = 'async';

      const cap = document.createElement('figcaption');
      cap.className = 'figcap';
      cap.textContent = composeCaption(art);

      fig.appendChild(img);
      fig.appendChild(cap);

      fig.addEventListener('click', ()=> openLightboxById(art.id));
      fig.addEventListener('keypress', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); openLightboxById(art.id); }});

      wrap.appendChild(fig);
    });

    const gHeading = $('#gallery-heading');
    if (gHeading && gHeading.classList.contains('reveal')) observeReveal(gHeading);
    refreshReveals();
  }

  function composeAlt(art){
    const title = (art.title && (art.title[state.lang]||art.title.en||'')) || '';
    return `${title || 'Artwork'} — ${art.year || ''}`.trim();
  }

  function composeCaption(art){
    const title = (art.title && (art.title[state.lang]||art.title.en||'')) || '';
    const medium = (art.medium && (art.medium[state.lang]||art.medium.en||'')) || '';
    const bits = [title, art.year, medium].filter(Boolean);
    return bits.join(' · ');
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
    img.alt = composeAlt(art);
    cap.textContent = composeCaption(art);
  }

  async function onSubmitContact(e){
    e.preventDefault();
    const nameEl = $('#name');
    const emailEl = $('#email');
    const messageEl = $('#message');
    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const message = messageEl ? messageEl.value.trim() : '';

    if(!name || !email || !message){
      alert(t('contact.form.validation', 'Please fill in all fields.'));
      return;
    }
    const subject = encodeURIComponent(t('contact.form.subject','Portfolio contact'));
    const body = encodeURIComponent(`${t('contact.form.name','Name')}: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
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
    // Observe any static elements with .reveal present at load
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
