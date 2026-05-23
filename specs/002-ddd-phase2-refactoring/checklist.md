# DDD Phase 2 品質閘門檢核清單 (DDD Quality Gate Checklist)

**目的**：本清單為「十八大防線」的實際驗核標準，每項防線必須在程式碼中有明確實作證明，方可標記通過。

---

## 防線 01：全域剛性資源鎖定順序

- [ ] **D01-A**：`ApproveSalesOrderUseCase` 中悲觀鎖順序是否嚴格遵守 `Member → Product（productId 字典序）→ SalesOrder`？
- [ ] **D01-B**：是否無任何 Use Case 以不同順序鎖定這三種資源？

## 防線 02：抗時鐘回撥 ID 生成器

- [ ] **D02-A**：若有自定義 ID 生成邏輯，是否已加入時鐘回撥偵測（比對 `Date.now()` 與上次生成時間）？
- [ ] **D02-B**：若直接使用資料庫 AUTO_INCREMENT / Prisma 預設 ID，此防線可標記為 N/A（依賴 DB 保證）

## 防線 03：事務型發件箱 (Outbox)

- [ ] **D03-A**：領域事件（如 `ProductLowStockAlert`）是否在業務 `$transaction` 內原子性寫入 `outbox_events` 表？
- [ ] **D03-B**：`OutboxWorker` 是否以 `At-Least-Once` 語意處理事件，並在成功後標記 `PROCESSED`？
- [ ] **D03-C**：`OutboxWorker` 的處理失敗是否有 retry 機制，不會靜默丟失？

## 防線 04：Redis 冪等鍵攔截器

- [ ] **D04-A**：是否為敏感寫入 API（銷售單審核、退貨審核）實作了 `SET NX` 冪等鍵中介軟體？
- [ ] **D04-B**：重複請求是否返回 `409 Conflict` 並附帶 `ERR_DUPLICATE_REQUEST` 錯誤碼？

## 防線 05：會計總帳無鎖追加

- [ ] **D05-A**：`BookkeepingService` 是否使用純 `INSERT` 寫入日記帳分錄，從未執行 `UPDATE` 更新帳戶餘額行？
- [ ] **D05-B**：查詢帳戶餘額時，是否透過 `SUM(amount)` 聚合運算，而非讀取單一餘額欄位？

## 防線 06：混合庫存控制

- [ ] **D06-A**：`PrismaProductRepository.lock()` 是否使用 `$executeRaw` + `Prisma.join()`（非 `$executeRawUnsafe` 字串拼接）？
- [ ] **D06-B**：`Product.deductStock()` 是否在扣減前再次校驗庫存充足性（即使已鎖定）？

## 防線 07：Saga 最終一致性（預留）

- [ ] **D07-A**：**(Phase 2 暫不實施)** 標記為 `DEFERRED — 待微服務拆分後實施`

## 防線 08：冷熱數據分區歸檔（預留）

- [ ] **D08-A**：**(Phase 2 暫不實施)** DDL 中是否預留了 `created_at` 索引以支援未來分區？

## 防線 09：水平分片 Sharding（預留）

- [ ] **D09-A**：**(Phase 2 暫不實施)** 標記為 `DEFERRED — 待數據量達到分片閾值後實施`

## 防線 10：對帳與自癒補償

- [ ] **D10-A**：是否實作了背景對帳任務，交叉校核銷售單金額與日記帳分錄加總？
- [ ] **D10-B**：發現差額時，是否自動觸發補償交易並寫入修正分錄？

## 防線 11：整數分 Money 精度

- [ ] **D11-A**：所有金額計算是否統一使用 `Money.js` 值物件（整數分）？
- [ ] **D11-B**：是否無任何 `toFixed()` 或浮點數直接相乘出現在業務邏輯中？
- [ ] **D11-C**：`Money` 的 `multiply()` 是否使用 `Math.round()` 搭配 `Number.EPSILON` 實作 `RoundHalfUp`？

## 防線 12：BookkeepingService 平衡守衡

- [ ] **D12-A**：`JournalEntry` 在 `save()` 前，`BookkeepingService` 是否強制校驗 `Sum(Debit) === Sum(Credit)`（以分為單位）？
- [ ] **D12-B**：不平衡時是否拋出 `ValidationException('ERR_LEDGER_UNBALANCED')` 並回滾交易？

## 防線 13：折後毛利守衡

- [ ] **D13-A**：`SalesOrder.addDetail()` 或 `approve()` 時，是否校驗折後單價 ≥ 商品成本？
- [ ] **D13-B**：毛利為負時是否拋出 `ValidationException('ERR_NEGATIVE_MARGIN')`？

## 防線 14：Repository 雙軌強健還原

- [ ] **D14-A**：所有 Repository 的 `toDomain()` 映射器是否同時讀取 `camelCase` 與 `snake_case` 欄位名稱？
  ```js
  const id = raw.memberId ?? raw.member_id; // 雙軌相容
  ```
- [ ] **D14-B**：使用 `$queryRaw` 悲觀鎖後再呼叫 `findById()` 是否仍能正確還原聚合根？

## 防線 15：Product 充血聚合根低水位事件

- [ ] **D15-A**：`Product.deductStock()` 在庫存低於 `safety_stock` 後，是否自動呼叫 `this.addDomainEvent(new ProductLowStockAlert(...))`？
- [ ] **D15-B**：`ProductLowStockAlert` 事件是否被 `EventDispatcher` 正確分發並寫入 Outbox？

## 防線 16：依賴反轉原則 (DIP)

- [ ] **D16-A**：`domain/` 目錄下是否**零**出現 `require('@prisma/client')` 或 `require('express')`？
- [ ] **D16-B**：`application/` 目錄下是否所有 Repository 使用都透過介面（而非直接 `new PrismaXxxRepository()`）？

## 防線 17：純領域 Jest 單元測試

- [ ] **D17-A**：`tests/unit/domain/` 下的測試是否不含任何 `jest.mock()`、`supertest` 或資料庫連線？
- [ ] **D17-B**：`Member.test.js`、`Product.test.js`、`Money.test.js`、`SalesOrder.test.js` 是否全數通過？
- [ ] **D17-C**：所有 unit tests 的執行時間是否在 **1 秒以內**（無 I/O 等待）？

## 防線 18：全域 errorHandler 狀態碼自動對映

- [ ] **D18-A**：`presentation/http/middlewares/errorHandler.js` 是否自動將各 `DomainException` 子類別對映為正確 HTTP 狀態碼？
  | 例外類別 | HTTP Code |
  |---|---|
  | `NotFoundException` | 404 |
  | `ForbiddenException` | 403 |
  | `ConflictException` | 409 |
  | `ValidationException` | 422 |
- [ ] **D18-B**：Express Controller 是否**不含任何** `res.status(4xx).json({...})` 硬編碼，全部交由 `errorHandler` 處理？

---

## 統計

| 類別 | 總項目 | 通過 |
|---|---|---|
| 必須實施 (Phase 2) | 34 | 0 |
| 預留 (DEFERRED) | 4 | N/A |
