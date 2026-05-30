// ── Config ──────────────────────────────────────────────────────────────────
const CONFIG_KEY = 'soc_wazuh_config';
const PAGE_SIZE  = 20;

let config    = loadConfig();
let token     = null;
let allAlerts = [];
let filtered  = [];
let currentPage = 1;

// ── DOM refs ────────────────────────────────────────────────────────────────
const configBtn      = document.getElementById('configBtn');
const configPanel    = document.getElementById('configPanel');
const cancelConfig   = document.getElementById('cancelConfig');
const saveConfig     = document.getElementById('saveConfig');
const emptyConfigBtn = document.getElementById('emptyConfigBtn');
const refreshBtn     = document.getElementById('refreshBtn');
const refreshIcon    = document.getElementById('refreshIcon');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const lastUpdated    = document.getElementById('lastUpdated');
const alertBody      = document.getElementById('alertTableBody');
const filterLevel    = document.getElementById('filterLevel');
const filterAgent    = document.getElementById('filterAgent');
const tableCount     = document.getElementById('tableCount');
const pagination     = document.getElementById('pagination');

const statTotal    = document.getElementById('statTotal');
const statCritical = document.getElementById('statCritical');
const statHigh     = document.getElementById('statHigh');
const statMedium   = document.getElementById('statMedium');
const statTotalSub = document.getElementById('statTotalSub');

// ── Config persistence ───────────────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; }
  catch { return {}; }
}

function saveConfigData(url, user, pass) {
  config = { url: url.replace(/\/$/, ''), user, pass };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ── Config panel ─────────────────────────────────────────────────────────────
function openConfig() {
  document.getElementById('wazuhUrl').value  = config.url  || '';
  document.getElementById('wazuhUser').value = config.user || '';
  document.getElementById('wazuhPass').value = config.pass || '';
  configPanel.style.display = 'block';
}

configBtn.addEventListener('click', openConfig);
if (emptyConfigBtn) emptyConfigBtn.addEventListener('click', openConfig);

cancelConfig.addEventListener('click', () => { configPanel.style.display = 'none'; });

saveConfig.addEventListener('click', async () => {
  const url  = document.getElementById('wazuhUrl').value.trim();
  const user = document.getElementById('wazuhUser').value.trim();
  const pass = document.getElementById('wazuhPass').value;
  if (!url || !user || !pass) { alert('Please fill in all fields.'); return; }
  saveConfigData(url, user, pass);
  configPanel.style.display = 'none';
  token = null;
  await fetchData();
});

// ── Status ───────────────────────────────────────────────────────────────────
function setStatus(state) {
  statusDot.className = 'status-dot ' + (state === 'connected' ? 'connected' : state === 'error' ? 'error' : '');
  statusText.textContent = state === 'connected' ? 'Connected' : state === 'error' ? 'Error' : 'Disconnected';
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function authenticate() {
  if (!config.url || !config.user || !config.pass) return null;
  try {
    const res = await fetch(`${config.url}/security/user/authenticate`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${config.user}:${config.pass}`)
      }
    });
    if (!res.ok) throw new Error('Auth failed');
    const data = await res.json();
    return data?.data?.token || null;
  } catch (e) {
    console.error('Auth error:', e);
    return null;
  }
}

// ── Fetch alerts ──────────────────────────────────────────────────────────────
async function fetchData() {
  if (!config.url) return;

  // Spin the refresh button
  refreshBtn.classList.add('spinning');

  try {
    if (!token) {
      token = await authenticate();
      if (!token) { setStatus('error'); refreshBtn.classList.remove('spinning'); return; }
    }

    // Fetch alerts from last 24h, up to 500
    const since = new Date(Date.now() - 86400000).toISOString();
    const url = `${config.url}/alerts?limit=500&sort=-timestamp&q=timestamp>${since}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      // Token expired, re-auth once
      token = await authenticate();
      if (!token) { setStatus('error'); refreshBtn.classList.remove('spinning'); return; }
      return fetchData();
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    allAlerts = (data?.data?.affected_items || []).map(normalizeAlert);

    setStatus('connected');
    lastUpdated.textContent = 'Updated ' + new Date().toLocaleTimeString();
    updateStats();
    populateAgentFilter();
    applyFilters();

  } catch (e) {
    console.error('Fetch error:', e);
    setStatus('error');
    token = null;
  }

  refreshBtn.classList.remove('spinning');
}

// ── Normalize Wazuh alert ─────────────────────────────────────────────────────
function normalizeAlert(a) {
  return {
    timestamp: a.timestamp || '',
    level:     parseInt(a.rule?.level || 0),
    agent:     a.agent?.name || a.agent?.id || 'unknown',
    ruleId:    a.rule?.id    || '—',
    desc:      a.rule?.description || '—',
  };
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const critical = allAlerts.filter(a => a.level >= 12).length;
  const high     = allAlerts.filter(a => a.level >= 9 && a.level <= 11).length;
  const medium   = allAlerts.filter(a => a.level >= 4 && a.level <= 8).length;

  statTotal.textContent    = allAlerts.length;
  statCritical.textContent = critical;
  statHigh.textContent     = high;
  statMedium.textContent   = medium;
  statTotalSub.textContent = 'Last 24 hours';
}

// ── Agent filter population ───────────────────────────────────────────────────
function populateAgentFilter() {
  const agents = [...new Set(allAlerts.map(a => a.agent))].sort();
  const current = filterAgent.value;
  filterAgent.innerHTML = '<option value="">All agents</option>';
  agents.forEach(ag => {
    const opt = document.createElement('option');
    opt.value = ag;
    opt.textContent = ag;
    if (ag === current) opt.selected = true;
    filterAgent.appendChild(opt);
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  const lvl   = filterLevel.value;
  const agent = filterAgent.value;

  filtered = allAlerts.filter(a => {
    if (agent && a.agent !== agent) return false;
    if (lvl === 'critical' && !(a.level >= 12)) return false;
    if (lvl === 'high'     && !(a.level >= 9 && a.level <= 11)) return false;
    if (lvl === 'medium'   && !(a.level >= 4 && a.level <= 8)) return false;
    if (lvl === 'low'      && !(a.level >= 1 && a.level <= 3)) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

filterLevel.addEventListener('change', applyFilters);
filterAgent.addEventListener('change', applyFilters);

// ── Table render ──────────────────────────────────────────────────────────────
function levelBadge(level) {
  if (level >= 12) return `<span class="badge badge--critical">● ${level} Critical</span>`;
  if (level >= 9)  return `<span class="badge badge--high">● ${level} High</span>`;
  if (level >= 4)  return `<span class="badge badge--medium">● ${level} Medium</span>`;
  return `<span class="badge badge--low">● ${level} Low</span>`;
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function renderTable() {
  if (filtered.length === 0 && allAlerts.length === 0) {
    alertBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <p>Configure your Wazuh API to start seeing live alerts</p>
            <button class="btn-primary small" onclick="openConfig()">Configure now</button>
          </div>
        </td>
      </tr>`;
    tableCount.textContent = '0 alerts';
    pagination.innerHTML = '';
    return;
  }

  if (filtered.length === 0) {
    alertBody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state"><p>No alerts match the current filters</p></div></td></tr>`;
    tableCount.textContent = '0 alerts';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);

  alertBody.innerHTML = page.map(a => `
    <tr>
      <td class="time">${formatTime(a.timestamp)}</td>
      <td>${levelBadge(a.level)}</td>
      <td class="agent">${escHtml(a.agent)}</td>
      <td class="rule">${escHtml(a.ruleId)}</td>
      <td class="desc">${escHtml(a.desc)}</td>
    </tr>
  `).join('');

  tableCount.textContent = `${filtered.length} alert${filtered.length !== 1 ? 's' : ''}`;
  renderPagination(totalPages);
}

function renderPagination(total) {
  if (total <= 1) { pagination.innerHTML = ''; return; }

  let html = '';
  // Prev
  html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  // Pages (show max 5 around current)
  const start = Math.max(1, currentPage - 2);
  const end   = Math.min(total, currentPage + 2);
  if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>${start > 2 ? '<span style="padding:0 4px;color:var(--text-3)">…</span>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < total) html += `${end < total - 1 ? '<span style="padding:0 4px;color:var(--text-3)">…</span>' : ''}<button class="page-btn" onclick="goPage(${total})">${total}</button>`;
  // Next
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>›</button>`;
  pagination.innerHTML = html;
}

function goPage(p) {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  if (p < 1 || p > total) return;
  currentPage = p;
  renderTable();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Refresh button ────────────────────────────────────────────────────────────
refreshBtn.addEventListener('click', fetchData);

// ── Auto-refresh every 60s ────────────────────────────────────────────────────
setInterval(fetchData, 60000);

// ── Init ──────────────────────────────────────────────────────────────────────
if (config.url) {
  fetchData();
} else {
  setStatus('disconnected');
}
