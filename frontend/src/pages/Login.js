import { api } from '../utils/api.js';
import { state } from '../utils/state.js';

export default function Login() {
  let activeTab = 'staff'; // 'staff' | 'member'
  let isRegisterMode = false;
  let errorMessage = '';
  let successMessage = '';

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^09\d{8}$/.test(phone);
  }

  function validatePassword(password) {
    // Length >= 8, must contain uppercase, lowercase, and numbers
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  }

  return {
    render() {
      return `
        <div class="flex items-center justify-center min-h-[80vh] px-4 font-inter">
          <div class="erp-glass-card w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
            <!-- Glow background effect -->
            <div class="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>
            
            <h2 class="font-outfit text-3xl font-bold text-center tracking-tight bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent mb-6">
              進銷存與權限管理系統
            </h2>
            
            <!-- Auth Selection Tabs -->
            <div class="flex border-b border-zinc-800 mb-6">
              <button id="tab-staff" class="flex-1 pb-3 text-sm font-medium border-b-2 text-center transition-colors focus:outline-none ${activeTab === 'staff' ? 'border-teal-500 text-teal-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}">
                後台員工登入
              </button>
              <button id="tab-member" class="flex-1 pb-3 text-sm font-medium border-b-2 text-center transition-colors focus:outline-none ${activeTab === 'member' ? 'border-teal-500 text-teal-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}">
                前台會員門戶
              </button>
            </div>
            
            <!-- Error / Success Alert -->
            ${errorMessage ? `
              <div class="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-400 text-center font-medium">
                ${errorMessage}
              </div>
            ` : ''}
            ${successMessage ? `
              <div class="mb-4 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 text-center font-medium">
                ${successMessage}
              </div>
            ` : ''}
            
            <!-- Authentication Form -->
            <form id="auth-form" class="space-y-4" onsubmit="return false;">
              ${isRegisterMode && activeTab === 'member' ? `
                <!-- Registration Fields -->
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">真實姓名</label>
                  <input type="text" id="reg-name" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" placeholder="請輸入姓名" />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">手機號碼 (台灣格式)</label>
                  <input type="tel" id="reg-phone" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" placeholder="例如: 0912345678" />
                </div>
              ` : ''}
              
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  ${activeTab === 'staff' ? '帳號 (Username)' : '電子郵件 (Email)'}
                </label>
                <input type="${activeTab === 'staff' ? 'text' : 'email'}" id="auth-identity" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" placeholder="${activeTab === 'staff' ? '請輸入員工帳號' : '請輸入電子郵件'}" />
              </div>
              
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">密碼</label>
                <input type="password" id="auth-password" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" placeholder="請輸入密碼" />
              </div>
              
              <button type="submit" id="submit-btn" class="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-zinc-900 font-semibold text-sm rounded-lg py-2.5 shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all cursor-pointer">
                ${isRegisterMode && activeTab === 'member' ? '註冊會員' : '立即登入'}
              </button>
            </form>
            
            <!-- Toggle registration link for members -->
            ${activeTab === 'member' ? `
              <div class="mt-6 text-center text-xs text-zinc-500">
                ${isRegisterMode ? '已經有帳號？' : '還沒有會員帳號？'}
                <button id="toggle-mode-btn" class="text-teal-400 hover:underline font-medium focus:outline-none cursor-pointer">
                  ${isRegisterMode ? '點此登入' : '點此註冊'}
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    afterRender(renderPage) {
      // Tab switcher
      const tabStaff = document.getElementById('tab-staff');
      const tabMember = document.getElementById('tab-member');

      tabStaff?.addEventListener('click', () => {
        activeTab = 'staff';
        isRegisterMode = false;
        errorMessage = '';
        successMessage = '';
        renderPage();
      });

      tabMember?.addEventListener('click', () => {
        activeTab = 'member';
        isRegisterMode = false;
        errorMessage = '';
        successMessage = '';
        renderPage();
      });

      // Register Mode toggler
      const toggleModeBtn = document.getElementById('toggle-mode-btn');
      toggleModeBtn?.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        errorMessage = '';
        successMessage = '';
        renderPage();
      });

      // Form submit handler
      const form = document.getElementById('auth-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage = '';
        successMessage = '';

        const identity = document.getElementById('auth-identity').value.trim();
        const password = document.getElementById('auth-password').value;

        if (!identity || !password) {
          errorMessage = '請填寫所有必要欄位';
          renderPage();
          return;
        }

        try {
          if (activeTab === 'staff') {
            // Staff Login
            const res = await api.post('/auth/staff/login', { username: identity, password });
            localStorage.setItem('token', res.accessToken);
            state.setUser({
              id: res.user.user_id,
              type: 'STAFF',
              role: res.user.role,
              realName: res.user.real_name,
              username: res.user.username
            });
            state.setRoute('#/dashboard');
          } else {
            // Member Section
            if (isRegisterMode) {
              // Member Registration
              const realName = document.getElementById('reg-name').value.trim();
              const phone = document.getElementById('reg-phone').value.trim();

              if (!realName || !phone) {
                errorMessage = '請填寫所有欄位';
                renderPage();
                return;
              }
              if (!validateEmail(identity)) {
                errorMessage = '電子郵件格式無效';
                renderPage();
                return;
              }
              if (!validatePhone(phone)) {
                errorMessage = '手機號碼無效，需符合台灣格式 (例: 0912345678)';
                renderPage();
                return;
              }
              if (!validatePassword(password)) {
                errorMessage = '密碼過於脆弱，長度需至少 8 碼，並包含大寫、小寫字母與數字';
                renderPage();
                return;
              }

              await api.post('/auth/member/register', {
                email: identity,
                password,
                phone,
                real_name: realName
              });

              successMessage = '註冊成功！請使用新帳號登入';
              isRegisterMode = false;
              renderPage();
            } else {
              // Member Login
              if (!validateEmail(identity)) {
                errorMessage = '電子郵件格式無效';
                renderPage();
                return;
              }

              const res = await api.post('/auth/member/login', { email: identity, password });
              localStorage.setItem('token', res.accessToken);
              state.setUser({
                id: res.member.member_id,
                type: 'MEMBER',
                role: 'MEMBER',
                email: res.member.email,
                realName: res.member.real_name,
                tier: res.member.tier
              });
              state.setRoute('#/member-portal');
            }
          }
        } catch (err) {
          errorMessage = err.message || '登入失敗，請檢查您的憑證';
          renderPage();
        }
      });
    }
  };
}
