"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, Pencil } from "lucide-react";
import { getInventoryStock, getInventoryPurchases } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { InventoryStock, InventoryPurchase } from "@/lib/types";
import { EggSizeIcon } from "@/components/EggSizeIcon";
import { TimeRangeSelector, filterPurchasesByDateRange, getTimeRangeLabel } from "@/components/TimeRangeSelector";
import { useTimeRange } from "@/components/TimeRangeContext";

export default function InventoryPage() {
  const { timeRange, setTimeRange } = useTimeRange();
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const { canEdit } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const inventoryStocks = await getInventoryStock();
    setStocks(inventoryStocks);
    const inventoryPurchases = await getInventoryPurchases();
    setPurchases(inventoryPurchases.sort((a, b) => 
      new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    ));
  }

  const filteredPurchases = filterPurchasesByDateRange(purchases, timeRange);
  
  const totalTrays = stocks.reduce((sum, s) => sum + s.total_quantity, 0);
  const totalValue = stocks.reduce((sum, s) => sum + s.total_cost, 0);
  const lowStockSizes = stocks.filter(s => s.total_quantity < 20);
  
  const periodCapital = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity * purchase.cost_per_unit,
    0
  );
  const periodAddedTrays = filteredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="ml-auto">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      <section>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Trays</p>
            <p className="text-2xl font-bold">{totalTrays}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">₱{totalValue.toLocaleString()}</p>
          </div>
          <div className="col-span-2 bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel(timeRange)} Capital</p>
            <p className="text-2xl font-bold">₱{periodCapital.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {periodAddedTrays} tray{periodAddedTrays === 1 ? "" : "s"} added
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg font-semibold">Stock Levels - Egg</h2>
          <Link
            href="/add-inventory"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Stock
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {stocks.map((stock) => (
            <div key={stock.egg_size} className={`border rounded-lg p-4 ${stock.total_quantity < 20 ? "bg-red-50 border-red-200" : "bg-card"}`}>
              <div className="flex items-center gap-2 mb-2">
                <EggSizeIcon size={stock.egg_size} />
                <span className="text-lg font-bold">{stock.egg_size}</span>
                {stock.total_quantity < 20 && <span className="text-xs text-red-500 font-medium ml-auto">Low</span>}
              </div>
              <p className="text-2xl font-bold">{stock.total_quantity}</p>
              <p className="text-xs text-muted-foreground">trays</p>
              <p className="text-sm text-muted-foreground mt-2">Value: ₱{stock.total_cost.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      {lowStockSizes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600 font-medium">
            Low Stock Alert: {lowStockSizes.map(s => `${s.egg_size}: ${s.total_quantity} trays`).join(", ")}
          </p>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Purchases</h2>
        <div className="space-y-2">
          {purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No purchases recorded yet</p>
          ) : (
            purchases.slice(0, 10).map((purchase) => (
              <div key={purchase.id} className="bg-card border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EggSizeIcon size={purchase.egg_size} compact />
                    <span className="font-medium">{purchase.egg_size}</span>
                    <span className="text-muted-foreground">× {purchase.quantity} trays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">₱{(purchase.quantity * purchase.cost_per_unit).toLocaleString()}</span>
                    {canEdit && (
                      <Link href={`/edit-purchase/${purchase.id}`} className="p-1 hover:bg-muted rounded">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{purchase.supplier_name || "No supplier"}</span>
                  <span>₱{purchase.cost_per_unit}/tray • {new Date(purchase.purchase_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
