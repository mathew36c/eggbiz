"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { getPendingSales, getPendingExpenses, getInventoryStock, getInventoryPurchases } from "@/lib/db";
import { Sale, Expense, InventoryPurchase, InventoryStock } from "@/lib/types";
import { calculateProfitMetrics } from "@/lib/profit";
import { TimeRangeSelector, filterByDateRange, getTimeRangeLabel } from "@/components/TimeRangeSelector";
import { useTimeRange } from "@/components/TimeRangeContext";

const COLORS = ["#FFF9C4", "#FFECB3", "#FFE082", "#FFD54F"];

export default function AnalyticsPage() {
  const { timeRange, setTimeRange } = useTimeRange();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const allSales = await getPendingSales();
    const allExpenses = await getPendingExpenses();
    const allPurchases = await getInventoryPurchases();
    const inventoryStocks = await getInventoryStock();
    
    setSales(allSales);
    setExpenses(allExpenses);
    setPurchases(allPurchases);
    setStocks(inventoryStocks);
  }

  const filteredSales = filterByDateRange(sales, timeRange);
  const filteredExpenses = filterByDateRange(expenses, timeRange);

  const {
    revenue: totalRevenue,
    itemsSold: totalItems,
    cogs: totalCogs,
    grossProfit,
    expenses: totalExpenses,
    netProfit,
  } = calculateProfitMetrics({
    allSales: sales,
    selectedSales: filteredSales,
    expenses: filteredExpenses,
    purchases,
  });

  const salesBySize = ["S", "M", "L", "XL"].map((size) => {
    const sizeSales = filteredSales.filter((s) => s.egg_size === size);
    const qty = sizeSales.reduce((sum, s) => sum + s.quantity_sold, 0);
    const revenue = sizeSales.reduce((sum, s) => sum + (s.quantity_sold * s.selling_price_per_unit), 0);
    return {
      name: size,
      qty,
      revenue,
      avgPrice: qty > 0 ? revenue / qty : 0,
    };
  });

  const dailySales = filteredSales.reduce((acc: Record<string, { date: string; revenue: number; qty: number }>, sale) => {
    const dateKey = sale.sale_date;
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, revenue: 0, qty: 0 };
    }
    acc[dateKey].revenue += sale.quantity_sold * sale.selling_price_per_unit;
    acc[dateKey].qty += sale.quantity_sold;
    return acc;
  }, {});

  const dailyData = Object.values(dailySales)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14);

  const topLocation = filteredSales.reduce((acc: Record<string, number>, sale) => {
    acc[sale.location_name] = (acc[sale.location_name] || 0) + (sale.quantity_sold * sale.selling_price_per_unit);
    return acc;
  }, {});

  const topLocationEntry = Object.entries(topLocation).sort((a, b) => b[1] - a[1])[0];

  const inventoryData = stocks.map((stock, index) => ({
    name: stock.egg_size,
    value: stock.total_quantity,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </header>

      <div className="flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">₱{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Trays Sold</p>
            <p className="text-xl font-bold">{totalItems}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">COGS</p>
            <p className="text-xl font-bold">₱{totalCogs.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Gross Profit</p>
            <p className={`text-xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
              ₱{grossProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold">₱{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
              ₱{netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Sales by Size</h2>
        <div className="bg-card border rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesBySize}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qty" fill="#22c55e" name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {salesBySize.map((size) => (
            <div key={size.name} className="flex justify-between">
              <span>{size.name}:</span>
              <span className="font-medium">{size.qty} trays (₱{size.avgPrice.toFixed(0)}/tray)</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Daily Revenue</h2>
        <div className="bg-card border rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Revenue"]}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Inventory Status</h2>
        <div className="bg-card border rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={inventoryData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                fill="#22c55e"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {inventoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-around text-sm">
          {stocks.map((stock) => (
            <div key={stock.egg_size} className="text-center">
              <p className="font-medium">{stock.egg_size}</p>
              <p className="text-muted-foreground">{stock.total_quantity} trays</p>
            </div>
          ))}
        </div>
      </section>

      {topLocationEntry && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Top Selling Location</h2>
          <div className="bg-card border rounded-lg p-4">
            <p className="font-medium text-lg">{topLocationEntry[0]}</p>
            <p className="text-muted-foreground">₱{topLocationEntry[1].toLocaleString()} revenue</p>
          </div>
        </section>
      )}
    </div>
  );
}
