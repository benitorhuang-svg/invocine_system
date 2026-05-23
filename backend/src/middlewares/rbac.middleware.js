// B. 限後台員工過濾器 (Staff Only Gatekeeper)
const requireStaffOnly = (req, res, next) => {
  if (!req.user || req.user.type !== 'STAFF') {
    return res.status(403).json({
      success: false,
      error: { code: 'ERR_FORBIDDEN', message: '越權訪問拒絕：前台會員禁止存取後台管理端' }
    });
  }
  next();
};

// C. 限前台會員過濾器 (Member Only Gatekeeper)
const requireMemberOnly = (req, res, next) => {
  if (!req.user || req.user.type !== 'MEMBER') {
    return res.status(403).json({
      success: false,
      error: { code: 'ERR_FORBIDDEN', message: '越權訪問拒絕：僅限登入會員本人存取此端點' }
    });
  }
  next();
};

// D. 後台 RBAC 角色層級過濾器 (RBAC Filter for Staff Roles)
const authorizeStaffRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'STAFF' || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'ERR_FORBIDDEN', message: '權限不足：您的後台角色無此操作權力' }
      });
    }
    next();
  };
};

module.exports = { requireStaffOnly, requireMemberOnly, authorizeStaffRoles };
