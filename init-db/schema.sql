CREATE DATABASE IF NOT EXISTS `erp_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `erp_system`;

-- 1. roles (角色資料表)
CREATE TABLE `roles` (
  `role_id` INT AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `idx_roles_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. users (後台員工資料表)
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(100) NOT NULL,
  `role_id` INT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `idx_users_username` (`username`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. members (前台會員/客戶主檔表) - 全新加入
CREATE TABLE `members` (
  `member_id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(100) NOT NULL,
  `tier` VARCHAR(20) NOT NULL DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM
  `total_spent` DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- ??????
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `idx_members_email_uniq` (`email`),
  UNIQUE KEY `idx_members_phone_uniq` (`phone`),
  CONSTRAINT `chk_members_tier` CHECK (`tier` IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
  CONSTRAINT `chk_members_total_spent` CHECK (`total_spent` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. products (商品主檔表)
CREATE TABLE `products` (
  `product_id` VARCHAR(50) NOT NULL,
  `barcode` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `spec` VARCHAR(255) NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'pcs',
  `cost_price` DECIMAL(12, 2) NOT NULL,
  `retail_price` DECIMAL(12, 2) NOT NULL,
  `stock_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `safety_stock` DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `idx_products_barcode` (`barcode`),
  CONSTRAINT `chk_cost_price` CHECK (`cost_price` >= 0.00),
  CONSTRAINT `chk_retail_price` CHECK (`retail_price` >= `cost_price`),
  CONSTRAINT `chk_stock_qty` CHECK (`stock_quantity` >= 0.00),
  CONSTRAINT `chk_safety_stock` CHECK (`safety_stock` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. sales_orders (銷售訂單主表) - 修改： customer_name 改為外鍵強關聯 member_id
CREATE TABLE `sales_orders` (
  `order_id` VARCHAR(50) NOT NULL,
  `order_date` DATE NOT NULL,
  `member_id` VARCHAR(50) NOT NULL, -- 關聯會員 ID
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, SHIPPED, VOIDED
  `created_by` INT NOT NULL,
  `approved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  INDEX `idx_so_date` (`order_date`),
  INDEX `idx_so_status` (`status`),
  CONSTRAINT `fk_so_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_so_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_so_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_so_total` CHECK (`total_amount` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. sales_order_details (銷售訂單明細副表)
CREATE TABLE `sales_order_details` (
  `detail_id` INT AUTO_INCREMENT,
  `order_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (`detail_id`),
  UNIQUE KEY `idx_sod_order_prod` (`order_id`, `product_id`),
  CONSTRAINT `fk_sod_order` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sod_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_sod_qty` CHECK (`quantity` > 0.00),
  CONSTRAINT `chk_sod_price` CHECK (`unit_price` >= 0.00),
  CONSTRAINT `chk_sod_subtotal` CHECK (`subtotal` = `quantity` * `unit_price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. sales_returns (銷售退貨單主表)
CREATE TABLE `sales_returns` (
  `return_id` VARCHAR(50) NOT NULL,
  `return_date` DATE NOT NULL,
  `original_order_id` VARCHAR(50) NOT NULL,
  `refund_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, APPROVED, REJECTED
  `created_by` INT NOT NULL,
  `approved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`return_id`),
  CONSTRAINT `fk_sr_original_so` FOREIGN KEY (`original_order_id`) REFERENCES `sales_orders` (`order_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sr_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sr_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_sr_refund` CHECK (`refund_total` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. sales_return_details (銷售退貨明細副表)
CREATE TABLE `sales_return_details` (
  `return_detail_id` INT AUTO_INCREMENT,
  `return_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `is_restocked` TINYINT(1) NOT NULL DEFAULT 1, -- 1=良品加可用庫存, 0=不良品報廢移入報廢表
  PRIMARY KEY (`return_detail_id`),
  UNIQUE KEY `idx_srd_return_prod` (`return_id`, `product_id`),
  CONSTRAINT `fk_srd_return` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`return_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_srd_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_srd_qty` CHECK (`quantity` > 0.00),
  CONSTRAINT `chk_srd_price` CHECK (`unit_price` >= 0.00),
  CONSTRAINT `chk_srd_subtotal` CHECK (`subtotal` = `quantity` * `unit_price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. damaged_inventories (報廢不良品實體記錄表)
CREATE TABLE `damaged_inventories` (
  `scrap_id` INT AUTO_INCREMENT,
  `return_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL,
  `scrap_reason` VARCHAR(255) DEFAULT '損壞報廢',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`scrap_id`),
  CONSTRAINT `fk_scrap_return` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`return_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_scrap_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_scrap_qty` CHECK (`quantity` > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. audit_logs (操作稽核日誌表)
CREATE TABLE `audit_logs` (
  `log_id` INT AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, VOID
  `target_table` VARCHAR(100) NOT NULL,
  `target_key` VARCHAR(100) NOT NULL,
  `payload_before` JSON NULL,
  `payload_after` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_action` (`action`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. credit_memos (????????) - ????
CREATE TABLE `credit_memos` (
  `memo_id` VARCHAR(50) NOT NULL,
  `return_id` VARCHAR(50) NOT NULL,
  `member_id` VARCHAR(50) NOT NULL,
  `memo_amount` DECIMAL(12, 2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'UNAPPLIED', -- UNAPPLIED, APPLIED, VOIDED
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`memo_id`),
  UNIQUE KEY `idx_cm_return` (`return_id`),
  CONSTRAINT `fk_cm_return` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`return_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cm_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cm_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_cm_amount` CHECK (`memo_amount` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. financial_ledgers (????????) - ????
CREATE TABLE `financial_ledgers` (
  `entry_id` INT AUTO_INCREMENT,
  `entry_date` DATE NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL, -- SALES_ORDER, SALES_RETURN, CREDIT_MEMO
  `reference_id` VARCHAR(50) NOT NULL,
  `account_code` VARCHAR(50) NOT NULL, -- AR, SALES_REVENUE, SALES_TAX_PAYABLE, COGS, INVENTORY, SALES_RETURN, SCRAP_LOSS
  `debit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`entry_id`),
  INDEX `idx_ledger_ref` (`reference_type`, `reference_id`),
  CONSTRAINT `fk_ledger_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_ledger_debit` CHECK (`debit` >= 0.00),
  CONSTRAINT `chk_ledger_credit` CHECK (`credit` >= 0.00),
  CONSTRAINT `chk_ledger_debit_credit` CHECK ((`debit` > 0.00 AND `credit` = 0.00) OR (`debit` = 0.00 AND `credit` > 0.00))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Seed 初始數據
-- -----------------------------------------------------
INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'ADMIN', '系統管理員，擁有全域最高權限'),
(2, 'ACCT', '財務會計人員，負責價格監控、銷退核准與報表稽核'),
(3, 'SALES', '業務銷售人員，可建立銷售單，但嚴禁查看進貨成本'),
(4, 'WAREHOUSE', '倉管庫存人員，負責商品CRUD與銷退良品/報廢處置');

-- 初始管理員： admin / admin12345
INSERT INTO `users` (`user_id`, `username`, `password_hash`, `real_name`, `role_id`, `is_active`) VALUES
(1, 'admin', '$2b$10$w6g275w3yK82t8tO3F9sN.d6P3.k6eM6h0t69H4u7e4wLzX3hD5fK', '超級管理員', 1, 1);

-- 初始會員： member@example.com / member12345 (對應雜湊如下)
INSERT INTO `members` (`member_id`, `email`, `phone`, `password_hash`, `real_name`, `tier`, `total_spent`, `is_active`) VALUES
('MBR-20260522-0001', 'member@example.com', '0912345678', '$2b$10$3c.S86b9fQfV9zX9c6wM5uG7H4t69O6h0t69H4u7e4wLzX3hD5fK', '??????', 'BRONZE', 0.00, 1);