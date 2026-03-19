import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Sale, Expense, InventoryPurchase, InventoryStock, EggSize, ProductType, TransactionLog } from "./types";
import { v4 as uuidv4 } from "uuid";

// Supabase client
let supabase: SupabaseClient | null = null;

export function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
}

// IndexedDB for local storage
interface LocalDB extends DBSchema {
  pendingSales: {
    key: string;
    value: Sale & { pending_sync?: boolean; supabase_id?: string };
    indexes: { "by-date": string };
  };
  pendingExpenses: {
    key: string;
    value: Expense & { pending_sync?: boolean; supabase_id?: string };
    indexes: { "by-date": string };
  };
  inventory: {
    key: string;
    value: InventoryStock & { supabase_id?: string };
  };
  inventoryPurchases: {
    key: string;
    value: InventoryPurchase & { pending_sync?: boolean; supabase_id?: string };
    indexes: { "by-date": string };
  };
  transactionLogs: {
    key: string;
    value: TransactionLog & { pending_sync?: boolean; supabase_id?: string };
    indexes: { "by-date": string; "by-action": string };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: "insert" | "update" | "delete";
      data: any;
      timestamp: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LocalDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LocalDB>("egg-business-sync", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pendingSales")) {
          const salesStore = db.createObjectStore("pendingSales", { keyPath: "id" });
          salesStore.createIndex("by-date", "sale_date");
        }
        if (!db.objectStoreNames.contains("pendingExpenses")) {
          const expenseStore = db.createObjectStore("pendingExpenses", { keyPath: "id" });
          expenseStore.createIndex("by-date", "expense_date");
        }
        if (!db.objectStoreNames.contains("inventory")) {
          db.createObjectStore("inventory", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("inventoryPurchases")) {
          const purchaseStore = db.createObjectStore("inventoryPurchases", { keyPath: "id" });
          purchaseStore.createIndex("by-date", "purchase_date");
        }
        if (!db.objectStoreNames.contains("transactionLogs")) {
          const logStore = db.createObjectStore("transactionLogs", { keyPath: "id" });
          logStore.createIndex("by-date", "created_at");
          logStore.createIndex("by-action", "action");
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// Network status
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function setOnlineStatus(status: boolean) {
  isOnline = status;
}

// Initialize network listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Network: Back online");
    setOnlineStatus(true);
    triggerSync();
  });
  
  window.addEventListener("offline", () => {
    console.log("Network: Gone offline");
    setOnlineStatus(false);
  });
}

// Sync functions
async function addToSyncQueue(table: string, operation: "insert" | "update" | "delete", data: any) {
  const db = await getDB();
  await db.put("syncQueue", {
    id: uuidv4(),
    table,
    operation,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerSync() {
  if (!isOnline) return;
  
  const db = await getDB();
  const queue = await db.getAll("syncQueue");
  
  if (queue.length === 0) {
    // Even if there's nothing to sync, refresh from Supabase to get other users' data
    await refreshFromSupabase();
    return;
  }
  
  console.log(`Syncing ${queue.length} pending changes...`);
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase not initialized");
    return;
  }
  
  const syncedIds: string[] = [];
  
  for (const item of queue) {
    try {
      switch (item.table) {
        case "sales":
          await syncSale(supabase, item.operation, item.data);
          break;
        case "expenses":
          await syncExpense(supabase, item.operation, item.data);
          break;
        case "inventory":
          await syncInventory(supabase, item.operation, item.data);
          break;
        case "inventory_purchases":
          await syncPurchase(supabase, item.operation, item.data);
          break;
        case "transaction_logs":
          await syncTransactionLog(supabase, item.operation, item.data);
          break;
      }
      syncedIds.push(item.id);
    } catch (error) {
      console.error(`Error syncing ${item.table}:`, error);
    }
  }
  
  // Remove synced items from queue
  for (const id of syncedIds) {
    await db.delete("syncQueue", id);
  }
  
  if (syncedIds.length > 0) {
    console.log(`Synced ${syncedIds.length} items successfully`);
  }
  
  // After syncing, refresh from Supabase to get updates from other users
  await refreshFromSupabase();
}

async function syncSale(supabase: SupabaseClient, operation: string, data: any) {
  const saleData = {
    sale_date: data.sale_date,
    location_name: data.location_name,
    product_type: data.product_type,
    egg_size: data.egg_size,
    quantity_sold: data.quantity_sold,
    selling_price_per_unit: data.selling_price_per_unit,
    payment_method: data.payment_method,
    notes: data.notes,
    synced: true,
    created_at: data.created_at,
  };
  
  if (operation === "insert" || operation === "update") {
    if (data.supabase_id) {
      await supabase.from("sales").update(saleData).eq("id", data.supabase_id);
    } else {
      const result = await supabase.from("sales").insert(saleData).select().single();
      if (result.data) {
        const db = await getDB();
        await db.put("pendingSales", { ...data, supabase_id: result.data.id, synced: true });
      }
    }
  } else if (operation === "delete" && data.supabase_id) {
    await supabase.from("sales").delete().eq("id", data.supabase_id);
  }
}

async function syncExpense(supabase: SupabaseClient, operation: string, data: any) {
  const expenseData = {
    expense_date: data.expense_date,
    category: data.category,
    amount: data.amount,
    description: data.description,
    synced: true,
    created_at: data.created_at,
  };
  
  if (operation === "insert" || operation === "update") {
    if (data.supabase_id) {
      await supabase.from("expenses").update(expenseData).eq("id", data.supabase_id);
    } else {
      const result = await supabase.from("expenses").insert(expenseData).select().single();
      if (result.data) {
        const db = await getDB();
        await db.put("pendingExpenses", { ...data, supabase_id: result.data.id, synced: true });
      }
    }
  } else if (operation === "delete" && data.supabase_id) {
    await supabase.from("expenses").delete().eq("id", data.supabase_id);
  }
}

async function syncInventory(supabase: SupabaseClient, operation: string, data: any) {
  const inventoryData = {
    product_type: data.product_type,
    egg_size: data.egg_size,
    total_quantity: data.total_quantity,
    total_cost: data.total_cost,
    updated_at: new Date().toISOString(),
  };
  
  if (operation === "insert" || operation === "update") {
    await supabase.from("inventory").upsert(inventoryData);
  }
}

async function syncPurchase(supabase: SupabaseClient, operation: string, data: any) {
  const purchaseData = {
    product_type: data.product_type,
    egg_size: data.egg_size,
    quantity: data.quantity,
    cost_per_unit: data.cost_per_unit,
    supplier_name: data.supplier_name,
    purchase_date: data.purchase_date,
    notes: data.notes,
    created_at: data.created_at,
  };
  
  if (operation === "insert" || operation === "update") {
    if (data.supabase_id) {
      await supabase.from("inventory_purchases").update(purchaseData).eq("id", data.supabase_id);
    } else {
      const result = await supabase.from("inventory_purchases").insert(purchaseData).select().single();
      if (result.data) {
        const db = await getDB();
        await db.put("inventoryPurchases", { ...data, supabase_id: result.data.id, pending_sync: false });
      }
    }
  } else if (operation === "delete" && data.supabase_id) {
    await supabase.from("inventory_purchases").delete().eq("id", data.supabase_id);
  }
}

async function syncTransactionLog(supabase: SupabaseClient, operation: string, data: any) {
  const logData = {
    action: data.action,
    product_type: data.product_type,
    egg_size: data.egg_size,
    quantity: data.quantity,
    amount: data.amount,
    unit_price: data.unit_price,
    location: data.location,
    category: data.category,
    payment_method: data.payment_method,
    description: data.description,
    supplier_name: data.supplier_name,
    notes: data.notes,
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    previous_values: data.previous_values,
    new_values: data.new_values,
    created_at: data.created_at,
  };
  
  if (operation === "insert") {
    if (!data.supabase_id) {
      await supabase.from("transaction_logs").insert(logData);
    }
  }
}

// Load data from Supabase
export async function loadFromSupabase() {
  const supabase = getSupabase();
  if (!supabase || !isOnline) return null;
  
  try {
    const [salesRes, expensesRes, inventoryRes, purchasesRes, logsRes] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory").select("*"),
      supabase.from("inventory_purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("transaction_logs").select("*").order("created_at", { ascending: false }),
    ]);
    
    const db = await getDB();
    
    // Store in local DB
    if (salesRes.data) {
      for (const sale of salesRes.data) {
        await db.put("pendingSales", { ...sale, synced: true });
      }
    }
    
    if (expensesRes.data) {
      for (const expense of expensesRes.data) {
        await db.put("pendingExpenses", { ...expense, synced: true });
      }
    }
    
    if (inventoryRes.data) {
      for (const stock of inventoryRes.data) {
        await db.put("inventory", stock);
      }
    }
    
    if (purchasesRes.data) {
      for (const purchase of purchasesRes.data) {
        await db.put("inventoryPurchases", { ...purchase, pending_sync: false, synced: true });
      }
    }
    
    // Store transaction logs
    if (logsRes.data) {
      for (const log of logsRes.data) {
        await db.put("transactionLogs", { ...log, supabase_id: log.id });
      }
    }
    
    console.log("Data loaded from Supabase successfully");
    return true;
  } catch (error) {
    console.error("Error loading from Supabase:", error);
    return null;
  }
}

// Check if initial load is needed
export async function needsInitialLoad(): Promise<boolean> {
  const db = await getDB();
  const sales = await db.getAll("pendingSales");
  const inventory = await db.getAll("inventory");
  return sales.length === 0 && inventory.length === 0;
}

// Refresh local data from Supabase (for getting updates from other users)
export async function refreshFromSupabase() {
  const supabase = getSupabase();
  if (!supabase || !isOnline) return null;
  
  try {
    const [salesRes, expensesRes, inventoryRes, purchasesRes, logsRes] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("inventory").select("*"),
      supabase.from("inventory_purchases").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("transaction_logs").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    
    const db = await getDB();
    
    // Store in local DB (overwrite to get updates from other users)
    if (salesRes.data) {
      await db.clear("pendingSales");
      for (const sale of salesRes.data) {
        await db.put("pendingSales", { ...sale, synced: true });
      }
    }
    
    if (expensesRes.data) {
      await db.clear("pendingExpenses");
      for (const expense of expensesRes.data) {
        await db.put("pendingExpenses", { ...expense, synced: true });
      }
    }
    
    if (inventoryRes.data) {
      await db.clear("inventory");
      for (const stock of inventoryRes.data) {
        await db.put("inventory", stock);
      }
    }
    
    if (purchasesRes.data) {
      await db.clear("inventoryPurchases");
      for (const purchase of purchasesRes.data) {
        await db.put("inventoryPurchases", { ...purchase, pending_sync: false, synced: true });
      }
    }
    
    if (logsRes.data) {
      await db.clear("transactionLogs");
      for (const log of logsRes.data) {
        await db.put("transactionLogs", { ...log, supabase_id: log.id });
      }
    }
    
    console.log("Data refreshed from Supabase successfully");
    
    // Dispatch event so components can react to the data update
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("supabase-data-updated"));
    }
    
    return true;
  } catch (error) {
    console.error("Error refreshing from Supabase:", error);
    return null;
  }
}

// ============ EXPORTED DB FUNCTIONS ============
// These replace the original IndexedDB functions with hybrid local + sync

export async function addPendingSale(sale: Sale) {
  const db = await getDB();
  const saleWithSync = { ...sale, pending_sync: true };
  await db.put("pendingSales", saleWithSync);
  
  if (isOnline) {
    await addToSyncQueue("sales", "insert", saleWithSync);
    await triggerSync();
  }
}

export async function getPendingSales(): Promise<Sale[]> {
  const db = await getDB();
  const sales = await db.getAll("pendingSales");
  return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deletePendingSale(id: string) {
  const db = await getDB();
  const sale = await db.get("pendingSales", id);
  await db.delete("pendingSales", id);
  
  if (isOnline && sale?.supabase_id) {
    await addToSyncQueue("sales", "delete", { id, supabase_id: sale.supabase_id });
    await triggerSync();
  }
}

export async function updateSale(sale: Sale) {
  const db = await getDB();
  const saleWithSync = { ...sale, pending_sync: true };
  await db.put("pendingSales", saleWithSync);
  
  if (isOnline) {
    await addToSyncQueue("sales", "update", saleWithSync);
    await triggerSync();
  }
}

export async function getSaleById(id: string): Promise<Sale | undefined> {
  const db = await getDB();
  return db.get("pendingSales", id);
}

export async function addPendingExpense(expense: Expense) {
  const db = await getDB();
  const expenseWithSync = { ...expense, pending_sync: true };
  await db.put("pendingExpenses", expenseWithSync);
  
  if (isOnline) {
    await addToSyncQueue("expenses", "insert", expenseWithSync);
    await triggerSync();
  }
}

export async function getPendingExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const expenses = await db.getAll("pendingExpenses");
  return expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deletePendingExpense(id: string) {
  const db = await getDB();
  const expense = await db.get("pendingExpenses", id);
  await db.delete("pendingExpenses", id);
  
  if (isOnline && expense?.supabase_id) {
    await addToSyncQueue("expenses", "delete", { id, supabase_id: expense.supabase_id });
    await triggerSync();
  }
}

export async function updateInventoryStock(productType: ProductType, eggSize: EggSize, quantityChange: number, costChange: number = 0) {
  const db = await getDB();
  const allStocks = await db.getAll("inventory");
  const existing = allStocks.find(s => s.product_type === productType && s.egg_size === eggSize);
  
  let newStock: InventoryStock;
  
  if (existing) {
    let newCost = existing.total_cost;
    
    if (quantityChange < 0 && existing.total_quantity > 0) {
      const avgCost = existing.total_cost / existing.total_quantity;
      const costReduction = Math.abs(quantityChange) * avgCost;
      newCost = existing.total_cost - costReduction;
    } else if (quantityChange > 0) {
      newCost = existing.total_cost + (costChange || 0);
    }
    
    newStock = {
      ...existing,
      total_quantity: existing.total_quantity + quantityChange,
      total_cost: Math.max(0, newCost),
    };
  } else if (quantityChange > 0) {
    newStock = {
      id: `${productType}_${eggSize}`,
      product_type: productType,
      egg_size: eggSize,
      total_quantity: quantityChange,
      total_cost: costChange,
    };
  } else {
    return;
  }
  
  await db.put("inventory", newStock);
  
  if (isOnline) {
    await addToSyncQueue("inventory", "update", newStock);
    await triggerSync();
  }
}

export async function getInventoryStock(): Promise<InventoryStock[]> {
  const db = await getDB();
  return db.getAll("inventory");
}

export async function setInventoryStock(stock: InventoryStock) {
  const db = await getDB();
  await db.put("inventory", stock);
  
  if (isOnline) {
    await addToSyncQueue("inventory", "update", stock);
    await triggerSync();
  }
}

export async function addInventoryPurchase(purchase: InventoryPurchase) {
  const db = await getDB();
  const purchaseWithSync = { ...purchase, pending_sync: true };
  await db.put("inventoryPurchases", purchaseWithSync);
  
  if (isOnline) {
    await addToSyncQueue("inventory_purchases", "insert", purchaseWithSync);
    await triggerSync();
  }
}

export async function getInventoryPurchases(): Promise<InventoryPurchase[]> {
  const db = await getDB();
  const purchases = await db.getAll("inventoryPurchases");
  return purchases.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
}

export async function updateInventoryPurchase(purchase: InventoryPurchase) {
  const db = await getDB();
  const purchaseWithSync = { ...purchase, pending_sync: true };
  await db.put("inventoryPurchases", purchaseWithSync);
  
  if (isOnline) {
    await addToSyncQueue("inventory_purchases", "update", purchaseWithSync);
    await triggerSync();
  }
}

export async function deleteInventoryPurchase(id: string) {
  const db = await getDB();
  const purchase = await db.get("inventoryPurchases", id);
  await db.delete("inventoryPurchases", id);
  
  if (isOnline && purchase?.supabase_id) {
    await addToSyncQueue("inventory_purchases", "delete", { id, supabase_id: purchase.supabase_id });
    await triggerSync();
  }
}

export async function getInventoryPurchaseById(id: string): Promise<InventoryPurchase | undefined> {
  const db = await getDB();
  return db.get("inventoryPurchases", id);
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("pendingSales");
  await db.clear("pendingExpenses");
  await db.clear("inventory");
  await db.clear("inventoryPurchases");
  await db.clear("transactionLogs");
  await db.clear("syncQueue");
}

export async function addTransactionLog(log: Omit<TransactionLog, "id" | "created_at">) {
  const db = await getDB();
  const fullLog: TransactionLog = {
    ...log,
    id: uuidv4(),
    created_at: new Date().toISOString(),
  };
  await db.put("transactionLogs", fullLog);
  
  if (isOnline) {
    await addToSyncQueue("transaction_logs", "insert", fullLog);
    await triggerSync();
  }
}

export async function getTransactionLogs(limit: number = 500): Promise<TransactionLog[]> {
  const db = await getDB();
  const logs = await db.getAll("transactionLogs");
  return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export async function getTransactionLogsByAction(action: string, limit: number = 100): Promise<TransactionLog[]> {
  const db = await getDB();
  const allLogs = await db.getAll("transactionLogs");
  return allLogs
    .filter(log => log.action === action)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function clearDatabase() {
  const db = await getDB();
  await db.clear("pendingSales");
  await db.clear("pendingExpenses");
  await db.clear("inventory");
  await db.clear("inventoryPurchases");
  await db.clear("transactionLogs");
  await db.clear("syncQueue");
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  const queue = await db.getAll("syncQueue");
  return queue.length;
}

// Polling interval for automatic sync
let syncIntervalId: NodeJS.Timeout | null = null;

// Start polling for real-time sync
export function startPolling(intervalMs: number = 30000) {
  if (syncIntervalId) return;
  
  syncIntervalId = setInterval(async () => {
    if (isOnline) {
      console.log("Polling: checking for updates from Supabase...");
      await refreshFromSupabase();
    }
  }, intervalMs);
  
  console.log(`Started polling every ${intervalMs}ms`);
}

// Stop polling
export function stopPolling() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log("Stopped polling");
  }
}
