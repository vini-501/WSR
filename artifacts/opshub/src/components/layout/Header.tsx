import React from "react";
import { useLocation } from "wouter";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const [location] = useLocation();

  const getTitle = () => {
    if (location === "/dashboard") return "Dashboard";
    if (location.startsWith("/departments")) return "Departments";
    if (location.startsWith("/employees")) return "Employees";
    if (location.startsWith("/reports")) return "Weekly Reports";
    if (location === "/management") return "Management Panel";
    if (location === "/analytics") return "Analytics & Insights";
    if (location === "/notifications") return "Notification Center";
    if (location === "/activity-logs") return "Activity Logs";
    if (location === "/audit-logs") return "Audit Logs";
    if (location === "/settings") return "System Settings";
    if (location === "/profile") return "My Profile";
    return "OpsHub";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-8">
        <h2 className="text-xl font-bold tracking-tight">{getTitle()}</h2>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
