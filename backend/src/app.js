require('dotenv').config();
const express = require('express');
const errorHandler = require('./middlewares/error.middleware');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const salesRoutes = require('./routes/sales.routes');
const returnRoutes = require('./routes/return.routes');

const app = express();

app.use(express.json());

// 註冊認證/會員相關路由
app.use('/api', authRoutes);

// 註冊商品相關路由
app.use('/api/products', productRoutes);

// 註冊銷售訂單相關路由
app.use('/api/sales-orders', salesRoutes);

// 註冊銷售退貨相關路由
app.use('/api/sales-returns', returnRoutes);

// 健康檢查端點
app.get('/health', (req, res) => {
  return res.status(200).json({ success: true, message: 'Server is healthy' });
});

// 全域錯誤處理中介軟體 (必須放在所有路由之後)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
