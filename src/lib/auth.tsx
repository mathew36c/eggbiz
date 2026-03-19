"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { addTransactionLog, getSupabase, initSupabase, startPolling } from "./db";
import { v4 as uuidv4 } from "uuid";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default users with their generated passwords
const DEFAULT_USERS: { email: string; name: string; role: string; password: string }[] = [
  { email: "admin@eggbiz.com", name: "Admin", role: "super_admin", password: "xqzmlk" },
  { email: "frank@eggbiz.com", name: "Frank", role: "manager", password: "pqrstu" },
  { email: "arnel@eggbiz.com", name: "Arnel", role: "manager", password: "vwxyza" },
  { email: "jose@eggbiz.com", name: "Jose", role: "operator", password: "bcdfgk" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    
    // Initialize Supabase and passwords
    initSupabase();
  }, []);

  // Ensure passwords are stored in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("egg-user-passwords");
    if (!stored) {
      localStorage.setItem("egg-user-passwords", JSON.stringify(
        DEFAULT_USERS.map(u => ({ email: u.email, password: u.password }))
      ));
      console.log("Passwords initialized in localStorage");
    }
  }, []);

  // Initialize users in Supabase on first load
  useEffect(() => {
    async function initializeUsers() {
      const supabase = getSupabase();
      if (!supabase) return;
      
      try {
        const { data: existingUsers } = await supabase.from("users").select("email");
        
        if (!existingUsers || existingUsers.length === 0) {
          console.log("Creating default users in Supabase...");
          
          for (const u of DEFAULT_USERS) {
            const { error } = await supabase.from("users").insert({
              email: u.email,
              name: u.name,
              role: u.role,
            });
            
            if (error) {
              console.error(`Error creating user ${u.email}:`, error);
            } else {
              console.log(`Created user: ${u.email} (password: ${u.password})`);
            }
          }
          
          // Store passwords locally (in a real app, you'd use proper auth)
          localStorage.setItem("egg-user-passwords", JSON.stringify(
            DEFAULT_USERS.map(u => ({ email: u.email, password: u.password }))
          ));
        }
      } catch (error) {
        console.error("Error initializing users:", error);
      }
    }
    
    initializeUsers();
  }, []);

  async function loadUser() {
    try {
      const stored = localStorage.getItem("egg-user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      // Always ensure correct passwords are stored
      localStorage.setItem("egg-user-passwords", JSON.stringify(
        DEFAULT_USERS.map(u => ({ email: u.email, password: u.password }))
      ));
      
      const storedPasswords = localStorage.getItem("egg-user-passwords");
      const passwords = storedPasswords ? JSON.parse(storedPasswords) : [];
      
      // Check if email and password match any default user
      const found = passwords.find((p: { email: string; password: string }) => 
        p.email.toLowerCase() === email.toLowerCase() && p.password === password
      );
      
      if (found) {
        // Get user from Supabase
        const supabase = getSupabase();
        if (supabase) {
          const { data: users } = await supabase.from("users").select("*").eq("email", email).single();
          
          if (users) {
            const userData: User = {
              id: users.id,
              email: users.email,
              name: users.name,
              role: users.role,
              created_at: users.created_at,
            };
            
            setUser(userData);
            localStorage.setItem("egg-user", JSON.stringify(userData));
            
            // Start polling for real-time sync
            startPolling(30000);
            
            await addTransactionLog({
              action: "login",
              user_id: userData.id,
              user_name: userData.name,
              user_role: userData.role,
            });
            
            return true;
          }
        }
        
        // Fallback: create user from stored data if Supabase fails
        const userData: User = {
          id: uuidv4(),
          email: email,
          name: email.split("@")[0],
          role: "operator",
          created_at: new Date().toISOString(),
        };
        
        setUser(userData);
        localStorage.setItem("egg-user", JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  function logout() {
    const currentUser = user;
    setUser(null);
    localStorage.removeItem("egg-user");
    
    if (currentUser) {
      addTransactionLog({
        action: "logout",
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
      }).catch(console.error);
    }
  }

  const canEdit = user?.role === "super_admin" || user?.role === "manager";

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}