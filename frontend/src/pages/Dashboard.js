import { api } from '../utils/api.js';
import { state } from '../utils/state.js';

export default function Dashboard() {
  let products = [];
  let alerts = [];
  let showAddModal = false;
  let showEditModal = false;

  let errorMessage = '';

  // Form fields for create/edit
  let formId = '';
  let formBarcode = '';
  let formName = '';
  let formSpec = '';
  let formUnit = 'pcs';
  let formCost = '';
  let formRetail = '';
  let formStock = '';
  let formSafety = '';

  async function loadData() {
    try {
      products = await api.get('/products');
      alerts = await api.get('/products/replenishment-alerts');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  return {
    async initData() {
      await loadData();
    },

    render() {
      const isSensitiveRole = state.user?.role === 'ADMIN' || state.user?.role === 'ACCT';

      return `
        <div class="space-y-8 font-inter">
          <!-- Dashboard Header -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 class="font-outfit text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                商品主檔與庫存看板
              </h1>
              <p class="text-sm text-zinc-400 mt-1">即時庫存盤點、安全水位預警與主檔維護門戶</p>
            </div>
            
            ${state.user?.type === 'STAFF' && (state.user?.role === 'ADMIN' || state.user?.role === 'WAREHOUSE') ? `
              <button id="add-product-btn" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-zinc-900 font-semibold text-sm rounded-lg px-5 py-2.5 shadow-lg shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer">
                + 新增商品品項
              </button>
            ` : ''}
          </div>

          <!-- Alert Notices Panel -->
          ${alerts.length > 0 ? `
            <div class="erp-glass-card p-6 rounded-2xl border-l-4 border-l-red-500 replenishment-pulse">
              <h3 class="font-outfit text-lg font-semibold text-red-400 flex items-center gap-2">
                ⚠️ 安全庫存補貨預警 (${alerts.length} 項商品告急)
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                ${alerts.map(a => `
                  <div class="bg-zinc-950/40 border border-red-500/20 rounded-xl p-4 text-xs space-y-1">
                    <div class="font-semibold text-zinc-200 text-sm font-outfit">${a.productName}</div>
                    <div class="text-zinc-500">編號: <code class="text-zinc-400">${a.productId}</code> | 條碼: ${a.barcode}</div>
                    <div class="flex items-center justify-between text-zinc-400 pt-2 border-t border-zinc-900">
                      <span>可用庫存: <strong class="text-red-400">${a.stockQuantity}</strong> ${a.unit}</span>
                      <span>安全水位: <strong>${a.safetyStock}</strong></span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="erp-glass-card p-5 rounded-2xl border-l-4 border-l-teal-500 flex items-center gap-3">
              <span class="text-teal-400 text-lg">✓</span>
              <p class="text-sm text-zinc-400 font-medium">所有商品可用庫存均高於安全水位，補貨防線運作正常。</p>
            </div>
          `}

          <!-- Product Master Grid List -->
          <div class="erp-glass-card rounded-2xl overflow-hidden">
            <div class="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 class="font-outfit text-lg font-semibold text-zinc-200">商品清冊檔案</h3>
              <span class="text-xs font-semibold px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                共 ${products.length} 項
              </span>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead>
                  <tr class="bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <th class="px-6 py-3.5">商品編號</th>
                    <th class="px-6 py-3.5">商品名稱</th>
                    <th class="px-6 py-3.5">條碼</th>
                    <th class="px-6 py-3.5">規格 / 單位</th>
                    ${isSensitiveRole ? `<th class="px-6 py-3.5 text-right">進貨成本 (含稅)</th>` : ''}
                    <th class="px-6 py-3.5 text-right">建議零售價 (含稅)</th>
                    <th class="px-6 py-3.5 text-right">現有庫存</th>
                    <th class="px-6 py-3.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-900 text-zinc-300">
                  ${products.map(p => {
                    const isLow = Number(p.stockQuantity) <= Number(p.safetyStock);
                    return `
                      <tr class="hover:bg-zinc-900/20 transition-colors">
                        <td class="px-6 py-4 font-mono font-medium text-teal-400 text-xs">${p.productId}</td>
                        <td class="px-6 py-4 font-semibold text-zinc-100">${p.productName}</td>
                        <td class="px-6 py-4 text-xs font-mono text-zinc-400">${p.barcode}</td>
                        <td class="px-6 py-4 text-xs">${p.spec || '--'} / ${p.unit}</td>
                        ${isSensitiveRole ? `<td class="px-6 py-4 text-right font-mono text-zinc-400">$${Number(p.costPrice).toFixed(2)}</td>` : ''}
                        <td class="px-6 py-4 text-right font-mono text-teal-400 font-semibold">$${Number(p.retailPrice).toFixed(2)}</td>
                        <td class="px-6 py-4 text-right">
                          <span class="font-mono font-semibold px-2 py-0.5 rounded text-xs ${isLow ? 'bg-red-950/40 text-red-400 border border-red-500/20' : 'bg-teal-950/40 text-teal-400 border border-teal-500/20'}">
                            ${Number(p.stockQuantity).toFixed(2)}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                          <div class="flex items-center justify-center gap-2">
                            ${state.user?.type === 'STAFF' && (state.user?.role === 'ADMIN' || state.user?.role === 'WAREHOUSE') ? `
                              <button data-edit="${p.productId}" class="text-teal-400 hover:text-teal-300 text-xs font-semibold px-2.5 py-1 bg-teal-950/20 border border-teal-500/20 hover:border-teal-500/40 rounded transition-all cursor-pointer">
                                編輯
                              </button>
                            ` : ''}
                            ${state.user?.type === 'STAFF' && state.user?.role === 'ADMIN' ? `
                              <button data-delete="${p.productId}" class="text-red-400 hover:text-red-300 text-xs font-semibold px-2.5 py-1 bg-red-950/20 border border-red-500/20 hover:border-red-500/40 rounded transition-all cursor-pointer">
                                刪除
                              </button>
                            ` : '<span class="text-zinc-600 text-xs font-medium">權限不足</span>'}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Modals (Add / Edit Product) -->
          ${showAddModal || showEditModal ? `
            <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div class="erp-glass-card w-full max-w-lg p-8 rounded-2xl relative overflow-hidden">
                <h3 class="font-outfit text-2xl font-bold bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent mb-6">
                  ${showAddModal ? '建立全新商品品項' : '維護商品主檔'}
                </h3>
                
                ${errorMessage ? `
                  <div class="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-400 text-center font-medium">
                    ${errorMessage}
                  </div>
                ` : ''}

                <form id="product-form" class="grid grid-cols-2 gap-4 text-xs font-inter" onsubmit="return false;">
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">商品編號</label>
                    <input type="text" id="prod-id" required ${showEditModal ? 'disabled' : ''} class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500 disabled:opacity-50" placeholder="PROD-A01" value="${formId}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">國際條碼</label>
                    <input type="text" id="prod-barcode" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="8碼或13碼數字" value="${formBarcode}" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">商品名稱</label>
                    <input type="text" id="prod-name" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="進口全脂鮮乳 1L" value="${formName}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">規格規格</label>
                    <input type="text" id="prod-spec" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="1000ml" value="${formSpec}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">計量單位</label>
                    <input type="text" id="prod-unit" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" value="${formUnit}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">進貨成本 (含稅)</label>
                    <input type="number" step="0.01" id="prod-cost" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="0.00" value="${formCost}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">零售售價 (含稅)</label>
                    <input type="number" step="0.01" id="prod-retail" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="不得低於成本" value="${formRetail}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">現有可用庫存</label>
                    <input type="number" step="0.01" id="prod-stock" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" placeholder="0.00" value="${formStock}" />
                  </div>
                  <div>
                    <label class="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider">安全警示庫存水位</label>
                    <input type="number" step="0.01" id="prod-safety" required class="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500" value="${formSafety}" />
                  </div>
                  
                  <div class="col-span-2 flex items-center justify-end gap-3 mt-6">
                    <button type="button" id="modal-cancel-btn" class="border border-zinc-800 hover:border-zinc-700 text-zinc-400 font-semibold text-sm rounded-lg px-5 py-2 transition-all cursor-pointer">
                      取消
                    </button>
                    <button type="submit" id="modal-submit-btn" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-zinc-900 font-semibold text-sm rounded-lg px-5 py-2 shadow-lg shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer">
                      儲存變更
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    },

    afterRender(renderPage) {
      // 1. Add Product Trigger
      const addBtn = document.getElementById('add-product-btn');
      addBtn?.addEventListener('click', () => {
        showAddModal = true;
        errorMessage = '';
        formId = '';
        formBarcode = '';
        formName = '';
        formSpec = '';
        formUnit = 'pcs';
        formCost = '';
        formRetail = '';
        formStock = '0.00';
        formSafety = '10.00';
        renderPage();
      });

      // 2. Cancel Modal
      const cancelBtn = document.getElementById('modal-cancel-btn');
      cancelBtn?.addEventListener('click', () => {
        showAddModal = false;
        showEditModal = false;
        errorMessage = '';
        renderPage();
      });

      // 3. Edit Product Trigger
      document.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-edit');
          const p = products.find(prod => prod.productId === id);
          if (p) {
            showEditModal = true;
            errorMessage = '';
            formId = p.productId;
            formBarcode = p.barcode;
            formName = p.productName;
            formSpec = p.spec || '';
            formUnit = p.unit;
            formCost = p.costPrice;
            formRetail = p.retailPrice;
            formStock = p.stockQuantity;
            formSafety = p.safetyStock;
            renderPage();
          }
        });
      });

      // 4. Delete Product Trigger
      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete');
          if (confirm(`確定要將商品品項 ${id} 徹底從主檔中刪除嗎？`)) {
            try {
              await api.delete(`/products/${id}`);
              await loadData();
              renderPage();
            } catch (err) {
              alert(err.message || '刪除商品失敗，該商品可能已被關聯或權限不足');
            }
          }
        });
      });

      // 5. Submit Form (Create / Edit)
      const form = document.getElementById('product-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage = '';

        const productId = document.getElementById('prod-id').value.trim();
        const barcode = document.getElementById('prod-barcode').value.trim();
        const productName = document.getElementById('prod-name').value.trim();
        const spec = document.getElementById('prod-spec').value.trim();
        const unit = document.getElementById('prod-unit').value.trim();
        const costPrice = Number(document.getElementById('prod-cost').value);
        const retailPrice = Number(document.getElementById('prod-retail').value);
        const stockQuantity = Number(document.getElementById('prod-stock').value);
        const safetyStock = Number(document.getElementById('prod-safety').value);

        if (!productId || !barcode || !productName || !unit) {
          errorMessage = '請填寫所有必要欄位';
          renderPage();
          return;
        }

        if (costPrice < 0 || retailPrice < 0 || stockQuantity < 0 || safetyStock < 0) {
          errorMessage = '數值價格與庫存水量不可為負數';
          renderPage();
          return;
        }

        if (retailPrice < costPrice) {
          errorMessage = '產品零售售價不可低於其進貨成本';
          renderPage();
          return;
        }

        try {
          if (showAddModal) {
            await api.post('/products', {
              productId,
              barcode,
              productName,
              spec,
              unit,
              costPrice,
              retailPrice,
              stockQuantity,
              safetyStock
            });
          } else {
            await api.put(`/products/${productId}`, {
              barcode,
              productName,
              spec,
              unit,
              costPrice,
              retailPrice,
              stockQuantity,
              safetyStock
            });
          }

          showAddModal = false;
          showEditModal = false;
          await loadData();
          renderPage();
        } catch (err) {
          errorMessage = err.message || '儲存商品主檔變更失敗';
          renderPage();
        }
      });
    }
  };
}
