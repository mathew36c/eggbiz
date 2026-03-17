import { Expense, InventoryPurchase, Sale } from "./types";

type ProfitTransaction =
  | { kind: "purchase"; purchase: InventoryPurchase }
  | { kind: "sale"; sale: Sale };

interface StockLedger {
  quantity: number;
  totalCost: number;
}

export interface ProfitMetrics {
  revenue: number;
  itemsSold: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

function getBusinessDateValue(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

function getCreatedAtValue(createdAt: string) {
  return new Date(createdAt).getTime();
}

function compareTransactions(a: ProfitTransaction, b: ProfitTransaction) {
  const aBusinessDate = getBusinessDateValue(
    a.kind === "purchase" ? a.purchase.purchase_date : a.sale.sale_date
  );
  const bBusinessDate = getBusinessDateValue(
    b.kind === "purchase" ? b.purchase.purchase_date : b.sale.sale_date
  );

  if (aBusinessDate !== bBusinessDate) {
    return aBusinessDate - bBusinessDate;
  }

  const aCreatedAt = getCreatedAtValue(
    a.kind === "purchase" ? a.purchase.created_at : a.sale.created_at
  );
  const bCreatedAt = getCreatedAtValue(
    b.kind === "purchase" ? b.purchase.created_at : b.sale.created_at
  );

  if (aCreatedAt !== bCreatedAt) {
    return aCreatedAt - bCreatedAt;
  }

  if (a.kind !== b.kind) {
    return a.kind === "purchase" ? -1 : 1;
  }

  return 0;
}

function buildSaleCostMap(purchases: InventoryPurchase[], sales: Sale[]) {
  const transactions: ProfitTransaction[] = [
    ...purchases.map((purchase) => ({ kind: "purchase" as const, purchase })),
    ...sales.map((sale) => ({ kind: "sale" as const, sale })),
  ].sort(compareTransactions);

  const stockBySize = new Map<string, StockLedger>();
  const saleCosts = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.kind === "purchase") {
      const { egg_size, quantity, cost_per_unit } = transaction.purchase;
      const current = stockBySize.get(egg_size) ?? { quantity: 0, totalCost: 0 };

      current.quantity += quantity;
      current.totalCost += quantity * cost_per_unit;
      stockBySize.set(egg_size, current);
      continue;
    }

    const { id, egg_size, quantity_sold } = transaction.sale;
    const current = stockBySize.get(egg_size) ?? { quantity: 0, totalCost: 0 };
    const averageCost = current.quantity > 0 ? current.totalCost / current.quantity : 0;
    const availableQuantity = Math.min(quantity_sold, current.quantity);
    const saleCost = availableQuantity * averageCost;

    current.quantity = Math.max(0, current.quantity - quantity_sold);
    current.totalCost = Math.max(0, current.totalCost - saleCost);
    stockBySize.set(egg_size, current);
    saleCosts.set(id, saleCost);
  }

  return saleCosts;
}

export function calculateProfitMetrics(args: {
  allSales: Sale[];
  selectedSales?: Sale[];
  expenses: Expense[];
  purchases: InventoryPurchase[];
}) {
  const saleCosts = buildSaleCostMap(args.purchases, args.allSales);
  const selectedSales = args.selectedSales ?? args.allSales;

  const revenue = selectedSales.reduce(
    (sum, sale) => sum + sale.quantity_sold * sale.selling_price_per_unit,
    0
  );
  const itemsSold = selectedSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);
  const cogs = selectedSales.reduce((sum, sale) => sum + (saleCosts.get(sale.id) ?? 0), 0);
  const expenses = args.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  return {
    revenue,
    itemsSold,
    cogs,
    grossProfit,
    expenses,
    netProfit,
  };
}
