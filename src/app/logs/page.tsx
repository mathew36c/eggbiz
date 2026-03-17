"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, Edit3, UserCheck, UserX, History, Egg } from "lucide-react";
import { getTransactionLogs } from "@/lib/db";
import { TransactionLog, LogAction } from "@/lib/types";

const ACTION_CONFIG: Record<LogAction, { label: string; icon: string; color: string }> = {
  sale: { label: "Sale", icon: "Egg", color: "text-green-600 bg-green-50" },
  purchase: { label: "Purchase", icon: "Egg", color: "text-blue-600 bg-blue-50" },
  expense: { label: "Expense", icon: "Receipt", color: "text-red-600 bg-red-50" },
  sale_edit: { label: "Sale Edit", icon: "Egg", color: "text-amber-600 bg-amber-50" },
  purchase_edit: { label: "Purchase Edit", icon: "Egg", color: "text-amber-600 bg-amber-50" },
  expense_edit: { label: "Expense Edit", icon: "Receipt", color: "text-amber-600 bg-amber-50" },
  stock_adjustment: { label: "Stock Adjustment", icon: "History", color: "text-purple-600 bg-purple-50" },
  login: { label: "Login", icon: "UserCheck", color: "text-green-600 bg-green-50" },
  logout: { label: "Logout", icon: "UserX", color: "text-red-600 bg-red-50" },
};

function getIcon(iconName: string) {
  switch (iconName) {
    case "Egg":
      return <Egg className="h-4 w-4" />;
    case "Receipt":
      return <Receipt className="h-4 w-4" />;
    case "Edit3":
      return <Edit3 className="h-4 w-4" />;
    case "UserCheck":
      return <UserCheck className="h-4 w-4" />;
    case "UserX":
      return <UserX className="h-4 w-4" />;
    case "History":
      return <History className="h-4 w-4" />;
    default:
      return <History className="h-4 w-4" />;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAction(log: TransactionLog) {
  const config = ACTION_CONFIG[log.action];
  let details = "";

  switch (log.action) {
    case "sale":
    case "sale_edit":
      details = `${log.egg_size} × ${log.quantity} trays @ ₱${log.unit_price}/tray`;
      if (log.location) details += ` - ${log.location}`;
      break;
    case "purchase":
    case "purchase_edit":
      details = `${log.egg_size} × ${log.quantity} trays @ ₱${log.amount}/tray`;
      if (log.supplier_name) details += ` - ${log.supplier_name}`;
      break;
    case "expense":
    case "expense_edit":
      details = `₱${log.amount?.toLocaleString()}`;
      if (log.category) details += ` (${log.category})`;
      if (log.description) details += ` - ${log.description}`;
      break;
    case "login":
      details = log.user_name || "User logged in";
      break;
    case "logout":
      details = log.user_name || "User logged out";
      break;
    default:
      details = log.action;
  }

  return { config, details };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const transactionLogs = await getTransactionLogs();
    setLogs(
      transactionLogs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/settings" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Logs</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total Logs</p>
          <p className="text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Latest Activity</p>
          <p className="text-sm font-medium">
            {logs[0] ? formatDate(logs[0].created_at) : "No activity"}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Activity History</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No activity yet</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const { config, details } = formatAction(log);
                return (
                  <div key={log.id} className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${config.color}`}>
                      {getIcon(config.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sm">{config.label}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{details}</p>
                      {log.user_name && (
                        <p className="text-xs text-muted-foreground mt-1">by {log.user_name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
