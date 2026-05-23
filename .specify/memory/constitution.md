# 進銷存與權限管理系統 (Invoicing, Inventory & RBAC System) 憲章

<!-- Sync Impact Report
- Version change: 0.0.0 -> 1.0.0
- List of modified principles: Initialized principles (I to V)
- Added sections: Core Principles, Technical Stack & Security Constraints, SDLC & Quality Gates, Governance
- Templates requiring updates: All initial templates initialized
- Follow-up TODOs: None
-->

## Core Principles

### I. 容器化與環境一致性 (Containerization & Environment Consistency)
所有基礎設施（特別是 MySQL 8.0 資料庫）必須在 Docker 容器中運行，確保開發環境、測試環境與生產環境的配置 100% 一致。禁止在本地主機直接安裝或依賴非容器化的資料庫服務，以避免環境變數污染與版本衝突。

### II. 主副表（明細表）交易安全性 (Master-Detail Transaction Safety)
所有涉及主表與副表（明細表）的單據操作（如新增銷售單、審核扣庫、銷退單入庫）必須在庫存/財務資料庫交易（Transaction）中以原子操作（Atomic Operation）執行。若交易中任何一步（例如單一商品的庫存扣減）失敗，整筆單據與庫存變動必須自動回滾 (Rollback)，嚴禁產生半完成的孤立資料，保證庫存與帳款的絕對精準。

### III. 角色基礎存取控制 (Role-Based Access Control, RBAC)
系統必須實施嚴格的角色權限管理。所有 API 節點與選單操作必須經過 RBAC 中介軟體進行身份與權限驗證。敏感資料（如商品的進貨成本價、公司的利潤分析、客戶的敏感資訊）僅限於授權角色（ADMIN, ACCT）讀取，其他角色（SALES, WAREHOUSE）嚴禁越權訪問。

### IV. 規格與測試驅動開發 (Specification & Test-Driven Development)
本專案堅持「規格先行，測試驅動」原則。所有新功能開發或變更必須先建立對應的 Markdown 規格書與整合/單元測試案例。在測試案例編寫完成並驗證「失敗（Red）」後，方可進行功能實作，直到測試通過（Green）並進行代碼重構。嚴禁無規格、無測試的「直覺式編碼（Vibe Coding）」。

### V. 系統審計與操作日誌 (System Audit & Logging)
任何對資料庫寫入的操作（包括新增單據、修改狀態、作廢、人員異動）必須被 udit_logs 稽核攔截器自動記錄。記錄內容必須包含操作人 ID、動作類型、變更前資料 (JSON) 與變更後資料 (JSON)，確保所有財務與庫存異動皆有跡可循，滿足企業級稽核合規要求。

## 技術棧與安全性限制 (Technical Stack & Security Constraints)

### 1. 開發技術棧
*   **後端**: Node.js (Express.js) + Prisma ORM
*   **資料庫**: MySQL 8.0 (Docker 容器運行)
*   **前端**: HTML5 + TailwindCSS + Vanilla JavaScript (Vite 構建，以獲得最佳響應速度與 premium 視覺效果)

### 2. 安全性要求
*   **密碼儲存**: 使用 crypt 進行高強度 Salt 雜湊處理，嚴禁明文儲存。
*   **身份驗證**: 採用無狀態的 JSON Web Token (JWT)，並實施 Token 過期與續簽機制。
*   **SQL 注入防護**: 必須使用 Prisma ORM 的參數化查詢，嚴禁拼接 SQL 字串。

## 軟體開發生命週期與品質閥 (SDLC & Quality Gates)

### 1. SDLC 開發流程
每一功能特性（Feature）開發必須嚴格遵循以下步驟：
1.  **Specify**: 建立功能需求規格書。
2.  **Plan**: 設計技術架構與資料表變更。
3.  **Tasks**: 拆解出具體、可測試的開發工作清單。
4.  **Implement**: 編寫測試與代碼實作。
5.  **Verify**: 通過整合測試與手動驗證。

### 2. 品質閥門 (Quality Gates)
*   所有單元測試與 API 整合測試通過率必須為 100%。
*   在高併發交易情境下（如多用戶同時購買同一商品），系統必須通過「超賣/負數庫存」鎖定防護測試。

## Governance

本憲章為「進銷存與權限管理系統」的最高開發準則。任何代碼變更與 AI 生成代碼都必須 100% 遵循本憲章定義之原則。本憲章的修訂必須伴隨版本號的語意化遞增（SemVer）以及 Sync Impact Report 的更新。

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
