-- =====================================================
-- Egg Business - Supabase Migration Script
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'operator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory Stock table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type TEXT NOT NULL DEFAULT 'egg' CHECK (product_type = 'egg'),
    egg_size TEXT NOT NULL CHECK (egg_size IN ('S', 'M', 'L', 'XL')),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_type, egg_size)
);

-- Inventory Purchases table
CREATE TABLE IF NOT EXISTS inventory_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type TEXT NOT NULL DEFAULT 'egg' CHECK (product_type = 'egg'),
    egg_size TEXT NOT NULL CHECK (egg_size IN ('S', 'M', 'L', 'XL')),
    quantity INTEGER NOT NULL,
    cost_per_unit DECIMAL(12, 2) NOT NULL,
    supplier_name TEXT,
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    location_name TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'egg' CHECK (product_type = 'egg'),
    egg_size TEXT NOT NULL CHECK (egg_size IN ('S', 'M', 'L', 'XL')),
    quantity_sold INTEGER NOT NULL,
    selling_price_per_unit DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'gcash')),
    notes TEXT,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fuel', 'maintenance', 'supplies', 'food', 'misc')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction Logs table
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL CHECK (action IN ('sale', 'purchase', 'expense', 'sale_edit', 'purchase_edit', 'expense_edit', 'stock_adjustment', 'login', 'logout')),
    product_type TEXT,
    egg_size TEXT,
    quantity INTEGER,
    amount DECIMAL(12, 2),
    unit_price DECIMAL(12, 2),
    location TEXT,
    category TEXT,
    payment_method TEXT,
    description TEXT,
    supplier_name TEXT,
    notes TEXT,
    user_id UUID REFERENCES users(id),
    user_name TEXT,
    user_role TEXT,
    previous_values TEXT,
    new_values TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_egg_size ON inventory(egg_size);
CREATE INDEX IF NOT EXISTS idx_inventory_product_type ON inventory(product_type);

-- Inventory Purchases indexes
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_date ON inventory_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_inventory_purchases_egg_size ON inventory_purchases(egg_size);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_egg_size ON sales(egg_size);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_name);
CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_synced ON expenses(synced);

-- Transaction Logs indexes
CREATE INDEX IF NOT EXISTS idx_transaction_logs_action ON transaction_logs(action);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_date ON transaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_user ON transaction_logs(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can delete users" ON users FOR DELETE USING (true);

-- Create policies for inventory table
CREATE POLICY "Anyone can view inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory" ON inventory FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete inventory" ON inventory FOR DELETE USING (true);

-- Create policies for inventory_purchases table
CREATE POLICY "Anyone can view inventory_purchases" ON inventory_purchases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert inventory_purchases" ON inventory_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update inventory_purchases" ON inventory_purchases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete inventory_purchases" ON inventory_purchases FOR DELETE USING (true);

-- Create policies for sales table
CREATE POLICY "Anyone can view sales" ON sales FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sales" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sales" ON sales FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sales" ON sales FOR DELETE USING (true);

-- Create policies for expenses table
CREATE POLICY "Anyone can view expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update expenses" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete expenses" ON expenses FOR DELETE USING (true);

-- Create policies for transaction_logs table
CREATE POLICY "Anyone can view transaction_logs" ON transaction_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transaction_logs" ON transaction_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update transaction_logs" ON transaction_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete transaction_logs" ON transaction_logs FOR DELETE USING (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA - Create default inventory records
-- =====================================================

INSERT INTO inventory (product_type, egg_size, total_quantity, total_cost) VALUES
    ('egg', 'S', 0, 0),
    ('egg', 'M', 0, 0),
    ('egg', 'L', 0, 0),
    ('egg', 'XL', 0, 0)
ON CONFLICT (product_type, egg_size) DO NOTHING;

-- =====================================================
-- MIGRATION HELPER FUNCTIONS
-- =====================================================

-- Function to get all unsynced sales
CREATE OR REPLACE FUNCTION get_unsynced_sales()
RETURNS TABLE (
    id UUID,
    sale_date DATE,
    location_name TEXT,
    product_type TEXT,
    egg_size TEXT,
    quantity_sold INTEGER,
    selling_price_per_unit DECIMAL(12, 2),
    payment_method TEXT,
    notes TEXT,
    synced BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.sale_date, s.location_name, s.product_type, s.egg_size,
           s.quantity_sold, s.selling_price_per_unit, s.payment_method,
           s.notes, s.synced, s.created_at
    FROM sales s
    WHERE s.synced = false;
END;
$$ LANGUAGE plpgsql;

-- Function to get all unsynced expenses
CREATE OR REPLACE FUNCTION get_unsynced_expenses()
RETURNS TABLE (
    id UUID,
    expense_date DATE,
    category TEXT,
    amount DECIMAL(12, 2),
    description TEXT,
    synced BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.expense_date, e.category, e.amount, e.description,
           e.synced, e.created_at
    FROM expenses e
    WHERE e.synced = false;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sales as synced
CREATE OR REPLACE FUNCTION mark_sales_synced(sale_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE sales
    SET synced = true
    WHERE id = ANY(sale_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to mark expenses as synced
CREATE OR REPLACE FUNCTION mark_expenses_synced(expense_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE expenses
    SET synced = true
    WHERE id = ANY(expense_ids);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function to get sales by date range
CREATE OR REPLACE FUNCTION get_sales_by_date_range(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    sale_date DATE,
    total_revenue DECIMAL(12, 2),
    total_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.sale_date,
        SUM(s.quantity_sold * s.selling_price_per_unit)::DECIMAL(12, 2) AS total_revenue,
        SUM(s.quantity_sold)::INTEGER AS total_quantity
    FROM sales s
    WHERE s.sale_date >= start_date AND s.sale_date <= end_date
    GROUP BY s.sale_date
    ORDER BY s.sale_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get expenses by date range
CREATE OR REPLACE FUNCTION get_expenses_by_date_range(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    expense_date DATE,
    category TEXT,
    total_amount DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.expense_date,
        e.category,
        SUM(e.amount)::DECIMAL(12, 2) AS total_amount
    FROM expenses e
    WHERE e.expense_date >= start_date AND e.expense_date <= end_date
    GROUP BY e.expense_date, e.category
    ORDER BY e.expense_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get inventory stock summary
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
    egg_size TEXT,
    total_quantity INTEGER,
    total_cost DECIMAL(12, 2),
    avg_cost DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.egg_size,
        i.total_quantity,
        i.total_cost,
        CASE 
            WHEN i.total_quantity > 0 THEN (i.total_cost / i.total_quantity)::DECIMAL(12, 2)
            ELSE 0
        END AS avg_cost
    FROM inventory i
    ORDER BY i.egg_size;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE
-- =====================================================

SELECT 'Migration completed successfully!' AS status;
