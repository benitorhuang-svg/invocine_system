const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// 剛性校驗正則表達式
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAIWAN_PHONE_REGEX = /^09\d{8}$/; // 09 開頭，共 10 碼數字

/**
 * 產生自增格式的 member_id (格式 MBR-YYYYMMDD-XXXX)
 */
async function generateMemberId(tx) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${date}`;

  // 查詢當日目前已註冊的會員數量
  const prefix = `MBR-${dateStr}-`;
  const count = await tx.member.count({
    where: {
      memberId: {
        startsWith: prefix,
      },
    },
  });

  const nextSeq = String(count + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * 前台會員註冊
 */
async function registerMember({ email, phone, password, real_name }) {
  // 1. 欄位格式校驗
  if (!email || !EMAIL_REGEX.test(email)) {
    const error = new Error('Email 格式不正確');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  if (!phone || !TAIWAN_PHONE_REGEX.test(phone)) {
    const error = new Error('手機號碼格式不正確 (須為台灣 09 開頭 10 碼數字)');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('密碼長度不得小於 6 位數');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  if (!real_name || real_name.trim().length === 0) {
    const error = new Error('真實姓名不可為空');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  // 2. 唯一性校驗
  const existingEmail = await prisma.member.findUnique({ where: { email } });
  if (existingEmail) {
    const error = new Error('Email 已被重複註冊');
    error.status = 400;
    error.code = 'ERR_EMAIL_EXISTS';
    throw error;
  }

  const existingPhone = await prisma.member.findUnique({ where: { phone } });
  if (existingPhone) {
    const error = new Error('手機號碼已被重複註冊');
    error.status = 400;
    error.code = 'ERR_PHONE_EXISTS';
    throw error;
  }

  // 3. 雜湊密碼與寫入資料庫 (在 Transaction 內安全產生 member_id)
  return await prisma.$transaction(async (tx) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const memberId = await generateMemberId(tx);

    const newMember = await tx.member.create({
      data: {
        memberId,
        email,
        phone,
        passwordHash,
        realName: real_name,
        tier: 'BRONZE',
        totalSpent: 0.00,
        isActive: true,
      },
    });

    return {
      member_id: newMember.memberId,
      email: newMember.email,
      real_name: newMember.realName,
    };
  });
}

/**
 * 前台會員登入
 */
async function loginMember({ email, password }) {
  if (!email || !password) {
    const error = new Error('請輸入 Email 與密碼');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member || !member.isActive) {
    const error = new Error('帳號不存在或已被停用');
    error.status = 404;
    error.code = 'ERR_MEMBER_NOT_FOUND';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, member.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('密碼輸入錯誤');
    error.status = 401;
    error.code = 'ERR_INVALID_TOKEN';
    throw error;
  }

  // 簽發專屬 MEMBER JWT
  const accessToken = jwt.sign(
    { member_id: member.memberId, type: 'MEMBER' },
    process.env.JWT_MEMBER_SECRET || 'membersecret',
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { member_id: member.memberId, type: 'MEMBER' },
    process.env.JWT_REFRESH_SECRET || 'refreshsecret',
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    member: {
      member_id: member.memberId,
      email: member.email,
      real_name: member.realName,
      tier: member.tier,
    },
  };
}

/**
 * 後台員工登入
 */
async function loginStaff({ username, password }) {
  if (!username || !password) {
    const error = new Error('請輸入帳號與密碼');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    const error = new Error('員工帳號不存在或已被停用');
    error.status = 404;
    error.code = 'ERR_MEMBER_NOT_FOUND';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('密碼輸入錯誤');
    error.status = 401;
    error.code = 'ERR_INVALID_TOKEN';
    throw error;
  }

  // 簽發專屬 STAFF JWT，包含 role 名稱
  const accessToken = jwt.sign(
    { user_id: user.userId, role: user.role.roleName, type: 'STAFF' },
    process.env.JWT_STAFF_SECRET || 'staffsecret',
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { user_id: user.userId, role: user.role.roleName, type: 'STAFF' },
    process.env.JWT_REFRESH_SECRET || 'refreshsecret',
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      user_id: user.userId,
      username: user.username,
      real_name: user.realName,
      role: user.role.roleName,
    },
  };
}

/**
 * 後台員工註冊 (限 ADMIN 執行)
 */
async function registerStaff({ username, password, real_name, role_id }) {
  if (!username || !password || !real_name || !role_id) {
    const error = new Error('欄位必填');
    error.status = 400;
    error.code = 'ERR_INVALID_MEMBER_INFO';
    throw error;
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    const error = new Error('帳號已被重複註冊');
    error.status = 400;
    error.code = 'ERR_EMAIL_EXISTS';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      username,
      passwordHash,
      realName: real_name,
      roleId: Number(role_id),
      isActive: true,
    },
  });

  return {
    user_id: newUser.userId,
    username: newUser.username,
    real_name: newUser.realName,
  };
}

module.exports = {
  registerMember,
  loginMember,
  loginStaff,
  registerStaff,
};
