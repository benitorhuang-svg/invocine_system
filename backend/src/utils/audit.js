const prisma = require('./prisma');

/**
 * 寫入操作稽核日誌
 * @param {Object} params
 * @param {number} params.userId - 執行操作的用戶 ID
 * @param {string} params.action - 操作類型，如 CREATE, UPDATE, DELETE, APPROVE, VOID
 * @param {string} params.targetTable - 目標資料表名
 * @param {string} params.targetKey - 目標資料列主鍵值
 * @param {Object} [params.payloadBefore] - 變更前 JSON 資料
 * @param {Object} [params.payloadAfter] - 變更後 JSON 資料
 * @param {string} [params.ipAddress] - 用戶 IP 位址
 */
async function writeAuditLog({
  userId,
  action,
  targetTable,
  targetKey,
  payloadBefore = null,
  payloadAfter = null,
  ipAddress = null
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetTable,
        targetKey,
        payloadBefore: payloadBefore ? JSON.parse(JSON.stringify(payloadBefore)) : null,
        payloadAfter: payloadAfter ? JSON.parse(JSON.stringify(payloadAfter)) : null,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

module.exports = { writeAuditLog };
