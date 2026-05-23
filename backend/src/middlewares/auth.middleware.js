const jwt = require('jsonwebtoken');

/**
 * 雙軌 JWT 解析器 (Dual-Track JWT Parser)
 * 支援雙金鑰 (JWT_STAFF_SECRET & JWT_MEMBER_SECRET) 機制
 */
const authenticateDualJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: '未提供授權憑證' }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. 先解碼 token 以獲取其 payload，用以辨別 type ('STAFF' 或 'MEMBER')
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.type) {
      return res.status(401).json({
        success: false,
        error: { code: 'ERR_INVALID_TOKEN', message: '憑證結構無效' }
      });
    }

    // 2. 依據身份類別選擇對應的 JWT 金鑰進行完整驗證
    let secret = null;
    if (decodedPayload.type === 'STAFF') {
      secret = process.env.JWT_STAFF_SECRET;
    } else if (decodedPayload.type === 'MEMBER') {
      secret = process.env.JWT_MEMBER_SECRET;
    } else {
      return res.status(401).json({
        success: false,
        error: { code: 'ERR_INVALID_TOKEN', message: '憑證身份類別無效' }
      });
    }

    // 3. 執行密鑰簽章驗證
    const verified = jwt.verify(token, secret);
    req.user = verified; // 注入 user 物件，包含 type, role, user_id, member_id 等
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_INVALID_TOKEN', message: '憑證無效或已過期' }
    });
  }
};

module.exports = { authenticateDualJWT };
