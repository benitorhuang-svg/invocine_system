const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

// Mock Prisma Client
jest.mock('../../src/utils/prisma', () => {
  const localMock = {
    member: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesOrder: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesReturn: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    damagedInventory: {
      create: jest.fn(),
    },
    creditMemo: {
      count: jest.fn(),
      create: jest.fn(),
    },
    financialLedger: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(localMock)),
    $executeRawUnsafe: jest.fn(),
  };
  return localMock;
});

const prisma = require('../../src/utils/prisma');

describe('銷售退貨與折讓整合測試 (Sales Return & Credit Memos)', () => {
  const mockMember = {
    memberId: 'MBR-20260523-0001',
    email: 'member@example.com',
    phone: '0912345678',
    realName: '張會員',
    tier: 'SILVER',
    totalSpent: 15000.00,
    isActive: true
  };

  const mockProduct = {
    productId: 'PROD-A01',
    barcode: '4710123456789',
    productName: '進口鮮乳',
    costPrice: 65.00,
    retailPrice: 100.00,
    stockQuantity: 10.00,
    safetyStock: 2.00
  };

  const mockOrder = {
    orderId: 'SO-20260523-0001',
    orderDate: new Date('2026-05-23'),
    memberId: 'MBR-20260523-0001',
    totalAmount: 1000.00,
    status: 'APPROVED',
    createdBy: 1,
    salesOrderDetails: [
      {
        productId: 'PROD-A01',
        quantity: 10.00,
        unitPrice: 100.00,
        subtotal: 1000.00
      }
    ]
  };

  const mockReturn = {
    returnId: 'SR-20260523-0001',
    returnDate: new Date('2026-05-23'),
    originalOrderId: 'SO-20260523-0001',
    refundTotal: 500.00,
    status: 'DRAFT',
    createdBy: 1,
    originalOrder: mockOrder,
    salesReturnDetails: [
      {
        productId: 'PROD-A01',
        quantity: 5.00,
        unitPrice: 100.00,
        subtotal: 500.00,
        isRestocked: true
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 銷售退貨單建立 (Create Sales Return)', () => {
    it('原銷售訂單不存在時，應返回 404', async () => {
      const salesToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          original_order_id: 'SO-NONEXISTENT',
          return_date: '2026-05-23',
          details: [{ product_id: 'PROD-A01', quantity: 2 }]
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_ORDER_NOT_FOUND');
    });

    it('原銷售訂單非 APPROVED 狀態時，應返回 400', async () => {
      const salesToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: 'DRAFT'
      });

      const res = await request(app)
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          original_order_id: 'SO-20260523-0001',
          return_date: '2026-05-23',
          details: [{ product_id: 'PROD-A01', quantity: 2 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_ORDER_STATUS');
    });

    it('退貨商品不在原銷售明細中，應返回 400', async () => {
      const salesToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce(mockOrder);

      const res = await request(app)
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          original_order_id: 'SO-20260523-0001',
          return_date: '2026-05-23',
          details: [{ product_id: 'PROD-B02', quantity: 2 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_RETURN_INFO');
    });

    it('退貨數量超出購買數量，應返回 400', async () => {
      const salesToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce(mockOrder);

      const res = await request(app)
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          original_order_id: 'SO-20260523-0001',
          return_date: '2026-05-23',
          details: [{ product_id: 'PROD-A01', quantity: 15 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_RETURN_QTY');
    });

    it('正常建立退貨單應成功並返回 DRAFT 狀態', async () => {
      const salesToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.salesReturn.count.mockResolvedValueOnce(0);
      prisma.salesReturn.create.mockResolvedValueOnce({
        ...mockReturn,
        status: 'DRAFT'
      });

      const res = await request(app)
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          original_order_id: 'SO-20260523-0001',
          return_date: '2026-05-23',
          details: [{ product_id: 'PROD-A01', quantity: 5, is_restocked: true }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.returnId).toBe('SR-20260523-0001');
    });
  });

  describe('2. 銷售退貨單核准 (Approve Sales Return)', () => {
    it('非 DRAFT 狀態的退貨單進行核准，應返回 400', async () => {
      const acctToken = jwt.sign(
        { user_id: 2, role: 'ACCT', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesReturn.findUnique.mockResolvedValueOnce({
        ...mockReturn,
        status: 'APPROVED'
      });

      const res = await request(app)
        .post('/api/sales-returns/SR-20260523-0001/approve')
        .set('Authorization', `Bearer ${acctToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_RETURN_STATUS');
    });

    it('核准退貨為良品回庫：應加回主庫存、扣減累計消費/調整會員等級，並寫入折讓單與會計分錄', async () => {
      const acctToken = jwt.sign(
        { user_id: 2, role: 'ACCT', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesReturn.findUnique.mockResolvedValueOnce(mockReturn);
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct);
      prisma.member.findUnique.mockResolvedValueOnce(mockMember);
      prisma.creditMemo.count.mockResolvedValueOnce(0);

      // Mock updates
      prisma.product.update.mockResolvedValueOnce({});
      prisma.member.update.mockResolvedValueOnce({});
      prisma.creditMemo.create.mockResolvedValueOnce({
        memoId: 'CM-20260523-0001',
        memoAmount: 500.00,
        status: 'UNAPPLIED'
      });
      prisma.salesReturn.update.mockResolvedValueOnce({
        ...mockReturn,
        status: 'APPROVED'
      });

      const res = await request(app)
        .post('/api/sales-returns/SR-20260523-0001/approve')
        .set('Authorization', `Bearer ${acctToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.salesReturn.status).toBe('APPROVED');
      expect(res.body.data.creditMemo.memoId).toBe('CM-20260523-0001');

      // 驗證良品加回主庫存
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { productId: 'PROD-A01' },
        data: { stockQuantity: 15.00 } // 10.00 原庫存 + 5.00 退貨良品
      });

      // 驗證會員累計消費減少 500 元，且等級變更 (原 15000 -> 14500，仍為 SILVER，但總消費更新)
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { memberId: 'MBR-20260523-0001' },
        data: {
          totalSpent: 14500.00,
          tier: 'SILVER'
        }
      });

      // 驗證會計日記帳寫入：5 個分錄
      // 分錄 A：
      // 借：SALES_RETURN = 476.19
      // 借：SALES_TAX_PAYABLE = 23.81
      // 貸：AR = 500.00
      // 分錄 B (良品)：
      // 借：INVENTORY = 325.00 (65.00 * 5)
      // 貸：COGS = 325.00
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(5);
    });

    it('核准退貨為不良品報廢：庫存不加回、新增報廢紀錄，並寫入報廢損失會計分錄', async () => {
      const acctToken = jwt.sign(
        { user_id: 2, role: 'ACCT', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      // 設定 mockReturnDetails 為 isRestocked = false
      const scrapReturn = {
        ...mockReturn,
        salesReturnDetails: [
          {
            productId: 'PROD-A01',
            quantity: 5.00,
            unitPrice: 100.00,
            subtotal: 500.00,
            isRestocked: false
          }
        ]
      };

      prisma.salesReturn.findUnique.mockResolvedValueOnce(scrapReturn);
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct);
      prisma.member.findUnique.mockResolvedValueOnce(mockMember);
      prisma.creditMemo.count.mockResolvedValueOnce(0);

      // Mock updates
      prisma.damagedInventory.create.mockResolvedValueOnce({});
      prisma.member.update.mockResolvedValueOnce({});
      prisma.creditMemo.create.mockResolvedValueOnce({
        memoId: 'CM-20260523-0001',
        memoAmount: 500.00,
        status: 'UNAPPLIED'
      });
      prisma.salesReturn.update.mockResolvedValueOnce({
        ...scrapReturn,
        status: 'APPROVED'
      });

      const res = await request(app)
        .post('/api/sales-returns/SR-20260523-0001/approve')
        .set('Authorization', `Bearer ${acctToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 不會呼叫 product.update (因為非良品不回主庫存)
      expect(prisma.product.update).not.toHaveBeenCalled();

      // 驗證新增商品報廢紀錄
      expect(prisma.damagedInventory.create).toHaveBeenCalledWith({
        data: {
          returnId: 'SR-20260523-0001',
          productId: 'PROD-A01',
          quantity: 5.00,
          scrapReason: '銷售退貨不良品報廢'
        }
      });

      // 驗證會計日記帳寫入：5 個分錄
      // 分錄 A：
      // 借：SALES_RETURN = 476.19
      // 借：SALES_TAX_PAYABLE = 23.81
      // 貸：AR = 500.00
      // 分錄 C (不良品報廢)：
      // 借：SCRAP_LOSS = 325.00 (65.00 * 5)
      // 貸：COGS = 325.00
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(5);
    });
  });
});
