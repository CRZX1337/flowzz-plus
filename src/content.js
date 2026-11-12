/* flowzz+ · Herkunft, Preise & Suche
 * Erweitert flowzz.com um eine eigene Produktsuche mit Herkunfts-, Preis-,
 * THC-, Hersteller- und Bestrahlungsfilter – für Blüten, Extrakte und Edibles.
 * Zusatz: Apotheken-Preisvergleich, Favoriten, Preisalarm, CSV-Export.
 * Läuft als Content-Script (Firefox/Chrome) und als Userscript.
 */
(() => {
  if (window.__FX_LOADED__) return;
  window.__FX_LOADED__ = true;

  const PAGE_SIZE = 240;
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const VENDOR_TTL = 24 * 60 * 60 * 1000;
  const PAGE_STEP = 60;

  const CATEGORIES = [
    { id: 'flowers', label: 'Blüten', endpoint: '/api/v1/views/flowers', pricePath: '2', file: 'blueeten' },
    { id: 'extracts', label: 'Extrakte', endpoint: '/api/v1/views/extracts', pricePath: '3', file: 'extrakte' },
    { id: 'edibles', label: 'Edibles', endpoint: '/api/v1/views/edibles', pricePath: '4', file: 'edibles' }
  ];

  const HAS_CHROME = typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.id;
  const CSS_URL = HAS_CHROME ? chrome.runtime.getURL('overlay.css') : null;
  const CAN_NOTIFY = typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create;

  /* ---------- Herkunft normalisieren ---------- */

  const ORIGIN_ALIAS = {
    'spain': 'Spanien',
    'süd afrika': 'Südafrika',
    'suedafrika': 'Südafrika',
    'nord mazedonien': 'Nordmazedonien',
    'mazedonien': 'Nordmazedonien',
    'kanalinseln': 'Jersey',
    'england': 'Vereinigtes Königreich',
    'vereinigtes königreich': 'Vereinigtes Königreich',
    'usa': 'USA',
    'deutschland': 'Deutschland'
  };

  const FLAGS = {
    'Kanada': '🇨🇦', 'Portugal': '🇵🇹', 'Tschechien': '🇨🇿', 'Deutschland': '🇩🇪',
    'Nordmazedonien': '🇲🇰', 'Dänemark': '🇩🇰', 'Südafrika': '🇿🇦', 'Kolumbien': '🇨🇴',
    'Spanien': '🇪🇸', 'Australien': '🇦🇺', 'Israel': '🇮🇱', 'Schweiz': '🇨🇭',
    'Thailand': '🇹🇭', 'Griechenland': '🇬🇷', 'Lesotho': '🇱🇸', 'Argentinien': '🇦🇷',
    'Jersey': '🇯🇪', 'Uruguay': '🇺🇾', 'Niederlande': '🇳🇱', 'Vereinigtes Königreich': '🇬🇧',
    'Malta': '🇲🇹', 'USA': '🇺🇸', 'Uganda': '🇺🇬', 'Simbabwe': '🇿🇼',
    'Neuseeland': '🇳🇿', 'Chile': '🇨🇱', 'Unbekannt': '🏳️'
  };

  function normOrigin(raw) {
    const s = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Unbekannt';
    const alias = ORIGIN_ALIAS[s.toLowerCase()];
    if (alias) return alias;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function normGenetic(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s.startsWith('ind')) return 'Indica';
    if (s.startsWith('sat')) return 'Sativa';
    if (s.startsWith('hy') || s.startsWith('hry')) return 'Hybrid';
    return '';
  }

  /* ---------- Storage ---------- */

  const store = {
    async get(key) {
      if (HAS_CHROME && chrome.storage && chrome.storage.local) {
        return new Promise((res) => chrome.storage.local.get(key, (r) => res(r ? r[key] : null)));
      }
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    },
    async set(key, value) {
      if (HAS_CHROME && chrome.storage && chrome.storage.local) {
        return new Promise((res) => chrome.storage.local.set({ [key]: value }, res));
      }
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ---------- Helpers ---------- */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const eur = (v) => (v == null ? '—' : v.toFixed(2).replace('.', ',') + ' €');
  const pct = (v) => (v == null ? '—' : String(v).replace('.', ',') + '%');

  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const flagOf = (origin) => FLAGS[origin] || '🌱';

  const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

  const errMsg = (err) => (err && err.message ? err.message : String(err));

  function toast(text, kind) {
    if (!ui.shadow) return;
    let box = ui.shadow.querySelector('.fx-toast');
    if (!box) {
      box = el('div', 'fx-toast');
      ui.shadow.appendChild(box);
    }
    box.textContent = text;
    box.className = 'fx-toast is-visible' + (kind ? ' fx-toast-' + kind : '');
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => box.classList.remove('is-visible'), 4200);
  }

  /* ---------- State ---------- */

  const state = {
    items: [],
    loadedAt: 0,
    loading: false,
    error: null,
    progress: { n: 0, total: 0 },
    visible: PAGE_STEP,
    opened: false,
    facetsBuilt: false,
    category: 'flowers',
    favorites: new Set(),
    alerts: {},
    prices: new Map(),
    pricesLoading: false,
    vendors: null,
    filters: {
      q: '',
      origins: new Set(),
      producers: new Set(),
      genetic: '',
      thcMin: null,
      thcMax: null,
      priceMax: null,
      irr: '',
      onlyAvail: false,
      onlyFavs: false,
      sort: 'popularity'
    }
  };

  const ui = {};

  /* ---------- Daten ---------- */

  function normalize(p, cat) {
    const img = p.image && p.image.data && p.image.data.attributes;
    const small = img && img.formats && img.formats.small ? img.formats.small.url : (img ? img.url : '');
    return {
      id: p.id,
      cat,
      slug: p.url,
      name: p.name || '',
      strain: p.strain_name || p.name || '',
      producer: p.producer_name || '',
      origin: normOrigin(p.origin),
      thc: typeof p.thc === 'number' ? p.thc : null,
      cbd: typeof p.cbd === 'number' ? p.cbd : null,
      price: typeof p.min_price === 'number' ? p.min_price : null,
      priceMax: typeof p.max_price === 'number' ? p.max_price : null,
      rating: typeof p.ratings_score === 'number' ? p.ratings_score : null,
      ratingCount: p.ratings_count || 0,
      genetic: normGenetic(p.genetic),
      irr: !!p.irradiated,
      avail: p.availibility === 1,
      img: small || '',
      unit: p.unit || '',
      published: p.published_at || p.created_at || ''
    };
  }

  async function fetchCategory(catId, onProgress) {
    const cat = catById(catId);
    let page = 1;
    let total = 0;
    const out = [];
    const seen = new Set();
    for (;;) {
      const url = `${cat.endpoint}?pagination%5BpageSize%5D=${PAGE_SIZE}&pagination%5Bpage%5D=${page}`;
      const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const payload = json && json.data;
      const rows = (payload && payload.data) || [];
      total = (payload && payload.meta && payload.meta.pagination && payload.meta.pagination.total) || total;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(normalize(row, catId));
      }
      if (onProgress) onProgress(out.length, total);
      const next = payload && payload.meta && payload.meta.pagination && payload.meta.pagination.hasNextPage;
      if (!next || !rows.length) break;
      page += 1;
    }
    out.forEach((p, i) => { p.rank = i; });
    return { items: out, loadedAt: Date.now(), cat: catId };
  }

  async function loadCategory(catId, force) {
    if (state.loading) return;
    state.error = null;
    state.prices = new Map();
    state.pricesLoading = false;

    if (!force) {
      const cached = await store.get('fx_cache_v3_' + catId);
      if (cached && cached.items && cached.items.length) {
        state.items = cached.items;
        state.loadedAt = cached.loadedAt;
        state.facetsBuilt = false;
        render();
        if (Date.now() - cached.loadedAt < CACHE_TTL) return;
      }
    }

    state.loading = true;
    state.progress = { n: 0, total: 0 };
    renderLoading();
    try {
      const fresh = await fetchCategory(catId, (n, total) => {
        state.progress = { n, total };
        renderLoading();
      });
      state.items = fresh.items;
      state.loadedAt = fresh.loadedAt;
      state.facetsBuilt = false;
      await store.set('fx_cache_v3_' + catId, fresh);
      render();
    } catch (err) {
      state.error = err;
      if (!state.items.length && ui.grid) {
        ui.grid.textContent = '';
        ui.empty.hidden = false;
        ui.empty.querySelector('b').textContent = 'Daten konnten nicht geladen werden';
        ui.empty.querySelector('span').textContent = 'Bitte die Seite neu laden. (' + errMsg(err) + ')';
      }
    } finally {
      state.loading = false;
      renderLoading();
    }
  }

  /* ---------- Apotheken-Preise ---------- */

  function parsePriceRow(row) {
    if (Array.isArray(row)) {
      return { pid: Number(row[0]), price: Number(row[1]), avail: Number(row[2]) === 1, vendor: Number(row[3]) };
    }
    if (row && typeof row === 'object') {
      return {
        pid: Number(row.product || row.product_id || row.id),
        price: Number(row.price),
        avail: row.availability === 1 || row.availibility === 1 || row.available === true,
        vendor: Number(row.vendor || row.vendor_id)
      };
    }
    return null;
  }

  async function loadPrices(ids) {
    const cat = catById(state.category);
    const missing = ids.filter((id) => id && !state.prices.has(Number(id)));
    if (!missing.length || state.pricesLoading) return;
    state.pricesLoading = true;
    try {
      const chunk = missing.slice(0, 300).join(',');
      const res = await fetch(`/api/v1/views/vendors/prices/${cat.pricePath}/${chunk}`, {
        credentials: 'same-origin', headers: { accept: 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      const grouped = new Map();
      for (const raw of rows) {
        const r = parsePriceRow(raw);
        if (!r || !r.pid || !r.price) continue;
        if (!grouped.has(r.pid)) grouped.set(r.pid, []);
        grouped.get(r.pid).push(r);
      }
      for (const [pid, offers] of grouped) {
        offers.sort((a, b) => a.price - b.price);
        state.prices.set(pid, {
          min: offers[0].price,
          count: offers.filter((o) => o.avail).length || offers.length,
          offers
        });
      }
      updatePriceLabels();
    } catch (e) {
      /* Preise sind Beiwerk – Fehler nicht eskalieren */
    } finally {
      state.pricesLoading = false;
    }
  }

  function updatePriceLabels() {
    if (!ui.shadow) return;
    ui.shadow.querySelectorAll('.fx-card[data-id]').forEach((card) => {
      const info = state.prices.get(Number(card.dataset.id));
      const line = card.querySelector('.fx-offers');
      if (!line) return;
      line.textContent = info
        ? info.count + (info.count === 1 ? ' Apotheke' : ' Apotheken') + ' · günstigste ' + eur(info.min)
        : 'Preise vergleichen';
    });
  }

  async function loadVendors() {
    if (state.vendors) return state.vendors;
    const cached = await store.get('fx_vendors_v1');
    if (cached && cached.ts && Date.now() - cached.ts < VENDOR_TTL && cached.map) {
      state.vendors = cached.map;
      return state.vendors;
    }
    let map = null;
    try {
      const nd = document.getElementById('__NEXT_DATA__');
      if (nd) {
        const data = JSON.parse(nd.textContent);
        const pp = data && data.props && data.props.pageProps;
        const vendors = pp && pp.productFilterData && pp.productFilterData.vendors;
        if (Array.isArray(vendors)) map = vendors;
      }
    } catch (e) { /* ignore */ }

    if (!map) {
      try {
        const res = await fetch('/product', { credentials: 'same-origin' });
        const html = await res.text();
        const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (m) {
          const data = JSON.parse(m[1]);
          map = data.props.pageProps.productFilterData.vendors;
        }
      } catch (e) { /* ignore */ }
    }

    if (Array.isArray(map)) {
      const slim = {};
      for (const v of map) slim[v.id] = { name: (v.name || '').trim(), city: v.city || '', plz: v.plz || '' };
      state.vendors = slim;
      await store.set('fx_vendors_v1', { ts: Date.now(), map: slim });
    }
    return state.vendors || {};
  }

  /* ---------- Favoriten & Alarme ---------- */

  async function loadUserData() {
    const favs = await store.get('fx_favs_v1');
    if (Array.isArray(favs)) state.favorites = new Set(favs.map(Number));
    const alerts = await store.get('fx_alerts_v1');
    if (alerts && typeof alerts === 'object') state.alerts = alerts;
  }

  async function saveFavorites() {
    await store.set('fx_favs_v1', [...state.favorites]);
  }

  async function saveAlerts() {
    await store.set('fx_alerts_v1', state.alerts);
  }

  function toggleFavorite(p) {
    if (state.favorites.has(p.id)) state.favorites.delete(p.id);
    else state.favorites.add(p.id);
    saveFavorites();
    renderFacets();
    renderGrid();
  }

  function alertFor(p) {
    return state.alerts[String(p.id)] || null;
  }

  async function setAlert(p, target) {
    if (target == null) {
      delete state.alerts[String(p.id)];
    } else {
      state.alerts[String(p.id)] = {
        id: p.id,
        cat: p.cat,
        slug: p.slug,
        name: p.name,
        target: Number(target),
        lastPrice: p.price,
        updatedAt: Date.now(),
        notifiedAt: 0
      };
    }
    await saveAlerts();
    renderGrid();
  }

  async function checkAlerts() {
    const alerts = Object.values(state.alerts);
    if (!alerts.length) return;
    const hits = alerts.filter((a) => a.target != null && a.lastPrice != null &&
      a.lastPrice <= a.target && (!a.notifiedAt || Date.now() - a.notifiedAt > 24 * 60 * 60 * 1000));
    if (!hits.length) return;
    for (const a of hits) {
      a.notifiedAt = Date.now();
      if (CAN_NOTIFY) {
        try {
          chrome.notifications.create('fx-alert-' + a.id, {
            type: 'basic',
            iconUrl: HAS_CHROME ? chrome.runtime.getURL('icons/icon128.png') : '',
            title: 'flowzz+ Preisalarm',
            message: `${a.name}: jetzt ${eur(a.lastPrice)} / g (Ziel ${eur(a.target)})`,
            priority: 1
          });
        } catch (e) { /* ignore */ }
      } else {
        toast(`${a.name}: ${eur(a.lastPrice)} / g erreicht`, 'good');
      }
    }
    await saveAlerts();
  }

  /* ---------- Filterlogik ---------- */

  function matches(p, f, skip) {
    if (f.q) {
      const hay = (p.name + ' ' + p.strain + ' ' + p.producer + ' ' + p.origin).toLowerCase();
      for (const t of f.q.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(t)) return false;
    }
    if (f.onlyFavs && !state.favorites.has(p.id)) return false;
    if (skip !== 'origin' && f.origins.size && !f.origins.has(p.origin)) return false;
    if (skip !== 'producer' && f.producers.size && !f.producers.has(p.producer)) return false;
    if (f.genetic && p.genetic !== f.genetic) return false;
    if (f.thcMin != null && (p.thc == null || p.thc < f.thcMin)) return false;
    if (f.thcMax != null && (p.thc == null || p.thc > f.thcMax)) return false;
    if (f.priceMax != null && (p.price == null || p.price > f.priceMax)) return false;
    if (f.irr === 'no' && p.irr) return false;
    if (f.irr === 'yes' && !p.irr) return false;
    if (f.onlyAvail && !p.avail) return false;
    return true;
  }

  function sorted(list) {
    const f = state.filters;
    const copy = list.slice();
    switch (f.sort) {
      case 'price-asc': copy.sort((a, b) => (a.price == null) - (b.price == null) || a.price - b.price); break;
      case 'thc-desc': copy.sort((a, b) => (b.thc == null) - (a.thc == null) || b.thc - a.thc); break;
      case 'rating': copy.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.ratingCount - a.ratingCount); break;
      case 'new': copy.sort((a, b) => String(b.published).localeCompare(String(a.published))); break;
      default: copy.sort((a, b) => a.rank - b.rank);
    }
    return copy;
  }

  function currentList() {
    return sorted(state.items.filter((p) => matches(p, state.filters)));
  }

  function facetCounts(kind) {
    const counts = new Map();
    const f = state.filters;
    for (const p of state.items) {
      if (!matches(p, f, kind)) continue;
      const key = kind === 'origin' ? p.origin : p.producer;
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }

  /* ---------- Overlay ---------- */

  function ensureHost() {
    if (ui.host) return ui.host;
    const host = document.createElement('div');
    host.id = 'fx-host';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483600';
    host.style.pointerEvents = 'none';
    (document.body || document.documentElement).appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    if (CSS_URL) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      shadow.appendChild(link);
    } else if (typeof window.__FX_CSS === 'string') {
      const style = document.createElement('style');
      style.textContent = window.__FX_CSS;
      shadow.appendChild(style);
    }
    ui.host = host;
    ui.shadow = shadow;
    return host;
  }

  function buildOverlay() {
    const shadow = ui.shadow;
    const app = el('div', 'fx-app');
    app.setAttribute('role', 'dialog');
    app.setAttribute('aria-label', 'flowzz+ Suche');

    const top = el('header', 'fx-top');
    const brand = el('div', 'fx-brand');
    brand.append(el('span', 'fx-logo', 'f+'));
    const brandText = el('div', 'fx-brandtext');
    brandText.append(el('b', null, 'flowzz+'), el('small', null, 'Herkunft & Preise'));
    brand.append(brandText);

    const searchWrap = el('div', 'fx-search');
    searchWrap.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Sorte, Hersteller, Herkunft …';
    input.setAttribute('aria-label', 'Suche');
    input.spellcheck = false;
    const kbd = el('kbd', null, '/');
    searchWrap.append(input, kbd);

    const close = el('button', 'fx-close');
    close.type = 'button';
    close.innerHTML = '<span>Schließen</span><kbd>Esc</kbd>';
    close.addEventListener('click', closeOverlay);

    top.append(brand, searchWrap, close);

    const tabs = el('nav', 'fx-tabs');
    ui.tabs = new Map();
    for (const cat of CATEGORIES) {
      const b = el('button', 'fx-tab', cat.label);
      b.type = 'button';
      b.dataset.cat = cat.id;
      b.addEventListener('click', () => switchCategory(cat.id));
      tabs.append(b);
      ui.tabs.set(cat.id, b);
    }

    const body = el('div', 'fx-body');
    const side = el('aside', 'fx-side');
    const main = el('main', 'fx-main');

    const sideHead = el('div', 'fx-side-head');
    const countBox = el('div', 'fx-countbox');
    ui.countNum = el('b', null, '–');
    ui.countLabel = el('span', null, 'Blüten');
    countBox.append(ui.countNum, ui.countLabel);
    const resetBtn = el('button', 'fx-reset', 'Zurücksetzen');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', resetFilters);
    sideHead.append(countBox, resetBtn);

    ui.facets = { origins: new Map() };
    ui.originSection = buildOriginSection();
    ui.producerSection = buildProducerSection();
    ui.priceSection = buildPriceSection();
    ui.thcSection = buildThcSection();
    ui.geneticSection = buildGeneticSection();
    ui.irrSection = buildIrrSection();
    ui.availSection = buildAvailSection();
    ui.favSection = buildFavSection();

    ui.dataNote = el('div', 'fx-datanote', '');
    side.append(
      sideHead,
      ui.originSection.node,
      ui.producerSection.node,
      ui.priceSection.node,
      ui.thcSection.node,
      ui.geneticSection.node,
      ui.irrSection.node,
      ui.availSection.node,
      ui.favSection.node,
      ui.dataNote
    );

    const toolbar = el('div', 'fx-toolbar');
    ui.resultText = el('div', 'fx-resulttext');
    const tools = el('div', 'fx-tools');
    const sortWrap = el('label', 'fx-select');
    sortWrap.append(el('span', null, 'Sortieren'));
    const sort = document.createElement('select');
    [
      ['popularity', 'Empfohlen'],
      ['price-asc', 'Preis aufsteigend'],
      ['thc-desc', 'THC absteigend'],
      ['rating', 'Bewertung'],
      ['new', 'Neueste']
    ].forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; sort.appendChild(o); });
    sort.value = state.filters.sort;
    sort.addEventListener('change', () => { state.filters.sort = sort.value; state.visible = PAGE_STEP; render(); syncURL(); });
    ui.sort = sort;
    sortWrap.append(sort);

    const csvBtn = el('button', 'fx-iconbtn fx-csvbtn', 'CSV');
    csvBtn.type = 'button';
    csvBtn.title = 'Aktuelle Auswahl als CSV exportieren';
    csvBtn.addEventListener('click', () => exportCSV(currentList()));

    const refresh = el('button', 'fx-iconbtn', '↻');
    refresh.type = 'button';
    refresh.title = 'Daten aktualisieren';
    refresh.addEventListener('click', () => loadCategory(state.category, true));

    const mobileFilter = el('button', 'fx-mobilefilter', 'Filter');
    mobileFilter.type = 'button';
    mobileFilter.addEventListener('click', () => side.classList.toggle('fx-side-open'));

    tools.append(sortWrap, csvBtn, refresh, mobileFilter);
    toolbar.append(ui.resultText, tools);

    ui.grid = el('div', 'fx-grid');
    ui.empty = el('div', 'fx-empty');
    ui.empty.hidden = true;
    ui.empty.append(el('b', null, 'Nichts gefunden'), el('span', null, 'Filter lockern oder Suche zurücksetzen.'));
    const moreWrap = el('div', 'fx-more');
    ui.moreBtn = el('button', 'fx-btn', 'Mehr laden');
    ui.moreBtn.type = 'button';
    ui.moreBtn.addEventListener('click', () => { state.visible += PAGE_STEP; renderGrid(); });
    moreWrap.append(ui.moreBtn);

    ui.progress = el('div', 'fx-loading');
    ui.progress.hidden = true;
    ui.progress.innerHTML = '<div class="fx-progress"><i></i></div><span>Daten werden geladen …</span>';
    ui.progressBar = ui.progress.querySelector('i');
    ui.progressText = ui.progress.querySelector('span');

    main.append(toolbar, ui.progress, ui.grid, ui.empty, moreWrap);
    body.append(side, main);
    app.append(top, tabs, body);
    shadow.appendChild(app);

    ui.app = app;
    ui.input = input;
    ui.side = side;

    ui.modal = el('div', 'fx-modal');
    ui.modal.hidden = true;
    ui.modalCard = el('div', 'fx-modal-card');
    ui.modal.append(ui.modalCard);
    ui.modal.addEventListener('click', (e) => { if (e.target === ui.modal) closeModal(); });
    shadow.appendChild(ui.modal);

    input.addEventListener('input', debounce(() => {
      state.filters.q = input.value.trim();
      state.visible = PAGE_STEP;
      render();
      syncURL();
    }, 120));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeOverlay(); }
    });

    return app;
  }

  function section(title) {
    const node = el('section', 'fx-section');
    const head = el('button', 'fx-section-head');
    head.type = 'button';
    head.innerHTML = '<span>' + title + '</span><i></i>';
    const bodyEl = el('div', 'fx-section-body');
    head.addEventListener('click', () => node.classList.toggle('fx-collapsed'));
    node.append(head, bodyEl);
    return { node, body: bodyEl, head };
  }

  function buildOriginSection() {
    const s = section('Herkunft');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'fx-mini-search';
    search.placeholder = 'Land suchen …';
    ui.originSearch = search;
    const list = el('div', 'fx-checklist');
    s.body.append(search, list);
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      for (const [origin, ref] of ui.facets.origins) {
        ref.row.hidden = !!q && !origin.toLowerCase().includes(q);
      }
    });
    return { node: s.node, list };
  }

  function buildProducerSection() {
    const s = section('Hersteller');
    const sel = document.createElement('select');
    sel.className = 'fx-producer';
    s.body.append(sel);
    sel.addEventListener('change', () => {
      state.filters.producers = new Set(sel.value ? [sel.value] : []);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    return { node: s.node, select: sel };
  }

  function buildPriceSection() {
    const s = section('Preis pro Gramm');
    const value = el('div', 'fx-rangevalue', 'egal');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '2';
    range.max = '25';
    range.step = '0.5';
    range.value = '25';
    range.addEventListener('input', () => {
      const v = Number(range.value);
      state.filters.priceMax = v >= 25 ? null : v;
      value.textContent = v >= 25 ? 'egal' : 'bis ' + eur(v);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    s.body.append(value, range);
    return { node: s.node, range, value };
  }

  function buildThcSection() {
    const s = section('THC-Gehalt');
    const row = el('div', 'fx-numberrow');
    const min = document.createElement('input');
    min.type = 'number'; min.min = '0'; min.max = '100'; min.step = '1'; min.placeholder = 'von';
    const max = document.createElement('input');
    max.type = 'number'; max.min = '0'; max.max = '100'; max.step = '1'; max.placeholder = 'bis';
    const apply = () => {
      state.filters.thcMin = min.value === '' ? null : Number(min.value);
      state.filters.thcMax = max.value === '' ? null : Number(max.value);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    };
    min.addEventListener('change', apply);
    max.addEventListener('change', apply);
    row.append(min, el('span', 'fx-dash', '–'), max);
    s.body.append(row);
    return { node: s.node, min, max };
  }

  function buildGeneticSection() {
    const s = section('Strain-Typ');
    const seg = el('div', 'fx-seg');
    [['', 'Alle'], ['Indica', 'Indica'], ['Sativa', 'Sativa'], ['Hybrid', 'Hybrid']].forEach(([val, label]) => {
      const b = el('button', 'fx-segbtn', label);
      b.type = 'button';
      b.dataset.value = val;
      b.addEventListener('click', () => {
        state.filters.genetic = val;
        seg.querySelectorAll('.fx-segbtn').forEach((x) => x.classList.toggle('is-active', x.dataset.value === val));
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      if (val === '') b.classList.add('is-active');
      seg.append(b);
    });
    s.body.append(seg);
    ui.geneticSeg = seg;
    return { node: s.node };
  }

  function buildIrrSection() {
    const s = section('Bestrahlung');
    const seg = el('div', 'fx-seg');
    [['', 'Egal'], ['no', 'Unbestrahlt'], ['yes', 'Bestrahlt']].forEach(([val, label]) => {
      const b = el('button', 'fx-segbtn', label);
      b.type = 'button';
      b.dataset.value = val;
      b.addEventListener('click', () => {
        state.filters.irr = val;
        seg.querySelectorAll('.fx-segbtn').forEach((x) => x.classList.toggle('is-active', x.dataset.value === val));
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      if (val === '') b.classList.add('is-active');
      seg.append(b);
    });
    s.body.append(seg);
    ui.irrSeg = seg;
    return { node: s.node };
  }

  function buildAvailSection() {
    const s = section('Verfügbarkeit');
    const label = el('label', 'fx-switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      state.filters.onlyAvail = cb.checked;
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    label.append(cb, el('span', 'fx-knob'), el('span', null, 'Nur lieferbar'));
    s.body.append(label);
    return { node: s.node, checkbox: cb };
  }

  function buildFavSection() {
    const s = section('Favoriten');
    const label = el('label', 'fx-switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const text = el('span', 'fx-favtext', 'Nur Favoriten');
    cb.addEventListener('change', () => {
      state.filters.onlyFavs = cb.checked;
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    label.append(cb, el('span', 'fx-knob'), text);
    s.body.append(label);
    return { node: s.node, checkbox: cb, text };
  }

  /* ---------- Rendering ---------- */

  function render() {
    if (!state.opened) return;
    renderTabs();
    renderFacets();
    renderGrid();
  }

  function renderTabs() {
    for (const [id, btn] of ui.tabs) btn.classList.toggle('is-active', id === state.category);
    ui.countLabel.textContent = catById(state.category).label;
  }

  function buildFacetLists() {
    const f = state.filters;
    const originCounts = facetCounts('origin');
    const origins = [...new Set(state.items.map((p) => p.origin))];
    origins.sort((a, b) => {
      if (a === 'Unbekannt') return 1;
      if (b === 'Unbekannt') return -1;
      return (originCounts.get(b) || 0) - (originCounts.get(a) || 0);
    });

    const list = ui.originSection.list;
    list.textContent = '';
    const nodes = new Map();
    for (const origin of origins) {
      const row = el('label', 'fx-check');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = f.origins.has(origin);
      cb.addEventListener('change', () => {
        if (cb.checked) f.origins.add(origin); else f.origins.delete(origin);
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      const count = el('span', 'fx-checkcount', String(originCounts.get(origin) || 0));
      row.append(cb, el('span', 'fx-flag', flagOf(origin)), el('span', 'fx-checkname', origin), count);
      list.append(row);
      nodes.set(origin, { row, count, cb });
    }
    ui.facets.origins = nodes;

    const pCounts = facetCounts('producer');
    const producers = [...new Set(state.items.map((p) => p.producer).filter(Boolean))]
      .sort((a, b) => (pCounts.get(b) || 0) - (pCounts.get(a) || 0));
    const sel = ui.producerSection.select;
    sel.textContent = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Alle Hersteller';
    sel.append(optAll);
    for (const prod of producers) {
      const o = document.createElement('option');
      o.value = prod;
      o.textContent = prod + '  (' + (pCounts.get(prod) || 0) + ')';
      sel.append(o);
    }
    sel.value = f.producers.size ? [...f.producers][0] : '';

    state.facetsBuilt = true;
  }

  function renderFacets() {
    const f = state.filters;
    if (!state.facetsBuilt && state.items.length) buildFacetLists();

    const originCounts = facetCounts('origin');
    const originQuery = (ui.originSearch && ui.originSearch.value.trim().toLowerCase()) || '';
    for (const [origin, ref] of ui.facets.origins) {
      ref.count.textContent = String(originCounts.get(origin) || 0);
      ref.cb.checked = f.origins.has(origin);
      ref.row.hidden = !!originQuery && !origin.toLowerCase().includes(originQuery);
      ref.row.classList.toggle('is-zero', (originCounts.get(origin) || 0) === 0 && !f.origins.has(origin));
    }

    const pCounts = facetCounts('producer');
    if (ui.producerSection) {
      const sel = ui.producerSection.select;
      const current = f.producers.size ? [...f.producers][0] : '';
      for (const o of sel.options) {
        if (!o.value) continue;
        o.textContent = o.value + '  (' + (pCounts.get(o.value) || 0) + ')';
      }
      sel.value = current;
    }

    const listNow = currentList();
    const cat = catById(state.category);
    ui.countNum.textContent = String(listNow.length);
    ui.countLabel.textContent = cat.label;
    ui.resultText.textContent = listNow.length
      ? listNow.length + ' von ' + state.items.length + ' ' + cat.label
      : 'Keine Treffer';
    if (ui.favSection) ui.favSection.text.textContent = 'Nur Favoriten (' + state.favorites.size + ')';
    if (ui.dataNote) {
      ui.dataNote.textContent = state.loadedAt
        ? 'Quelle: flowzz.com · Stand ' + new Date(state.loadedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '';
    }
  }

  function card(p) {
    const a = document.createElement('a');
    a.className = 'fx-card';
    a.href = '/product/' + p.slug;
    a.dataset.id = p.id;

    const thumb = el('div', 'fx-thumb');
    if (p.img) {
      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.strain;
      img.loading = 'lazy';
      thumb.append(img);
    }
    const org = el('span', 'fx-orgbadge');
    org.append(el('span', 'fx-flag', flagOf(p.origin)), el('span', null, p.origin));
    thumb.append(org);
    if (!p.avail) thumb.append(el('span', 'fx-soldout', 'nicht lieferbar'));

    const actions = el('div', 'fx-actions');
    const fav = el('button', 'fx-actbtn' + (state.favorites.has(p.id) ? ' is-on' : ''), '★');
    fav.type = 'button';
    fav.title = state.favorites.has(p.id) ? 'Favorit entfernen' : 'Zu Favoriten';
    fav.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(p); });
    const bell = el('button', 'fx-actbtn' + (alertFor(p) ? ' is-on' : ''), '🔔');
    bell.type = 'button';
    bell.title = alertFor(p) ? 'Preisalarm bearbeiten' : 'Preisalarm setzen';
    bell.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAlertDialog(p); });
    actions.append(fav, bell);
    thumb.append(actions);

    const body = el('div', 'fx-cardbody');
    body.append(el('div', 'fx-cardprod', p.producer || '—'));
    body.append(el('div', 'fx-name', p.strain || p.name));
    const meta = el('div', 'fx-meta');
    meta.append(el('span', null, 'THC ' + pct(p.thc)), el('span', 'fx-dot', '·'), el('span', null, 'CBD ' + pct(p.cbd)));
    body.append(meta);
    if (p.genetic) body.append(el('span', 'fx-tag', p.genetic));

    const info = state.prices.get(p.id);
    const offers = el('button', 'fx-offers', info
      ? info.count + (info.count === 1 ? ' Apotheke' : ' Apotheken') + ' · günstigste ' + eur(info.min)
      : 'Preise vergleichen');
    offers.type = 'button';
    offers.title = 'Apotheken-Preise vergleichen';
    offers.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPriceDialog(p);
    });
    body.append(offers);

    const foot = el('div', 'fx-foot');
    const price = el('div', 'fx-price');
    price.append(el('b', null, eur(p.price)), el('small', null, ' / g'));
    const rating = el('div', 'fx-rating', p.rating ? '★ ' + p.rating.toFixed(1) : '—');
    if (p.ratingCount) rating.title = p.ratingCount + ' Bewertungen';
    foot.append(price, rating);
    body.append(foot);

    a.append(thumb, body);
    return a;
  }

  function renderGrid() {
    const list = currentList();
    const grid = ui.grid;
    grid.textContent = '';
    const slice = list.slice(0, state.visible);
    const frag = document.createDocumentFragment();
    for (const p of slice) frag.append(card(p));
    grid.append(frag);
    ui.empty.hidden = list.length > 0;
    ui.moreBtn.parentElement.hidden = list.length <= slice.length;
    ui.grid.classList.toggle('fx-grid-empty', !list.length);
    updatePriceLabels();
  }

  function renderLoading() {
    if (!ui.progress) return;
    ui.progress.hidden = !state.loading;
    if (state.loading) {
      const { n, total } = state.progress;
      const p = total ? Math.min(100, Math.round((n / total) * 100)) : 8;
      ui.progressBar.style.width = p + '%';
      ui.progressText.textContent = total
        ? 'Daten werden geladen … ' + n + ' / ' + total
        : 'Daten werden geladen …';
    }
  }

  /* ---------- CSV ---------- */

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCSV(list) {
    if (!list.length) { toast('Keine Treffer zum Exportieren'); return; }
    const cat = catById(state.category);
    const head = ['Name', 'Sorte', 'Hersteller', 'Herkunft', 'THC %', 'CBD %', 'Genetik', 'Preis €/g', 'Preis max €/g', 'Bewertung', 'Bestrahlung', 'Lieferbar', 'Link'];
    const rows = list.map((p) => {
      return [
        p.name, p.strain, p.producer, p.origin, p.thc, p.cbd, p.genetic,
        p.price, p.priceMax, p.rating, p.irr ? 'ja' : 'nein',
        p.avail ? 'ja' : 'nein', 'https://flowzz.com/product/' + p.slug
      ].map(csvCell).join(';');
    });
    const csv = '\ufeff' + [head.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'flowzz-plus-' + cat.file + '-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(list.length + ' Zeilen exportiert', 'good');
  }

  /* ---------- Modals ---------- */

  function openModal(content) {
    ui.modalCard.textContent = '';
    ui.modalCard.append(content);
    ui.modal.hidden = false;
    ui.modal.classList.add('is-open');
  }

  function closeModal() {
    if (!ui.modal) return;
    ui.modal.hidden = true;
    ui.modal.classList.remove('is-open');
  }

  async function openPriceDialog(p) {
    const head = el('div', 'fx-modal-head');
    head.append(el('b', null, 'Apotheken-Preise'), el('span', null, p.strain || p.name));
    const close = el('button', 'fx-modal-close', '✕');
    close.type = 'button';
    close.addEventListener('click', closeModal);
    head.append(close);

    const bodyEl = el('div', 'fx-modal-body');
    bodyEl.append(el('div', 'fx-modal-note', 'Preise werden geladen …'));
    const wrap = el('div', 'fx-modal-inner');
    wrap.append(head, bodyEl);
    openModal(wrap);

    await loadPrices([p.id]);
    updatePriceLabels();
    const info = state.prices.get(p.id);
    bodyEl.textContent = '';
    if (!info) {
      bodyEl.append(el('div', 'fx-modal-note', 'Für dieses Produkt liegen aktuell keine Apothekenpreise vor.'));
      return;
    }
    const vendors = await loadVendors();
    const summary = el('div', 'fx-modal-summary');
    summary.append(el('b', null, eur(info.min) + ' / g'), el('span', null, info.count + ' Apotheken · günstigster Preis'));
    bodyEl.append(summary);

    const list = el('div', 'fx-offerlist');
    for (const o of info.offers.slice(0, 12)) {
      const v = vendors[o.vendor] || {};
      const row = el('div', 'fx-offer');
      const left = el('div', 'fx-offer-left');
      left.append(el('span', 'fx-offer-name', v.name || 'Apotheke #' + o.vendor));
      if (v.plz || v.city) left.append(el('span', 'fx-offer-city', [v.plz, v.city].filter(Boolean).join(' ')));
      const right = el('div', 'fx-offer-right');
      right.append(el('b', null, eur(o.price)));
      right.append(el('span', 'fx-offer-state' + (o.avail ? ' is-avail' : ''), o.avail ? 'lieferbar' : 'nicht lieferbar'));
      row.append(left, right);
      list.append(row);
    }
    bodyEl.append(list);
    bodyEl.append(el('div', 'fx-modal-note', 'Preise pro Gramm, Stand der Website. Alle Apotheken auf der Produktseite.'));
  }

  function openAlertDialog(p) {
    const existing = alertFor(p);
    const head = el('div', 'fx-modal-head');
    head.append(el('b', null, 'Preisalarm'), el('span', null, p.strain || p.name));
    const close = el('button', 'fx-modal-close', '✕');
    close.type = 'button';
    close.addEventListener('click', closeModal);
    head.append(close);

    const bodyEl = el('div', 'fx-modal-body');
    bodyEl.append(el('div', 'fx-modal-note', 'Aktueller Preis: ' + eur(p.price) + ' / g. Die Erweiterung prüft den Preis alle 3 Stunden und meldet sich, sobald dein Ziel erreicht ist.'));
    const row = el('div', 'fx-numberrow');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.min = '0';
    input.placeholder = 'Ziel €/g';
    input.value = existing ? String(existing.target) : (p.price != null ? String(Math.max(0.5, Math.floor(p.price * 0.9 * 10) / 10)) : '');
    row.append(input);

    const actions = el('div', 'fx-modal-actions');
    const save = el('button', 'fx-btn fx-btn-primary', existing ? 'Alarm aktualisieren' : 'Alarm setzen');
    save.type = 'button';
    save.addEventListener('click', async () => {
      const v = Number(String(input.value).replace(',', '.'));
      if (!v || v <= 0) { toast('Bitte einen Zielpreis eingeben'); return; }
      await setAlert(p, v);
      closeModal();
      toast('Preisalarm für ' + (p.strain || p.name) + ' bei ' + eur(v) + ' gespeichert', 'good');
    });
    actions.append(save);
    if (existing) {
      const del = el('button', 'fx-btn', 'Alarm löschen');
      del.type = 'button';
      del.addEventListener('click', async () => {
        await setAlert(p, null);
        closeModal();
        toast('Preisalarm entfernt');
      });
      actions.append(del);
    }

    bodyEl.append(el('div', 'fx-modal-note', 'Aktueller Preis: ' + eur(p.price) + ' / g – geprüft wird alle 3 Stunden.'), row, actions);
    const wrap = el('div', 'fx-modal-inner');
    wrap.append(head, bodyEl);
    openModal(wrap);
    setTimeout(() => input.focus(), 50);
  }

  /* ---------- Kategorie / Filter ---------- */

  function switchCategory(catId) {
    if (catId === state.category) return;
    state.category = catId;
    state.filters = {
      q: state.filters.q, origins: new Set(), producers: new Set(), genetic: '',
      thcMin: null, thcMax: null, priceMax: null, irr: '', onlyAvail: false,
      onlyFavs: state.filters.onlyFavs, sort: state.filters.sort
    };
    state.visible = PAGE_STEP;
    state.items = [];
    state.facetsBuilt = false;
    state.loadedAt = 0;
    if (ui.input) ui.input.value = state.filters.q;
    resetControls();
    render();
    syncURL();
    loadCategory(catId, false);
  }

  function resetControls() {
    if (ui.priceSection) {
      ui.priceSection.range.value = '25';
      ui.priceSection.value.textContent = 'egal';
    }
    if (ui.thcSection) { ui.thcSection.min.value = ''; ui.thcSection.max.value = ''; }
    if (ui.sort) ui.sort.value = state.filters.sort;
    if (ui.availSection) ui.availSection.checkbox.checked = false;
    if (ui.geneticSeg) ui.geneticSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === ''));
    if (ui.irrSeg) ui.irrSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === ''));
  }

  function resetFilters() {
    state.filters = {
      q: '', origins: new Set(), producers: new Set(), genetic: '',
      thcMin: null, thcMax: null, priceMax: null, irr: '', onlyAvail: false,
      onlyFavs: false, sort: 'popularity'
    };
    state.visible = PAGE_STEP;
    if (ui.input) ui.input.value = '';
    if (ui.favSection) ui.favSection.checkbox.checked = false;
    resetControls();
    render();
    syncURL();
  }

  /* ---------- URL ---------- */

  const URL_KEYS = ['fx', 'cat', 'q', 'origin', 'producer', 'genetic', 'thc', 'price', 'irr', 'avail', 'fav', 'sort'];

  function syncURL() {
    if (!state.opened) return;
    const f = state.filters;
    const params = new URLSearchParams();
    params.set('fx', '1');
    if (state.category !== 'flowers') params.set('cat', state.category);
    if (f.q) params.set('q', f.q);
    if (f.origins.size) params.set('origin', [...f.origins].join(','));
    if (f.producers.size) params.set('producer', [...f.producers].join(','));
    if (f.genetic) params.set('genetic', f.genetic);
    if (f.thcMin != null || f.thcMax != null) params.set('thc', (f.thcMin == null ? '' : f.thcMin) + '-' + (f.thcMax == null ? '' : f.thcMax));
    if (f.priceMax != null) params.set('price', String(f.priceMax));
    if (f.irr) params.set('irr', f.irr);
    if (f.onlyAvail) params.set('avail', '1');
    if (f.onlyFavs) params.set('fav', '1');
    if (f.sort !== 'popularity') params.set('sort', f.sort);
    history.replaceState(history.state, '', location.pathname + '?' + params.toString());
  }

  function applyURL() {
    const params = new URLSearchParams(location.search);
    const f = state.filters;
    if (params.get('cat')) state.category = params.get('cat');
    f.q = params.get('q') || '';
    if (params.get('origin')) f.origins = new Set(params.get('origin').split(',').map(normOrigin));
    if (params.get('producer')) f.producers = new Set(params.get('producer').split(','));
    if (params.get('genetic')) f.genetic = params.get('genetic');
    const thc = params.get('thc');
    if (thc && thc.includes('-')) {
      const [a, b] = thc.split('-');
      f.thcMin = a === '' ? null : Number(a);
      f.thcMax = b === '' ? null : Number(b);
    }
    if (params.get('price')) f.priceMax = Number(params.get('price'));
    if (params.get('irr')) f.irr = params.get('irr');
    f.onlyAvail = params.get('avail') === '1';
    f.onlyFavs = params.get('fav') === '1';
    if (params.get('sort')) f.sort = params.get('sort');
  }

  function clearURL() {
    const params = new URLSearchParams(location.search);
    URL_KEYS.forEach((k) => params.delete(k));
    const qs = params.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : ''));
  }

  /* ---------- Öffnen / Schließen ---------- */

  function lowerCookieBanner() {
    if (ui.cookieZ != null) return;
    const dlg = document.getElementById('CybotCookiebotDialog');
    if (!dlg) return;
    ui.cookieZ = dlg.style.zIndex || '';
    dlg.style.zIndex = '1';
  }

  function restoreCookieBanner() {
    if (ui.cookieZ == null) return;
    const dlg = document.getElementById('CybotCookiebotDialog');
    if (dlg) dlg.style.zIndex = ui.cookieZ;
    ui.cookieZ = null;
  }

  function openOverlay(pending) {
    ensureHost();
    lowerCookieBanner();
    if (!ui.app) buildOverlay();
    if (!state.opened) {
      state.opened = true;
      applyURL();
      if (ui.input) ui.input.value = state.filters.q;
      if (ui.sort) ui.sort.value = state.filters.sort;
      if (ui.priceSection) {
        const v = state.filters.priceMax == null ? 25 : state.filters.priceMax;
        ui.priceSection.range.value = String(v);
        ui.priceSection.value.textContent = state.filters.priceMax == null ? 'egal' : 'bis ' + eur(v);
      }
      if (ui.thcSection) {
        ui.thcSection.min.value = state.filters.thcMin == null ? '' : String(state.filters.thcMin);
        ui.thcSection.max.value = state.filters.thcMax == null ? '' : String(state.filters.thcMax);
      }
      if (ui.availSection) ui.availSection.checkbox.checked = state.filters.onlyAvail;
      if (ui.favSection) ui.favSection.checkbox.checked = state.filters.onlyFavs;
      if (pending) Object.assign(state.filters, pending);
      if (ui.geneticSeg) ui.geneticSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.filters.genetic));
      if (ui.irrSeg) ui.irrSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.filters.irr));
      ui.app.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      ui.host.classList.add('fx-visible');
      render();
      loadUserData().then(() => {
        render();
        if (!state.items.length) loadCategory(state.category, false);
        checkAlerts();
      });
      setTimeout(() => ui.input && ui.input.focus(), 60);
    } else {
      ui.app.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      ui.host.classList.add('fx-visible');
    }
    hideLauncher();
  }

  function closeOverlay() {
    state.opened = false;
    closeModal();
    if (ui.app) ui.app.classList.remove('is-open');
    if (ui.host) ui.host.classList.remove('fx-visible');
    document.documentElement.style.overflow = '';
    restoreCookieBanner();
    clearURL();
    showLauncher();
  }

  /* ---------- Launcher ---------- */

  function buildLauncher() {
    const btn = el('button', 'fx-launcher');
    btn.type = 'button';
    btn.innerHTML = '<span class="fx-launcher-logo">f+</span><span class="fx-launcher-label">Herkunft filtern</span>';
    btn.addEventListener('click', openOverlay);
    ensureHost();
    ui.shadow.appendChild(btn);
    ui.launcher = btn;
  }

  function showLauncher() {
    if (!ui.launcher) buildLauncher();
    const isList = location.pathname === '/product' || location.pathname === '/product/';
    ui.launcher.querySelector('.fx-launcher-label').textContent = isList ? 'Herkunft filtern' : 'flowzz+ Suche';
    ui.launcher.classList.add('is-visible');
  }

  function hideLauncher() {
    if (ui.launcher) ui.launcher.classList.remove('is-visible');
  }

  /* ---------- Produktdetail ---------- */

  function detailInfo() {
    const nd = document.getElementById('__NEXT_DATA__');
    if (!nd) return null;
    try {
      const data = JSON.parse(nd.textContent);
      let found = null;
      const walk = (node, depth) => {
        if (!node || typeof node !== 'object' || depth > 12 || found) return;
        if (node.origin && node.url && (node.name || node.strain_name)) { found = node; return; }
        for (const key of Object.keys(node)) {
          const v = node[key];
          if (v && typeof v === 'object') walk(v, depth + 1);
          if (found) return;
        }
      };
      walk(data, 0);
      if (!found) return null;
      return { origin: normOrigin(found.origin), name: found.name, slug: found.url };
    } catch (e) { return null; }
  }

  function injectDetailBadge() {
    if (!/^\/product\/[^/]+/.test(location.pathname)) return;
    if (document.querySelector('.fx-detail-line')) return;
    const info = detailInfo();
    if (!info) return;
    const h1 = document.querySelector('h1');
    if (!h1 || !h1.parentElement) return;

    const line = el('div', 'fx-detail-line');
    const badge = el('button', 'fx-detail-badge');
    badge.type = 'button';
    badge.append(el('span', 'fx-flag', flagOf(info.origin)), el('span', null, 'Herkunft: ' + info.origin));
    badge.title = 'Alle aus ' + info.origin + ' anzeigen';
    badge.addEventListener('click', () => {
      state.visible = PAGE_STEP;
      openOverlay({ origins: new Set([info.origin]) });
      syncURL();
    });
    line.append(badge);
    h1.parentElement.insertBefore(line, h1.nextSibling);
  }

  /* ---------- Boot ---------- */

  function boot() {
    ensureHost();
    showLauncher();

    const params = new URLSearchParams(location.search);
    if (params.get('cat')) state.category = params.get('cat');

    loadUserData();
    loadCategory(state.category, false);
    injectDetailBadge();
    setTimeout(checkAlerts, 6000);

    if (params.get('fx') === '1') {
      setTimeout(openOverlay, 250);
    }

    let lastPath = location.pathname + location.search;
    setInterval(() => {
      const now = location.pathname + location.search;
      if (now === lastPath) return;
      lastPath = now;
      if (!state.opened) { showLauncher(); injectDetailBadge(); }
    }, 1200);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (ui.modal && !ui.modal.hidden) { closeModal(); return; }
        if (state.opened) { e.preventDefault(); closeOverlay(); }
      }
      if (e.key === '/' && !state.opened) {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        openOverlay();
      }
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openOverlay();
      }
    });

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((m) => {
        if (m && m.type === 'FX_OPEN') openOverlay();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
