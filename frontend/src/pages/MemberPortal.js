import { api } from '../utils/api.js';
import { state } from '../utils/state.js';

export default function MemberPortal() {
  let orders = [];
  let memberProfile = null;

  async function loadData() {
    try {
      orders = await api.get('/member/my-orders');
      // Re-fetch current member details to get accurate tier/spent
      const members = await api.get('/auth/members');
      memberProfile = members.find(m => m.memberId === state.user.id);
      if (memberProfile) {
        state.setUser({
          ...state.user,
          tier: memberProfile.tier,
          totalSpent: memberProfile.totalSpent
        });
      }
    } catch (err) {
      console.error('Failed to load MemberPortal data:', err);
    }
  }

  function getTierColor(tier) {
    switch (tier) {
      case 'PLATINUM': return 'from-indigo-400 to-cyan-400 bg-clip-text text-transparent';
      case 'GOLD': return 'from-yellow-400 to-amber-500 bg-clip-text text-transparent';
      case 'SILVER': return 'from-zinc-300 to-zinc-400 bg-clip-text text-transparent';
      case 'BRONZE':
      default: return 'from-amber-700 to-orange-800 bg-clip-text text-transparent';
    }
  }

  return {
    async initData() {
      await loadData();
    },

    render() {
      const u = memberProfile || state.user;
      const spentVal = Number(u.totalSpent || 0);

      // Calculate progress to next tier
      let nextTier = 'MAX';
      let nextThreshold = 0;
      let progressPct = 100;

      if (spentVal < 10000) {
        nextTier = 'SILVER (白銀會員)';
        nextThreshold = 10000;
        progressPct = (spentVal / 10000) * 100;
      } else if (spentVal < 50000) {
        nextTier = 'GOLD (黃金會員)';
        nextThreshold = 50000;
        progressPct = ((spentVal - 10000) / 40000) * 100;
      } else if (spentVal < 100000) {
        nextTier = 'PLATINUM (白金會員)';
        nextThreshold = 100000;
        progressPct = ((spentVal - 50000) / 50000) * 100;
      }

      return `
        <div class="space-y-8 font-inter">
          <!-- Member Welcome Header -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 class="font-outfit text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                親愛的 ${u.realName || '會員'}，您好！
              </h1>
              <p class="text-sm text-zinc-400 mt-1">歡迎進入您的專屬會員中心，此處可查詢您的等級與歷史銷貨對帳單</p>
            </div>
            
            <button id="logout-btn" class="self-start md:self-auto border border-zinc-800 hover:border-red-500/30 hover:text-red-400 text-zinc-400 font-semibold text-xs rounded-lg px-4 py-2 transition-all cursor-pointer">
              安全登出
            </button>
          </div>

          <!-- Member Tier Status & Spent Card -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Left: Tier badge -->
            <div class="erp-glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-purple-500/5 blur-2xl pointer-events-none"></div>
              <span class="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">當前會員等級</span>
              <h2 class="font-outfit text-4xl font-extrabold bg-gradient-to-r ${getTierColor(u.tier)} tracking-wider mb-2">
                ${u.tier}
              </h2>
              <span class="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xxs font-semibold">
                專屬結帳折扣: ${(getMemberDiscountRate(u.tier) * 100).toFixed(0)}% OFF
              </span>
            </div>

            <!-- Middle: Spent & Progress -->
            <div class="erp-glass-card p-6 rounded-2xl md:col-span-2 space-y-6 flex flex-col justify-between">
              <div class="space-y-2">
                <span class="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">累計有效消費金額 (total_spent)</span>
                <span class="font-mono text-4xl font-extrabold text-teal-400 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  $${spentVal.toFixed(2)}
                </span>
              </div>
              
              <!-- Progress Bar -->
              ${nextTier !== 'MAX' ? `
                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between text-zinc-400">
                    <span>距離升級至 <strong class="text-teal-400">${nextTier}</strong></span>
                    <span>還需消費: <strong class="font-mono text-zinc-300">$${(nextThreshold - spentVal).toFixed(2)}</strong></span>
                  </div>
                  <div class="w-full bg-zinc-900 border border-zinc-800/50 rounded-full h-2 overflow-hidden">
                    <div class="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
                  </div>
                </div>
              ` : `
                <div class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  ★ 您已榮登尊貴的最高階白金會員，享有全站最優 85 折結帳折扣！
                </div>
              `}
            </div>
          </div>

          <!-- Historical Invoices List -->
          <div class="erp-glass-card rounded-2xl overflow-hidden">
            <div class="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 class="font-outfit text-base font-semibold text-zinc-200">歷史銷貨對帳單</h3>
              <span class="text-xs font-semibold px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                共 ${orders.length} 筆單據
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead>
                  <tr class="bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <th class="px-6 py-3.5">單據編號</th>
                    <th class="px-6 py-3.5">銷貨日期</th>
                    <th class="px-6 py-3.5 text-right">含稅應收總額 (AR)</th>
                    <th class="px-6 py-3.5 text-center">單據狀態</th>
                    <th class="px-6 py-3.5 text-center">詳細</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-900 text-zinc-300">
                  ${orders.length === 0 ? `
                    <tr>
                      <td colspan="5" class="px-6 py-12 text-center text-zinc-500 text-xs">
                        目前尚無您的銷貨單據歷史記錄。
                      </td>
                    </tr>
                  ` : orders.map(o => `
                    <tr class="hover:bg-zinc-900/10 transition-colors">
                      <td class="px-6 py-4 font-mono text-teal-400 text-xs">${o.orderId}</td>
                      <td class="px-6 py-4 text-xs text-zinc-400">${new Date(o.orderDate).toLocaleDateString()}</td>
                      <td class="px-6 py-4 text-right font-mono text-teal-400 font-semibold text-xs">
                        $${Number(o.totalAmount).toFixed(2)}
                      </td>
                      <td class="px-6 py-4 text-center">
                        <span class="px-2 py-0.5 text-xxs font-semibold rounded ${o.status === 'APPROVED' ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}">
                          ${o.status === 'APPROVED' ? '已核准出貨' : o.status}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-center text-zinc-500 text-xs">
                        僅限對帳
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    afterRender(_renderPage) {
      const logoutBtn = document.getElementById('logout-btn');
      logoutBtn?.addEventListener('click', () => {
        state.logout();
      });
    }
  };

  function getMemberDiscountRate(tier) {
    switch (tier) {
      case 'PLATINUM': return 0.15;
      case 'GOLD': return 0.10;
      case 'SILVER': return 0.05;
      case 'BRONZE':
      default: return 0.00;
    }
  }
}
