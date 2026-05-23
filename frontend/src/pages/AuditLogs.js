import { api } from '../utils/api.js';

export default function AuditLogs() {
  let logs = [];
  let expandedLogId = null;

  async function loadData() {
    try {
      logs = await api.get('/audit-logs');
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }

  function formatJSON(json) {
    if (!json) return '<span class="text-zinc-600">無記錄 (NULL)</span>';
    try {
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      return `<pre class="bg-zinc-950 p-4 rounded-xl font-mono text-xxs text-teal-400 overflow-x-auto border border-zinc-900/50 max-h-72 select-text">${JSON.stringify(obj, null, 2)}</pre>`;
    } catch (e) {
      return `<pre class="bg-zinc-950 p-4 rounded-xl font-mono text-xxs text-red-400 overflow-x-auto border border-zinc-900/50 max-h-72 select-text">${json}</pre>`;
    }
  }

  return {
    async initData() {
      await loadData();
      expandedLogId = null;
    },

    render() {
      return `
        <div class="space-y-6 font-inter">
          <div>
            <h1 class="font-outfit text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              系統操作稽核日誌
            </h1>
            <p class="text-sm text-zinc-400 mt-1">追蹤所有商品、單據與會計日記帳的Mutation異動軌跡</p>
          </div>

          <!-- Logs Datagrid -->
          <div class="erp-glass-card rounded-2xl overflow-hidden">
            <div class="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 class="font-outfit text-base font-semibold text-zinc-200">審計軌跡明細</h3>
              <span class="text-xs font-semibold px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                共 ${logs.length} 筆變更
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm border-collapse">
                <thead>
                  <tr class="bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <th class="px-6 py-3.5">日誌ID</th>
                    <th class="px-6 py-3.5">操作人ID</th>
                    <th class="px-6 py-3.5">變更動作</th>
                    <th class="px-6 py-3.5">異動模組</th>
                    <th class="px-6 py-3.5">資料識別主鍵</th>
                    <th class="px-6 py-3.5">操作時間</th>
                    <th class="px-6 py-3.5 text-center">狀態比對</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-900 text-zinc-300">
                  ${logs.map(log => {
                    const isExpanded = expandedLogId === log.logId;
                    let actionBadge = '';
                    switch (log.action) {
                      case 'CREATE':
                        actionBadge = '<span class="bg-emerald-950/30 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-xxs font-semibold">新增</span>';
                        break;
                      case 'UPDATE':
                        actionBadge = '<span class="bg-amber-950/30 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded text-xxs font-semibold">修改</span>';
                        break;
                      case 'DELETE':
                        actionBadge = '<span class="bg-red-950/30 text-red-400 border border-red-500/25 px-2 py-0.5 rounded text-xxs font-semibold">刪除</span>';
                        break;
                      case 'APPROVE':
                        actionBadge = '<span class="bg-purple-950/30 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded text-xxs font-semibold">審核核准</span>';
                        break;
                      default:
                        actionBadge = `<span class="bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded text-xxs font-semibold">${log.action}</span>`;
                    }

                    return `
                      <tr class="hover:bg-zinc-900/10 transition-colors">
                        <td class="px-6 py-4 font-mono text-zinc-500 text-xs">${log.logId}</td>
                        <td class="px-6 py-4 font-semibold text-zinc-300">STAFF-${log.userId}</td>
                        <td class="px-6 py-4">${actionBadge}</td>
                        <td class="px-6 py-4 text-xs font-semibold text-zinc-400">${log.targetTable}</td>
                        <td class="px-6 py-4 font-mono text-xs text-teal-400">${log.targetKey}</td>
                        <td class="px-6 py-4 text-xs text-zinc-500">${new Date(log.createdAt).toLocaleString()}</td>
                        <td class="px-6 py-4 text-center">
                          <button data-toggle-log="${log.logId}" class="text-teal-400 hover:text-teal-300 text-xs font-semibold px-3 py-1 bg-teal-950/20 border border-teal-500/20 hover:border-teal-500/40 rounded transition-all cursor-pointer">
                            ${isExpanded ? '收起' : '展開比對'}
                          </button>
                        </td>
                      </tr>
                      ${isExpanded ? `
                        <tr class="bg-zinc-950/20">
                          <td colspan="7" class="px-6 py-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                              <div class="space-y-1">
                                <span class="text-xxs font-semibold uppercase tracking-wider text-zinc-500">變更前資料 (Payload Before)</span>
                                ${formatJSON(log.payloadBefore)}
                              </div>
                              <div class="space-y-1">
                                <span class="text-xxs font-semibold uppercase tracking-wider text-zinc-500">變更後資料 (Payload After)</span>
                                ${formatJSON(log.payloadAfter)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ` : ''}
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    afterRender(renderPage) {
      document.querySelectorAll('[data-toggle-log]').forEach(btn => {
        btn.addEventListener('click', () => {
          const logId = parseInt(btn.getAttribute('data-toggle-log'));
          if (expandedLogId === logId) {
            expandedLogId = null;
          } else {
            expandedLogId = logId;
          }
          renderPage();
        });
      });
    }
  };
}
