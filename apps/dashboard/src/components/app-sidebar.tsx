"use client";

import { useAuthContext } from "@/lib/auth-context";
import { cn } from "@drug-store/ui";
import {
  Activity,
  Bell,
  ClipboardList,
  LineChart,
  PackagePlus,
  Pill,
  ScrollText,
  Search,
  ShoppingCart,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantBranchSwitcher } from "./tenant-branch-switcher";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainLinks: NavItem[] = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const patientLinks: NavItem[] = [
  { href: "/patients/lookup", label: "Lookup patient", icon: Search },
  { href: "/patients/new", label: "New patient", icon: Users },
];

const inventoryLinks: NavItem[] = [
  { href: "/inventory", label: "Medicines", icon: Pill },
  { href: "/inventory/new", label: "Add medicine", icon: PackagePlus },
  { href: "/inventory/drafts", label: "Draft medicines", icon: ClipboardList },
  { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
  { href: "/inventory/buy", label: "Buy stock", icon: ShoppingCart },
  { href: "/inventory/sell", label: "Sell", icon: LineChart },
  { href: "/inventory/valuation", label: "Valuation", icon: LineChart },
  { href: "/inventory/org-on-hand", label: "Org on-hand", icon: LineChart },
  { href: "/transfers", label: "Transfers", icon: Truck },
];

const branchInventoryLinks: NavItem[] = [
  { href: "/inventory", label: "Medicines", icon: Pill },
  { href: "/inventory/new-draft", label: "Add draft medicine", icon: PackagePlus },
  { href: "/inventory/buy", label: "Buy stock", icon: ShoppingCart },
  { href: "/inventory/sell", label: "Sell", icon: LineChart },
  { href: "/inventory/valuation", label: "Valuation", icon: LineChart },
  { href: "/transfers", label: "Transfers", icon: Truck },
];

const purchasingLinks: NavItem[] = [
  { href: "/purchase-orders", label: "Purchase orders", icon: ClipboardList },
  { href: "/suppliers", label: "Suppliers", icon: Users },
];

const branchPurchasingLinks: NavItem[] = [
  { href: "/purchase-orders/approvals", label: "PO approvals", icon: ClipboardList },
];

const orgLinks: NavItem[] = [
  { href: "/organization", label: "Branches & access", icon: Users },
  { href: "/audit", label: "Audit log", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-surface_container_lowest text-primary shadow-tonal"
          : "text-on_surface_variant hover:bg-surface_container hover:text-on_surface",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          active ? "text-primary" : "text-on_surface_variant group-hover:text-primary",
        )}
      />
      {label}
    </Link>
  );
}

export function AppSidebar() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const visibleInventoryLinks = isHqUser ? inventoryLinks : branchInventoryLinks;
  const visiblePurchasingLinks = isHqUser ? purchasingLinks : branchPurchasingLinks;

  return (
    <aside className="w-64 flex flex-col bg-surface_container_low min-h-screen">
      <div className="flex h-16 items-center px-6 gap-3">
        <div className="flex items-center justify-center p-1.5 bg-secondary_container rounded-lg">
          <Stethoscope className="h-6 w-6 text-on_secondary_container" />
        </div>
        <span className="text-lg font-manrope font-bold tracking-tight text-on_surface">
          Drug Store
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-auto px-4 py-8">
        <TenantBranchSwitcher />
        <div>
          <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant mb-2">
            Dashboard
          </p>
          <div className="space-y-1">
            {mainLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant mb-2">
            Patients
          </p>
          <div className="space-y-1">
            {patientLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant mb-2">
            Inventory
          </p>
          <div className="space-y-1">
            {visibleInventoryLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant mb-2">
            Purchasing
          </p>
          <div className="space-y-1">
            {visiblePurchasingLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant mb-2">
            Organization
          </p>
          <div className="space-y-1">
            {orgLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 mb-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-on_surface_variant hover:bg-surface_container cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-surface_container_lowest shadow-tonal flex items-center justify-center text-primary font-bold tracking-tight">
            JD
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-on_surface">John Doe</span>
            <span className="text-[0.6875rem] uppercase tracking-[0.05rem] text-on_surface_variant">
              Pharmacist
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
