const authService = require('../services/auth.service');

const registerMember = async (req, res, next) => {
  try {
    const { email, phone, password, real_name } = req.body;
    const data = await authService.registerMember({ email, phone, password, real_name });
    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const loginMember = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginMember({ email, password });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const loginStaff = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const data = await authService.loginStaff({ username, password });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const registerStaff = async (req, res, next) => {
  try {
    const { username, password, real_name, role_id } = req.body;
    const data = await authService.registerStaff({ username, password, real_name, role_id });
    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const getMemberProfile = async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const member = await prisma.member.findUnique({
      where: { memberId: req.user.member_id }
    });
    if (!member) {
      const error = new Error('會員資料不存在');
      error.status = 404;
      error.code = 'ERR_MEMBER_NOT_FOUND';
      throw error;
    }
    return res.status(200).json({
      success: true,
      data: {
        member_id: member.memberId,
        email: member.email,
        phone: member.phone,
        real_name: member.realName,
        tier: member.tier,
        total_spent: Number(member.totalSpent)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMembers = async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const members = await prisma.member.findMany({
      where: { isActive: true }
    });
    const data = members.map(m => ({
      memberId: m.memberId,
      email: m.email,
      phone: m.phone,
      realName: m.realName,
      tier: m.tier,
      totalSpent: Number(m.totalSpent),
      isActive: m.isActive === 1 || m.isActive === true
    }));
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerMember,
  loginMember,
  loginStaff,
  registerStaff,
  getMemberProfile,
  getMembers
};