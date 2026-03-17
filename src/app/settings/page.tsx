"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sun, Moon, LogOut, User as UserIcon, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const APP_VERSION = "1.0.0";

export default function SettingsPage() {
  const { user, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function getRoleLabel(role: string | undefined) {
    switch (role) {
      case "super_admin": return "Admin";
      case "manager": return "Manager";
      case "operator": return "Operator";
      default: return "Unknown";
    }
  }

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  if (!mounted || isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="touch-manipulation">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Account</h2>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold">{user?.name || "Not logged in"}</p>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
              <p className="text-sm font-medium text-primary">{getRoleLabel(user?.role)}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Appearance</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 touch-manipulation hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span>Dark Mode</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${theme === "dark" ? "translate-x-6" : ""}`} />
            </div>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Navigation</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          <Link
            href="/logs"
            className="w-full flex items-center gap-3 p-4 touch-manipulation hover:bg-muted transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Logs</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Account Actions</h2>
        <div className="bg-card border rounded-lg overflow-hidden space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 text-red-500 touch-manipulation hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">About</h2>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">App Version</span>
            <span className="font-medium">v{APP_VERSION}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-muted-foreground">Egg Business</span>
            <span className="font-medium">PWA</span>
          </div>
        </div>
      </section>
    </div>
  );
}
