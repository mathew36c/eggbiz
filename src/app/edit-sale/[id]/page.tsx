"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSaleById, updateSale, updateInventoryStock, getInventoryStock } from "@/lib/db";
import { logSaleEdit } from "@/lib/logger";
import { useAuth } from "@/lib/auth";
import { EggSize, Sale, InventoryStock } from "@/lib/types";

const QUICK_PRICES = [199, 205, 219, 225, 249];

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const { canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<Sale | null>(null);
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  
  const [eggSize, setEggSize] = useState<EggSize | null>(null);
  const [traysSold, setTraysSold] = useState("");
  const [pricePerTray, setPricePerTray] = useState("");
  const [locationName, setLocationName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!canEdit) {
      router.push("/sales");
      return;
    }
    loadSale();
  }, [canEdit, params.id]);

  async function loadSale() {
    const id = params.id as string;
    const saleData = await getSaleById(id);
    if (!saleData) {
      alert("Sale not found");
      router.push("/sales");
      return;
    }
    setSale(saleData);
    setEggSize(saleData.egg_size);
    setTraysSold(saleData.quantity_sold.toString());
    setPricePerTray(saleData.selling_price_per_unit.toString());
    setLocationName(saleData.location_name);
    setPaymentMethod(saleData.payment_method);
    setSaleDate(saleData.sale_date);
    setNotes(saleData.notes || "");
    
    const inventoryStocks = await getInventoryStock();
    setStocks(inventoryStocks);
    setLoading(false);
  }

  const currentStock = stocks.find(s => s.egg_size === eggSize);
  const availableStock = (currentStock?.total_quantity || 0) + (sale?.quantity_sold || 0);
  const requestedQty = parseInt(traysSold) || 0;
  const hasEnoughStock = requestedQty > 0 && requestedQty <= availableStock;
  const canSave = hasEnoughStock && requestedQty > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!eggSize || !traysSold || !pricePerTray || !locationName) {
      alert("Please fill in all required fields");
      return;
    }

    if (!sale) return;

    if (!hasEnoughStock) {
      alert("Not enough stock available");
      return;
    }

    setIsSubmitting(true);

    try {
      const traysNum = parseInt(traysSold);
      const priceNum = parseFloat(pricePerTray);
      
      const quantityDifference = sale.quantity_sold - traysNum;
      
      const updatedSale: Sale = {
        ...sale,
        egg_size: eggSize!,
        quantity_sold: traysNum,
        selling_price_per_unit: priceNum,
        location_name: locationName,
        payment_method: paymentMethod,
        sale_date: saleDate,
        notes: notes || undefined,
      };

      await updateSale(updatedSale);
      
      // If egg size changed, need to adjust both old and new sizes
      if (sale.egg_size !== eggSize) {
        // Return stock to old size
        await updateInventoryStock("egg", sale.egg_size, sale.quantity_sold);
        // Deduct from new size
        await updateInventoryStock("egg", eggSize!, -traysNum);
      } else {
        // Same size, just adjust quantity
        if (quantityDifference !== 0) {
          await updateInventoryStock("egg", eggSize!, quantityDifference);
        }
      }
      
      const previousValues = `Trays: ${sale.quantity_sold}, Price: ₱${sale.selling_price_per_unit}/tray, Location: ${sale.location_name}`;
      const newValues = `Trays: ${traysNum}, Price: ₱${priceNum}/tray, Location: ${locationName}`;
      await logSaleEdit(eggSize!, traysNum, priceNum, locationName, paymentMethod, previousValues, newValues);
      
      router.push("/sales");
    } catch (error) {
      console.error("Error updating sale:", error);
      alert("Failed to update sale");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickPrice(price: number) {
    if (canSave) {
      setPricePerTray(price.toString());
    }
  }

  const total = (parseInt(traysSold) || 0) * (parseFloat(pricePerTray) || 0);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <button onClick={() => router.back()} className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">Edit Sale</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Size {eggSize && `(${availableStock} available)`}</label>
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
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g., Greenfield Subdivision"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Trays Sold 
            {eggSize && (
              <span className={`ml-2 text-xs ${hasEnoughStock ? "text-green-600" : "text-red-500"}`}>
                (Available: {availableStock})
              </span>
            )}
          </label>
          <input
            type="number"
            value={traysSold}
            onChange={(e) => setTraysSold(e.target.value)}
            placeholder="Enter trays"
            min="1"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
            required
          />
          {eggSize && traysSold && !hasEnoughStock && (
            <p className="text-xs text-red-500 mt-1">Not enough stock. Maximum: {availableStock}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price per Tray (₱)</label>
          <input
            type="number"
            value={pricePerTray}
            onChange={(e) => setPricePerTray(e.target.value)}
            placeholder="Enter price"
            min="0"
            step="1"
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation"
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
                disabled={!canSave}
                className={`py-2 rounded-lg font-medium text-sm border touch-manipulation transition-colors ${
                  parseFloat(pricePerTray) === price
                    ? "bg-primary text-primary-foreground border-primary"
                    : canSave
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
              onClick={() => setPaymentMethod("cash")}
              className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                paymentMethod === "cash"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("gcash")}
              className={`py-3 rounded-lg font-medium border touch-manipulation transition-colors ${
                paymentMethod === "gcash"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted"
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
            rows={2}
            className="w-full p-3 rounded-lg border bg-card text-lg touch-manipulation resize-none"
          />
        </div>

        {total > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>₱{total.toLocaleString()}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !canSave}
          className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-medium text-lg touch-manipulation hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Update Sale"}
        </button>
      </form>
    </div>
  );
}
