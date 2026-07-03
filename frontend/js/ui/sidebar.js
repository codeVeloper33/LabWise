/* ============================================================
   LabWise — sidebar.js

   Single shared sidebar component. Include this script on every
   authenticated page. It reads the current URL to highlight the
   active item and reads Storage.getUser() for the user block.

   Usage (every authenticated page):
     <div class="sidebar" id="sidebar"></div>
     <div class="main-content">
       ... page content ...
     </div>
     <script src="../js/utils/storage.js"></script>
     <script src="../js/ui/sidebar.js"></script>
   ============================================================ */

const Sidebar = (() => {

  /* ── Menu definition ──────────────────────────────────────── */
  const MENU_ITEMS = [
    { icon: '🏠', label: 'Dashboard',         href: 'dashboard.html'        },
    { icon: '🧪', label: 'Experiments',       href: 'experiments.html'      },
    { icon: '➕', label: 'Create Experiment', href: 'create-experiment.html'},
    { icon: '📊', label: 'Results',           href: 'results.html'          },
    { icon: '👤', label: 'Account',           href: 'account.html'          },
    { icon: '⚙️', label: 'Settings',          href: 'settings.html'         },
    { icon: '⭐', label: 'Upgrade',           href: 'upgrade.html'          },
  ];

  /* ── Render ───────────────────────────────────────────────── */
  function render() {
    const container = document.getElementById('sidebar');
    if (!container) return;

    const currentPage = window.location.pathname.split('/').pop();

    /* Logo */
    let html = `
      <a href="dashboard.html" class="sidebar-logo">
        <span class="sidebar-logo-icon">⚗️</span>
        <span class="sidebar-logo-text">LabWise</span>
      </a>
      <nav class="sidebar-menu">
    `;

    /* Menu items */
    MENU_ITEMS.forEach(item => {
      const isActive = currentPage === item.href;
      html += `
        <a href="${item.href}"
           class="sidebar-item${isActive ? ' active' : ''}"
           ${isActive ? 'aria-current="page"' : ''}>
          <span class="sidebar-icon">${item.icon}</span>
          <span class="sidebar-label">${item.label}</span>
        </a>
      `;
    });

    html += `</nav>`;

    /* Footer: logout */
    html += `
      <div class="sidebar-footer">
        <a href="#" class="sidebar-item" id="sidebar-logout-btn">
          <span class="sidebar-icon">🚪</span>
          <span class="sidebar-label">Logout</span>
        </a>
      </div>
    `;

    container.innerHTML = html;

    /* Insert user block between menu and footer */
    _insertUserBlock(container);

    /* Logout handler */
    document.getElementById('sidebar-logout-btn')
      ?.addEventListener('click', e => {
        e.preventDefault();
        if (window.Storage) Storage.logout();
        window.location.href = 'login.html';
      });
  }

  /* ── User block ───────────────────────────────────────────── */
  function _insertUserBlock(container) {
    if (!window.Storage) return;
    const user = Storage.getUser();
    if (!user) return;

    const tier    = user.tier || 'free';
    const initial = (user.username || 'U').charAt(0).toUpperCase();
    const tierLabels = {
      free: 'Free', tier1: 'Tier 1', tier2: 'Tier 2', tier3: 'Tier 3'
    };
    const tierLabel = tierLabels[tier] || 'Free';

    const block = document.createElement('div');
    block.className = 'sidebar-user';
    block.innerHTML = `
      <div class="sidebar-user-avatar">${initial}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${user.username || 'Student'}</div>
        <span class="sidebar-user-tier tier-${tier}">${tierLabel}</span>
      </div>
    `;

    /* Insert just before the footer */
    const footer = container.querySelector('.sidebar-footer');
    if (footer) {
      container.insertBefore(block, footer);
    } else {
      container.appendChild(block);
    }
  }

  /* ── Update user block after login / tier change ─────────── */
  function refresh() {
    const existing = document.querySelector('.sidebar-user');
    if (existing) existing.remove();
    const container = document.getElementById('sidebar');
    if (container) _insertUserBlock(container);
  }

  /* Auto-render when DOM is ready */
  document.addEventListener('DOMContentLoaded', render);

  return { render, refresh };

})();
