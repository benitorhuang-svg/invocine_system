const express = require('express');
const router = express.Router();
const returnController = require('../controllers/return.controller');
const { authenticateDualJWT } = require('../middlewares/auth.middleware');
const { requireStaffOnly, authorizeStaffRoles } = require('../middlewares/rbac.middleware');

router.get('/', authenticateDualJWT, requireStaffOnly, returnController.getSalesReturns);
router.get('/:id', authenticateDualJWT, requireStaffOnly, returnController.getSalesReturnById);

// Staff only routes for managing sales returns
router.post('/', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'SALES'), returnController.createSalesReturn);
router.post('/:id/approve', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'ACCT'), returnController.approveSalesReturn);

module.exports = router;
