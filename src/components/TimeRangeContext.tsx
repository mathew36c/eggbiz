"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TimeRange } from "@/components/TimeRangeSelector";

interface TimeRangeContextType {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextType | undefined>(undefined);

const STORAGE_KEY = "egg-business-time-range";

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRangeState] = useState<TimeRange>("today");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["today", "yesterday", "this_month", "last_7_days", "last_28_days", "last_90_days"].includes(stored)) {
      setTimeRangeState(stored as TimeRange);
    }
    setIsLoaded(true);
  }, []);

  const setTimeRange = (range: TimeRange) => {
    setTimeRangeState(range);
    localStorage.setItem(STORAGE_KEY, range);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  const context = useContext(TimeRangeContext);
  if (context === undefined) {
    throw new Error("useTimeRange must be used within a TimeRangeProvider");
  }
  return context;
}
