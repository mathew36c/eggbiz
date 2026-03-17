"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, SlidersHorizontal } from "lucide-react";
import { getPendingSales } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { Sale, EggSize } from "@/lib/types";
import { EggSizeIcon } from "@/components/EggSizeIcon";
import { TimeRangeSelector, filterByDateRange, getTimeRangeLabel } from "@/components/TimeRangeSelector";
import { useTimeRange } from "@/components/TimeRangeContext";

export default function SalesPage() {
  const { timeRange, setTimeRange } = useTimeRange();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filter, setFilter] = useState<{ eggSize?: EggSize; dateFrom?: string; dateTo?: string }>({});
  const { canEdit } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const allSales = await getPendingSales();
    setSales(allSales.sort((a, b) => 
      new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    ));
  }

  const filteredByTimeSales = filterByDateRange(sales, timeRange);

  const filteredSales = filteredByTimeSales.filter((sale) => {
    if (filter.eggSize && sale.egg_size !== filter.eggSize) return false;
    if (filter.dateFrom && new Date(sale.sale_date) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(sale.sale_date) > new Date(filter.dateTo)) return false;
    return true;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.quantity_sold * s.selling_price_per_unit), 0);
  const totalTrays = filteredSales.reduce((sum, s) => sum + s.quantity_sold, 0);
  const hasActiveFilters = Boolean(filter.eggSize || filter.dateFrom || filter.dateTo);

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Sales</h1>
        <div className="ml-auto">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      <section>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel(timeRange)} Revenue</p>
            <p className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{getTimeRangeLabel(timeRange)} Trays</p>
            <p className="text-2xl font-bold">{totalTrays}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg font-semibold">Sales Records</h2>
          <Link
            href="/add-sale"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Sale
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilter({})}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={filter.eggSize || ""}
              onChange={(e) => setFilter({ ...filter, eggSize: e.target.value as EggSize || undefined })}
              className="flex-1 p-2.5 rounded-lg border bg-background text-sm"
            >
              <option value="">All Sizes</option>
              <option value="S">Small</option>
              <option value="M">Medium</option>
              <option value="L">Large</option>
              <option value="XL">Extra Large</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={filter.dateFrom || ""}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value || undefined })}
              className="flex-1 p-2.5 rounded-lg border bg-background text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={filter.dateTo || ""}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value || undefined })}
              className="flex-1 p-2.5 rounded-lg border bg-background text-sm"
              placeholder="To"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filteredSales.length} sale{filteredSales.length === 1 ? "" : "s"} shown</span>
            {hasActiveFilters && <span>Showing filtered results</span>}
          </div>
        </div>

        <div className="space-y-2">
          {filteredSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales recorded yet</p>
          ) : (
            filteredSales.map((sale) => (
              <div key={sale.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <EggSizeIcon size={sale.egg_size} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sale.location_name}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {sale.egg_size}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {sale.quantity_sold} tray{sale.quantity_sold === 1 ? "" : "s"} sold
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold">₱{(sale.quantity_sold * sale.selling_price_per_unit).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">₱{sale.selling_price_per_unit}/tray</p>
                    </div>
                    {canEdit && (
                      <Link href={`/edit-sale/${sale.id}`} className="p-1 hover:bg-muted rounded">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span className="capitalize">{sale.payment_method}</span>
                  <span>{new Date(sale.sale_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
