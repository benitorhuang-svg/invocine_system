const errorHandler = (err, req, res, next) => {
  console.error('Error Handler Triggered:', err);

  const status = err.status || 500;
  const code = err.code || 'ERR_INTERNAL_SERVER_ERROR';
  const message = err.message || '伺服器內部發生未知錯誤';

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

module.exports = errorHandler;
