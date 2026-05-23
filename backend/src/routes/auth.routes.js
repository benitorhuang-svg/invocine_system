const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateDualJWT } = require('../middlewares/auth.middleware');
const { requireStaffOnly, requireMemberOnly, authorizeStaffRoles } = require('../middlewares/rbac.middleware');

// 前台會員路由
router.post('/member/register', authController.registerMember);
router.post('/member/login', authController.loginMember);
router.get('/member/profile', authenticateDualJWT, requireMemberOnly, authController.getMemberProfile);

// 後台員工路由
router.post('/auth/login', authController.loginStaff);

// 後台員工註冊 (限 ADMIN 角色使用)
router.post('/auth/register', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN'), authController.registerStaff);


// Aliases for frontend routes
router.post('/auth/member/register', authController.registerMember);
router.post('/auth/member/login', authController.loginMember);
router.post('/auth/staff/login', authController.loginStaff);
router.get('/auth/members', authenticateDualJWT, authController.getMembers);

module.exports = router;