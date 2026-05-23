const prisma = require('../utils/prisma');

async function createProduct({ product_id, barcode, product_name, spec, unit, cost_price, retail_price, stock_quantity, safety_stock }) {
  if (!product_id || !barcode || !product_name || cost_price === undefined || retail_price === undefined) {
    const error = new Error('必要欄位未填寫');
    error.status = 400;
    error.code = 'ERR_INVALID_PRODUCT_INFO';
    throw error;
  }

  if (Number(cost_price) < 0) {
    const error = new Error('進貨成本不可小於 0');
    error.status = 400;
    error.code = 'ERR_INVALID_PRODUCT_INFO';
    throw error;
  }

  if (Number(retail_price) < Number(cost_price)) {
    const error = new Error('零售價格不可低於進貨成本');
    error.status = 400;
    error.code = 'ERR_INVALID_PRODUCT_INFO';
    throw error;
  }

  // 檢查條碼唯一性
  const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
  if (existingBarcode) {
    const error = new Error('商品條碼已存在');
    error.status = 400;
    error.code = 'ERR_BARCODE_EXISTS';
    throw error;
  }

  // 檢查商品ID唯一性
  const existingId = await prisma.product.findUnique({ where: { productId: product_id } });
  if (existingId) {
    const error = new Error('商品 ID 已存在');
    error.status = 400;
    error.code = 'ERR_PRODUCT_EXISTS';
    throw error;
  }

  return await prisma.product.create({
    data: {
      productId: product_id,
      barcode,
      productName: product_name,
      spec,
      unit: unit || 'pcs',
      costPrice: cost_price,
      retailPrice: retail_price,
      stockQuantity: stock_quantity !== undefined ? stock_quantity : 0.00,
      safetyStock: safety_stock !== undefined ? safety_stock : 10.00,
    }
  });
}

async function getProducts() {
  return await prisma.product.findMany();
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({ where: { productId: id } });
  if (!product) {
    const error = new Error('商品不存在');
    error.status = 404;
    error.code = 'ERR_PRODUCT_NOT_FOUND';
    throw error;
  }
  return product;
}

async function updateProduct(id, updateData) {
  const product = await getProductById(id);

  const costPrice = updateData.cost_price !== undefined ? updateData.cost_price : product.costPrice;
  const retailPrice = updateData.retail_price !== undefined ? updateData.retail_price : product.retailPrice;

  if (Number(costPrice) < 0) {
    const error = new Error('進貨成本不可小於 0');
    error.status = 400;
    error.code = 'ERR_INVALID_PRODUCT_INFO';
    throw error;
  }

  if (Number(retailPrice) < Number(costPrice)) {
    const error = new Error('零售價格不可低於進貨成本');
    error.status = 400;
    error.code = 'ERR_INVALID_PRODUCT_INFO';
    throw error;
  }

  if (updateData.barcode && updateData.barcode !== product.barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: updateData.barcode } });
    if (existingBarcode) {
      const error = new Error('商品條碼已存在');
      error.status = 400;
      error.code = 'ERR_BARCODE_EXISTS';
      throw error;
    }
  }

  return await prisma.product.update({
    where: { productId: id },
    data: {
      barcode: updateData.barcode,
      productName: updateData.product_name,
      spec: updateData.spec,
      unit: updateData.unit,
      costPrice: updateData.cost_price,
      retailPrice: updateData.retail_price,
      stockQuantity: updateData.stock_quantity,
      safetyStock: updateData.safety_stock,
    }
  });
}

async function deleteProduct(id) {
  await getProductById(id);
  return await prisma.product.delete({ where: { productId: id } });
}

async function getLowStockAlerts() {
  const products = await prisma.product.findMany();
  return products.filter(p => Number(p.stockQuantity) <= Number(p.safetyStock));
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockAlerts
};
