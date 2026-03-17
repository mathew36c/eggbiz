"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { addPendingSale, updateInventoryStock, getInventoryStock } from "@/lib/db";
import { logSale } from "@/lib/logger";
import { EggSize, InventoryStock } from "@/lib/types";

const QUICK_PRICES = [199, 205, 219, 225, 249];

export default function AddSalePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [sizeSelected, setSizeSelected] = useState(false);
  
  const [eggSize, setEggSize] = useState<EggSize | null>(null);
  const [quantitySold, setQuantitySold] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [locationName, setLocationName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    if (eggSize) {
      setSizeSelected(true);
      setQuantitySold("");
      setPricePerUnit("");
    }
  }, [eggSize]);

  async function loadStock() {
    const inventoryStocks = await getInventoryStock();
    setStocks(inventoryStocks);
  }

  const currentStock = stocks.find(s => s.egg_size === eggSize);
  const availableStock = currentStock?.total_quantity || 0;
  const requestedQty = parseInt(quantitySold) || 0;
  const hasEnoughStock = requestedQty > 0 && requestedQty <= availableStock;
  const canEdit = sizeSelected && hasEnoughStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!sizeSelected || !quantitySold || !pricePerUnit || !locationName) {
      alert("Please fill in all required fields");
      return;
    }

    if (!hasEnoughStock) {
      alert("Not enough stock available");
      return;
    }

    setIsSubmitting(true);

    try {
      const quantityNum = parseInt(quantitySold);
      const priceNum = parseFloat(pricePerUnit);
      
      const sale = {
        id: uuidv4(),
        sale_date: saleDate,
        location_name: locationName,
        product_type: "egg" as const,
        egg_size: eggSize!,
        quantity_sold: quantityNum,
        selling_price_per_unit: priceNum,
        payment_method: paymentMethod,
        notes: notes || undefined,
        created_at: new Date().toISOString(),
        synced: false,
      };

      await addPendingSale(sale);
      await updateInventoryStock("egg", eggSize!, -quantityNum);
      
      await logSale(eggSize!, quantityNum, priceNum, locationName, paymentMethod, notes || undefined);
      
      router.push("/sales");
    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Failed to save sale");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickPrice(price: number) {
    if (canEdit) {
      setPricePerUnit(price.toString());
    }
  }

  function handleSizeSelect(size: EggSize) {
    setEggSize(size);
  }

  const total = (parseInt(quantitySold) || 0) * (parseFloat(pricePerUnit) || 0);

  const inputDisabledClass = "opacity-50 cursor-not-allowed";
  const inputEnabledClass = "";

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <button onClick={() => router.back()} className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">New Sale</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Size {eggSize && `(${availableStock} available)`}</label>
          <div className="grid grid-cols-4 gap-2">
            {(["S", "M", "L", "XL"] as EggSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeSelect(size)}
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
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g., Greenfield Subdivision"
            disabled={!sizeSelected}
            className={`w-full p-3 rounded-lg border bg-card text-lg touch-manipulation ${!sizeSelected ? inputDisabledClass : inputEnabledClass}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Trays Sold 
            {sizeSelected && (
              <span className={`ml-2 text-xs ${hasEnoughStock ? "text-green-600" : "text-red-500"}`}>
                (Available: {availableStock})
              </span>
            )}
          </label>
          <input
            type="number"
            value={quantitySold}
            onChange={(e) => setQuantitySold(e.target.value)}
            placeholder={!sizeSelected ? "Select size first" : "Enter trays"}
            min="1"
            disabled={!sizeSelected}
            className={`w-full p-3 rounded-lg border bg-card text-lg touch-manipulation ${!sizeSelected ? inputDisabledClass : inputEnabledClass}`}
            required
          />
          {sizeSelected && quantitySold && !hasEnoughStock && (
            <p className="text-xs text-red-500 mt-1">Not enough stock. Maximum: {availableStock}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price per Tray (₱)</label>
          <input
            type="number"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            placeholder={!sizeSelected ? "Select size first" : "Enter price"}
            min="0"
            step="1"
            disabled={!sizeSelected}
            className={`w-full p-3 rounded-lg border bg-card text-lg touch-manipulation ${!sizeSelected ? inputDisabledClass : inputEnabledClass}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quick Prices</label>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_PRICES.map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => handleQuickPrice(price)}
                disabled={!canEdit}
                className={`py-2 rounded-lg font-medium text-sm border touch-manipulation transition-colors ${
                  parseFloat(pricePerUnit) === price
                    ? "bg-primary text-primary-foreground border-primary"
                    : canEdit
                      ? "bg-card hover:bg-muted"
                      : "bg-muted opacity-50 cursor-not-allowed"
                }`}
              >
                {price}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => canEdit && setPaymentMethod("cash")}
              disabled={!canEdit}
              className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                paymentMethod === "cash"
                  ? "bg-primary text-primary-foreground border-primary"
                  : canEdit
                    ? "bg-card hover:bg-muted"
                    : "bg-muted opacity-50 cursor-not-allowed"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => canEdit && setPaymentMethod("gcash")}
              disabled={!canEdit}
              className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                paymentMethod === "gcash"
                  ? "bg-primary text-primary-foreground border-primary"
                  : canEdit
                    ? "bg-card hover:bg-muted"
                    : "bg-muted opacity-50 cursor-not-allowed"
              }`}
            >
              GCash
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sale Date</label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            disabled={!canEdit}
            className={`w-full p-3 rounded-lg border bg-card text-lg touch-manipulation ${!canEdit ? inputDisabledClass : inputEnabledClass}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={2}
            disabled={!canEdit}
            className={`w-full p-3 rounded-lg border bg-card text-lg touch-manipulation resize-none ${!canEdit ? inputDisabledClass : inputEnabledClass}`}
          />
        </div>

        {total > 0 && hasEnoughStock && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>₱{total.toLocaleString()}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !canEdit}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium text-lg touch-manipulation hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Record Sale"}
        </button>
      </form>
    </div>
  );
}
