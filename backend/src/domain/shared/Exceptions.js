class DomainException extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode; // 剛性 HTTP 狀態碼對應
  }
}

// 422 Unprocessable Entity - 違反業務規則
class BusinessRuleException extends DomainException {
  constructor(message) {
    super(message, 422);
  }
}

// 404 Not Found - 實體不存在
class NotFoundException extends DomainException {
  constructor(message) {
    super(message, 404);
  }
}

// 403 Forbidden - 權限不足或非法存取
class UnauthorizedException extends DomainException {
  constructor(message) {
    super(message, 403);
  }
}

module.exports = { DomainException, BusinessRuleException, NotFoundException, UnauthorizedException };
