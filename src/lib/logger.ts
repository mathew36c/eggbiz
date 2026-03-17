import { addTransactionLog } from "./db";
import { LogAction, EggSize, ExpenseCategory, PaymentMethod, UserRole } from "./types";

interface LogData {
  action: LogAction;
  product_type?: "egg";
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
}

export async function logTransaction(data: LogData) {
  try {
    await addTransactionLog(data);
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
}

export function getUserInfo() {
  if (typeof window === "undefined") return { user_id: undefined, user_name: undefined, user_role: undefined };
  
  try {
    const userStr = localStorage.getItem("egg-user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      };
    }
  } catch (error) {
    console.error("Error getting user info:", error);
  }
  return { user_id: undefined, user_name: undefined, user_role: undefined };
}

export async function logSale(
  eggSize: EggSize,
  quantity: number,
  unitPrice: number,
  location: string,
  paymentMethod: PaymentMethod,
  notes?: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "sale",
    product_type: "egg",
    egg_size: eggSize,
    quantity,
    unit_price: unitPrice,
    location,
    payment_method: paymentMethod,
    notes,
    ...userInfo,
  });
}

export async function logPurchase(
  eggSize: EggSize,
  quantity: number,
  unitCost: number,
  supplierName?: string,
  notes?: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "purchase",
    product_type: "egg",
    egg_size: eggSize,
    quantity,
    amount: unitCost,
    supplier_name: supplierName,
    notes,
    ...userInfo,
  });
}

export async function logExpense(
  category: ExpenseCategory,
  amount: number,
  description?: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "expense",
    category,
    amount,
    description,
    ...userInfo,
  });
}

export async function logSaleEdit(
  eggSize: EggSize,
  quantity: number,
  unitPrice: number,
  location: string,
  paymentMethod: PaymentMethod,
  previousValues: string,
  newValues: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "sale_edit",
    product_type: "egg",
    egg_size: eggSize,
    quantity,
    unit_price: unitPrice,
    location,
    payment_method: paymentMethod,
    previous_values: previousValues,
    new_values: newValues,
    ...userInfo,
  });
}

export async function logPurchaseEdit(
  eggSize: EggSize,
  quantity: number,
  unitCost: number,
  supplierName?: string,
  previousValues?: string,
  newValues?: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "purchase_edit",
    product_type: "egg",
    egg_size: eggSize,
    quantity,
    amount: unitCost,
    supplier_name: supplierName,
    previous_values: previousValues,
    new_values: newValues,
    ...userInfo,
  });
}

export async function logExpenseEdit(
  category: ExpenseCategory,
  amount: number,
  description?: string,
  previousValues?: string,
  newValues?: string
) {
  const userInfo = getUserInfo();
  await logTransaction({
    action: "expense_edit",
    category,
    amount,
    description,
    previous_values: previousValues,
    new_values: newValues,
    ...userInfo,
  });
}
