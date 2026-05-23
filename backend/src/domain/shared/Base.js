// 1. 值物件基類 (Value Object - 屬性相同即相等)
class ValueObject {
  constructor(props) {
    this.props = Object.freeze({ ...props });
  }
  equals(other) {
    if (other === null || other === undefined) return false;
    if (other.constructor.name !== this.constructor.name) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

// 2. 實體基類 (Entity - 由唯一識別碼定義身分)
class Entity {
  constructor(id, props) {
    this.id = id;
    this.props = props;
  }
  equals(other) {
    if (other === null || other === undefined) return false;
    if (other.constructor.name !== this.constructor.name) return false;
    return this.id === other.id;
  }
}

// 3. 聚合根基類 (Aggregate Root)
class AggregateRoot extends Entity {
  constructor(id, props) {
    super(id, props);
    this._domainEvents = [];
  }
  get domainEvents() { return this._domainEvents; }
  addDomainEvent(event) {
    this._domainEvents.push(event);
  }
  clearDomainEvents() {
    this._domainEvents = [];
  }
}

module.exports = { ValueObject, Entity, AggregateRoot };
