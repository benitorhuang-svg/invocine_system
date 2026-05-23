import { api } from '../utils/api.js';
import { state } from '../utils/state.js';

export default function ReturnsForm() {
  let searchOrderId = '';
  let originalOrder = null;
  let returnDate = new Date().toISOString().split('T')[0];
  let returnItems = []; // { productId, productName, originalQty, unitPrice, returnQty, isRestocked }

  let errorMessage = '';
  let successMessage = '';

  async function searchOrder() {
    errorMessage = '';
    successMessage = '';
    originalOrder = null;
    returnItems = [];

    if (!searchOrderId.trim()) {
      errorMessage = '請輸入銷貨訂單編號';
      return;
    }

    try {
      const order = await api.get(`/sales-orders/${searchOrderId.trim()}`);
      if (order.status !== 'APPROVED') {
        errorMessage = '該單據尚未核准，非 APPROVED 狀態無法開立退貨';
        return;
      }

      originalOrder = order;

      // Load products to show details
      const products = await api.get('/products');

      // Calculate remaining allocatable return quantities
      returnItems = order.salesOrderDetails.map(d => {
        const prod = products.find(p => p.productId === d.productId);
        return {
          productId: d.productId,
          productName: prod ? prod.productName : d.productId,
          originalQty: Number(d.quantity),
          unitPrice: Number(d.unitPrice),
          returnQty: 0,
          isRestocked: true // Default: 良品回庫
        };
      });
    } catch (err) {
      errorMessage = err.message || '找不到指定的銷貨訂單，請確認單號是否正確';
    }
  }

  function roundHalfUp(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function calculateReturnTotal() {
    let refundTotal = 0.00;
    returnItems.forEach(i => {
      refundTotal += Number(i.returnQty) * Number(i.unitPrice);
    });
    refundTotal = roundHalfUp(refundTotal);
    const refundNet = roundHalfUp(refundTotal / 1.05);
    const refundTax = roundHalfUp(refundTotal - refundNet);

    return {
      refundTotal,
      refundNet,
      refundTax
    };
  }

  return {
    async initData() {
      searchOrderId = '';
      originalOrder = null;
      returnItems = [];
      errorMessage = '';
      successMessage = '';
    },

    render() {
      const { refundTotal, refundNet, refundTax } = calculateReturnTotal();

      return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 font-inter">
          <!-- Main Sales Return Form (Col-span 2) -->
          <div class="lg:col-span-2 space-y-6">
            <div>
              <h1 class="font-outfit text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                開立銷貨退貨單
              </h1>
              <p class="text-sm text-zinc-400 mt-1">針對已出貨銷貨單開立退貨，核認良品回庫或不良品報廢處置</p>
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

            <!-- Search Original Order Card -->
            <div class="erp-glass-card p-6 rounded-2xl space-y-4 text-xs">
              <h3 class="font-outfit text-sm font-semibold text-zinc-200">1. 關聯原出貨銷貨單</h3>
              <div class="flex gap-3">
                <input type="text" id="search-order-id" class="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 font-mono" placeholder="請輸入銷貨單編號 (例: SO-XXXXXXXX-XXXX)" value="${searchOrderId}" />
                <button type="button" id="search-btn" class="bg-teal-950/40 hover:bg-teal-950/60 border border-teal-500/30 text-teal-400 text-sm font-semibold px-5 rounded-lg active:scale-[0.98] transition-all cursor-pointer">
                  檢索載入
                </button>
              </div>
            </div>

            ${originalOrder ? `
              <!-- Original Order details & returns list -->
              <div class="erp-glass-card p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 class="text-zinc-500 font-semibold mb-1 uppercase tracking-wider">歸戶會員編號</h4>
                  <p class="text-sm font-semibold text-zinc-300">${originalOrder.memberId}</p>
                </div>
                <div>
                  <h4 class="text-zinc-500 font-semibold mb-1 uppercase tracking-wider">退貨開立日期</h4>
                  <input type="date" id="return-date" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" value="${returnDate}" />
                </div>
              </div>

              <div class="erp-glass-card rounded-2xl overflow-hidden">
                <div class="p-5 border-b border-zinc-800">
                  <h3 class="font-outfit text-base font-semibold text-zinc-200">2. 選取退回品項與處置別</h3>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr class="bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                        <th class="px-5 py-3">產品名稱</th>
                        <th class="px-5 py-3 text-right">出貨數量</th>
                        <th class="px-5 py-3 text-right">出貨單價 (含稅)</th>
                        <th class="px-5 py-3 text-center" style="width: 100px;">退回數量</th>
                        <th class="px-5 py-3 text-center" style="width: 140px;">良品 / 不良品處置</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-900 text-zinc-300">
                      ${returnItems.map((item, idx) => `
                        <tr class="hover:bg-zinc-900/10">
                          <td class="px-5 py-4">
                            <span class="font-semibold text-zinc-200 text-xs">${item.productName}</span><br/>
                            <code class="text-zinc-500 text-xs">${item.productId}</code>
                          </td>
                          <td class="px-5 py-4 text-right font-mono text-zinc-400 text-xs">
                            ${item.originalQty.toFixed(2)}
                          </td>
                          <td class="px-5 py-4 text-right font-mono text-zinc-400 text-xs">
                            $${item.unitPrice.toFixed(2)}
                          </td>
                          <td class="px-5 py-4 text-center">
                            <input type="number" step="0.01" data-row-idx="${idx}" data-field="returnQty" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1 text-center font-mono text-xs text-zinc-200 focus:outline-none focus:border-teal-500" value="${item.returnQty}" />
                          </td>
                          <td class="px-5 py-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                              <button data-row-idx="${idx}" data-restock="1" class="px-2 py-0.5 text-xxs font-semibold rounded ${item.isRestocked ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'} cursor-pointer">
                                良品回庫
                              </button>
                              <button data-row-idx="${idx}" data-restock="0" class="px-2 py-0.5 text-xxs font-semibold rounded ${!item.isRestocked ? 'bg-red-950/40 text-red-400 border border-red-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'} cursor-pointer">
                                不良品報廢
                              </button>
                            </div>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : `
              <div class="erp-glass-card p-12 text-center text-zinc-500 text-sm">
                請在上方輸入原出貨銷貨單編號，進行單據數據檢索與歸戶載入。
              </div>
            `}
          </div>

          <!-- Financial Flow Sidebar (Col-span 1) -->
          <div class="space-y-6">
            <div class="erp-glass-card p-6 rounded-2xl space-y-6 relative overflow-hidden">
              <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-red-500/5 blur-2xl pointer-events-none"></div>

              <h3 class="font-outfit text-lg font-bold text-zinc-200 border-b border-zinc-800 pb-3">
                退折財務沖抵明細
              </h3>

              <div class="space-y-4 text-xs font-inter">
                <div class="flex items-center justify-between text-zinc-400">
                  <span>原銷貨單單號</span>
                  <span class="font-mono text-zinc-300">${originalOrder ? originalOrder.orderId : '--'}</span>
                </div>
                
                <div class="flex items-center justify-between text-zinc-400 pt-2 border-t border-zinc-900">
                  <span>沖退銷售淨額 (Return Net)</span>
                  <span class="font-mono text-sm text-zinc-300">$${refundNet.toFixed(2)}</span>
                </div>
                
                <div class="flex items-center justify-between text-zinc-400">
                  <span>銷項營業稅沖回 (Inclusive 5%)</span>
                  <span class="font-mono text-sm text-zinc-400">$${refundTax.toFixed(2)}</span>
                </div>
                
                <div class="flex flex-col pt-4 border-t border-zinc-800 space-y-1">
                  <span class="text-zinc-500 font-semibold uppercase tracking-wider">退款 / 折讓總額 (Refund Total)</span>
                  <span class="font-mono text-3xl font-extrabold text-red-400 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    $${refundTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button id="submit-return-btn" ${!originalOrder ? 'disabled' : ''} class="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-zinc-900 font-semibold text-sm rounded-lg py-2.5 shadow-lg shadow-red-500/15 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer">
                審核退貨單 (自動生成折讓與分錄)
              </button>
            </div>
          </div>
        </div>
      `;
    },

    afterRender(renderPage) {
      // 1. Search input change
      const searchInput = document.getElementById('search-order-id');
      searchInput?.addEventListener('change', (e) => {
        searchOrderId = e.target.value;
      });

      // 2. Search Button Trigger
      const searchBtn = document.getElementById('search-btn');
      searchBtn?.addEventListener('click', () => {
        searchOrder().then(() => renderPage());
      });

      // 3. Date input change
      const dateInput = document.getElementById('return-date');
      dateInput?.addEventListener('change', (e) => {
        returnDate = e.target.value;
      });

      // 4. Return Qty Input change
      document.querySelectorAll('[data-field="returnQty"]').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(input.getAttribute('data-row-idx'));
          returnItems[idx].returnQty = Number(e.target.value);
          errorMessage = '';
          renderPage();
        });
      });

      // 5. Restock Toggler
      document.querySelectorAll('[data-restock]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-row-idx'));
          const restockVal = btn.getAttribute('data-restock') === '1';
          returnItems[idx].isRestocked = restockVal;
          errorMessage = '';
          renderPage();
        });
      });

      // 6. Submit Return
      const submitBtn = document.getElementById('submit-return-btn');
      submitBtn?.addEventListener('click', async () => {
        errorMessage = '';
        successMessage = '';

        if (!originalOrder) return;

        const validItems = returnItems.filter(i => i.returnQty > 0);
        if (validItems.length === 0) {
          errorMessage = '請至少輸入一筆退回數量大於 0 的品項';
          renderPage();
          return;
        }

        try {
          const returnDetails = validItems.map(i => ({
            product_id: i.productId,
            quantity: Number(i.returnQty),
            is_restocked: i.isRestocked ? 1 : 0
          }));

          // A. Create Sales Return Draft
          const draftReturn = await api.post('/sales-returns', {
            original_order_id: originalOrder.orderId,
            return_date: returnDate,
            items: returnDetails,
            created_by: state.user.id
          });

          // B. Approve Sales Return (Generates Credit Memo, Ledger)
          await api.post(`/sales-returns/${draftReturn.returnId}/approve`, {
            approved_by: state.user.id
          });

          successMessage = `退貨單 ${draftReturn.returnId} 審核通過！已自動沖減客戶應收、生成實體折讓單 (Credit Memo)，並錄入日記帳！`;
          originalOrder = null;
          searchOrderId = '';
          returnItems = [];
          renderPage();
        } catch (err) {
          errorMessage = err.message || '審核退貨單失敗，可能超過原出貨剩餘退貨上限';
          renderPage();
        }
      });
    }
  };
}
