"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { addPendingExpense } from "@/lib/db";
import { logExpense } from "@/lib/logger";
import { ExpenseCategory } from "@/lib/types";

const categories: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "fuel", label: "Fuel", icon: "⛽" },
  { value: "maintenance", label: "Maintenance", icon: "🔧" },
  { value: "supplies", label: "Supplies", icon: "📦" },
  { value: "food", label: "Food", icon: "🍱" },
  { value: "misc", label: "Misc", icon: "📝" },
];

export default function AddExpensePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!amount) {
      alert("Please enter an amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const amountNum = parseFloat(amount);
      
      const expense = {
        id: uuidv4(),
        expense_date: expenseDate,
        category: category,
        amount: amountNum,
        description: description || undefined,
        created_at: new Date().toISOString(),
        synced: false,
      };

      await addPendingExpense(expense);
      await logExpense(category, amountNum, description || undefined);
      
      router.push("/expenses");
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <button onClick={() => router.back()} className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">Add Expense</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                  category === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted"
                }`}
              >
                <span className="block text-lg mb-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Amount (₱)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Gas station near market"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium text-lg touch-manipulation hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
}