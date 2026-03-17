"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getPendingExpenses } from "@/lib/db";
import { Expense, ExpenseCategory } from "@/lib/types";
import { TimeRangeSelector, filterByDateRange, getTimeRangeLabel } from "@/components/TimeRangeSelector";
import { useTimeRange } from "@/components/TimeRangeContext";

const categories: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "fuel", label: "Fuel", icon: "⛽" },
  { value: "maintenance", label: "Maintenance", icon: "🔧" },
  { value: "supplies", label: "Supplies", icon: "📦" },
  { value: "food", label: "Food", icon: "🍱" },
  { value: "misc", label: "Misc", icon: "📝" },
];

export default function ExpensesPage() {
  const { timeRange, setTimeRange } = useTimeRange();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<{ category?: ExpenseCategory; dateFrom?: string; dateTo?: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const allExpenses = await getPendingExpenses();
    setExpenses(allExpenses.sort((a, b) => 
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    ));
  }

  const filteredByTimeExpenses = filterByDateRange(expenses, timeRange);

  const filteredExpenses = filteredByTimeExpenses.filter((expense) => {
    if (filter.category && expense.category !== filter.category) return false;
    if (filter.dateFrom && new Date(expense.expense_date) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(expense.expense_date) > new Date(filter.dateTo)) return false;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryInfo = categories.find(c => c.value === filter.category);

  const getCategoryInfo = (cat: ExpenseCategory) => {
    return categories.find(c => c.value === cat) || { label: cat, icon: "📝" };
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="ml-auto">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex justify-between text-sm mb-1">
          <span>{getTimeRangeLabel(timeRange)} Total:</span>
          <span className="font-bold">₱{totalExpenses.toLocaleString()}</span>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <Link 
            href="/add-expense" 
            className="flex items-center gap-1 text-sm text-primary font-medium touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Link>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter({ ...filter, category: undefined })}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap touch-manipulation ${
                !filter.category ? "bg-primary text-primary-foreground" : "bg-card border"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter({ ...filter, category: cat.value })}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap touch-manipulation ${
                  filter.category === cat.value ? "bg-primary text-primary-foreground" : "bg-card border"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={filter.dateFrom || ""}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value || undefined })}
              className="flex-1 p-2 rounded-lg border bg-card text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={filter.dateTo || ""}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value || undefined })}
              className="flex-1 p-2 rounded-lg border bg-card text-sm"
              placeholder="To"
            />
          </div>
        </div>

        {filter.category && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span>Filtered Total ({categoryInfo?.icon} {categoryInfo?.label}):</span>
              <span className="font-bold">₱{totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses recorded yet</p>
          ) : (
            filteredExpenses.map((expense) => {
              const catInfo = getCategoryInfo(expense.category);
              return (
                <div key={expense.id} className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{catInfo.icon}</span>
                      <span className="font-medium capitalize">{expense.category}</span>
                    </div>
                    <span className="font-bold text-lg">₱{expense.amount.toLocaleString()}</span>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}