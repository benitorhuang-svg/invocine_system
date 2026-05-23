const { ValueObject } = require('./Base');

class Money extends ValueObject {
  constructor(props) {
    super(props);
    this.validate();
  }

  validate() {
    const amountInCents = this.props.amountInCents;
    if (typeof amountInCents !== 'number' || !Number.isInteger(amountInCents)) {
      throw new Error('ERR_MONEY_MUST_BE_INTEGER_CENTS');
    }
  }

  // 工廠方法：從常見的 Decimal 數值還原
  static fromDecimal(decimalValue) {
    const cents = Math.round(Number(decimalValue) * 100);
    return new Money({ amountInCents: cents });
  }

  // 輸出為兩位小數的標準 Decimal
  toDecimal() {
    return Number((this.props.amountInCents / 100).toFixed(2));
  }

  add(other) {
    return new Money({ amountInCents: this.props.amountInCents + other.props.amountInCents });
  }

  subtract(other) {
    return new Money({ amountInCents: this.props.amountInCents - other.props.amountInCents });
  }

  multiply(rate) {
    // 支援稅率與折扣乘積計算，並執行 RoundHalfUp 剛性四捨五入
    const cents = Math.round(this.props.amountInCents * rate);
    return new Money({ amountInCents: cents });
  }
}
module.exports = Money;
