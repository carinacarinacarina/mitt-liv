'use strict';

// ============================================================
// CATEGORIES
// ============================================================
const CATEGORIES = [
  { id: 'kalender',  label: 'Kalender',  color: 'var(--cat-kalender)',  text: 'var(--text-light)' },
  { id: 'räkningar', label: 'Räkningar', color: 'var(--cat-räkningar)', text: 'var(--text-light)' },
  { id: 'barn',      label: 'Barn',      color: 'var(--cat-barn)',      text: 'var(--text-dark)'  },
  { id: 'inköp',     label: 'Inköp',     color: 'var(--cat-inköp)',     text: 'var(--text-light)' },
  { id: 'att-göra',  label: 'Att göra',  color: 'var(--cat-att-göra)',  text: 'var(--text-light)' },
  { id: 'semester',  label: 'Semester',  color: 'var(--cat-semester)',  text: 'var(--text-light)' },
  { id: 'hund',      label: 'Hund',      color: 'var(--cat-hund)',      text: 'var(--text-dark)'  },
  { id: 'tankar',    label: 'Tankar',    color: 'var(--cat-tankar)',    text: 'var(--text-light)' },
];

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
};

function loadData() {
  try {
    const raw = localStorage.getItem('mitt-liv-v1');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { items: [], settings: { name: '', reviewTime: '20:00', lastReview: null } };
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

function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'tankar');
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

function todayItems() {
  const d = new Date().toISOString().split('T')[0];
  return DATA.items.filter(x => !x.completed && x.date === d);
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
      new Notification(`Mitt Liv — ${cat.label}`, { body: item.text });
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
  const name = DATA.settings.name;
  document.getElementById('header-greeting').textContent = name ? `Hej ${name}` : 'Mitt Liv';
  document.getElementById('header-date').textContent = svDate();

  // Cards
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = CATEGORIES.map(cat => {
    const count = activeCount(cat.id);
    const items = catItems(cat.id).filter(x => !x.completed);
    const preview = items.length
      ? (items.find(x => x.date) || items[0]).text.slice(0, 48)
      : 'Inga objekt';

    const countCls = count >= 100 ? 'three-digits' : count >= 10 ? 'two-digits' : '';

    return `<div class="category-card card-${cat.id}" onclick="showCategory('${cat.id}')">
      <div>
        <div class="card-label">${cat.label}</div>
        <div class="card-sublabel">${preview}</div>
      </div>
      <div class="card-count ${countCls}">${count}</div>
    </div>`;
  }).join('');

  // Today strip
  const overdue  = overdueItems();
  const today    = todayItems();
  const upcoming = upcomingItems(3).filter(x => x.date !== new Date().toISOString().split('T')[0]);
  const strip    = [...overdue, ...today, ...upcoming].slice(0, 10);
  const el       = document.getElementById('today-strip');

  if (!strip.length) { el.innerHTML = ''; return; }

  el.innerHTML = `<div class="today-strip-title">Snart &amp; förfallet</div>`
    + strip.map(item => {
      const cat  = getCat(item.category);
      const info = formatDate(item.date);
      return `<div class="today-item" onclick="openDetail('${item.id}')">
        <div class="today-dot" style="background:${cat.color}"></div>
        <div class="today-item-text">${item.text}</div>
        <div class="today-item-meta ${info ? info.cls : ''}">${info ? info.text : ''}</div>
      </div>`;
    }).join('');
}

// ============================================================
// RENDER: CATEGORY VIEW
// ============================================================
function renderCategoryView(catId) {
  const cat = getCat(catId);
  const header = document.getElementById('category-header');

  header.style.background = `var(--cat-${catId})`;
  header.style.color = cat.text.includes('light') ? 'var(--text-light)' : 'var(--text-dark)';

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

  if (overdue.length) {
    html += section('Förfallna', overdue);
  }
  if (upcoming.length) {
    html += section('Kommande 7 dagar', upcoming);
  }
  if (added.length) {
    html += section('Tillagt idag', added);
  }

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
    <div class="today-dot" style="background:${cat.color};margin-top:4px;flex-shrink:0"></div>
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

function openModal(catId = null, editId = null) {
  EDITING_ID = editId;
  STATE.selectedCategoryForAdd = catId;

  const txtEl  = document.getElementById('item-text');
  const dateEl = document.getElementById('item-date');
  const remEl  = document.getElementById('item-reminder');

  if (editId) {
    const item = DATA.items.find(x => x.id === editId);
    if (item) {
      txtEl.value  = item.text;
      dateEl.value = item.date || '';
      remEl.value  = item.reminder ? item.reminder.slice(0, 16) : '';
      STATE.selectedCategoryForAdd = item.category;
      document.getElementById('modal-title').textContent = 'Redigera';
      showSuggestion(item.category);
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
  document.getElementById('category-chips').innerHTML = CATEGORIES.map(cat =>
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
  if (detected && !dateEl.value) dateEl.value = detected;
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
  badge.textContent    = cat.label;
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
    renderDashboard();
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
  if (e.key === 'n' && !inField && !addOpen) openModal();
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
