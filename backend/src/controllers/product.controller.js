const productService = require('../services/product.service');

function formatProduct(product, showCostPrice = false) {
  const formatted = {
    product_id: product.productId,
    productId: product.productId,
    barcode: product.barcode,
    product_name: product.productName,
    productName: product.productName,
    spec: product.spec,
    unit: product.unit,
    retail_price: Number(product.retailPrice),
    retailPrice: Number(product.retailPrice),
    stock_quantity: Number(product.stockQuantity),
    stockQuantity: Number(product.stockQuantity),
    safety_stock: Number(product.safetyStock),
    safetyStock: Number(product.safetyStock),
    created_at: product.createdAt
  };
  if (showCostPrice) {
    formatted.cost_price = Number(product.costPrice);
    formatted.costPrice = Number(product.costPrice);
  }
  return formatted;
}

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return res.status(201).json({
      success: true,
      data: formatProduct(product, true)
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getProducts();
    const showCostPrice = req.user && req.user.type === 'STAFF' && (req.user.role === 'ADMIN' || req.user.role === 'ACCT');
    return res.status(200).json({
      success: true,
      data: products.map(p => formatProduct(p, showCostPrice))
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    const showCostPrice = req.user && req.user.type === 'STAFF' && (req.user.role === 'ADMIN' || req.user.role === 'ACCT');
    return res.status(200).json({
      success: true,
      data: formatProduct(product, showCostPrice)
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: formatProduct(product, true)
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    return res.status(200).json({
      success: true,
      message: '商品已成功刪除'
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const products = await productService.getLowStockAlerts();
    const showCostPrice = req.user && req.user.type === 'STAFF' && (req.user.role === 'ADMIN' || req.user.role === 'ACCT');
    return res.status(200).json({
      success: true,
      data: products.map(p => formatProduct(p, showCostPrice))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockAlerts
};
