const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

// Mock Prisma Client
jest.mock('../../src/utils/prisma', () => {
  const localMock = {
    member: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(localMock)),
  };
  return localMock;
});

const prisma = require('../../src/utils/prisma');

describe('雙軌身份驗證與 RBAC 隔離安全防禦測試', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 前台會員註冊與格式強校驗 (MEMBER Registration)', () => {
    it('應攔截非法 Email 格式註冊，返回 400 與 ERR_INVALID_MEMBER_INFO', async () => {
      const res = await request(app)
        .post('/api/member/register')
        .send({
          email: 'invalid-email',
          phone: '0912345678',
          password: 'password123',
          real_name: '王小明'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_MEMBER_INFO');
    });

    it('應攔截非法台灣手機格式註冊，返回 400 與 ERR_INVALID_MEMBER_INFO', async () => {
      const res = await request(app)
        .post('/api/member/register')
        .send({
          email: 'test@example.com',
          phone: '09123', // 不足 10 碼
          password: 'password123',
          real_name: '王小明'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_MEMBER_INFO');
    });

    it('若 Email 已存在，應返回 400 與 ERR_EMAIL_EXISTS', async () => {
      prisma.member.findUnique.mockResolvedValueOnce({ memberId: 'MBR-123' }); // Email exists

      const res = await request(app)
        .post('/api/member/register')
        .send({
          email: 'duplicate@example.com',
          phone: '0912345678',
          password: 'password123',
          real_name: '王小明'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_EMAIL_EXISTS');
    });
  });

  describe('2. 雙軌驗證隔離防護 (Dual-Track Isolation)', () => {
    it('前台會員 Token 嘗試存取後台員工註冊端點，應 100% 被阻斷並返回 403 與 ERR_FORBIDDEN', async () => {
      // 產生前台會員 Token
      const memberToken = jwt.sign(
        { member_id: 'MBR-20260523-0001', type: 'MEMBER' },
        process.env.JWT_MEMBER_SECRET || 'membersecret'
      );

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          username: 'newstaff',
          password: 'password123',
          real_name: '新員工',
          role_id: 2
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('未提供 Token 存取保護路由，應返回 401 與 ERR_UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/member/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });
  });

  describe('3. 後台 RBAC 角色層級過濾 (Staff RBAC Filtering)', () => {
    it('非 ADMIN 員工 (如 WAREHOUSE) 嘗試存取後台員工註冊端點，應被阻斷並返回 403 與 ERR_FORBIDDEN', async () => {
      // 產生 WAREHOUSE 員工 Token
      const staffToken = jwt.sign(
        { user_id: 1, role: 'WAREHOUSE', type: 'STAFF' },
        process.env.JWT_STAFF_SECRET || 'staffsecret'
      );

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          username: 'newstaff',
          password: 'password123',
          real_name: '新員工',
          role_id: 2
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });
  });
});
