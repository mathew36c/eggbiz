"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Package, TrendingUp, TrendingDown, Wifi, RefreshCw, CloudOff, CloudSync } from "lucide-react";
import { getInventoryStock, getPendingSales, getPendingExpenses, getInventoryPurchases, initSupabase, loadFromSupabase, needsInitialLoad, getOnlineStatus, getPendingSyncCount, triggerSync, refreshFromSupabase, startPolling } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { InventoryStock, DailyMetrics, Sale, Expense } from "@/lib/types";
import { calculateProfitMetrics } from "@/lib/profit";
import { EggSizeIcon } from "@/components/EggSizeIcon";
import { TimeRangeSelector, filterByDateRange, getTimeRangeLabel } from "@/components/TimeRangeSelector";
import { useTimeRange } from "@/components/TimeRangeContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { timeRange, setTimeRange } = useTimeRange();
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics>({
    revenue: 0,
    items_sold: 0,
    cogs: 0,
    expenses: 0,
    gross_profit: 0,
    net_profit: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Initialize Supabase and load initial data
  useEffect(() => {
    async function initialize() {
      initSupabase();
      
      const online = getOnlineStatus();
      setIsOnline(online);
      
      // Check if we need to load from Supabase (first time or empty local DB)
      if (online) {
        const needsLoad = await needsInitialLoad();
        if (needsLoad) {
          console.log("Initial load from Supabase...");
          await loadFromSupabase();
        }
      }
      
      // Start polling for real-time sync
      startPolling(30000); // Poll every 30 seconds
      
      setIsInitializing(false);
    }
    
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || isInitializing) return;
    
    const handleOnline = async () => {
      setIsOnline(true);
      // Try to sync when coming back online
      await triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleDataUpdated = () => {
      console.log("Data updated from Supabase, reloading...");
      loadData();
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("supabase-data-updated", handleDataUpdated);
    
    loadData();
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("supabase-data-updated", handleDataUpdated);
    };
  }, [user, isInitializing]);

  // Reload data when time range changes
  useEffect(() => {
    if (!allSales.length && !allExpenses.length) return;
    
    const loadFilteredData = async () => {
      try {
        const inventoryPurchases = await getInventoryPurchases();
        
        const filteredSales = filterByDateRange(allSales, timeRange);
        const filteredExpenses = filterByDateRange(allExpenses, timeRange);
        
        const { revenue, itemsSold, cogs, grossProfit, expenses, netProfit } = calculateProfitMetrics({
          allSales,
          selectedSales: filteredSales,
          expenses: filteredExpenses,
          purchases: inventoryPurchases,
        });
        
        setMetrics({
          revenue,
          items_sold: itemsSold,
          cogs,
          expenses,
          gross_profit: grossProfit,
          net_profit: netProfit,
        });
      } catch (error) {
        console.error("Error filtering data:", error);
      }
    };
    
    loadFilteredData();
  }, [timeRange, allSales, allExpenses]);

  async function loadData() {
    try {
      const inventoryStocks = await getInventoryStock();
      setStocks(inventoryStocks);
      
      const pendingSales = await getPendingSales();
      const pendingExpenses = await getPendingExpenses();
      const inventoryPurchases = await getInventoryPurchases();
      setPendingCount(pendingSales.length + pendingExpenses.length);
      
      // Get pending sync count
      const syncCount = await getPendingSyncCount();
      setPendingSyncCount(syncCount);
      
      setAllSales(pendingSales);
      setAllExpenses(pendingExpenses);
      setStocks(inventoryStocks);
      
      // Filter sales and expenses based on time range
      const filteredSales = filterByDateRange(pendingSales, timeRange);
      const filteredExpenses = filterByDateRange(pendingExpenses, timeRange);
      
      const { revenue, itemsSold, cogs, grossProfit, expenses, netProfit } = calculateProfitMetrics({
        allSales: pendingSales,
        selectedSales: filteredSales,
        expenses: filteredExpenses,
        purchases: inventoryPurchases,
      });
      
      setMetrics({
        revenue,
        items_sold: itemsSold,
        cogs,
        expenses,
        gross_profit: grossProfit,
        net_profit: netProfit,
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async function handleSync() {
    if (!isOnline) return;
    
    setIsSyncing(true);
    await triggerSync();
    await loadData();
    setIsSyncing(false);
  }

  const totalItems = stocks.reduce((sum, s) => sum + s.total_quantity, 0);
  const totalValue = stocks.reduce((sum, s) => sum + s.total_cost, 0);
  const lowStockSizes = stocks.filter(s => s.total_quantity < 20);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Egg Business</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          {isInitializing ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <CloudSync className="h-4 w-4 animate-pulse" />
              Loading...
            </span>
          ) : !isOnline ? (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <CloudOff className="h-4 w-4" />
              Offline
            </span>
          ) : pendingSyncCount > 0 ? (
            <span className="flex items-center gap-1 text-sm text-yellow-600">
              <CloudSync className="h-4 w-4" />
              {pendingSyncCount} pending
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              Synced
            </span>
          )}
          {pendingCount > 0 && (
            <button 
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </header>

      {pendingCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-yellow-600">
            {pendingCount} pending {pendingCount === 1 ? "entry" : "entries"} waiting to sync
          </span>
          {isOnline && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="text-sm font-medium text-yellow-600 hover:underline"
            >
              {isSyncing ? "Syncing..." : "Sync now"}
            </button>
          )}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">{getTimeRangeLabel(timeRange)} Revenue</span>
          </div>
          <p className="text-2xl font-bold">₱{metrics.revenue.toLocaleString()}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs">Trays Sold</span>
          </div>
          <p className="text-2xl font-bold">{metrics.items_sold}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">COGS</span>
          </div>
          <p className="text-2xl font-bold">₱{metrics.cogs.toLocaleString()}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Gross Profit</span>
          </div>
          <p className={`text-2xl font-bold ${metrics.gross_profit >= 0 ? "text-green-600" : "text-red-500"}`}>
            ₱{metrics.gross_profit.toLocaleString()}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">Expenses</span>
          </div>
          <p className="text-2xl font-bold">₱{metrics.expenses.toLocaleString()}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Net Profit</span>
          </div>
          <p className={`text-2xl font-bold ${metrics.net_profit >= 0 ? "text-green-600" : "text-red-500"}`}>
            ₱{metrics.net_profit.toLocaleString()}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Inventory Status</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-2 p-3 bg-muted text-xs font-medium">
            <div>Size</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Value</div>
            <div className="text-right">Status</div>
          </div>
          {stocks.map((stock) => (
            <div 
              key={stock.egg_size} 
              className={`grid grid-cols-4 gap-2 p-3 text-sm border-t ${stock.total_quantity < 20 ? "bg-red-50" : ""}`}
            >
              <div className="flex items-center gap-2 font-medium">
                <EggSizeIcon size={stock.egg_size} compact />
                <span>{stock.egg_size}</span>
              </div>
              <div className="text-right">{stock.total_quantity}</div>
              <div className="text-right">₱{stock.total_cost.toLocaleString()}</div>
              <div className="text-right">
                {stock.total_quantity < 20 ? (
                  <span className="text-xs text-red-500 font-medium">Low</span>
                ) : (
                  <span className="text-xs text-green-600">OK</span>
                )}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 p-3 text-sm font-medium bg-muted border-t">
            <div>Total</div>
            <div className="text-right">{totalItems}</div>
            <div className="text-right">₱{totalValue.toLocaleString()}</div>
            <div className="text-right"></div>
          </div>
        </div>
        
        {lowStockSizes.length > 0 && (
          <p className="text-xs text-red-500 mt-2">
            ⚠️ Low stock alert: {lowStockSizes.map(s => s.egg_size).join(", ")}
          </p>
        )}
      </section>

      <section className="flex gap-3">
        <a
          href="/add-sale"
          className="flex-1 bg-primary text-primary-foreground py-4 rounded-lg font-medium text-center touch-manipulation hover:opacity-90 transition-opacity"
        >
          + New Sale
        </a>
        <a
          href="/add-expense"
          className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-lg font-medium text-center touch-manipulation hover:opacity-90 transition-opacity border"
        >
          + Expense
        </a>
      </section>
    </div>
  );
}