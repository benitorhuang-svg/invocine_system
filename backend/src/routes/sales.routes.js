const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticateDualJWT } = require('../middlewares/auth.middleware');
const { requireStaffOnly, authorizeStaffRoles } = require('../middlewares/rbac.middleware');

router.get('/', authenticateDualJWT, requireStaffOnly, salesController.getSalesOrders);
router.get('/:id', authenticateDualJWT, requireStaffOnly, salesController.getSalesOrderById);

// Staff only routes for managing sales orders
router.post('/', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'SALES'), salesController.createSalesOrder);
router.post('/:id/approve', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'ACCT'), salesController.approveSalesOrder);

module.exports = router;
