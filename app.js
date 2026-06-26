'use strict';

// ============================================================
// CATEGORIES
// ============================================================
const CATEGORIES = [
  { id: 'kalender',  label: 'Kalender',  color: '#BDD3CE', text: '#013D5A' },
  { id: 'räkningar', label: 'Räkningar', color: '#F4A25B', text: '#013D5A' },
  { id: 'barn',      label: 'Barn',      color: '#708C69', text: '#FCF3E3' },
  { id: 'inköp',     label: 'Inköp',     color: '#BDD3CE', text: '#013D5A' },
  { id: 'att-göra',  label: 'Att göra',  color: '#013D5A', text: '#FCF3E3' },
  { id: 'semester',  label: 'Semester',  color: '#708C69', text: '#FCF3E3' },
  { id: 'hund',      label: 'Hund',      color: '#F4A25B', text: '#013D5A' },
  { id: 'tankar',    label: 'Tankar',    color: '#013D5A', text: '#FCF3E3' },
];

// ============================================================
// PRESET COLORS FOR CUSTOM CATEGORIES
// ============================================================
const PRESET_COLORS = [
  { color: '#708C69', text: '#FCF3E3' },
  { color: '#F4A25B', text: '#013D5A' },
  { color: '#BDD3CE', text: '#013D5A' },
  { color: '#013D5A', text: '#FCF3E3' },
  { color: '#7B5EA7', text: '#FCF3E3' },
  { color: '#D62839', text: '#FCF3E3' },
  { color: '#457B9D', text: '#FCF3E3' },
  { color: '#E9C46A', text: '#013D5A' },
];
let selectedPresetColor = PRESET_COLORS[0];

// ============================================================
// KEYWORDS FOR AUTO-CATEGORIZATION
// ============================================================
const KEYWORDS = {
  'kalender':  ['möte','mötet','träff','lunch','middag','imorgon','idag','måndag','tisdag',
                'onsdag','torsdag','fredag','lördag','söndag','kl ','klockan','bokad',
                'bokar','bokade','boka','dags','tid','kalender','schema','april','maj',
                'juni','juli','aug','sep','okt','nov','dec','jan','feb','mar'],
  'räkningar': ['räkning','faktura','betala','betalt','hyra','el ','försäkring',
                'prenumeration','abonnemang','lån','skuld','ränta','swish','bankgiro',
                'fakturor','autogiro','betalning','kreditkort','bolån','avgift'],
  'barn':      ['barn','barnen','skola','dagis','förskola','fotboll','simning','lektion',
                'läxa','hämta','lämna','föräldramöte','aktivitet','fritids','sport',
                'barnaktivitet','barnvakt','barnens','klassfest','skolresa'],
  'inköp':     ['köp','köpa','köpte','handla','handlar','butik','affär','mat','mjölk',
                'bröd','frukt','grönsaker','storhandla','ica','coop','hemköp','livsmedel',
                'kläder','beställ','beställa','shoppa','apoteket','inköpslista','behöver'],
  'semester':  ['semester','resa','resan','flyg','hotell','airbnb','bokning','bokade',
                'utland','strandsemester','camping','pass','bagage','charter','vandring',
                'roadtrip','kryssning','solsemester','skidsemester'],
  'hund':      ['hund','hunden','promenad','veterinär','foder','hundmat','hundpark',
                'valp','koppel','hundsitter','hundpensionat','vovve','hundfrisör',
                'vaccination','chip','halsbandet','bur'],
};

// ============================================================
// STATE & DATA
// ============================================================
const STATE = {
  view: 'dashboard',
  selectedCategory: null,
  currentItemId: null,
  currentFilter: 'active',
  selectedCategoryForAdd: null,
  activeFilter: null,  // category filter on main view (null = all)
};

function loadData() {
  try {
    const raw = localStorage.getItem('mitt-liv-v1');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { items: [], settings: { name: '', reviewTime: '20:00', lastReview: null, customCategories: [] } };
}

function saveData() {
  localStorage.setItem('mitt-liv-v1', JSON.stringify(DATA));
}

let DATA = loadData();

// ============================================================
// UTILS
// ============================================================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getAllCategories() {
  return [...CATEGORIES, ...(DATA.settings.customCategories || [])];
}

function getCat(id) {
  return getAllCategories().find(c => c.id === id) || CATEGORIES.find(c => c.id === 'tankar');
}

function svDate() {
  return new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return { text: Math.abs(diff) === 1 ? 'Igår' : `${Math.abs(diff)} dagar sen`, cls: 'overdue' };
  if (diff === 0) return { text: 'Idag',    cls: 'today' };
  if (diff === 1) return { text: 'Imorgon', cls: 'soon'  };
  if (diff <= 7)  return { text: `Om ${diff} dagar`, cls: 'soon' };
  return { text: d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), cls: 'normal' };
}

// ============================================================
// AUTO-CATEGORIZE
// ============================================================
function guessCategory(text) {
  const lower = text.toLowerCase();

  // Check if any category label appears in the text — custom categories first
  const allCats = getAllCategories();
  for (const cat of [...allCats].reverse()) {
    if (lower.includes(cat.label.toLowerCase())) return cat.id;
  }

  // Fall back to keyword matching
  let best = null, bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best || 'tankar';
}

function extractDate(text) {
  const lower = text.toLowerCase();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const add = n => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };
  if (lower.includes('idag'))         return add(0);
  if (lower.includes('imorgon'))      return add(1);
  if (lower.includes('övermorgon'))   return add(2);
  if (lower.includes('nästa vecka'))  return add(7);
  const days = ['söndag','måndag','tisdag','onsdag','torsdag','fredag','lördag'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      let diff = i - today.getDay();
      if (diff <= 0) diff += 7;
      return add(diff);
    }
  }
  return null;
}

// ============================================================
// ITEM CRUD
// ============================================================
function addItem({ text, category, date, reminder }) {
  const item = {
    id: uid(),
    text: text.trim(),
    category: category || guessCategory(text),
    date: date || null,
    reminder: reminder || null,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  DATA.items.unshift(item);
  saveData();
  scheduleReminder(item);
  return item;
}

function updateItem(id, patch) {
  const i = DATA.items.findIndex(x => x.id === id);
  if (i < 0) return;
  DATA.items[i] = { ...DATA.items[i], ...patch };
  saveData();
  if (patch.reminder) scheduleReminder(DATA.items[i]);
}

function deleteItem(id) {
  DATA.items = DATA.items.filter(x => x.id !== id);
  saveData();
}

function toggleComplete(id) {
  const item = DATA.items.find(x => x.id === id);
  if (item) { item.completed = !item.completed; saveData(); }
}

function activeCount(catId) {
  return DATA.items.filter(x => x.category === catId && !x.completed).length;
}

function catItems(catId) {
  return DATA.items.filter(x => x.category === catId);
}

function overdueItems() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return DATA.items.filter(x => {
    if (!x.date || x.completed) return false;
    return new Date(x.date + 'T00:00:00') < today;
  });
}

function upcomingItems(days = 7) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = new Date(today); limit.setDate(today.getDate() + days);
  return DATA.items
    .filter(x => {
      if (!x.date || x.completed) return false;
      const d = new Date(x.date + 'T00:00:00');
      return d >= today && d <= limit;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function requestNotifPerm() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleReminder(item) {
  if (!item.reminder) return;
  const ms = new Date(item.reminder).getTime() - Date.now();
  if (ms <= 0 || ms > 2147483647) return;
  setTimeout(() => {
    const cat = getCat(item.category);
    if (Notification.permission === 'granted') {
      new Notification(`Vardagsliv:ish — ${cat.label}`, { body: item.text });
    }
    showToast(`🔔 ${item.text}`);
  }, ms);
}

// ============================================================
// EVENING REVIEW CHECK
// ============================================================
function checkEvening() {
  const [h] = (DATA.settings.reviewTime || '20:00').split(':').map(Number);
  if (new Date().getHours() < h) return;
  const today = new Date().toISOString().split('T')[0];
  if (DATA.settings.lastReview === today) return;
  setTimeout(() => showToast('Dags för kvällsrevision! Tryck ◎'), 1800);
}

// ============================================================
// VIEW ROUTING
// ============================================================
function setActiveNav(viewId) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + id).classList.remove('hidden');
  STATE.view = id;
}

function showDashboard() {
  showView('dashboard');
  setActiveNav('dashboard');
  renderDashboard();
}

function showCategory(catId) {
  STATE.selectedCategory = catId;
  STATE.currentFilter = 'active';
  showView('category');
  setActiveNav('');
  renderCategoryView(catId);
}

function showSettings() {
  showView('settings');
  setActiveNav('settings');
  document.getElementById('setting-name').value = DATA.settings.name || '';
  document.getElementById('setting-review-time').value = DATA.settings.reviewTime || '20:00';
  renderCustomCategories();
  renderColorSwatches();
}

function renderCustomCategories() {
  const list = document.getElementById('custom-cats-list');
  const cats = DATA.settings.customCategories || [];
  if (!cats.length) {
    list.innerHTML = '<div class="custom-cats-empty">Inga egna kategorier ännu</div>';
    return;
  }
  list.innerHTML = cats.map(cat => `
    <div class="custom-cat-row">
      <div class="custom-cat-dot" style="background:${cat.color}"></div>
      <div class="custom-cat-name">${cat.label}</div>
      <button class="custom-cat-delete" onclick="deleteCustomCategory('${cat.id}')">✕</button>
    </div>`).join('');
}

function renderColorSwatches() {
  document.getElementById('color-swatches').innerHTML = PRESET_COLORS.map((c, i) =>
    `<button class="color-swatch ${c === selectedPresetColor ? 'selected' : ''}"
      style="background:${c.color}" onclick="selectPresetColor(${i})"></button>`
  ).join('');
}

function selectPresetColor(i) {
  selectedPresetColor = PRESET_COLORS[i];
  renderColorSwatches();
}

function addCustomCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { showToast('Ange ett namn för kategorin'); return; }
  const id = 'c-' + name.toLowerCase().replace(/[^\w]/g, '-') + '-' + Date.now().toString(36);
  if (!DATA.settings.customCategories) DATA.settings.customCategories = [];
  DATA.settings.customCategories.push({ id, label: name, color: selectedPresetColor.color, text: selectedPresetColor.text, custom: true });
  saveData();
  document.getElementById('new-cat-name').value = '';
  renderCustomCategories();
  showToast(`"${name}" tillagd`);
}

function deleteCustomCategory(id) {
  DATA.settings.customCategories = (DATA.settings.customCategories || []).filter(c => c.id !== id);
  saveData();
  renderCustomCategories();
  showToast('Kategori borttagen');
}

function saveSettings() {
  DATA.settings.name = document.getElementById('setting-name').value.trim();
  DATA.settings.reviewTime = document.getElementById('setting-review-time').value;
  saveData();
  showToast('Inställningar sparade');
  showDashboard();
}

function clearAllData() {
  if (!confirm('Är du säker? All data raderas permanent.')) return;
  localStorage.removeItem('mitt-liv-v1');
  DATA = loadData();
  STATE.activeFilter = null;
  showToast('All data raderad');
  showDashboard();
}

function startReview() {
  showView('review');
  setActiveNav('review');
  DATA.settings.lastReview = new Date().toISOString().split('T')[0];
  saveData();
  renderReview();
}

function setFilter(btn, filter) {
  STATE.currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderItemList(STATE.selectedCategory);
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
function renderDashboard() {
  document.getElementById('header-date').textContent = svDate();
  renderCatFilterGrid();
  renderMainItemList();
}

function setMainFilter(catId) {
  STATE.activeFilter = STATE.activeFilter === catId ? null : catId;
  renderCatFilterGrid();
  renderMainItemList();
}

function renderCatFilterGrid() {
  const grid = document.getElementById('cat-filter-grid');
  if (!grid) return;
  grid.innerHTML = getAllCategories().map(cat => {
    const isActive = STATE.activeFilter === cat.id;
    return `<button class="cat-filter-btn ${isActive ? 'active' : ''}"
      style="background:${cat.color};color:${cat.text}"
      onclick="setMainFilter('${cat.id}')">
      ${cat.label}
    </button>`;
  }).join('');
}

function renderMainItemList() {
  const list = document.getElementById('main-item-list');
  if (!list) return;

  let items;
  if (STATE.activeFilter) {
    items = DATA.items.filter(x => x.category === STATE.activeFilter && !x.completed);
  } else {
    items = DATA.items.filter(x => !x.completed);
  }

  if (!items.length) {
    const msg = STATE.activeFilter
      ? 'Inga aktiva objekt i den här kategorin'
      : 'Inga objekt än — skriv något ovan!';
    list.innerHTML = `<li class="empty-state">${msg}</li>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const cat  = getCat(item.category);
    const info = item.date ? formatDate(item.date) : null;
    const dateTag = info ? `<span class="item-date-tag ${info.cls}">${info.text}</span>` : '';
    const catPill = !STATE.activeFilter
      ? `<span class="item-cat-pill" style="background:${cat.color};color:${cat.text}">${cat.label}</span>`
      : '';
    const hasMeta = info || !STATE.activeFilter;

    return `<li class="item-row ${item.completed ? 'completed' : ''}" onclick="openDetail('${item.id}')">
      <div class="item-checkbox" onclick="event.stopPropagation();tapCheckMain('${item.id}')"></div>
      <div class="item-content">
        <div class="item-text">${item.text}</div>
        ${hasMeta ? `<div class="item-meta">${dateTag}${catPill}</div>` : ''}
      </div>
    </li>`;
  }).join('');
}

function tapCheckMain(id) {
  toggleComplete(id);
  renderMainItemList();
}

// ============================================================
// INLINE ADD FORM
// ============================================================
function toggleInlineField(type) {
  const wrap = document.getElementById('inline-field-' + type);
  const chip = document.getElementById('inline-chip-' + type);
  if (!wrap || !chip) return;
  const opening = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden', !opening);
  chip.classList.toggle('active', opening);
  if (opening) {
    const inp = wrap.querySelector('input');
    if (inp) setTimeout(() => inp.focus(), 60);
  } else {
    const inp = wrap.querySelector('input');
    if (inp) inp.value = '';
  }
}

function onInlineInput(el) {
  // Auto-extract date from text
  const text = el.value;
  if (text.length < 3) return;
  const detected = extractDate(text);
  const dateEl = document.getElementById('inline-date');
  if (detected && dateEl && !dateEl.value) {
    dateEl.value = detected;
    const wrap = document.getElementById('inline-field-date');
    const chip = document.getElementById('inline-chip-date');
    if (wrap && wrap.classList.contains('hidden')) {
      wrap.classList.remove('hidden');
      if (chip) chip.classList.add('active');
    }
  }
}

function saveInlineItem() {
  const text = document.getElementById('inline-text').value.trim();
  if (!text) { showToast('Skriv något först!'); return; }

  const category = STATE.activeFilter || guessCategory(text);
  const date     = document.getElementById('inline-date').value || null;
  const rem      = document.getElementById('inline-tid').value;
  const reminder = rem ? rem + ':00' : null;

  addItem({ text, category, date, reminder });
  showToast(`Lagt till i ${getCat(category).label}`);
  requestNotifPerm();

  // Reset form
  document.getElementById('inline-text').value = '';
  document.getElementById('inline-date').value = '';
  document.getElementById('inline-tid').value = '';
  ['date', 'tid'].forEach(t => {
    const wrap = document.getElementById('inline-field-' + t);
    const chip = document.getElementById('inline-chip-' + t);
    if (wrap) wrap.classList.add('hidden');
    if (chip) chip.classList.remove('active');
  });

  renderMainItemList();
}

// ============================================================
// RENDER: CATEGORY VIEW (legacy, kept for edit flow)
// ============================================================
function renderCategoryView(catId) {
  const cat = getCat(catId);
  const header = document.getElementById('category-header');
  header.style.background = cat.color;
  header.style.color      = cat.text;
  document.getElementById('category-title').textContent = cat.label;
  document.getElementById('category-count-badge').textContent = activeCount(catId);
  document.getElementById('cat-add-btn').style.color = 'inherit';
  renderItemList(catId);
}

function renderItemList(catId) {
  const all = catItems(catId);
  let items;
  if (STATE.currentFilter === 'completed') items = all.filter(x => x.completed);
  else if (STATE.currentFilter === 'all')  items = all;
  else                                      items = all.filter(x => !x.completed);

  const list = document.getElementById('item-list');
  if (!items.length) {
    list.innerHTML = `<li class="empty-state">Inga objekt här ännu</li>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const info   = item.date ? formatDate(item.date) : null;
    const dateLi = info ? `<span class="item-date-tag ${info.cls}">${info.text}</span>` : '';
    const remLi  = item.reminder ? `<span class="item-date-tag">🔔 Påminnelse</span>` : '';

    return `<li class="item-row ${item.completed ? 'completed' : ''}" onclick="openDetail('${item.id}')">
      <div class="item-checkbox" onclick="event.stopPropagation();tapCheck('${item.id}')"></div>
      <div class="item-content">
        <div class="item-text">${item.text}</div>
        ${info || item.reminder ? `<div class="item-meta">${dateLi}${remLi}</div>` : ''}
      </div>
    </li>`;
  }).join('');
}

function tapCheck(id) {
  toggleComplete(id);
  renderItemList(STATE.selectedCategory);
  document.getElementById('category-count-badge').textContent = activeCount(STATE.selectedCategory);
}

// ============================================================
// RENDER: REVIEW
// ============================================================
function renderReview() {
  document.getElementById('review-date').textContent = svDate();
  const overdue  = overdueItems();
  const upcoming = upcomingItems(7);
  const todayStr = new Date().toISOString().split('T')[0];
  const added    = DATA.items.filter(x => x.createdAt.startsWith(todayStr));

  let html = '';
  if (overdue.length)  html += section('Förfallna', overdue);
  if (upcoming.length) html += section('Kommande 7 dagar', upcoming);
  if (added.length)    html += section('Tillagt idag', added);

  if (!html) {
    html = `<div class="review-empty">
      <div class="review-empty-icon">◎</div>
      <div class="review-empty-title">Allt är klart!</div>
      <div class="review-empty-sub">Ingen revision behövs just nu.</div>
    </div>`;
  }

  document.getElementById('review-content').innerHTML = html;
}

function section(title, items) {
  return `<div class="review-section">
    <div class="review-section-title">${title} (${items.length})</div>
    ${items.map(reviewRow).join('')}
  </div>`;
}

function reviewRow(item) {
  const cat  = getCat(item.category);
  const info = item.date ? formatDate(item.date) : null;
  return `<div class="review-item">
    <div class="today-dot" style="background:${cat.color}"></div>
    <div class="review-item-body">
      <div class="review-item-text">${item.text}</div>
      ${info ? `<div class="review-item-sub">${info.text}</div>` : ''}
    </div>
    <button class="review-remind-btn" onclick="quickReminder('${item.id}')">+ Påminn</button>
  </div>`;
}

function quickReminder(id) {
  const val = prompt('Påminnelsetid (ÅÅÅÅ-MM-DDTHH:MM):',
    new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  if (!val) return;
  updateItem(id, { reminder: val + ':00' });
  showToast('Påminnelse satt!');
  renderReview();
}

// ============================================================
// MODAL: ADD / EDIT
// ============================================================
let EDITING_ID = null;

function toggleField(type) {
  const wrap = document.getElementById('field-' + type);
  const chip = document.getElementById('chip-' + type);
  const opening = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden', !opening);
  chip.classList.toggle('active', opening);
  if (opening) {
    const inp = wrap.querySelector('input');
    if (inp) setTimeout(() => inp.focus(), 60);
  } else {
    const inp = wrap.querySelector('input');
    if (inp) inp.value = '';
  }
}

function openModal(catId = null, editId = null) {
  EDITING_ID = editId;
  STATE.selectedCategoryForAdd = catId;

  const txtEl  = document.getElementById('item-text');
  const dateEl = document.getElementById('item-date');
  const remEl  = document.getElementById('item-reminder');

  ['date', 'reminder'].forEach(t => {
    document.getElementById('field-' + t).classList.add('hidden');
    document.getElementById('chip-' + t).classList.remove('active');
  });

  if (editId) {
    const item = DATA.items.find(x => x.id === editId);
    if (item) {
      txtEl.value  = item.text;
      dateEl.value = item.date || '';
      remEl.value  = item.reminder ? item.reminder.slice(0, 16) : '';
      STATE.selectedCategoryForAdd = item.category;
      document.getElementById('modal-title').textContent = 'Redigera';
      showSuggestion(item.category);
      if (item.date) {
        document.getElementById('field-date').classList.remove('hidden');
        document.getElementById('chip-date').classList.add('active');
      }
      if (item.reminder) {
        document.getElementById('field-reminder').classList.remove('hidden');
        document.getElementById('chip-reminder').classList.add('active');
      }
    }
  } else {
    txtEl.value  = '';
    dateEl.value = '';
    remEl.value  = '';
    document.getElementById('modal-title').textContent = 'Lägg till';
    if (catId) {
      showSuggestion(catId);
    } else {
      document.getElementById('category-suggestion').style.display = 'none';
      document.getElementById('category-picker').classList.add('hidden');
    }
  }

  buildChips();
  document.getElementById('add-modal').classList.remove('hidden');
  requestNotifPerm();
  setTimeout(() => txtEl.focus(), 120);
}

function closeModal() {
  document.getElementById('add-modal').classList.add('hidden');
  EDITING_ID = null;
}

function showSuggestion(catId) {
  STATE.selectedCategoryForAdd = catId;
  document.getElementById('suggestion-name').textContent = getCat(catId).label;
  document.getElementById('category-suggestion').style.display = 'flex';
  buildChips();
}

function toggleCategoryPicker() {
  document.getElementById('category-picker').classList.toggle('hidden');
}

function selectChip(catId) {
  STATE.selectedCategoryForAdd = catId;
  document.getElementById('suggestion-name').textContent = getCat(catId).label;
  document.getElementById('category-suggestion').style.display = 'flex';
  document.getElementById('category-picker').classList.add('hidden');
  buildChips();
}

function buildChips() {
  document.getElementById('category-chips').innerHTML = getAllCategories().map(cat =>
    `<button class="category-chip ${STATE.selectedCategoryForAdd === cat.id ? 'selected' : ''}"
       style="background:${cat.color};color:${cat.text}"
       onclick="selectChip('${cat.id}')">${cat.label}</button>`
  ).join('');
}

function onTextInput(el) {
  const text = el.value;
  if (text.length < 3) { document.getElementById('category-suggestion').style.display = 'none'; return; }

  if (!STATE.selectedCategoryForAdd || EDITING_ID === null) {
    STATE.selectedCategoryForAdd = guessCategory(text);
  }
  showSuggestion(STATE.selectedCategoryForAdd);

  const detected = extractDate(text);
  const dateEl = document.getElementById('item-date');
  if (detected && !dateEl.value) {
    dateEl.value = detected;
    if (document.getElementById('field-date').classList.contains('hidden')) {
      toggleField('date');
    }
  }
}

function saveItem() {
  const text = document.getElementById('item-text').value.trim();
  if (!text) { showToast('Skriv något först!'); return; }

  const category = STATE.selectedCategoryForAdd || guessCategory(text);
  const date     = document.getElementById('item-date').value || null;
  const rem      = document.getElementById('item-reminder').value;
  const reminder = rem ? rem + ':00' : null;

  if (EDITING_ID) {
    updateItem(EDITING_ID, { text, category, date, reminder });
    showToast('Uppdaterat!');
  } else {
    addItem({ text, category, date, reminder });
    showToast(`Lagt till i ${getCat(category).label}`);
  }

  closeModal();
  refresh();
}

// ============================================================
// MODAL: DETAIL
// ============================================================
function openDetail(id) {
  STATE.currentItemId = id;
  const item = DATA.items.find(x => x.id === id);
  if (!item) return;
  const cat = getCat(item.category);

  const badge = document.getElementById('detail-category-badge');
  badge.textContent      = cat.label;
  badge.style.background = cat.color;
  badge.style.color      = cat.text;

  document.getElementById('detail-text').textContent = item.text;

  const meta = [];
  if (item.date) {
    const info = formatDate(item.date);
    meta.push(`Datum: ${info.text}`);
  }
  if (item.reminder) {
    const r = new Date(item.reminder);
    meta.push(`Påminnelse: ${r.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}`);
  }
  meta.push(`Tillagt: ${new Date(item.createdAt).toLocaleDateString('sv-SE')}`);
  document.getElementById('detail-meta').innerHTML = meta.join('<br>');

  const btn = document.getElementById('detail-complete-btn');
  btn.textContent = item.completed ? 'Markera som aktiv' : 'Markera som klar';
  btn.classList.toggle('is-done', item.completed);

  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  STATE.currentItemId = null;
}

function editCurrentItem() {
  const id = STATE.currentItemId;
  closeDetailModal();
  openModal(null, id);
}

function deleteCurrentItem() {
  if (!confirm('Ta bort detta objekt?')) return;
  deleteItem(STATE.currentItemId);
  closeDetailModal();
  refresh();
  showToast('Borttaget');
}

function toggleCurrentItem() {
  toggleComplete(STATE.currentItemId);
  closeDetailModal();
  refresh();
  showToast('Status uppdaterad');
}

// ============================================================
// REFRESH CURRENT VIEW
// ============================================================
function refresh() {
  if (STATE.view === 'dashboard') {
    renderMainItemList();
  } else if (STATE.view === 'category') {
    renderItemList(STATE.selectedCategory);
    document.getElementById('category-count-badge').textContent = activeCount(STATE.selectedCategory);
  } else if (STATE.view === 'review') {
    renderReview();
  }
}

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'fade-out');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.classList.add('hidden'), 320);
  }, 2600);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  const inField = tag === 'INPUT' || tag === 'TEXTAREA';
  const addOpen = !document.getElementById('add-modal').classList.contains('hidden');

  if (e.key === 'Escape') { closeModal(); closeDetailModal(); }
  if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) && addOpen) saveItem();
});

// ============================================================
// RESTORE REMINDERS ON LOAD
// ============================================================
function restoreReminders() {
  const now = Date.now();
  DATA.items.forEach(item => {
    if (item.reminder && new Date(item.reminder).getTime() > now) {
      scheduleReminder(item);
    }
  });
}

// ============================================================
// INIT
// ============================================================
function init() {
  showDashboard();
  restoreReminders();
  checkEvening();
  setInterval(() => { if (STATE.view === 'dashboard') renderDashboard(); }, 60000);
}

init();
