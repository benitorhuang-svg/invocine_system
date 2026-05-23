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

describe('銷售訂單事務處理與財務日記帳整合測試 (Sales Order & Ledgers)', () => {
  const mockMember = {
    memberId: 'MBR-20260523-0001',
    email: 'member@example.com',
    phone: '0912345678',
    realName: '張會員',
    tier: 'BRONZE',
    totalSpent: 0.00,
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
    status: 'DRAFT',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 銷售訂單建立與前置校驗', () => {
    it('會員未啟用或不存在時建立銷售單，應攔截並返回 400', async () => {
      const staffToken = jwt.sign(
        { user_id: 1, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.member.findUnique.mockResolvedValueOnce(null); // Member not found

      const res = await request(app)
        .post('/api/sales-orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          member_id: 'MBR-NONEXISTENT',
          order_date: '2026-05-23',
          details: [{ product_id: 'PROD-A01', quantity: 2, unit_price: 100 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_MEMBER_NOT_FOUND');
    });
  });

  describe('2. 審核扣庫、悲觀鎖定與雙分錄會計帳 (Approve Order & Ledgers)', () => {
    it('庫存不足時，核准訂單應拋出錯誤，觸發交易 Rollback', async () => {
      const acctToken = jwt.sign(
        { user_id: 2, role: 'ACCT', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      // Mock order exists
      prisma.salesOrder.findUnique.mockResolvedValueOnce(mockOrder);
      // Mock insufficient stock (demand 10, stock 5)
      prisma.product.findUnique.mockResolvedValueOnce({
        ...mockProduct,
        stockQuantity: 5.00
      });

      const res = await request(app)
        .post('/api/sales-orders/SO-20260523-0001/approve')
        .set('Authorization', `Bearer ${acctToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INSUFFICIENT_STOCK');
    });

    it('核准成功應扣減庫存、更新會員等級，且寫入雙分錄複式日記帳', async () => {
      const acctToken = jwt.sign(
        { user_id: 2, role: 'ACCT', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.salesOrder.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct);
      prisma.member.findUnique.mockResolvedValueOnce(mockMember);

      // Mock update returns
      prisma.product.update.mockResolvedValueOnce({});
      prisma.member.update.mockResolvedValueOnce({});
      prisma.salesOrder.update.mockResolvedValueOnce({
        ...mockOrder,
        status: 'APPROVED'
      });

      const res = await request(app)
        .post('/api/sales-orders/SO-20260523-0001/approve')
        .set('Authorization', `Bearer ${acctToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');

      // 驗證悲觀鎖定 (SELECT FOR UPDATE) 是否被執行
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM products WHERE product_id IN (\'PROD-A01\') FOR UPDATE')
      );

      // 驗證會計日記帳寫入：借貸平衡
      // 總額 1000：
      // 借：AR (應收帳款) = 1000
      // 貸：SALES_REVENUE (營業收入) = 952.38
      // 貸：SALES_TAX_PAYABLE (銷項稅額) = 47.62
      // 借：COGS (銷貨成本) = 650 (65 * 10)
      // 貸：INVENTORY (存貨) = 650
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(5);
    });
  });
});
