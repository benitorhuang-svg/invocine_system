# DDD Phase 2 技術實施計畫 (Implementation Plan)

**參考來源**：`docs/plan.md`（完整程式碼藍圖）、`docs/specification.md`（DDD 規格）  
**本文件用途**：快速索引各模組的程式碼藍圖位置，及關鍵實作決策記錄。

---

## 一、實施順序與模組對照表

| 任務 | 文件路徑 | 對應 docs/plan.md 章節 | 狀態 |
|---|---|---|---|
| T2-DDD-06 | `domain/shared/Base.js` | `Entity / AggregateRoot / ValueObject` | ⏳ |
| T2-DDD-07 | `domain/shared/Exceptions.js` | `DomainException 系列` | ⏳ |
| T2-DDD-08 | `domain/shared/Money.js` | `Money 值物件 (整數分)` | ⏳ |
| T2-DDD-09 | `domain/shared/EventDispatcher.js` | `領域事件分發器` | ⏳ |
| T2-DDD-10 | `domain/iam/User.js` | `IAM 領域模型` | ⏳ |
| T2-DDD-11 | `domain/member/Member.js` | `Member 充血聚合根` | ⏳ |
| T2-DDD-12 | `domain/product/Product.js` | `Product 充血聚合根 + 低水位事件` | ⏳ |
| T2-DDD-13 | `domain/sales/SalesOrder.js` | `SalesOrder 充血聚合根` | ⏳ |
| T2-DDD-14 | `domain/return/SalesReturn.js` | `SalesReturn 充血聚合根` | ⏳ |
| T2-DDD-15 | `domain/finance/JournalEntry.js` | `複式記帳 + BookkeepingService` | ⏳ |
| T2-DDD-23 | `infrastructure/.../PrismaMemberRepository.js` | `Repository 雙軌強健還原` | ⏳ |
| T2-DDD-24 | `infrastructure/.../PrismaProductRepository.js` | `悲觀鎖 Prisma.join` | ⏳ |
| T2-DDD-26 | `infrastructure/logging/AuditPlugin.js` | `AsyncLocalStorage 稽核插件` | ⏳ |
| T2-DDD-27 | `infrastructure/database/OutboxWorker.js` | `Outbox At-Least-Once Worker` | ⏳ |
| T2-DDD-28 | `application/sales/ApproveSalesOrderUseCase.js` | `銷售單審核 Use Case` | ⏳ |
| T2-DDD-36 | `presentation/http/middlewares/errorHandler.js` | `全域 errorHandler 狀態碼對映` | ⏳ |

---

## 二、關鍵實作決策 (Architecture Decision Records)

### ADR-001：CommonJS 模組系統
- **決策**：全部使用 `require()` / `module.exports`，禁用 `import`/`export`
- **理由**：現有 backend 為 CommonJS；混用 ESM 會導致循環依賴問題更複雜
- **影響**：所有新建文件須使用 `'use strict';` + `module.exports`

### ADR-002：Money 以整數分儲存
- **決策**：`Money` 值物件以整數 cents 儲存，`1 元 = 100 分`
- **理由**：消除 IEEE 754 浮點數精度問題（`0.1 + 0.2 !== 0.3`）
- **影響**：Prisma schema 的 `DECIMAL` 欄位讀取後需 `× 100` 轉分；寫入前需 `÷ 100`

### ADR-003：$executeRaw 替代 $executeRawUnsafe
- **決策**：悲觀鎖一律使用 `` tx.$executeRaw`...${Prisma.join(ids)}...` ``
- **理由**：`$executeRawUnsafe` 字串拼接存在 SQL Injection 風險（OWASP A03）
- **影響**：需在文件頂部 `const { Prisma } = require('@prisma/client')`

### ADR-004：CQRS 讀寫分離
- **決策**：讀取路徑（GET API）直連 Prisma，不過 Use Case 與 Repository
- **理由**：提升讀取吞吐量，避免聚合根重構成本高昂的 N+1 查詢
- **影響**：Controller 中保留部分 Prisma 直接呼叫屬於設計意圖，非違規

### ADR-005：Repository 介面以 JSDoc 定義
- **決策**：以 JSDoc `@interface` 註解定義 Repository 契約，不使用 Class extends
- **理由**：CommonJS 無原生 interface；使用 Class 繼承會引入不必要的 prototype chain
- **影響**：IDE 可透過 JSDoc 提供型別提示

---

## 三、完整程式碼藍圖索引

詳細程式碼範例（含每個類別的完整實作骨架）請參閱：

- **[docs/plan.md](../../docs/plan.md)** — 主要程式碼藍圖（含所有模組的程式碼範例）
- **[docs/specification.md](../../docs/specification.md)** — DDD 架構規格（含十八大防線詳解）
- **[DDD_modify.md](../../docs/DDD_modify.md)** — 十八大防線總覽表（含技術機制說明）
