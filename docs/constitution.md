# 進銷存與權限管理系統 (Invoicing, Inventory & RBAC System) 開發憲章

<!-- Sync Impact Report
- Version change: 1.2.0 -> 1.3.0
- List of modified principles: Expanded Section III to include detailed Global Naming Conventions
- Added sections: Database Naming Rules, Backend/Prisma Naming Rules, Frontend/UI Naming Rules, Git & Env Naming Rules
- Templates requiring updates: All documentation templates updated to production-level standards
- Follow-up TODOs: Implement Phase 1 env setups with matching names
-->

## 一、 核心開發原則 (Core Principles)

### I. 容器化與環境一致性 (Containerization & Environment Consistency)
*   **原則定義**：所有基礎設施（特別是 MySQL 8.0 資料庫）必須完全運行在 Docker 容器內，禁止依賴本地主機直接安裝的資料庫服務，以防範「在我的機器上可以運作 (Works on my machine)」的環境漂移問題。
*   **代碼級要求**：
    *   後端與資料庫的連線字串（如 `DATABASE_URL`）必須且僅能透過 `.env` 檔案的環境變數傳遞。
    *   Prisma 連線必須支援 Docker Compose 的服務名稱（例如 `mysql://user:pass@db:3306/erp_system`）。
    *   必須提供一鍵啟動腳本（`docker-compose up -d`），並且資料庫必須包含自動掛載的 `/docker-entrypoint-initdb.d` 初始化 SQL 腳本。

### II. 主副表（明細表）交易安全性 (Master-Detail Transaction Safety)
*   **原則定義**：任何涉及「主表」與「副表」聯動變更的業務（例如銷售單的建立、出貨審核、銷退處置），必須強制在同一個資料庫交易（Transaction）中執行。
*   **代碼級要求**：
    *   必須使用 Prisma Client 的 `$transaction` API 將主表寫入與明細副表寫入、庫存異動綁定為單一原子操作 (Atomic Operation)。
    *   在交易內，任何一步出錯（例如商品餘額不足、無外鍵關聯等），必須由 ORM 自動且完全地執行回滾 (Rollback)。
    *   嚴禁在交易之外進行分步非同步寫入，確保主副表數據生命週期的絕對一致性。

### III. 角色基礎存取控制 (Role-Based Access Control, RBAC)
*   **原則定義**：系統必須建立嚴密的角色與權限邊界。未經授權的請求必須在 API 路由的最前端被中介軟體 (Middleware) 阻斷，嚴格落實最小特權原則 (Principle of Least Privilege)。
*   **代碼級要求**：
    *   系統內建四個核心角色：`ADMIN`（系統管理員）、`ACCT`（會計財務）、`SALES`（業務銷售）、`WAREHOUSE`（倉管人員）。
    *   **權限矩陣表格**：
        | 功能模組 | API 端點 | ADMIN | ACCT | SALES | WAREHOUSE | 備註說明 |
        | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
        | **人員管理** | `* /api/users` | 🟢 | ❌ | ❌ | ❌ | 僅限系統管理員 |
        | **敏感價格** | `GET /api/products/cost` | 🟢 | 🟢 | ❌ | ❌ | 銷售與倉管不可存取進貨成本 |
        | **銷售單審核**| `POST /api/orders/:id/approve` | 🟢 | ❌ | ❌ | ❌ | 僅限管理員或銷售主管審核 |
        | **銷退審核** | `POST /api/returns/:id/approve`| 🟢 | 🟢 | ❌ | ❌ | 涉及退折與應收沖銷，需會計審核 |
        | **日誌審計** | `GET /api/audit-logs` | 🟢 | 🟢 | ❌ | ❌ | 僅限 ADMIN 與 ACCT 稽核 |
    *   任何越權嘗試必須返回 `403 Forbidden`，且該越權行為必須寫入 `audit_logs`。

### IV. 規格與測試驱动開發 (Specification & Test-Driven Development)
*   **原則定義**：拒絕「直覺式編碼（Vibe Coding）」。所有新功能實作或規格變更，必須先在 `.md` 規格書中完成定義，並在開發代碼前，先撰寫完成對應的整合/單元測試案例。
*   **代碼級要求**：
    *   測試案例必須覆蓋所有 Acceptance Scenarios（驗收場景）。
    *   在新功能代碼編寫前，測試必須執行且呈現「失敗（Red）」狀態。
    *   實作完成後，測試必須全部通過（Green），且單元/整合測試的覆蓋率必須符合品質閥門門檻。

### V. 系統審計與操作日誌 (System Audit & Logging)
*   **原則定義**：任何對資料庫產生 Mutation（新增、修改、刪除、審核、作廢）的動作，必須被自動且不可規避地記錄在 `audit_logs` 中。
*   **代碼級要求**：
    *   記錄必須包含：`log_id`（自增主鍵）、`user_id`（操作人）、`action`（動作如 CREATE, UPDATE, APPROVE）、`target_table`（受影響表名）、`target_key`（受影響行主鍵）、`payload_before`（變更前 JSON，若為新增則為 null）、`payload_after`（變更後 JSON，若為刪除則為 null）、`ip_address`、`created_at`。
    *   寫入日誌的動作必須與該變更的 Service 方法包在同一個資料庫 Transaction 中，以防止「業務變更成功但日誌遺漏」的情境。

---

## 二、 專案目錄結構規範 (Project Directory Specification)

專案結構必須嚴格遵循前後端分離的標準目錄設計，結構樹如下：

```
/ (root)
├── docker-compose.yml       # MySQL 8.0 容器與持久化磁碟設定
├── init-db/
│   └── schema.sql           # 資料庫初始化 DDL 與初始 Seed 數據
├── docs/                    # 系統規格書與設計文件
│   ├── constitution.md      # 開發憲章 (本文件)
│   ├── specification.md    # 業務規格書
│   ├── plan.md              # 技術實施計畫與資料表設計
│   ├── checklist.md         # 檢核清單
│   └── tasks.md             # 研發工作清單
├── backend/                 # Node.js + Express + Prisma 後端服務
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma    # Prisma 實體模型 Schema
│   ├── .env.example         # 後端環境變數範例
│   ├── src/
│   │   ├── config/          # 資料庫連線、JWT 安全金鑰與全域配置
│   │   ├── middlewares/     # JWT 身份驗證與 RBAC 權限過濾中介軟體
│   │   ├── controllers/     # 路由請求處理、參數檢驗與統一 Response 包裝
│   │   ├── services/        # 核心業務邏輯與悲觀列鎖原子交易
│   │   ├── routes/          # RESTful API 路由定義
│   │   └── app.js           # Express App 初始化與錯誤處理器
│   └── tests/               # Jest + Supertest 測試套件
│       ├── integration/     # API 整合測試 (含高併發超賣測試)
│       └── unit/            # 單元測試 (含 RBAC 中介軟體測試)
└── frontend/                # Vite + TailwindCSS + Vanilla JS 前端網頁
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.js
        ├── styles/
        │   └── index.css    # 現代化 TailwindCSS 設計系統與動畫
        └── pages/           # 各模組 SPA 頁面與組件
```

---

## 三、 全域命名與代碼 Commit 規範 (Global Naming, Coding & Commit Standards)

為了確保專案在資料庫、後端、前端以及協作分支上具備無比清晰的一致性，本專案強制實施以下命名規範：

### 1. 資料庫命名規範 (Database Naming Rules)
*   **資料表命名**：一律使用**小寫複數蛇形命名法 (`snake_case`)**，例如 `products`, `sales_orders`, `damaged_inventories`。
*   **欄位命名**：一律使用**小寫單數蛇形命名法 (`snake_case`)**，例如 `product_name`, `retail_price`。
*   **主鍵命名**：
    *   自增或特定業務主鍵：統一命名為 `[singular_table_name]_id`。例如 `roles` 的主鍵為 `role_id`，`sales_orders` 的主鍵為 `order_id`。這能 100% 避免在複雜的多表 `JOIN` 查詢中產生多個無意義的 `id` 欄位而造成的語義混淆。
*   **外鍵命名**：統一命名為 `[referenced_singular_table_name]_id`。例如 `users` 中的 `role_id`。若外鍵代表特定業務含意，則格式為 `[meaning]_[singular_table_name_suffix]`（如 `sales_orders` 中的 `created_by` 指向 `users` 的 `user_id`）。
*   **約束與索引命名**：
    *   外鍵約束：統一命名為 `fk_[source_table]_[target_table]`，例如 `fk_users_role`。
    *   唯一索引：統一命名為 `idx_[table_name]_[column_name]_uniq`，例如 `idx_products_barcode_uniq`。
    *   一般索引：統一命名為 `idx_[table_name]_[column_name]`，例如 `idx_so_date`。
    *   資料庫 CHECK 約束：統一命名為 `chk_[table_name]_[column_name]`，例如 `chk_products_stock_qty`。

### 2. 後端 Node.js & Prisma 命名規範 (Backend & ORM Naming Rules)
*   **實體檔案命名**：統一使用**小駝峰命名法 (`camelCase`)**，並配合**點分隔後綴副檔名**，格式為 `[name].[type].js`：
    *   路由定義檔案：`auth.routes.js`, `salesOrder.routes.js`
    *   控制器檔案：`auth.controller.js`, `salesOrder.controller.js`
    *   服務邏輯檔案：`auth.service.js`, `salesOrder.service.js`
    *   中介軟體檔案：`auth.middleware.js`, `rbac.middleware.js`
    *   單元與整合測試檔案：`[name].[type].test.js`，例如 `salesOrder.controller.test.js`。
*   **Prisma 實體模型命名**：
    *   模型名稱與欄位名稱：統一使用**小寫蛇形命名法**，與資料庫 DDL 保持 100% 一致。必須顯式使用 `@@map` 及 `@map` 進行資料庫映射，防止 Prisma 自動將欄位轉為小駝峰，例如：
        ```prisma
        model sales_orders {
          order_id   String   @id @map("order_id")
          order_date DateTime @map("order_date")
          
          @@map("sales_orders")
        }
        ```
*   **變數、函式與常數**：
    *   變數、物件屬性、函式、方法：統一使用**小駝峰命名法 (`camelCase`)**，例如 `const stockQuantity = 10;`，`function getProductById(productId) { ... }`。
    *   布林值變數與屬性：必須以 `is`, `has`, `should`, `can` 為前綴，例如 `isRestocked`, `hasPermission`, `shouldRollback`。
    *   全域常數與配置值：一律使用**大寫蛇形命名法 (`UPPER_SNAKE_CASE`)**，例如 `const JWT_ACCESS_SECRET = '...';`。

### 3. 前端 Vite & UI 命名規範 (Frontend & UI Naming Rules)
*   **頁面與元件檔案命名**：
    *   SPA 路由頁面檔案：統一使用**大駝峰命名法 (`PascalCase`)**，例如 `Dashboard.js`, `ProductList.js`, `SalesOrderForm.js`。
    *   共用 UI 組件檔案：統一使用**大駝峰命名法 (`PascalCase`)**，且以功能屬性作為前綴，例如 `BaseButton.js`, `FormInput.js`, `ModalDialog.js`。
*   **CSS 樣式命名**：
    *   自訂 CSS Class 名稱：一律使用**小寫且以連字號連接 (`kebab-case`)**，且以專案縮寫為前綴，例如 `.erp-glass-card`, `.erp-btn-primary`。

### 4. Git 分支與環境變數命名規範 (Git & Env Naming Rules)
*   **Git 分支命名**：一律以小寫且用連字號連接，格式為 `[type]/[ticket_id]-[short-description]`：
    *   新功能開發分支：`feature/T5.3-pessimistic-locking`
    *   缺陷修復分支：`bugfix/T4.1-duplicate-barcode`
    *   文檔更新分支：`docs/T0.2-naming-conventions`
*   **環境變數 (.env) 命名**：
    *   一律使用**大寫蛇形命名法**，且以業務模組名作為前綴，例如 `DB_HOST`, `DB_PORT`, `JWT_ACCESS_SECRET`, `PORT`。

### 5. Git Commit 語義化規範 (Semantic Commits)
每一次提交的 commit message 必須遵循以下格式：`<type>(<scope>): <subject>`，例如 `feat(order): implement pessimistic locking for stock reduction`。
*   `feat`: 新增功能 (Feature)
*   `fix`: 修復缺陷 (Bug Fix)
*   `docs`: 僅修改文檔 (Documentation)
*   `style`: 代碼格式調整 (不影響運作之空格、分號、排版調整)
*   `refactor`: 代碼重構 (非新增功能亦非修復 bug 的代碼修改)
*   `test`: 新增或調整測試案例 (Testing)
*   `chore`: 構建工具、依賴庫或輔助配置的變更

---

## 四、 測試與品質閥門門檻 (Test-Driven Verification Gates)

為確保系統具備極致的強健度與安全性，代碼在合併至主分支前必須 100% 通過以下品質閥門門檻：

1.  **測試通過率 (Test Pass Rate)**：所有寫入後端的單元測試與 API 整合測試通過率必須為 **100%**。
2.  **程式碼覆蓋率 (Code Coverage)**：後端核心業務服務層 (`services/`) 與權限控制中介軟體 (`middlewares/`) 的程式碼行覆蓋率 (Line Coverage) 必須達到 **85%** 以上。
3.  **高併發安全性 (Concurrency Safety Gate)**：
    *   模擬至少 **100 位** 業務同時針對僅剩 **1 件** 庫存的同商品進行出貨扣庫搶購。
    *   **通過指標**：成功交易筆數必須精準為 **1**；資料庫庫存必須精準為 **0**（絕不能為負數）；失敗的 99 筆交易必須全部乾淨回滾，返回 `ERR_STOCK_INSUFFICIENT (422)` 錯誤代碼，且沒有產生任何孤立的明細記錄。
4.  **操作稽核覆蓋率 (Audit Log Coverage)**：所有對資料表產生增刪改的 API 操作，在測試執行後，必須驗證 `audit_logs` 中確實存在對應的操作稽核記錄，否則該功能測試視為失敗。

---

**Version**: 1.3.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-23
