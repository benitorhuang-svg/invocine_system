const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/product.controller.js', 'utf8');

const target = 'function formatProduct(product, showCostPrice = false) {\n  const formatted = {\n    product_id: product.productId,\n    barcode: product.barcode,\n    product_name: product.productName,\n    spec: product.spec,\n    unit: product.unit,\n    retail_price: Number(product.retailPrice),\n    stock_quantity: Number(product.stockQuantity),\n    safety_stock: Number(product.safetyStock),\n    created_at: product.createdAt\n  };\n  if (showCostPrice) {\n    formatted.cost_price = Number(product.costPrice);\n  }\n  return formatted;\n}';

const replacement = 'function formatProduct(product, showCostPrice = false) {\n  const formatted = {\n    product_id: product.productId,\n    productId: product.productId,\n    barcode: product.barcode,\n    product_name: product.productName,\n    productName: product.productName,\n    spec: product.spec,\n    unit: product.unit,\n    retail_price: Number(product.retailPrice),\n    retailPrice: Number(product.retailPrice),\n    stock_quantity: Number(product.stockQuantity),\n    stockQuantity: Number(product.stockQuantity),\n    safety_stock: Number(product.safetyStock),\n    safetyStock: Number(product.safetyStock),\n    created_at: product.createdAt\n  };\n  if (showCostPrice) {\n    formatted.cost_price = Number(product.costPrice);\n    formatted.costPrice = Number(product.costPrice);\n  }\n  return formatted;\n}';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('backend/src/controllers/product.controller.js', content, 'utf8');
  console.log('Successfully updated product.controller.js!');
} else {
  console.error('Target not found in product.controller.js!');
  process.exit(1);
}
