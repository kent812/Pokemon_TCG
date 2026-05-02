// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
const API_KEY = 'b66c9324-40e6-4f99-a8bf-b2c65fd8e3a3';
const API_URL = 'https://api.pokemontcg.io/v2/cards';
const PER_PAGE = 12;

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let currentUser  = JSON.parse(localStorage.getItem('ptcg_user'))  || null;
let collection   = JSON.parse(localStorage.getItem('ptcg_coll'))  || {};
let allCards     = [];
let filtered     = [];
let page         = 1;
let showCollOnly = false;

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b,i) =>
    b.classList.toggle('active', (i===0 && tab==='login') || (i===1 && tab==='signup'))
  );
  document.getElementById('loginPanel').classList.toggle('active', tab==='login');
  document.getElementById('signupPanel').classList.toggle('active', tab==='signup');
  clearMsg('loginMsg'); clearMsg('signupMsg');
}

function doLogin() {
  const email = v('loginEmail').trim();
  const pass  = v('loginPassword');
  clearMsg('loginMsg');

  if (!email || !pass) return showMsg('loginMsg', 'Please fill in all fields.', 'error');
  if (!validEmail(email)) return showMsg('loginMsg', 'Enter a valid email address.', 'error');

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === pass);

  if (!user) return showMsg('loginMsg', 'Incorrect email or password.', 'error');

  loginSuccess(user);
}

function doSignup() {
  const name  = v('signupName').trim();
  const email = v('signupEmail').trim();
  const pass  = v('signupPassword');
  const conf  = v('signupConfirm');
  const terms = document.getElementById('termsBox').checked;
  clearMsg('signupMsg');

  if (!name || !email || !pass || !conf) return showMsg('signupMsg', 'Please fill in all fields.', 'error');
  if (!validEmail(email))                return showMsg('signupMsg', 'Enter a valid email address.', 'error');
  if (pass.length < 6)                   return showMsg('signupMsg', 'Password must be at least 6 characters.', 'error');
  if (pass !== conf)                     return showMsg('signupMsg', 'Passwords do not match.', 'error');
  if (!terms)                            return showMsg('signupMsg', 'Please accept the terms and conditions.', 'error');

  const users = getUsers();
  if (users.find(u => u.email === email)) return showMsg('signupMsg', 'An account with that email already exists.', 'error');

  const newUser = {
    id: Date.now().toString(36),
    name, email, password: pass,
    createdAt: new Date().toISOString(),
    logins: 1,
    lastLogin: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);

  showMsg('signupMsg', 'Account created! Logging you in…', 'success');
  setTimeout(() => loginSuccess(newUser), 900);
}

function loginSuccess(user) {
  // Update login record
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].logins    = (users[idx].logins || 0) + 1;
    users[idx].lastLogin = new Date().toISOString();
    saveUsers(users);
    user = users[idx];
  }

  currentUser = user;
  localStorage.setItem('ptcg_user', JSON.stringify(user));

  // Show app
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display    = 'block';

  // Fill nav
  document.getElementById('navAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('navName').textContent   = user.name;

  // Go home and load cards
  goPage('home');
  loadCards();
  toast(`Welcome back, ${user.name}! 👋`, 'success');
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('ptcg_user');
  document.getElementById('mainApp').style.display    = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  allCards = []; filtered = [];
  toast('Logged out.', 'info');
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  if (id === 'profile') fillProfile();
}

// ═══════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════
async function loadCards(query='') {
  showSkeletons();
  try {
    const url = query
      ? `${API_URL}?q=name:${encodeURIComponent(query)}*&pageSize=100`
      : `${API_URL}?pageSize=100`;

    const res  = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      document.getElementById('cardsGrid').innerHTML =
        `<p style="color:var(--gold);grid-column:1/-1;text-align:center;padding:40px;font-size:1.1rem">No cards found. Try another search!</p>`;
      updateStats([]);
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    allCards = data.data.map(c => ({
      ...c,
      powerScore:     calcPower(c),
      estimatedValue: calcValue(c)
    }));

    applyFilters();
  } catch(e) {
    document.getElementById('cardsGrid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red)">
        <div style="font-size:2rem;margin-bottom:10px">⚠️</div>
        <div style="font-weight:700;margin-bottom:8px">Could not load cards</div>
        <div style="color:var(--muted);font-size:.9rem">${e.message}</div>
      </div>`;
  }
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  loadCards(q);
}

function applyFilters() {
  const type   = document.getElementById('typeFilter').value;
  const rarity = document.getElementById('rarityFilter').value;
  const sort   = document.getElementById('sortFilter').value;

  filtered = allCards.filter(c => {
    if (type   && !(c.types && c.types.includes(type)))  return false;
    if (rarity && c.rarity !== rarity)                    return false;
    if (showCollOnly && !collection[c.id])                return false;
    return true;
  });

  filtered.sort((a,b) => {
    if (sort==='power') return b.powerScore - a.powerScore;
    if (sort==='value') return b.estimatedValue - a.estimatedValue;
    if (sort==='hp')    return (parseInt(b.hp)||0) - (parseInt(a.hp)||0);
    return a.name.localeCompare(b.name);
  });

  page = 1;
  renderCards();
  updateStats(filtered);
}

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  const start = (page-1)*PER_PAGE;
  const slice = filtered.slice(start, start+PER_PAGE);

  if (slice.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--gold);padding:40px">No cards match your filters.</p>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = slice.map(c => {
    const inColl = collection[c.id];
    return `
      <div class="card-item${inColl?' collected':''}" onclick="openCard('${c.id}')">
        ${inColl ? '<div class="coll-badge">✓</div>' : ''}
        ${c.rarity ? `<div class="card-rarity">${c.rarity}</div>` : ''}
        <img src="${c.images.small}" alt="${c.name}" loading="lazy">
        <div class="card-name">${c.name}</div>
        <div class="card-stats-row">
          <span class="tag tag-gold">PWR ${c.powerScore}</span>
          <span class="tag tag-blue">$${c.estimatedValue.toFixed(2)}</span>
        </div>
      </div>`;
  }).join('');

  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (total <= 1) { document.getElementById('pagination').innerHTML=''; return; }

  let html = `<button class="page-btn" onclick="goPage2(1)" ${page===1?'disabled':''}>«</button>
              <button class="page-btn" onclick="goPage2(${page-1})" ${page===1?'disabled':''}>‹</button>
              <span class="page-info">Page ${page} of ${total}</span>
              <button class="page-btn" onclick="goPage2(${page+1})" ${page===total?'disabled':''}>›</button>
              <button class="page-btn" onclick="goPage2(${total})" ${page===total?'disabled':''}>»</button>`;
  document.getElementById('pagination').innerHTML = html;
}

function goPage2(n) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (n<1||n>total) return;
  page = n;
  renderCards();
  document.getElementById('page-home').scrollTo(0,0);
  window.scrollTo(0,0);
}

function showSkeletons() {
  document.getElementById('cardsGrid').innerHTML =
    Array(PER_PAGE).fill(`
      <div class="skeleton-card">
        <div class="skel" style="height:165px;margin-bottom:10px"></div>
        <div class="skel" style="height:16px;width:70%;margin:0 auto 8px"></div>
        <div class="skel" style="height:12px"></div>
      </div>`).join('');
  document.getElementById('pagination').innerHTML = '';
}

function updateStats(cards) {
  document.getElementById('statTotal').textContent = cards.length;
  document.getElementById('statCollected').textContent = Object.keys(collection).length;

  if (cards.length === 0) {
    document.getElementById('statPower').textContent    = 0;
    document.getElementById('statStrongest').textContent = '–';
    return;
  }

  const avg     = Math.round(cards.reduce((s,c)=>s+c.powerScore,0)/cards.length);
  const strongest = cards.reduce((m,c)=>c.powerScore>m.powerScore?c:m);
  document.getElementById('statPower').textContent    = avg;
  document.getElementById('statStrongest').textContent = strongest.name;
}

function toggleCollection() {
  showCollOnly = !showCollOnly;
  document.getElementById('collToggle').classList.toggle('on', showCollOnly);
  applyFilters();
}

// ═══════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════
function openCard(id) {
  const c = allCards.find(x=>x.id===id);
  if (!c) return;

  const inColl = collection[id];
  const pct    = Math.min(100, (c.powerScore/200)*100);

  let attacks = '';
  if (c.attacks && c.attacks.length) {
    attacks = `<div class="attacks-section">
      <div class="info-label" style="margin-bottom:10px">Attacks</div>
      ${c.attacks.map(a=>`
        <div class="attack-item">
          <div class="attack-name">${a.name}</div>
          ${a.text?`<div style="color:var(--muted);font-size:.85rem;margin:4px 0">${a.text}</div>`:''}
          ${a.damage?`<div class="attack-dmg">${a.damage} dmg</div>`:''}
        </div>`).join('')}
    </div>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-grid">
      <div class="modal-img">
        <img src="${c.images.large}" alt="${c.name}">
      </div>
      <div class="modal-info">
        <div class="modal-title">${c.name}</div>
        <div class="power-bar-wrap">
          <span class="info-label">Power</span>
          <span class="info-val" style="min-width:40px">${c.powerScore}</span>
          <div class="power-bar"><div class="power-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="info-row"><span class="info-label">Type</span><span class="info-val">${c.types?c.types.join(', '):'–'}</span></div>
        <div class="info-row"><span class="info-label">HP</span><span class="info-val">${c.hp||'–'}</span></div>
        <div class="info-row"><span class="info-label">Rarity</span><span class="info-val">${c.rarity||'–'}</span></div>
        <div class="info-row"><span class="info-label">Est. Value</span><span class="info-val">$${c.estimatedValue.toFixed(2)}</span></div>
        ${c.set?`<div class="info-row"><span class="info-label">Set</span><span class="info-val">${c.set.name}</span></div>`:''}
        ${attacks}
        <div class="modal-actions">
          <button class="action-btn btn-green" id="addBtn"
            onclick="addToCollection('${id}')"
            ${inColl?'disabled style="opacity:.5;cursor:not-allowed"':''}>
            ${inColl?'✓ In Collection':'+ Add to Collection'}
          </button>
          ${inColl?`<button class="action-btn btn-red" onclick="removeFromCollection('${id}')">Remove</button>`:''}
        </div>
      </div>
    </div>`;

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay') || e.currentTarget?.classList.contains('modal-close')) {
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

function addToCollection(id) {
  collection[id] = true;
  localStorage.setItem('ptcg_coll', JSON.stringify(collection));
  document.getElementById('modalOverlay').classList.remove('open');
  renderCards();
  updateStats(filtered);
  toast('Card added to collection ✓', 'success');
}

function removeFromCollection(id) {
  delete collection[id];
  localStorage.setItem('ptcg_coll', JSON.stringify(collection));
  document.getElementById('modalOverlay').classList.remove('open');
  renderCards();
  updateStats(filtered);
  toast('Card removed from collection', 'info');
}

// ═══════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════
function fillProfile() {
  if (!currentUser) return;
  const u = getUsers().find(x=>x.id===currentUser.id) || currentUser;

  document.getElementById('profileAvatar').textContent = u.name.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent   = u.name;
  document.getElementById('profileEmail').textContent  = u.email;
  document.getElementById('pSince').textContent  = fmtDate(u.createdAt);
  document.getElementById('pLogins').textContent = u.logins || 1;
  document.getElementById('pLast').textContent   = fmtDateTime(u.lastLogin || u.createdAt);

  const collCards = allCards.filter(c=>collection[c.id]);
  document.getElementById('pCards').textContent = collCards.length;
  document.getElementById('pValue').textContent = '$' + collCards.reduce((s,c)=>s+c.estimatedValue,0).toFixed(2);
  document.getElementById('pPower').textContent = collCards.length
    ? Math.round(collCards.reduce((s,c)=>s+c.powerScore,0)/collCards.length)
    : 0;
}

// ═══════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════
function sendContact() {
  const name    = v('cName').trim();
  const email   = v('cEmail').trim();
  const subject = v('cSubject').trim();
  const message = v('cMessage').trim();
  if (!name||!email||!subject||!message) return toast('Please fill in all fields.', 'warning');
  if (!validEmail(email)) return toast('Enter a valid email address.', 'warning');
  ['cName','cEmail','cSubject','cMessage'].forEach(id=>document.getElementById(id).value='');
  toast('Message sent! We\'ll get back to you soon. 📬', 'success');
}

// ═══════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════
function calcPower(c) {
  let s = (parseInt(c.hp)||0) * 0.5;
  (c.attacks||[]).forEach(a => { s += (parseInt(a.damage)||0)*2; });
  const rm = {'Common':1,'Uncommon':1.2,'Rare':1.5,'Rare Holo':2,'Rare Holo EX':3,'Rare Ultra':4};
  if (rm[c.rarity]) s *= rm[c.rarity];
  return Math.round(s);
}

function calcValue(c) {
  const rv = {'Common':.10,'Uncommon':.25,'Rare':1,'Rare Holo':3,'Rare Holo EX':10,'Rare Ultra':25};
  let val = rv[c.rarity] || 0.05;
  val += calcPower(c)*0.05;
  if (/EX|GX|VMAX|VSTAR|\bV\b/.test(c.name)) val *= 2;
  return Math.round(val*100)/100;
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function toast(msg, type='info') {
  const icons = {success:'✓',error:'✕',warning:'⚠',info:'ℹ'};
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span class="toast-msg">${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(110%)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 3500);
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function v(id) { return document.getElementById(id)?.value || ''; }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getUsers()  { return JSON.parse(localStorage.getItem('ptcg_users'))||[]; }
function saveUsers(u){ localStorage.setItem('ptcg_users', JSON.stringify(u)); }
function showMsg(id, txt, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = txt;
  el.className   = `msg show ${type}`;
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) { el.className='msg'; el.textContent=''; }
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// ═══════════════════════════════════════════
// INIT — auto-login if session exists
// ═══════════════════════════════════════════
(function init() {
  if (currentUser) {
    loginSuccess(currentUser);
  }
  // Enter key support
  document.getElementById('loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('loginEmail').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('signupConfirm').addEventListener('keydown', e => { if(e.key==='Enter') doSignup(); });
  // Escape to close modal
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal({}); });
})();