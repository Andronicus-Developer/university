"use client";

import React from "react";
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import {
  ClassicPortalShell,
  type ClassicNavItem,
} from "@/components/portals/ClassicPortalShell";

const FINANCE_NAV_ITEMS: ClassicNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/finance/dashboard", icon: LayoutDashboard },
  {
    id: "fee-structures",
    label: "Fee Structures & Billing",
    href: "/finance/fee-structures",
    icon: FileSpreadsheet,
  },
  { id: "collect", label: "Collect Fees & Receipts", href: "/finance/collect", icon: CreditCard },
  {
    id: "balances",
    label: "Balances & Debtors",
    href: "/finance/balances",
    icon: Users,
  },
  { id: "expenses", label: "Expenses & Petty Cash", href: "/finance/expenses", icon: Receipt },
  { id: "payroll", label: "Payroll & Allowances", href: "/finance/payroll", icon: Wallet },
  { id: "reports", label: "Financial Reports", href: "/finance/reports", icon: BarChart3 },
  { id: "settings", label: "Profile & Settings", href: "/finance/settings", icon: Settings },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClassicPortalShell
      portalBadge="Finance & Bursar Portal"
      defaultUserTitle="Finance Officer / Bursar"
      homeHref="/finance/dashboard"
      navItems={FINANCE_NAV_ITEMS}
    >
      {children}
    </ClassicPortalShell>
  );
}
