# DDD Phase 2 重構任務清單 (Task Breakdown)

共 **38 個微任務**，分 9 步驟依序執行。每個任務均有明確驗證標準，完成後打 `[x]`。

---

## Step 1：建立目錄結構 (Directory Scaffolding)

- [ ] **T2-DDD-01**：在 `backend/src/domain/shared/` 建立空白佔位 `Base.js`, `Exceptions.js`, `Money.js`, `EventDispatcher.js`
  - **驗證**：`ls backend/src/domain/shared/` 顯示 4 個文件
- [ ] **T2-DDD-02**：建立 `domain/` 下 6 個限界上下文子目錄：`iam/`, `member/`, `product/`, `sales/`, `return/`, `finance/`
  - **驗證**：每個目錄含一個 `index.js` 空文件
- [ ] **T2-DDD-03**：建立 `application/` 下 5 個子目錄：`iam/`, `member/`, `product/`, `sales/`, `return/`
  - **驗證**：目錄結構符合 specification.md 第一節圖示
- [ ] **T2-DDD-04**：建立 `infrastructure/database/repositories/`、`infrastructure/logging/`、`infrastructure/security/`
  - **驗證**：`git status` 顯示新目錄（含 `.gitkeep`）
- [ ] **T2-DDD-05**：建立 `presentation/http/controllers/`、`presentation/http/middlewares/`、`presentation/http/routes/`
  - **驗證**：目錄存在且含佔位文件

---

## Step 2：共享基礎類別 (Shared Domain Kernel)

- [ ] **T2-DDD-06**：實作 `domain/shared/Base.js`
  - 包含：`Entity`（含 `_id`, `equals()`）、`AggregateRoot`（含 `_domainEvents`, `addDomainEvent()`, `clearEvents()`）、`ValueObject`（含 `equals()`）
  - **驗證**：`new Entity('id-1').equals(new Entity('id-1'))` 返回 `true`
- [ ] **T2-DDD-07**：實作 `domain/shared/Exceptions.js`
  - 包含：`DomainException`、`NotFoundException`（404）、`ForbiddenException`（403）、`ConflictException`（409）、`ValidationException`（422）
  - **驗證**：`new NotFoundException('X')` 的 `statusCode` 為 `404`
- [ ] **T2-DDD-08**：實作 `domain/shared/Money.js`
  - 整數分 Value Object；`add()`, `subtract()`, `multiply(qty)`, `isGreaterThanOrEqual(other)`；`RoundHalfUp` 四捨五入
  - **驗證**：`Money.fromYuan(1.005).toCents()` 等於 `101`（RoundHalfUp）
- [ ] **T2-DDD-09**：實作 `domain/shared/EventDispatcher.js`
  - 支援 `register(eventName, handler)` 與 `dispatch(event)`
  - **驗證**：dispatch 一個事件後 handler 被呼叫

---

## Step 3：純領域模型 (Domain Models)

- [ ] **T2-DDD-10**：實作 `domain/iam/User.js`
  - Invariants：密碼強度（≥8碼含大小寫數字）；角色枚舉校驗；`activate()` / `deactivate()`
  - **驗證**：`User.create({ password: 'weak' })` 拋出 `ValidationException`
- [ ] **T2-DDD-11**：實作 `domain/member/Member.js`
  - Invariants：Email 格式（`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`）；手機格式（`/^09\d{8}$/`）；`addSpending(amount)` 自動計算並觸發等級升級
  - **驗證**：`member.addSpending(Money.fromYuan(50001))` 後 `member.tier` 變為 `'GOLD'`
- [ ] **T2-DDD-12**：實作 `domain/product/Product.js`
  - Invariants：`stock_quantity >= 0`；`retail_price >= cost_price`；`deductStock(qty)` 低水位時自動 `addDomainEvent(new ProductLowStockAlert(...))`
  - **驗證**：庫存扣至低水位後 `product.domainEvents` 含 `ProductLowStockAlert`
- [ ] **T2-DDD-13**：實作 `domain/sales/SalesOrder.js`
  - Invariants：折後單價 ≥ 成本（毛利守衡）；`approve()` 冪等（已 APPROVED 不重複執行）；狀態機校驗
  - **驗證**：`approve()` 對已核准訂單拋出 `ConflictException`
- [ ] **T2-DDD-14**：實作 `domain/return/SalesReturn.js`
  - Invariants：退貨數量 ≤ (原出貨 - 歷史已退)；`approve()` 狀態機
  - **驗證**：超量退貨拋出 `ValidationException('ERR_RETURN_EXCEEDED')`
- [ ] **T2-DDD-15**：實作 `domain/finance/JournalEntry.js` + `BookkeepingService.js`
  - Invariants：`Sum(Debit) - Sum(Credit) === 0`（以分為單位）；僅允許 INSERT
  - **驗證**：借貸不平衡時拋出 `ValidationException('ERR_LEDGER_UNBALANCED')`

---

## Step 4：純領域單元測試 (Unit Tests — 0 DB / 0 Mock)

- [ ] **T2-DDD-16**：建立 `tests/unit/domain/Member.test.js`
  - 測試：Email 格式校驗、手機格式校驗、等級升級邊界（9999/10000/49999/50000/99999/100000 元）
  - **驗證**：`npm test -- tests/unit/domain/Member.test.js` 全數通過
- [ ] **T2-DDD-17**：建立 `tests/unit/domain/Product.test.js`
  - 測試：庫存扣減、超賣阻斷、低水位事件發布
  - **驗證**：`npm test -- tests/unit/domain/Product.test.js` 全數通過
- [ ] **T2-DDD-18**：建立 `tests/unit/domain/Money.test.js`
  - 測試：RoundHalfUp、加減乘、負數阻斷、equals
  - **驗證**：`npm test -- tests/unit/domain/Money.test.js` 全數通過
- [ ] **T2-DDD-19**：建立 `tests/unit/domain/SalesOrder.test.js`
  - 測試：毛利守衡、冪等 approve、狀態機
  - **驗證**：`npm test -- tests/unit/domain/SalesOrder.test.js` 全數通過

---

## Step 5：Repository 介面 + Prisma 實作 (Infrastructure)

- [ ] **T2-DDD-20**：建立 `domain/member/IMemberRepository.js`（抽象介面文件，JSDoc 定義契約）
- [ ] **T2-DDD-21**：建立 `domain/product/IProductRepository.js`（含 `lock(ids, tx)` 悲觀鎖契約）
- [ ] **T2-DDD-22**：建立 `domain/sales/ISalesOrderRepository.js`
- [ ] **T2-DDD-23**：實作 `infrastructure/database/repositories/PrismaMemberRepository.js`
  - 雙軌還原：`toDomain()` 同時相容 `camelCase`（ORM）與 `snake_case`（`$queryRaw`）
  - **驗證**：傳入 snake_case 原始物件能正確還原 `Member` 聚合根
- [ ] **T2-DDD-24**：實作 `infrastructure/database/repositories/PrismaProductRepository.js`
  - 含 `lock(productIds, tx)` → `tx.$executeRaw\`SELECT..FOR UPDATE\``（使用 `Prisma.join`）
  - **驗證**：`lock()` 不拋錯且使用 `$executeRaw`（非 `$executeRawUnsafe`）
- [ ] **T2-DDD-25**：實作 `infrastructure/database/repositories/PrismaSalesOrderRepository.js`
  - **驗證**：`findById()` 返回正確的 `SalesOrder` 聚合根

---

## Step 6：稽核日誌與 Outbox (Cross-Cutting Concerns)

- [ ] **T2-DDD-26**：實作 `infrastructure/logging/AuditPlugin.js`
  - 使用 `AsyncLocalStorage` 追蹤當前操作者；Prisma middleware 在 `create/update/delete` 時自動寫入 `audit_logs`
  - **驗證**：執行商品更新 API 後，`audit_logs` 表出現對應記錄含 `before`/`after` JSON
- [ ] **T2-DDD-27**：實作 `infrastructure/database/OutboxWorker.js`
  - At-Least-Once：輪詢 `outbox_events` 表，`status='PENDING'` 的記錄逐一處理並標記 `PROCESSED`
  - **驗證**：手動插入一筆 PENDING 記錄，Worker 處理後狀態變為 PROCESSED

---

## Step 7：應用層 Use Cases

- [ ] **T2-DDD-28**：實作 `application/sales/ApproveSalesOrderUseCase.js`
  - 協調：鎖定 Member → 鎖定 Products（字典序）→ 呼叫 `order.approve()` → 扣庫 → 更新 `member.addSpending()` → Repository 儲存
  - **驗證**：整個流程在一個 `$transaction` 內執行
- [ ] **T2-DDD-29**：實作 `application/return/ApproveReturnUseCase.js`
  - 協調：校驗退貨數量 → 良品回庫 / 不良品轉 `damaged_inventories` → 沖銷 AR
  - **驗證**：超量退貨拋出 `ValidationException`；良品庫存正確增加
- [ ] **T2-DDD-30**：實作 `application/member/RegisterMemberUseCase.js`
  - 協調：Email/手機重複性校驗 → `Member.create()` → Repository 儲存
  - **驗證**：重複 Email 返回 `ConflictException`
- [ ] **T2-DDD-31**：實作 `application/product/CreateProductUseCase.js`
  - 協調：條碼唯一性校驗 → `Product.create()` → Repository 儲存
  - **驗證**：重複條碼返回 `ConflictException('ERR_BARCODE_EXISTS')`

---

## Step 8：重構表現層 (Presentation Layer Refactoring)

- [ ] **T2-DDD-32**：重構 `presentation/http/controllers/SalesController.js`
  - 寫入路徑呼叫 `ApproveSalesOrderUseCase`；讀取路徑直連 Prisma（CQRS）
  - **驗證**：Controller 無任何業務邏輯，只做參數提取與 Use Case 呼叫
- [ ] **T2-DDD-33**：重構 `presentation/http/controllers/ReturnController.js`
  - **驗證**：同上，呼叫 `ApproveReturnUseCase`
- [ ] **T2-DDD-34**：重構 `presentation/http/controllers/ProductController.js`
  - **驗證**：同上，呼叫 `CreateProductUseCase`
- [ ] **T2-DDD-35**：重構 `presentation/http/controllers/AuthController.js`
  - **驗證**：同上，呼叫 `RegisterMemberUseCase` / `LoginUseCase`
- [ ] **T2-DDD-36**：更新 `presentation/http/middlewares/errorHandler.js`
  - 將 `Exceptions.js` 領域異常自動對映為 HTTP 狀態碼（404/403/409/422）
  - **驗證**：拋出 `NotFoundException` → API 返回 `404`；拋出 `ValidationException` → API 返回 `422`

---

## Step 9：集成測試驗證 (Integration Tests)

- [ ] **T2-DDD-37**：更新 `tests/integration/*.test.js` 以符合新架構的 API 行為（路由不變，業務行為不變）
  - **驗證**：所有現有 integration test 用例在新架構下繼續通過
- [ ] **T2-DDD-38**：執行完整測試套件
  - **驗證**：`npm test` 輸出 `Test Suites: N passed`，零失敗，零 error

---

## 完成統計

| Step | 任務數 | 狀態 |
|---|---|---|
| Step 1 目錄結構 | 5 | ⏳ |
| Step 2 共享基礎類別 | 4 | ⏳ |
| Step 3 領域模型 | 6 | ⏳ |
| Step 4 單元測試 | 4 | ⏳ |
| Step 5 Repository | 6 | ⏳ |
| Step 6 Outbox/Audit | 2 | ⏳ |
| Step 7 Use Cases | 4 | ⏳ |
| Step 8 表現層 | 5 | ⏳ |
| Step 9 集成測試 | 2 | ⏳ |
| **總計** | **38** | **0/38** |
