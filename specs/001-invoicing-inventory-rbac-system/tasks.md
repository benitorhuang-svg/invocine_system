# 進銷存與權限管理系統 (Invoicing, Inventory & RBAC System) 研發工作清單

---

## 研發任務總攬 (Tasks Roadmap)

本研發清單共拆解為 8 個開發階段 (Phases)，共 55 個微型、可測試的開發任務：

---

### Phase 1: 開發環境與資料庫初始化 (Environment & Database Initialization)

*   **[ ] T1.1: 建立 Docker Compose 資料庫服務**
    *   **內容**：在專案根目錄建立 `docker-compose.yml`，配置 MySQL 8.0 容器，設置 `DATABASE_URL` 環境變氣，掛載持久化 Volume，並將 `./init-db` 掛載至容器的 `/docker-entrypoint-initdb.d`。
    *   **驗證標準**：執行 `docker-compose up -d` 成功啟動，且在資料庫日誌中顯示 `ready for connections`。
*   **[ ] T1.2: 建立資料庫 Schema 初始化 DDL**
    *   **內容**：編寫 `init-db/schema.sql`，包含 `roles`, `users`, `members` (會員表), `products`, `sales_orders`, `sales_order_details`, `sales_returns`, `sales_return_details`, `damaged_inventories`, `audit_logs` 10 張表的完整 DDL 與外鍵約束、CHECK、Unique 索引及 Seed 初始數據（員工與會員）。
    *   **驗證標準**：當 MySQL 容器初次啟動時，會自動載入此 SQL。使用資料庫客戶端連線，確認 erp_system 資料庫存在，且 10 張表結構與 Seed 數據均正確。
*   **[ ] T1.3: 初始化後端 Node.js Express 專案**
    *   **內容**：在 `backend/` 目錄下執行 `npm init -y`，安裝 Express, @prisma/client, bcrypt, jsonwebtoken, dotenv，以及開發依賴 jest, supertest, prisma。
    *   **驗證標準**：`package.json` 正確生成且成功安裝所有依賴套件。
*   **[ ] T1.4: Prisma 初始化與實體模型映射**
    *   **內容**：在後端目錄下執行 `npx prisma init`，編寫 `prisma/schema.prisma`，設定為 `provider = "mysql"`，並手動依據 DDL 建立 10 張表的實體 model 與 @@map/`@map`。
    *   **驗證標準**：執行 `npx prisma generate` 成功生成客戶端。
*   **[ ] T1.5: 撰寫資料庫連線測試腳本**
    *   **內容**：在後端建立臨時測試腳本，連線 MySQL，嘗試讀取 `members` 表中 Seed 的首名會員並在終端列印。
    *   **驗證標準**：執行 `node test-connection.js`，控制台正確列印出 `email: member@example.com`。

---

### Phase 2: 後端基礎架構 (Foundational Infrastructure)

*   **[ ] T2.1: 封裝 Prisma Client 初始化模組**
    *   **內容**：在 `src/config/db.js` 封裝單例模式的 Prisma Client 連線。
    *   **驗證標準**：其他模組引進 `db.js` 均可正常呼叫，無重複連線警告。
*   **[ ] T2.2: 實作全域錯誤處理中介軟體**
    *   **內容**：在 `src/middlewares/errorHandler.js` 實作全域錯誤攔截，當捕獲任何 Error 時，將錯誤包裝為統一 JSON Response 並正確回傳對應的 HTTP Status Code。
    *   **驗證標準**：手動拋出 `Error('ERR_STOCK_INSUFFICIENT')`，API 需回傳 `422` 狀態碼與對應的 JSON。
*   **[ ] T2.3: 封裝統一 API Response 攔截器**
    *   **內容**：實作一個輔助方法包裝成功與失敗的回傳。
    *   **驗證標準**：所有回傳資料均包含 `success` 欄位與 `data` 或 `error`。

---

### Phase 3: 後台人員、前台會員與雙軌驗證模組 (User Stories 1 & 6 - Priority: P1)

*   **[ ] T3.1: 實作後台員工註冊與密碼雜湊**
    *   **內容**：建立 `/api/users/register` 端點，實作後台註冊邏輯，密碼以 bcrypt 加密。
    *   **驗證標準**：註冊成功後，確認 MySQL `users` 表中儲存的是加密雜湊。
*   **[ ] T3.2: 實作後台員工登入與 STAFF JWT 簽發**
    *   **內容**：建立 `/api/auth/login` 端點，比對密碼。登入成功後，簽發 `"type": "STAFF"` 的短期 `AccessToken`，以及長期 `RefreshToken` Cookie。
    *   **驗證標準**：發送登入請求，回傳 JSON 包含 JWT 且為 STAFF 屬性。
*   **[ ] T3.3: 實作前台會員註冊與手機/Email 強校驗**
    *   **內容**：建立 `/api/member/register` 端點。後端驗證 Email 格式以及台灣手機格式（`^09\d{8}$`），密碼以 bcrypt 加密。
    *   **驗證標準**：傳入重複 Email 或格式錯誤之手機號碼，API 拋出錯誤並 Rollback。
*   **[ ] T3.4: 實作前台會員登入與 MEMBER JWT 簽發**
    *   **內容**：建立 `/api/member/login` 端點。登入成功後，簽發 `"type": "MEMBER"` 的專屬 `AccessToken`，以及長期 `RefreshToken` Cookie。
    *   **驗證標準**：登入成功回傳的 Token 解密後 Payload 必須包含 `type: "MEMBER"`。
*   **[ ] T3.5: 實作雙軌 JWT 解析器與隔離中介軟體**
    *   **內容**：實作 `authenticateDualJWT` 解析 Token，並實作 `requireStaffOnly` (限員工) 與 `requireMemberOnly` (限會員) 過濾中介軟體。
    *   **驗證標準**：會員 Token 請求後台敏感 API，API 返回 `403 Forbidden`。
*   **[ ] T3.6: 實作後台員工 RBAC 角色層級過濾器**
    *   **內容**：實作 `authorizeStaffRoles(...allowedRoles)`，在確認為 `STAFF` 後比對角色。
    *   **驗證標準**：後台 WAREHOUSE 員工 Token 讀取成本 API 返回 `403 Forbidden`。

---

### Phase 4: 商品主檔管理與成本監控 (User Story 2 - Priority: P1 & P2)

*   **[ ] T4.1: 實作商品建立與條碼唯一性防禦**
    *   **內容**：建立 `POST /api/products`，校驗條碼重複與零售價不得低於成本。
    *   **驗證標準**：重複條碼輸入，API 返回 `409 Conflict` 與 `ERR_BARCODE_EXISTS`。
*   **[ ] T4.2: 實作商品查詢與更新 API**
    *   **內容**：實作商品 CRUD。
    *   **驗證標準**：發送更新請求，商品屬性成功變更。
*   **[ ] T4.3: 實作敏感價格角色攔截**
    *   **內容**：在獲取進貨成本 API `GET /api/products/cost` 套用 RBAC，限 ADMIN/ACCT。
    *   **驗證標準**：會員或 WAREHOUSE 讀取，返回 `403 Forbidden`。
*   **[ ] T4.4: 實作安全庫存補貨預警**
    *   **內容**：建立 `/api/products/replenishment-alerts`，篩選 `stock_quantity <= safety_stock`。
    *   **驗證標準**：庫存小於安全水位時，正確回傳該商品。

---

### Phase 5: 銷售訂單主副表事務與會員關聯扣庫模組 (User Stories 3 & 7 - Priority: P1)

*   **[ ] T5.1: 實作銷售單草稿嵌套建立 (主副表關聯會員)**
    *   **內容**：建立 `POST /api/sales-orders`。後端在一筆交易中建立主副表，且強關聯一個 `member_id`。
    *   **驗證標準**：如果傳入無效會員 ID `MBR-999`，API 攔截並返回 `ERR_MEMBER_NOT_FOUND` 且交易 Rollback。
*   **[ ] T5.2: 實作銷售單明細數量與單價校驗**
    *   **內容**：明細中 quantity 必須大於 0。
    *   **驗證標準**：數量為 0 或負數，整個交易回滾。
*   **[ ] T5.3: 實作悲觀鎖出貨扣庫交易 (SELECT FOR UPDATE)**
    *   **內容**：建立 `/api/sales-orders/:id/approve`。交易中使用原生 SQL 鎖定商品列，重新校驗庫存，並更新庫存與訂單狀態。
    *   **驗證標準**：
        *   若商品庫存充足，點擊審核，庫存扣減，單據變為 `APPROVED`，並寫入 `audit_logs`。
        *   若庫存不足，則拋出 `ERR_STOCK_INSUFFICIENT`，完全回滾。
*   **[ ] T5.4: 實作單據審核冪等防護**
    *   **內容**：若訂單狀態已是 `APPROVED`，重複發送審核請求直接拒絕。
    *   **驗證標準**：第二次審核請求返回 `ERR_ORDER_APPROVED`，無二次扣減。
*   **[ ] T5.5: 實作前台會員個人訂單查詢安全限制**
    *   **內容**：建立 `GET /api/member/my-orders`，強制限制只能檢索目前登入會員 `member_id` 關聯的訂單。
    *   **驗證標準**：會員 A 嘗試查詢會員 B 的訂單，返回 `403 Forbidden`。

---

### Phase 6: 銷售退貨與良品/不良品分類處置 (User Story 4 - Priority: P2)

*   **[ ] T6.1: 實作銷售退貨單草稿建立**
    *   **內容**：建立 `POST /api/sales-returns`，關聯原銷售單與會員。
    *   **驗證標準**：關聯不存在之銷售單 ID，API 返回錯誤。
*   **[ ] T6.2: 實作退貨數量超限檢驗**
    *   **內容**：後端校驗本次退貨數量不得超過可退餘量。
    *   **驗證標準**：退貨量大於原出貨量，API 拋出 `ERR_RETURN_QTY_EXCEEDED` 且拒絕建立。
*   **[ ] T6.3: 實作銷退審核之良品回庫**
    *   **內容**：建立 `/api/sales-returns/:id/approve`。當明細為 `is_restocked = 1`，審核通過後，可用庫存加上退貨數。
    *   **驗證標準**：商品可用庫存增加，且寫入稽核日誌。
*   **[ ] T6.4: 實作銷退審核之不良品報廢**
    *   **內容**：當明細為 `is_restocked = 0`，審核通過後，可用庫存不變，自動寫入 `damaged_inventories` 報廢品表。
    *   **驗證標準**：可用庫存不變，`damaged_inventories` 新增一筆。
*   **[ ] T6.5: 實作財務應收帳款與會員折讓沖銷**
    *   **內容**：銷退審核通過後，沖減該歸戶會員在原銷售單中產生的應收帳款，並變更銷退單狀態為 `APPROVED`，生成 Credit Memo。
    *   **驗證標準**：查詢銷退狀態變為已審核。

---

### Phase 7: 高併發對撞與審計日誌驗證 (User Story 5 - Priority: P1)

*   **[ ] T7.1: 實作操作稽核攔截器**
    *   **內容**：後端封裝稽核記錄模組，所有資料庫 mutation 均在同一個事務中寫入 `audit_logs`，包含變更前後 JSON。
    *   **驗證標準**：新增商品後，日誌中 payload_before 為 null，payload_after 為新增商品 JSON。
*   **[ ] T7.2: 編寫高併發超賣與雙軌越權搶購測試腳本**
    *   **內容**：使用 Jest 或輔助 Node 腳本，併發發送 100 個出貨扣庫請求，搶購 1 件商品。同時測試使用 Member Token 越權搶購。
    *   **驗證標準**：
        *   超賣搶購：只有 1 筆成功，其餘 99 筆返回 `422 ERR_STOCK_INSUFFICIENT`，庫存精準為 0。
        *   越權搶購：Member Token 請求後台扣庫 API 必須 100% 返回 `403 Forbidden`。

---

### Phase 8: 前端極致視覺與 SPA 網頁開發 (Frontend Web & Premium UI)

*   **[ ] T8.1: 初始化 Vite + TailwindCSS 專案**
    *   **內容**：使用 Vite 構建前端 SPA，配置極致暗色調 (Premium Dark Mode) 配色與 Harmonious Palette。
    *   **驗證標準**：網頁啟動無報錯，載入自訂 Google Fonts (Inter/Outfit)。
*   **[ ] T8.2: 實作後台登入網頁與員工角色選單控制**
    *   **內容**：後台登入 UI。登入後，前端根據解析的 STAFF JWT 角色，動態顯示或隱藏側邊導覽列的選單。
    *   **驗證標準**：SALES 登入時，導覽列自動不渲染「稽核日誌」與「人員管理」選單。
*   **[ ] T8.3: 實作前台會員登入與註冊及歷史訂單 UI (全新功能)**
    *   **內容**：實作前台客戶專屬的登入/註冊畫面。會員登入後，可查詢屬於自己 `member_id` 的歷史銷售訂單與退貨單明細。
    *   **驗證標準**：註冊能對手機、Email 格式進行前端即時防錯，登入後能流暢加載該會員的歷史訂單。
*   **[ ] T8.4: 實作商品主檔管理網頁 (含預警通知)**
    *   **內容**：商品 CRUD 畫面。庫存小於安全水位時，畫面上該商品的庫存格子顯示紅色玻璃閃爍微動畫，且在右上角顯示安全庫存預警。
    *   **驗證標準**：預警清單點擊後能跳轉至需補貨商品列表。
*   **[ ] T8.5: 實作銷售單新增網頁 (主副表動態交互與會員拉選)**
    *   **內容**：實作 Master-Detail 銷貨單表單。業務可動態「新增/刪除品項行」，並可自 dropdown 中拉選已註冊的會員 (Member)。前端即時小計與總額計算。
    *   **驗證標準**：增減明細行時，底部的「含稅總額」毫無遲滯（<50ms）地完成重新計算。
*   **[ ] T8.6: 實作銷退管理與良品/不良品處置 UI**
    *   **內容**：建立銷退單 UI。關聯原銷售單後，前端自動載入原單會員與明細以供勾選，並有 Toggle 供選擇「良品回庫」或「不良品報廢」。
    *   **驗證標準**：勾選良品/不良品別，正確送出對應的 `is_restocked` 給 API。
*   **[ ] T8.7: 實作操作稽核日誌查詢網頁**
    *   **內容**：提供日誌過濾查詢。可展開比對變更前 JSON 與變更後 JSON。
    *   **驗證標準**：點擊展開按鈕，能以漂亮的 JSON Formatter 展示變更前後對照。

---

**Version**: 1.2.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
