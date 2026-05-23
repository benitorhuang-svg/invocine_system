const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

// Mock Prisma Client
jest.mock('../../src/utils/prisma', () => {
  const localMock = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  };
  return localMock;
});

const prisma = require('../../src/utils/prisma');

describe('商品模組與欄位級權限過濾整合測試 (Product Master & RBAC)', () => {
  const mockProduct = {
    productId: 'PROD-A01',
    barcode: '4710123456789',
    productName: '進口鮮乳',
    spec: '936ml',
    unit: 'bottle',
    costPrice: 65.00,
    retailPrice: 90.00,
    stockQuantity: 100.00,
    safetyStock: 10.00,
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 商品建立與剛性校驗 (Create Product)', () => {
    it('應攔截零售價低於進貨成本之商品建立，返回 400', async () => {
      const staffToken = jwt.sign(
        { user_id: 1, role: 'WAREHOUSE', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product_id: 'PROD-A01',
          barcode: '4710123456789',
          product_name: '進口鮮乳',
          cost_price: 100.00,
          retail_price: 90.00 // 零售價低於進成本
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_PRODUCT_INFO');
    });

    it('攔截非授權角色 (如 SALES) 建立商品，返回 403', async () => {
      const staffToken = jwt.sign(
        { user_id: 2, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          product_id: 'PROD-A01',
          barcode: '4710123456789',
          product_name: '進口鮮乳',
          cost_price: 65.00,
          retail_price: 90.00
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. 欄位級進貨成本權限過濾 (Field-Level security on cost_price)', () => {
    it('ADMIN 與 ACCT 角色查詢商品列表時，應包含 cost_price', async () => {
      const adminToken = jwt.sign(
        { user_id: 1, role: 'ADMIN', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].cost_price).toBe(65.00);
      expect(res.body.data[0].retail_price).toBe(90.00);
    });

    it('SALES 角色或前台 MEMBER 查詢商品時，應 100% 遮蔽 cost_price 欄位', async () => {
      const salesToken = jwt.sign(
        { user_id: 2, role: 'SALES', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].cost_price).toBeUndefined(); // cost_price 必須不存在
      expect(res.body.data[0].retail_price).toBe(90.00);
    });
  });
});
