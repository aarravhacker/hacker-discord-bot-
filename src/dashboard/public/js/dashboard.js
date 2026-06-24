/* ─── Dashboard Shared JS ─────────────────────────── */

// Toast notifications
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Tab switching (only set if not already defined by a page)
if (typeof window.switchTab !== 'function') {
  function switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes(`'${tabId}'`)) {
        t.classList.add('active');
      }
    });
  }
}

// Modal management
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => { m.classList.remove('active'); });
    document.body.style.overflow = '';
  }
});

// Search/filter
function filterList(listId, query) {
  const items = document.querySelectorAll(`#${listId} .list-item, #${listId} .guild-card`);
  const q = query.toLowerCase();
  items.forEach(item => {
    const name = (item.dataset.name || item.textContent || '').toLowerCase();
    item.style.display = name.includes(q) ? '' : 'none';
  });
}

// Fetch with error handling
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, { credentials: 'include', ...options });
    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        showToast('Session expired. Please refresh.', 'error');
        return null;
      }
    }
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    showToast('Request failed', 'error');
    return null;
  }
}

// Format uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Format number
function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// Debounce
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// Relative time
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
