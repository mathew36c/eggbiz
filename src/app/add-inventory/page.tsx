"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { updateInventoryStock, addInventoryPurchase as savePurchase } from "@/lib/db";
import { logPurchase } from "@/lib/logger";
import { EggSize } from "@/lib/types";

export default function AddInventoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [eggSize, setEggSize] = useState<EggSize>("M");
  const [trays, setTrays] = useState("");
  const [costPerTray, setCostPerTray] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!trays || !costPerTray) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const traysNum = parseInt(trays);
      const costNum = parseFloat(costPerTray);
      const totalCost = traysNum * costNum;
      
      const purchase = {
        id: uuidv4(),
        product_type: "egg" as const,
        egg_size: eggSize,
        quantity: traysNum,
        cost_per_unit: costNum,
        supplier_name: supplierName || undefined,
        purchase_date: purchaseDate,
        notes: notes || undefined,
        created_at: new Date().toISOString(),
      };

      await savePurchase(purchase);
      await updateInventoryStock("egg", eggSize, traysNum, totalCost);
      
      await logPurchase(eggSize, traysNum, costNum, supplierName || undefined, notes || undefined);
      
      router.push("/inventory");
    } catch (error) {
      console.error("Error saving inventory:", error);
      alert("Failed to save inventory");
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
        <h1 className="text-2xl font-bold">Add Inventory</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Product Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-3 rounded-lg font-medium border bg-primary text-primary-foreground border-primary cursor-default"
            >
              Egg
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Size</label>
          <div className="grid grid-cols-4 gap-2">
            {(["S", "M", "L", "XL"] as EggSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setEggSize(size)}
                className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                  eggSize === size
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trays</label>
          <input
            type="number"
            value={trays}
            onChange={(e) => setTrays(e.target.value)}
            placeholder="Enter number of trays"
            min="1"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Cost per Tray (₱)</label>
          <input
            type="number"
            value={costPerTray}
            onChange={(e) => setCostPerTray(e.target.value)}
            placeholder="Enter cost per tray"
            min="0"
            step="0.01"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Supplier Name (optional)</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Enter supplier name"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={3}
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation resize-none"
          />
        </div>

        {trays && costPerTray && (
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total Cost:</span>
              <span className="font-bold">₱{(parseInt(trays) * parseFloat(costPerTray)).toLocaleString()}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium text-lg touch-manipulation hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Add to Inventory"}
        </button>
      </form>
    </div>
  );
}
