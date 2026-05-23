const returnService = require('../services/return.service');

const createSalesReturn = async (req, res, next) => {
  try {
    const { original_order_id, return_date, details } = req.body;
    const createdBy = req.user.user_id;
    const salesReturn = await returnService.createSalesReturn({ original_order_id, return_date, details, created_by: createdBy });
    return res.status(201).json({
      success: true,
      data: salesReturn
    });
  } catch (error) {
    next(error);
  }
};

const approveSalesReturn = async (req, res, next) => {
  try {
    const approvedBy = req.user.user_id;
    const result = await returnService.approveSalesReturn(req.params.id, approvedBy);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getSalesReturns = async (req, res, next) => {
  try {
    const returns = await returnService.getSalesReturns();
    return res.status(200).json({
      success: true,
      data: returns
    });
  } catch (error) {
    next(error);
  }
};

const getSalesReturnById = async (req, res, next) => {
  try {
    const salesReturn = await returnService.getSalesReturnById(req.params.id);
    return res.status(200).json({
      success: true,
      data: salesReturn
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSalesReturn,
  approveSalesReturn,
  getSalesReturns,
  getSalesReturnById
};
