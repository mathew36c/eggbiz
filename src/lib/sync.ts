"use client";

import { createClient } from "@/lib/supabase";
import { 
  getPendingSales, deletePendingSale, 
  getPendingExpenses, deletePendingExpense 
} from "./db";

let syncInProgress = false;

export async function syncPendingData() {
  if (syncInProgress || !navigator.onLine) {
    return { success: false, message: "Already syncing or offline" };
  }

  syncInProgress = true;
  
  try {
    const supabase = createClient();
    const pendingSales = await getPendingSales();
    const pendingExpenses = await getPendingExpenses();

    let syncedSales = 0;
    let syncedExpenses = 0;

    for (const sale of pendingSales) {
      const { error } = await supabase.from("sales").insert({
        sale_date: sale.sale_date,
        location_name: sale.location_name,
        product_type: sale.product_type,
        egg_size: sale.egg_size,
        quantity_sold: sale.quantity_sold,
        selling_price_per_unit: sale.selling_price_per_unit,
        payment_method: sale.payment_method,
        notes: sale.notes,
      });

      if (!error) {
        await deletePendingSale(sale.id);
        syncedSales++;
      } else {
        console.error("Error syncing sale:", error);
      }
    }

    for (const expense of pendingExpenses) {
      const { error } = await supabase.from("expenses").insert({
        expense_date: expense.expense_date,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
      });

      if (!error) {
        await deletePendingExpense(expense.id);
        syncedExpenses++;
      } else {
        console.error("Error syncing expense:", error);
      }
    }

    return { 
      success: true, 
      message: `Synced ${syncedSales} sales and ${syncedExpenses} expenses` 
    };
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false, message: "Sync failed" };
  } finally {
    syncInProgress = false;
  }
}

export function setupSyncListeners() {
  const handleOnline = async () => {
    console.log("Connection restored, syncing...");
    await syncPendingData();
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

export async function checkAndSync() {
  if (navigator.onLine) {
    await syncPendingData();
  }
}