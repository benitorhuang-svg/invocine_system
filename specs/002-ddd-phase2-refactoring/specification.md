# DDD Phase 2 重構架構規格書 (DDD Phase 2 Refactoring Specification)

**範疇**：本文件定義將現有 Express + Prisma 後端重構為生產級 **領域驅動設計 (DDD)** 架構的技術規格。  
**前置條件**：`specs/001-invoicing-inventory-rbac-system/specification.md` 的所有業務規格保持不變，本次重構為純架構層重組，**不新增任何業務功能**。

---

## 一、分層架構規格 (Layered Architecture)

```
backend/src/
├── domain/                   # 純領域層：零依賴外部框架
│   ├── shared/               # 跨領域共享基類
│   │   ├── Base.js           # Entity, AggregateRoot, ValueObject
│   │   ├── Exceptions.js     # 領域異常 (DomainException 系列)
│   │   ├── Money.js          # 整數分 Value Object
│   │   └── EventDispatcher.js
│   ├── iam/                  # Identity & Access Management 限界上下文
│   ├── member/               # 會員 限界上下文
│   ├── product/              # 商品 限界上下文
│   ├── sales/                # 銷售 限界上下文
│   ├── return/               # 退貨 限界上下文
│   └── finance/              # 財務 限界上下文
│
├── application/              # 應用層：協調 Use Cases（無業務規則）
│   ├── iam/
│   ├── member/
│   ├── product/
│   ├── sales/
│   └── return/
│
├── infrastructure/           # 基礎設施層：Prisma、Redis、Logging
│   ├── database/
│   │   └── repositories/     # Prisma Repository 實作
│   ├── logging/              # AsyncLocalStorage 稽核插件
│   └── security/             # JWT、bcrypt 工具
│
└── presentation/             # 表現層：Express Controller + Routes
    └── http/
        ├── controllers/
        ├── middlewares/
        └── routes/
```

---

## 二、限界上下文規格 (Bounded Contexts)

### 2.1 IAM 上下文 (`domain/iam/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `User` | Aggregate Root | 密碼強度 ≥ 8 碼含大小寫數字；角色必須是 `ADMIN/ACCT/SALES/WAREHOUSE` |
| `Role` | Entity | `role_name` 唯一 |
| `IUserRepository` | 介面 | `findByUsername(username)`, `save(user)` |

### 2.2 Member 上下文 (`domain/member/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `Member` | Aggregate Root | Email/手機格式校驗；`total_spent >= 0`；等級自動升級 |
| `MemberTier` | Value Object | `BRONZE/SILVER/GOLD/PLATINUM` |
| `IMemberRepository` | 介面 | `findById()`, `findByEmail()`, `save()` |

### 2.3 Product 上下文 (`domain/product/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `Product` | Aggregate Root | `stock_quantity >= 0`；`retail_price >= cost_price`；低水位自動發布 `ProductLowStockAlert` 事件 |
| `IProductRepository` | 介面 | `findById()`, `findByBarcode()`, `save()`, `lock(ids, tx)` |

### 2.4 Sales 上下文 (`domain/sales/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `SalesOrder` | Aggregate Root | 折後單價不得低於成本（毛利守衡）；狀態機 `DRAFT→APPROVED` 冪等 |
| `SalesOrderDetail` | Entity | `quantity > 0`；`unit_price > 0` |
| `ISalesOrderRepository` | 介面 | `findById()`, `save()` |

### 2.5 Return 上下文 (`domain/return/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `SalesReturn` | Aggregate Root | 退貨數量 ≤ 原出貨數量 - 歷史已退數量 |
| `ISalesReturnRepository` | 介面 | `findById()`, `findByOrderId()`, `save()` |

### 2.6 Finance 上下文 (`domain/finance/`)
| 類別 | 類型 | 核心 Invariants |
|---|---|---|
| `JournalEntry` | Aggregate Root | `Sum(Debit) = Sum(Credit)`（差額必須為 0 分錢） |
| `BookkeepingService` | Domain Service | 強制 Append-only 寫入；不允許行級更新 |

---

## 三、依賴規則 (Dependency Rule)

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain 層**：零依賴，不得 `require` Prisma、Express 或任何第三方庫
- **Application 層**：只依賴 Domain 介面，不直接操作 Prisma
- **Infrastructure 層**：實作 Domain 定義的 Repository 介面
- **Presentation 層**：呼叫 Application Use Cases，連接全域 `errorHandler`

---

## 四、核心模式規格 (Key Patterns)

### 4.1 Repository 雙軌強健還原
Prisma ORM 查詢返回 `camelCase`，`$queryRaw` 悲觀鎖查詢返回 `snake_case`。  
Repository 的 `toDomain()` 方法必須同時相容兩種命名風格：
```js
const id = raw.memberId ?? raw.member_id;
```

### 4.2 整數分 Money
所有金額計算以整數 **分 (cents)** 為單位（1元 = 100分），使用 `RoundHalfUp`，禁止浮點數運算。

### 4.3 事務型發件箱 (Transactional Outbox)
領域事件與業務 Mutation 必須在同一個 Prisma `$transaction` 內原子性寫入 `outbox_events` 表。

### 4.4 全域鎖定順序
悲觀鎖順序強制為：`Member → Product（字典序）→ SalesOrder`，防止死鎖。

### 4.5 CQRS 讀寫分離
- **寫入路徑**：`Controller → UseCase → AggregateRoot → Repository`
- **讀取路徑**：`Controller → Prisma（直連，不過領域層）`

---

## 五、技術棧約束

| 項目 | 規格 |
|---|---|
| 模組語法 | CommonJS (`require` / `module.exports`)，禁用 ESM |
| 資料庫 | MySQL 8.0 via Prisma ORM（**不修改** 現有 DDL 結構）|
| Redis | 冪等鍵攔截 + 庫存預扣減（熱銷商品）|
| 測試 | Jest（unit: 0 DB、0 mock；integration: supertest）|
