const { Prisma } = require('@prisma/client');
const prisma = require('../utils/prisma');
const { writeAuditLog } = require('../utils/audit');

function roundHalfUp(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calculateTier(totalSpent) {
  const spent = Number(totalSpent);
  if (spent >= 100000) return 'PLATINUM';
  if (spent >= 50000) return 'GOLD';
  if (spent >= 10000) return 'SILVER';
  return 'BRONZE';
}

/**
 * 建立銷售單 (預設狀態為 DRAFT)
 */
async function createSalesOrder({ member_id, order_date, details, created_by }) {
  if (!member_id || !order_date || !details || !Array.isArray(details) || details.length === 0) {
    const error = new Error('必要欄位未填寫或明細為空');
    error.status = 400;
    error.code = 'ERR_INVALID_ORDER_INFO';
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. 檢查會員是否存在且啟用
    const member = await tx.member.findUnique({ where: { memberId: member_id } });
    if (!member || !member.isActive) {
      const error = new Error('會員不存在或已被停用');
      error.status = 400;
      error.code = 'ERR_MEMBER_NOT_FOUND';
      throw error;
    }

    // 2. 產生 order_id (格式 SO-YYYYMMDD-XXXX)
    const dateStr = order_date.replace(/-/g, '');
    const count = await tx.salesOrder.count({
      where: {
        orderId: { startsWith: `SO-${dateStr}-` }
      }
    });
    const nextSeq = String(count + 1).padStart(4, '0');
    const orderId = `SO-${dateStr}-${nextSeq}`;

    let totalAmount = 0.00;
    const detailData = [];

    // 3. 處理明細與計算總額
    for (const item of details) {
      const product = await tx.product.findUnique({ where: { productId: item.product_id } });
      if (!product) {
        const error = new Error(`商品 ${item.product_id} 不存在`);
        error.status = 404;
        error.code = 'ERR_PRODUCT_NOT_FOUND';
        throw error;
      }

      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      if (qty <= 0 || price < 0) {
        const error = new Error('數量或單價格式錯誤');
        error.status = 400;
        error.code = 'ERR_INVALID_ORDER_INFO';
        throw error;
      }

      const subtotal = roundHalfUp(qty * price);
      totalAmount += subtotal;

      detailData.push({
        productId: item.product_id,
        quantity: qty,
        unitPrice: price,
        subtotal
      });
    }

    // 4. 寫入 sales_orders 與 sales_order_details
    const newOrder = await tx.salesOrder.create({
      data: {
        orderId,
        orderDate: new Date(order_date),
        memberId: member_id,
        totalAmount: roundHalfUp(totalAmount),
        status: 'DRAFT',
        createdBy: created_by,
        salesOrderDetails: {
          create: detailData
        }
      },
      include: {
        salesOrderDetails: true
      }
    });

    await writeAuditLog({
      userId: created_by,
      action: 'CREATE',
      targetTable: 'sales_orders',
      targetKey: orderId,
      payloadAfter: newOrder
    });

    return newOrder;
  });
}

/**
 * 審核銷售單與扣減庫存 (交易內 Pessimistic locking + 雙分錄日記帳)
 */
async function approveSalesOrder(orderId, approvedBy) {
  return await prisma.$transaction(async (tx) => {
    // 1. 取得並驗證訂單狀態
    const order = await tx.salesOrder.findUnique({
      where: { orderId },
      include: { salesOrderDetails: true }
    });

    if (!order) {
      const error = new Error('銷售訂單不存在');
      error.status = 404;
      error.code = 'ERR_ORDER_NOT_FOUND';
      throw error;
    }

    if (order.status !== 'DRAFT') {
      const error = new Error('僅 DRAFT 狀態的銷售訂單可進行核准');
      error.status = 400;
      error.code = 'ERR_INVALID_ORDER_STATUS';
      throw error;
    }

    // 2. 對訂單內商品實施悲觀鎖定 (SELECT FOR UPDATE) 防止高併發超賣
    const productIds = order.salesOrderDetails.map(d => d.productId);
    if (productIds.length > 0) {
      await tx.$executeRaw`SELECT product_id FROM products WHERE product_id IN (${Prisma.join(productIds)}) FOR UPDATE`;
    }

    let totalCogs = 0.00;
    const detailsWithCost = [];

    // 3. 檢查並更新商品庫存
    for (const detail of order.salesOrderDetails) {
      const product = await tx.product.findUnique({ where: { productId: detail.productId } });
      if (!product) {
        const error = new Error(`商品 ${detail.productId} 不存在`);
        error.status = 404;
        error.code = 'ERR_PRODUCT_NOT_FOUND';
        throw error;
      }

      const qty = Number(detail.quantity);
      const stock = Number(product.stockQuantity);
      if (stock < qty) {
        const error = new Error(`商品 ${product.productName} 庫存不足 (現有 ${stock}, 需求 ${qty})`);
        error.status = 400;
        error.code = 'ERR_INSUFFICIENT_STOCK';
        throw error;
      }

      const newStock = roundHalfUp(stock - qty);
      await tx.product.update({
        where: { productId: detail.productId },
        data: { stockQuantity: newStock }
      });

      // 計算銷貨成本 (COGS)
      const cost = Number(product.costPrice);
      totalCogs += roundHalfUp(qty * cost);

      detailsWithCost.push({
        productId: detail.productId,
        quantity: qty,
        unitPrice: Number(detail.unitPrice),
        costPrice: cost
      });
    }

    // 4. 更新會員累計消費金額與會員等級
    const member = await tx.member.findUnique({ where: { memberId: order.memberId } });
    const newTotalSpent = roundHalfUp(Number(member.totalSpent) + Number(order.totalAmount));
    const newTier = calculateTier(newTotalSpent);

    await tx.member.update({
      where: { memberId: order.memberId },
      data: {
        totalSpent: newTotalSpent,
        tier: newTier
      }
    });

    // 5. 更新銷售單狀態為 APPROVED
    const updatedOrder = await tx.salesOrder.update({
      where: { orderId },
      data: {
        status: 'APPROVED',
        approvedBy
      }
    });

    // 6. 寫入雙分錄複式日記帳 (Financial Ledger Entry)
    // 分錄 A：銷貨收入與銷項稅額 (5% 內含稅)
    const totalAmount = Number(order.totalAmount);
    const revenue = roundHalfUp(totalAmount / 1.05);
    const taxPayable = roundHalfUp(totalAmount - revenue);

    // 借：應收帳款 (AR)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        accountCode: 'AR',
        debit: totalAmount,
        credit: 0.00,
        description: `銷售訂單核准 - 應收帳款增加 (${order.memberId})`,
        createdBy: approvedBy
      }
    });

    // 貸：銷貨收入 (SALES_REVENUE)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        accountCode: 'SALES_REVENUE',
        debit: 0.00,
        credit: revenue,
        description: `銷售訂單核准 - 營業收入確認 (內扣銷項稅額 5%)`,
        createdBy: approvedBy
      }
    });

    // 貸：應付代收稅額 (SALES_TAX_PAYABLE)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        accountCode: 'SALES_TAX_PAYABLE',
        debit: 0.00,
        credit: taxPayable,
        description: `銷售訂單核准 - 銷項稅額確認`,
        createdBy: approvedBy
      }
    });

    // 分錄 B：銷貨成本 (COGS) 與庫存減項
    // 借：銷貨成本 (COGS)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        accountCode: 'COGS',
        debit: roundHalfUp(totalCogs),
        credit: 0.00,
        description: `銷售訂單核准 - 結轉銷貨成本`,
        createdBy: approvedBy
      }
    });

    // 貸：存貨 (INVENTORY)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        accountCode: 'INVENTORY',
        debit: 0.00,
        credit: roundHalfUp(totalCogs),
        description: `銷售訂單核准 - 存貨資產減項`,
        createdBy: approvedBy
      }
    });

    // 7. 寫入操作稽核日誌
    await writeAuditLog({
      userId: approvedBy,
      action: 'APPROVE',
      targetTable: 'sales_orders',
      targetKey: orderId,
      payloadBefore: order,
      payloadAfter: updatedOrder
    });

    return updatedOrder;
  });
}

async function getSalesOrders() {
  return await prisma.salesOrder.findMany({
    include: { salesOrderDetails: true }
  });
}

async function getSalesOrderById(id) {
  const order = await prisma.salesOrder.findUnique({
    where: { orderId: id },
    include: { salesOrderDetails: true }
  });
  if (!order) {
    const error = new Error('銷售訂單不存在');
    error.status = 404;
    error.code = 'ERR_ORDER_NOT_FOUND';
    throw error;
  }
  return order;
}

module.exports = {
  createSalesOrder,
  approveSalesOrder,
  getSalesOrders,
  getSalesOrderById
};
