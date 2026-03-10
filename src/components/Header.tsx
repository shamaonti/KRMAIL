import React, { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type HeaderAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
};

type HeaderActionsCtx = {
  headerActions: HeaderAction[];
  setHeaderActions: (actions: HeaderAction[]) => void;
};

// ─── Context ────────────────────────────────────────────────────────────────────
export const HeaderActionsContext = createContext<HeaderActionsCtx>({
  headerActions: [],
  setHeaderActions: () => {},
});

// ─── Hook — import this in every page ──────────────────────────────────────────
export const useHeaderActions = () => useContext(HeaderActionsContext);

// ─── Provider — wrap this around your routes in Dashboard.tsx ──────────────────
export const HeaderActionsProvider: React.FC<{
  children: React.ReactNode;
  headerActions: HeaderAction[];
  setHeaderActions: (actions: HeaderAction[]) => void;
}> = ({ children, headerActions, setHeaderActions }) => (
  <HeaderActionsContext.Provider value={{ headerActions, setHeaderActions }}>
    {children}
  </HeaderActionsContext.Provider>
);

// ─── Page title map ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                 "Dashboard Overview",
  "/dashboard/campaign":        "Campaign Management",
  "/dashboard/inbox-addition":  "Inbox Addition",
  "/dashboard/mailbox":         "Mail Box",
  "/dashboard/leads":           "Data Management",
  "/dashboard/email-templates": "Email Templates",
  "/dashboard/settings":        "Settings",
};

export const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/dashboard/campaign-result/")) return "Campaign Result";
  return "Dashboard";
};

// ─── Helper ─────────────────────────────────────────────────────────────────────
const safeJsonParse = <T,>(s: string | null, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

// ─── TopHeader Component ────────────────────────────────────────────────────────
// Usage in Dashboard.tsx:
//   <TopHeader headerActions={headerActions} />
const TopHeader: React.FC<{ headerActions: HeaderAction[] }> = ({ headerActions }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const user      = safeJsonParse<{ id?: number; name?: string; email?: string }>(
    localStorage.getItem("user"), {}
  );
  const initials  = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";
  const [profileOpen, setProfileOpen] = useState(false);
  const pageTitle = getPageTitle(location.pathname);
  const handleLogout = () => { localStorage.removeItem("user"); navigate("/auth"); };

  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      {/* Page Title */}
      <h2 className="text-xl font-semibold" style={{ color: "#012970" }}>
        {pageTitle}
      </h2>

      {/* Right side: dynamic action buttons + profile avatar */}
      <div className="flex items-center gap-2">
        {headerActions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "outline"}
            disabled={action.disabled}
            className={action.variant === "default" ? "text-white font-medium" : "border-gray-300"}
            style={action.variant === "default" ? { backgroundColor: "#1e3a8a" } : {}}
            onClick={action.onClick}
          >
            {action.icon && <span className="mr-2 flex items-center">{action.icon}</span>}
            {action.label}
          </Button>
        ))}

        {/* Profile Avatar */}
        <div className="relative ml-1">
          <button
            onClick={() => setProfileOpen(prev => !prev)}
            className="w-9 h-9 rounded-full bg-green-500 text-white font-bold flex items-center justify-center text-sm hover:bg-green-600"
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="absolute top-11 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" /> My Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopHeader;