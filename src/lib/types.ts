export type EggSize = "S" | "M" | "L" | "XL";
export type PaymentMethod = "cash" | "gcash";
export type ExpenseCategory = "fuel" | "maintenance" | "supplies" | "food" | "misc";
export type UserRole = "super_admin" | "manager" | "operator";
export type ProductType = "egg";
export type LogAction = "sale" | "purchase" | "expense" | "sale_edit" | "purchase_edit" | "expense_edit" | "stock_adjustment" | "login" | "logout";

export const PRODUCT_TYPES: { value: ProductType; label: string; sizes?: EggSize[] }[] = [
  { value: "egg", label: "Egg", sizes: ["S", "M", "L", "XL"] },
];

export const DEFAULT_SIZES: EggSize[] = ["S", "M", "L", "XL"];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface InventoryPurchase {
  id: string;
  product_type: ProductType;
  egg_size: EggSize;
  quantity: number;
  cost_per_unit: number;
  supplier_name?: string;
  purchase_date: string;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_date: string;
  location_name: string;
  product_type: ProductType;
  egg_size: EggSize;
  quantity_sold: number;
  selling_price_per_unit: number;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
  synced?: boolean;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  created_at: string;
  synced?: boolean;
}

export interface InventoryStock {
  id: string;
  product_type: ProductType;
  egg_size: EggSize;
  total_quantity: number;
  total_cost: number;
}

export interface DailyMetrics {
  revenue: number;
  items_sold: number;
  cogs: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
}

export interface MonthlyMetrics {
  revenue: number;
  items_sold: number;
  expenses: number;
  net_profit: number;
}

export interface TransactionLog {
  id: string;
  action: LogAction;
  product_type?: ProductType;
  egg_size?: EggSize;
  quantity?: number;
  amount?: number;
  unit_price?: number;
  location?: string;
  category?: ExpenseCategory;
  payment_method?: PaymentMethod;
  description?: string;
  supplier_name?: string;
  notes?: string;
  user_id?: string;
  user_name?: string;
  user_role?: UserRole;
  previous_values?: string;
  new_values?: string;
  created_at: string;
}