const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateDualJWT } = require('../middlewares/auth.middleware');
const { requireStaffOnly, authorizeStaffRoles } = require('../middlewares/rbac.middleware');

// Public or member/staff readable routes
router.get('/', authenticateDualJWT, productController.getProducts);
router.get('/alerts/low-stock', authenticateDualJWT, requireStaffOnly, productController.getLowStockAlerts);
router.get('/:id', authenticateDualJWT, productController.getProductById);

// Staff only routes for managing products
router.post('/', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'WAREHOUSE'), productController.createProduct);
router.put('/:id', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN', 'WAREHOUSE'), productController.updateProduct);
router.delete('/:id', authenticateDualJWT, requireStaffOnly, authorizeStaffRoles('ADMIN'), productController.deleteProduct);

module.exports = router;
