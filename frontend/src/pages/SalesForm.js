import { api } from '../utils/api.js';
import { state } from '../utils/state.js';

export default function SalesForm() {
  let members = [];
  let products = [];

  let selectedMemberId = '';
  let selectedMember = null;
  let orderDate = new Date().toISOString().split('T')[0];
  let items = [
    { productId: '', quantity: 1, unitPrice: 0.00, discountRate: 0.00, subtotal: 0.00 }
  ];

  let errorMessage = '';
  let successMessage = '';

  async function loadData() {
    try {
      members = await api.get('/auth/members');
      products = await api.get('/products');
    } catch (err) {
      console.error('Failed to load data for SalesForm:', err);
    }
  }

  function roundHalfUp(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function getMemberDiscount(tier) {
    switch (tier) {
      case 'PLATINUM': return 0.15;
      case 'GOLD': return 0.10;
      case 'SILVER': return 0.05;
      case 'BRONZE':
      default: return 0.00;
    }
  }

  function calculateRow(row) {
    const prod = products.find(p => p.productId === row.productId);
    if (!prod) {
      row.unitPrice = 0.00;
      row.discountRate = 0.00;
      row.subtotal = 0.00;
      return;
    }

    row.unitPrice = Number(prod.retailPrice);

    // Get member discount rate if selected
    if (selectedMember) {
      row.discountRate = getMemberDiscount(selectedMember.tier);
    } else {
      row.discountRate = 0.00;
    }

    const discountedPrice = row.unitPrice * (1.00 - row.discountRate);
    row.subtotal = roundHalfUp(Number(row.quantity) * discountedPrice);
  }

  function calculateTotals() {
    let totalAmount = 0.00;
    items.forEach(row => {
      calculateRow(row);
      totalAmount += row.subtotal;
    });

    totalAmount = roundHalfUp(totalAmount);
    const salesNet = roundHalfUp(totalAmount / 1.05);
    const salesTax = roundHalfUp(totalAmount - salesNet);

    return {
      totalAmount,
      salesNet,
      salesTax
    };
  }

  return {
    async initData() {
      await loadData();
      selectedMemberId = '';
      selectedMember = null;
      items = [
        { productId: '', quantity: 1, unitPrice: 0.00, discountRate: 0.00, subtotal: 0.00 }
      ];
      errorMessage = '';
      successMessage = '';
    },

    render() {
      const { totalAmount, salesNet, salesTax } = calculateTotals();

      return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 font-inter">
          <!-- Main Order Form (Col-span 2) -->
          <div class="lg:col-span-2 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="font-outfit text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  開立銷貨單據
                </h1>
                <p class="text-sm text-zinc-400 mt-1">建立 Master-Detail 銷貨草稿並關聯啟用客戶</p>
              </div>
            </div>

            <!-- Error / Success Alert -->
            ${errorMessage ? `
              <div class="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-400 text-center font-medium">
                ${errorMessage}
              </div>
            ` : ''}
            ${successMessage ? `
              <div class="p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 text-center font-medium">
                ${successMessage}
              </div>
            ` : ''}

            <!-- Master Info Panel -->
            <div class="erp-glass-card p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">選擇關聯會員 / 客戶</label>
                <select id="sales-member" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500">
                  <option value="">-- 請選擇歸戶會員 --</option>
                  ${members.map(m => `
                    <option value="${m.memberId}" ${selectedMemberId === m.memberId ? 'selected' : ''}>
                      [${m.tier}] ${m.realName} - ${m.email} (${m.memberId})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">銷貨單開立日期</label>
                <input type="date" id="sales-date" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" value="${orderDate}" />
              </div>
            </div>

            <!-- Detail Grid Table -->
            <div class="erp-glass-card rounded-2xl overflow-hidden">
              <div class="p-5 border-b border-zinc-800 flex items-center justify-between">
                <h3 class="font-outfit text-base font-semibold text-zinc-200">銷售商品明細行</h3>
                <button id="add-row-btn" class="bg-teal-950/40 hover:bg-teal-950/60 border border-teal-500/30 text-teal-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer">
                  + 新增商品明細行
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr class="bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                      <th class="px-5 py-3">選擇商品</th>
                      <th class="px-5 py-3 text-right">建議定價 (含稅)</th>
                      <th class="px-5 py-3 text-right">階級折扣</th>
                      <th class="px-5 py-3 text-center" style="width: 100px;">銷貨數量</th>
                      <th class="px-5 py-3 text-right">明細小計 (含稅)</th>
                      <th class="px-5 py-3 text-center" style="width: 80px;">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-900 text-zinc-300">
                    ${items.map((row, idx) => `
                      <tr class="hover:bg-zinc-900/10">
                        <td class="px-5 py-4">
                          <select data-row-idx="${idx}" data-field="productId" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500">
                            <option value="">-- 請選擇產品 --</option>
                            ${products.map(p => `
                              <option value="${p.productId}" ${row.productId === p.productId ? 'selected' : ''}>
                                ${p.productName} (${p.productId} - 庫存: ${p.stockQuantity} ${p.unit})
                              </option>
                            `).join('')}
                          </select>
                        </td>
                        <td class="px-5 py-4 text-right font-mono text-zinc-400 text-xs">
                          $${Number(row.unitPrice).toFixed(2)}
                        </td>
                        <td class="px-5 py-4 text-right">
                          <span class="font-mono text-xs ${row.discountRate > 0 ? 'text-emerald-400' : 'text-zinc-500'}">
                            -${(row.discountRate * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td class="px-5 py-4 text-center">
                          <input type="number" step="0.01" data-row-idx="${idx}" data-field="quantity" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1 text-center font-mono text-xs text-zinc-200 focus:outline-none focus:border-teal-500" value="${row.quantity}" />
                        </td>
                        <td class="px-5 py-4 text-right font-mono text-teal-400 font-semibold text-xs">
                          $${Number(row.subtotal).toFixed(2)}
                        </td>
                        <td class="px-5 py-4 text-center">
                          ${items.length > 1 ? `
                            <button data-remove-idx="${idx}" class="text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer">
                              刪除
                            </button>
                          ` : '<span class="text-zinc-600 text-xs font-medium">固定行</span>'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Invoicing Sidebar (Col-span 1) -->
          <div class="space-y-6">
            <div class="erp-glass-card p-6 rounded-2xl space-y-6 relative overflow-hidden">
              <!-- Glow back backdrop -->
              <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-teal-500/5 blur-2xl pointer-events-none"></div>

              <h3 class="font-outfit text-lg font-bold text-zinc-200 border-b border-zinc-800 pb-3">
                銷貨帳目拆分
              </h3>

              <div class="space-y-4 text-xs font-inter">
                <div class="flex items-center justify-between text-zinc-400">
                  <span>歸戶會員等級</span>
                  <span class="px-2.5 py-0.5 bg-purple-950/40 text-purple-400 border border-purple-500/20 rounded-full font-bold">
                    ${selectedMember ? selectedMember.tier : '未指定客戶'}
                  </span>
                </div>
                
                <div class="flex items-center justify-between text-zinc-400 pt-2 border-t border-zinc-900">
                  <span>未稅銷售淨額 (Sales Net)</span>
                  <span class="font-mono text-sm text-zinc-300 font-medium">$${salesNet.toFixed(2)}</span>
                </div>
                
                <div class="flex items-center justify-between text-zinc-400">
                  <span>銷項代收稅額 (Inclusive Tax 5%)</span>
                  <span class="font-mono text-sm text-zinc-400">$${salesTax.toFixed(2)}</span>
                </div>
                
                <div class="flex flex-col pt-4 border-t border-zinc-800 space-y-1">
                  <span class="text-zinc-500 font-semibold uppercase tracking-wider">應收含稅總額 (AR Total)</span>
                  <span class="font-mono text-3xl font-extrabold text-teal-400 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    $${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <button id="submit-order-btn" class="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-zinc-900 font-semibold text-sm rounded-lg py-2.5 shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all cursor-pointer">
                審核並核准銷貨 (扣減庫存)
              </button>
            </div>
          </div>
        </div>
      `;
    },

    afterRender(renderPage) {
      // 1. Member Selector change
      const memberSelect = document.getElementById('sales-member');
      memberSelect?.addEventListener('change', (e) => {
        selectedMemberId = e.target.value;
        selectedMember = members.find(m => m.memberId === selectedMemberId) || null;
        errorMessage = '';
        renderPage();
      });

      // 2. Date input change
      const dateInput = document.getElementById('sales-date');
      dateInput?.addEventListener('change', (e) => {
        orderDate = e.target.value;
      });

      // 3. Add Line Item Row
      const addRowBtn = document.getElementById('add-row-btn');
      addRowBtn?.addEventListener('click', () => {
        items.push({ productId: '', quantity: 1, unitPrice: 0.00, discountRate: 0.00, subtotal: 0.00 });
        errorMessage = '';
        renderPage();
      });

      // 4. Remove Line Item Row
      document.querySelectorAll('[data-remove-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-remove-idx'));
          items.splice(idx, 1);
          errorMessage = '';
          renderPage();
        });
      });

      // 5. Input fields change in grid (productId, quantity)
      document.querySelectorAll('[data-row-idx]').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(input.getAttribute('data-row-idx'));
          const field = input.getAttribute('data-field');
          const val = e.target.value;

          if (field === 'productId') {
            items[idx].productId = val;
          } else if (field === 'quantity') {
            items[idx].quantity = Number(val);
          }

          errorMessage = '';
          renderPage();
        });
      });

      // 6. Form Submission Trigger (Atomic Pessimistic Lock & Ledger Entry)
      const submitBtn = document.getElementById('submit-order-btn');
      submitBtn?.addEventListener('click', async () => {
        errorMessage = '';
        successMessage = '';

        if (!selectedMemberId) {
          errorMessage = '請指定有效的歸戶會員進行開立';
          renderPage();
          return;
        }

        const validItems = items.filter(i => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
          errorMessage = '請至少新增一筆有效的銷售商品品項';
          renderPage();
          return;
        }

        try {
          // A. Create Sales Order Draft
          const orderItems = validItems.map(i => ({
            product_id: i.productId,
            quantity: Number(i.quantity)
          }));

          const newOrder = await api.post('/sales-orders', {
            member_id: selectedMemberId,
            order_date: orderDate,
            items: orderItems,
            created_by: state.user.id
          });

          // B. Approve Sales Order (Performs Locking & Ledger)
          await api.post(`/sales-orders/${newOrder.orderId}/approve`, {
            approved_by: state.user.id
          });

          successMessage = `單據 ${newOrder.orderId} 已成功核准並扣減庫存，已記入會計日記帳！`;

          // Reset form state
          selectedMemberId = '';
          selectedMember = null;
          items = [
            { productId: '', quantity: 1, unitPrice: 0.00, discountRate: 0.00, subtotal: 0.00 }
          ];
          renderPage();
        } catch (err) {
          errorMessage = err.message || '銷售單核准出貨扣庫交易失敗';
          renderPage();
        }
      });
    }
  };
}
