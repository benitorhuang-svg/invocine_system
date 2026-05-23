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
 * 建立銷售退貨單 (預設狀態為 DRAFT)
 */
async function createSalesReturn({ original_order_id, return_date, details, created_by }) {
  if (!original_order_id || !return_date || !details || !Array.isArray(details) || details.length === 0) {
    const error = new Error('必要欄位未填寫或退貨明細為空');
    error.status = 400;
    error.code = 'ERR_INVALID_RETURN_INFO';
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. 查詢原銷售單
    const order = await tx.salesOrder.findUnique({
      where: { orderId: original_order_id },
      include: { salesOrderDetails: true }
    });

    if (!order) {
      const error = new Error('原銷售訂單不存在');
      error.status = 404;
      error.code = 'ERR_ORDER_NOT_FOUND';
      throw error;
    }

    if (order.status !== 'APPROVED') {
      const error = new Error('僅已核准 (APPROVED) 的銷售單可進行退貨');
      error.status = 400;
      error.code = 'ERR_INVALID_ORDER_STATUS';
      throw error;
    }

    // 2. 產生 return_id (格式 SR-YYYYMMDD-XXXX)
    const dateStr = return_date.replace(/-/g, '');
    const count = await tx.salesReturn.count({
      where: {
        returnId: { startsWith: `SR-${dateStr}-` }
      }
    });
    const nextSeq = String(count + 1).padStart(4, '0');
    const returnId = `SR-${dateStr}-${nextSeq}`;

    let refundTotal = 0.00;
    const detailData = [];

    // 3. 處理退貨明細與數量上限校驗
    for (const item of details) {
      const originalDetail = order.salesOrderDetails.find(d => d.productId === item.product_id);
      if (!originalDetail) {
        const error = new Error(`原訂單中無商品 ${item.product_id} 的銷售記錄`);
        error.status = 400;
        error.code = 'ERR_INVALID_RETURN_INFO';
        throw error;
      }

      const qty = Number(item.quantity);
      const price = Number(originalDetail.unitPrice); // 退貨單價與原出貨單價一致
      const maxQty = Number(originalDetail.quantity);

      if (qty <= 0 || qty > maxQty) {
        const error = new Error(`商品 ${item.product_id} 退貨數量超出可退上限 (購買 ${maxQty}, 請求退貨 ${qty})`);
        error.status = 400;
        error.code = 'ERR_INVALID_RETURN_QTY';
        throw error;
      }

      const subtotal = roundHalfUp(qty * price);
      refundTotal += subtotal;

      detailData.push({
        productId: item.product_id,
        quantity: qty,
        unitPrice: price,
        subtotal,
        isRestocked: item.is_restocked !== undefined ? item.is_restocked : true
      });
    }

    // 4. 寫入 sales_returns 與 sales_return_details
    const newReturn = await tx.salesReturn.create({
      data: {
        returnId,
        returnDate: new Date(return_date),
        originalOrderId: original_order_id,
        refundTotal: roundHalfUp(refundTotal),
        status: 'DRAFT',
        createdBy: created_by,
        salesReturnDetails: {
          create: detailData
        }
      },
      include: {
        salesReturnDetails: true
      }
    });

    await writeAuditLog({
      userId: created_by,
      action: 'CREATE',
      targetTable: 'sales_returns',
      targetKey: returnId,
      payloadAfter: newReturn
    });

    return newReturn;
  });
}

/**
 * 審核銷售退貨單 (悲觀鎖定 + 折讓單生成 + 存貨/報廢處置 + 雙分錄財務日記帳)
 */
async function approveSalesReturn(returnId, approvedBy) {
  return await prisma.$transaction(async (tx) => {
    // 1. 查詢並校驗退貨單
    const salesReturn = await tx.salesReturn.findUnique({
      where: { returnId },
      include: { salesReturnDetails: true, originalOrder: true }
    });

    if (!salesReturn) {
      const error = new Error('銷售退貨單不存在');
      error.status = 404;
      error.code = 'ERR_RETURN_NOT_FOUND';
      throw error;
    }

    if (salesReturn.status !== 'DRAFT') {
      const error = new Error('僅 DRAFT 狀態的退貨單可進行核准');
      error.status = 400;
      error.code = 'ERR_INVALID_RETURN_STATUS';
      throw error;
    }

    const orderId = salesReturn.originalOrderId;
    const memberId = salesReturn.originalOrder.memberId;

    // 2. 悲觀鎖定 (SELECT FOR UPDATE)
    const productIds = salesReturn.salesReturnDetails.map(d => d.productId);
    if (productIds.length > 0) {
      await tx.$executeRawUnsafe(
        `SELECT * FROM products WHERE product_id IN (${productIds.map(id => `'${id}'`).join(',')}) FOR UPDATE`
      );
    }

    let restockCogs = 0.00;
    let scrapCogs = 0.00;

    // 3. 處理良品回庫或不良品報廢移入
    for (const detail of salesReturn.salesReturnDetails) {
      const product = await tx.product.findUnique({ where: { productId: detail.productId } });
      if (!product) {
        const error = new Error(`商品 ${detail.productId} 不存在`);
        error.status = 404;
        error.code = 'ERR_PRODUCT_NOT_FOUND';
        throw error;
      }

      const qty = Number(detail.quantity);
      const cost = Number(product.costPrice);

      if (detail.isRestocked) {
        // 良品：加回主庫存
        const newStock = roundHalfUp(Number(product.stockQuantity) + qty);
        await tx.product.update({
          where: { productId: detail.productId },
          data: { stockQuantity: newStock }
        });
        restockCogs += roundHalfUp(qty * cost);
      } else {
        // 不良品：移入報廢表
        await tx.damagedInventory.create({
          data: {
            returnId,
            productId: detail.productId,
            quantity: qty,
            scrapReason: '銷售退貨不良品報廢'
          }
        });
        scrapCogs += roundHalfUp(qty * cost);
      }
    }

    // 4. 更新會員累計消費與等級
    const member = await tx.member.findUnique({ where: { memberId } });
    const refundTotal = Number(salesReturn.refundTotal);
    const newTotalSpent = roundHalfUp(Math.max(0.00, Number(member.totalSpent) - refundTotal));
    const newTier = calculateTier(newTotalSpent);

    await tx.member.update({
      where: { memberId },
      data: {
        totalSpent: newTotalSpent,
        tier: newTier
      }
    });

    // 5. 自動生成會員折讓單 (Credit Memo)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${date}`;

    const cmCount = await tx.creditMemo.count({
      where: {
        memoId: { startsWith: `CM-${dateStr}-` }
      }
    });
    const nextSeq = String(cmCount + 1).padStart(4, '0');
    const memoId = `CM-${dateStr}-${nextSeq}`;

    const newMemo = await tx.creditMemo.create({
      data: {
        memoId,
        returnId,
        memberId,
        memoAmount: refundTotal,
        status: 'UNAPPLIED',
        createdBy: approvedBy
      }
    });

    // 6. 更新退貨單狀態為 APPROVED
    const updatedReturn = await tx.salesReturn.update({
      where: { returnId },
      data: {
        status: 'APPROVED',
        approvedBy
      }
    });

    // 7. 寫入雙分錄複式日記帳
    // 分錄 A：應收帳款沖銷或產生折讓負債 (5% 內含稅)
    const revenueReduction = roundHalfUp(refundTotal / 1.05);
    const taxReduction = roundHalfUp(refundTotal - revenueReduction);

    // 借：銷貨退回 (SALES_RETURN 或直接借營業收入)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_RETURN',
        referenceId: returnId,
        accountCode: 'SALES_RETURN',
        debit: revenueReduction,
        credit: 0.00,
        description: `銷售退貨核准 - 銷貨收入沖減 (原訂單 ${orderId})`,
        createdBy: approvedBy
      }
    });

    // 借：應付代收稅額 (SALES_TAX_PAYABLE)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_RETURN',
        referenceId: returnId,
        accountCode: 'SALES_TAX_PAYABLE',
        debit: taxReduction,
        credit: 0.00,
        description: `銷售退貨核准 - 銷項稅額沖減`,
        createdBy: approvedBy
      }
    });

    // 貸：應收帳款 (AR)
    await tx.financialLedger.create({
      data: {
        entryDate: new Date(),
        referenceType: 'SALES_RETURN',
        referenceId: returnId,
        accountCode: 'AR',
        debit: 0.00,
        credit: refundTotal,
        description: `銷售退貨核准 - 沖銷應收帳款 / 產生折讓單 (${memoId})`,
        createdBy: approvedBy
      }
    });

    // 分錄 B：存貨回庫與 COGS 調整 (良品)
    if (restockCogs > 0) {
      // 借：存貨 (INVENTORY)
      await tx.financialLedger.create({
        data: {
          entryDate: new Date(),
          referenceType: 'SALES_RETURN',
          referenceId: returnId,
          accountCode: 'INVENTORY',
          debit: roundHalfUp(restockCogs),
          credit: 0.00,
          description: `銷售退貨核准 - 良品回庫`,
          createdBy: approvedBy
        }
      });

      // 貸：銷貨成本 (COGS)
      await tx.financialLedger.create({
        data: {
          entryDate: new Date(),
          referenceType: 'SALES_RETURN',
          referenceId: returnId,
          accountCode: 'COGS',
          debit: 0.00,
          credit: roundHalfUp(restockCogs),
          description: `銷售退貨核准 - 沖減銷貨成本`,
          createdBy: approvedBy
        }
      });
    }

    // 分錄 C：不良品報廢轉列報廢損失 (報廢損失與 COGS 沖減)
    if (scrapCogs > 0) {
      // 借：商品報廢損失 (SCRAP_LOSS)
      await tx.financialLedger.create({
        data: {
          entryDate: new Date(),
          referenceType: 'SALES_RETURN',
          referenceId: returnId,
          accountCode: 'SCRAP_LOSS',
          debit: roundHalfUp(scrapCogs),
          credit: 0.00,
          description: `銷售退貨核准 - 不良品報廢損失`,
          createdBy: approvedBy
        }
      });

      // 貸：銷貨成本 (COGS)
      await tx.financialLedger.create({
        data: {
          entryDate: new Date(),
          referenceType: 'SALES_RETURN',
          referenceId: returnId,
          accountCode: 'COGS',
          debit: 0.00,
          credit: roundHalfUp(scrapCogs),
          description: `銷售退貨核准 - 報廢移出銷貨成本`,
          createdBy: approvedBy
        }
      });
    }

    // 8. 寫入操作稽核日誌
    await writeAuditLog({
      userId: approvedBy,
      action: 'APPROVE',
      targetTable: 'sales_returns',
      targetKey: returnId,
      payloadBefore: salesReturn,
      payloadAfter: updatedReturn
    });

    return {
      salesReturn: updatedReturn,
      creditMemo: newMemo
    };
  });
}

async function getSalesReturns() {
  return await prisma.salesReturn.findMany({
    include: { salesReturnDetails: true }
  });
}

async function getSalesReturnById(id) {
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { returnId: id },
    include: { salesReturnDetails: true }
  });
  if (!salesReturn) {
    const error = new Error('銷售退貨單不存在');
    error.status = 404;
    error.code = 'ERR_RETURN_NOT_FOUND';
    throw error;
  }
  return salesReturn;
}

module.exports = {
  createSalesReturn,
  approveSalesReturn,
  getSalesReturns,
  getSalesReturnById
};
