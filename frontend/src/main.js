import './style.css';
import { state } from './utils/state.js';

// Import Pages
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import SalesForm from './pages/SalesForm.js';
import ReturnsForm from './pages/ReturnsForm.js';
import AuditLogs from './pages/AuditLogs.js';
import MemberPortal from './pages/MemberPortal.js';

const routes = {
  '#/login': Login,
  '#/dashboard': Dashboard,
  '#/sales-form': SalesForm,
  '#/returns-form': ReturnsForm,
  '#/audit-logs': AuditLogs,
  '#/member-portal': MemberPortal,
};

let currentPageInstance = null;

async function renderPage() {
  const hash = window.location.hash || '#/login';
  const appContainer = document.getElementById('app');

  // Guard authentication
  const token = localStorage.getItem('token');
  if (!token && hash !== '#/login') {
    state.setRoute('#/login');
    return;
  }

  if (token && hash === '#/login') {
    if (state.user?.type === 'MEMBER') {
      state.setRoute('#/member-portal');
    } else {
      state.setRoute('#/dashboard');
    }
    return;
  }

  // Load component
  const PageComponent = routes[hash] || Login;
  currentPageInstance = PageComponent();

  // Initialize data if component provides initData()
  if (currentPageInstance.initData) {
    try {
      appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-[60vh]">
          <div class="text-teal-400 font-medium text-sm animate-pulse flex items-center gap-2">
            <svg class="animate-spin h-5 w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            數據加載中，請稍候...
          </div>
        </div>
      `;
      await currentPageInstance.initData();
    } catch (e) {
      console.error('Failed to initialize page data:', e);
    }
  }

  // Render Layout Wrapper (Staff Layout vs Anonymous/Member Layout)
  const isStaffRoute = state.user?.type === 'STAFF' && hash !== '#/login';

  if (isStaffRoute) {
    const role = state.user?.role || 'STAFF';

    appContainer.innerHTML = `
      <div class="flex min-h-screen text-zinc-200">
        <!-- Sidebar Panel -->
        <aside class="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between p-6">
          <div class="space-y-8">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-zinc-900 font-bold text-lg font-outfit">
                E
              </div>
              <span class="font-outfit text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                ERP System
              </span>
            </div>
            
            <nav class="space-y-1.5 text-sm font-inter">
              <button data-nav="#/dashboard" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors font-medium focus:outline-none ${hash === '#/dashboard' ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}">
                📊 商品與庫存看板
              </button>
              
              <button data-nav="#/sales-form" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors font-medium focus:outline-none ${hash === '#/sales-form' ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}">
                📝 開立銷貨單據
              </button>
              
              <button data-nav="#/returns-form" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors font-medium focus:outline-none ${hash === '#/returns-form' ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}">
                🔄 銷貨退貨管理
              </button>
              
              ${role === 'ADMIN' || role === 'ACCT' ? `
                <button data-nav="#/audit-logs" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors font-medium focus:outline-none ${hash === '#/audit-logs' ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}">
                  🕵️ 稽核審計日誌
                </button>
              ` : ''}
            </nav>
          </div>
          
          <!-- Bottom Staff Account Profile Info -->
          <div class="border-t border-zinc-900 pt-4 space-y-4">
            <div class="space-y-1 text-xs">
              <div class="font-bold text-zinc-300 font-outfit">${state.user?.realName}</div>
              <div class="text-zinc-500 flex items-center justify-between">
                <span>帳號: ${state.user?.username}</span>
                <span class="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-teal-400 rounded-full font-bold uppercase scale-90 origin-right">${role}</span>
              </div>
            </div>
            <button id="sidebar-logout-btn" class="w-full border border-zinc-800 hover:border-red-500/20 hover:text-red-400 text-zinc-400 font-semibold text-xs rounded-lg py-2 transition-colors active:scale-[0.98] cursor-pointer">
              安全退登
            </button>
          </div>
        </aside>
        
        <!-- Main Content Area -->
        <main class="flex-1 p-8 overflow-y-auto max-h-screen">
          <div id="page-content" class="max-w-6xl mx-auto"></div>
        </main>
      </div>
    `;

    // Inject page content into inner container
    document.getElementById('page-content').innerHTML = currentPageInstance.render();
  } else {
    // Member or Login layout
    appContainer.innerHTML = `
      <div class="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
        <div id="page-content"></div>
      </div>
    `;
    document.getElementById('page-content').innerHTML = currentPageInstance.render();
  }

  // Bind inner page event listeners
  currentPageInstance.afterRender(renderPage);

  // Bind sidebar nav links
  if (isStaffRoute) {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dest = btn.getAttribute('data-nav');
        state.setRoute(dest);
      });
    });

    document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
      state.logout();
    });
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  state.init();

  window.addEventListener('hashchange', renderPage);

  state.on('user', renderPage);
  state.on('route', renderPage);

  // Default route handler
  if (!window.location.hash || window.location.hash === '#/') {
    state.setRoute('#/login');
  } else {
    renderPage();
  }
});
