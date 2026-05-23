const salesService = require('../services/sales.service');

const createSalesOrder = async (req, res, next) => {
  try {
    const { member_id, order_date, details } = req.body;
    const createdBy = req.user.user_id;
    const order = await salesService.createSalesOrder({ member_id, order_date, details, created_by: createdBy });
    return res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const approveSalesOrder = async (req, res, next) => {
  try {
    const approvedBy = req.user.user_id;
    const order = await salesService.approveSalesOrder(req.params.id, approvedBy);
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getSalesOrders = async (req, res, next) => {
  try {
    const orders = await salesService.getSalesOrders();
    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

const getSalesOrderById = async (req, res, next) => {
  try {
    const order = await salesService.getSalesOrderById(req.params.id);
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSalesOrder,
  approveSalesOrder,
  getSalesOrders,
  getSalesOrderById
};
