"use client";

import { useAuthContext } from "@/lib/auth-context";
import { cn } from "@drug-store/ui";
import { clearAuthSession } from "@/lib/auth-storage";
import {
  Activity,
  Bell,
  CheckSquare,
  ClipboardList,
  LineChart,
  LogOut,
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
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/adjustments", label: "Adjustments", icon: ClipboardList },
  { href: "/stock-counts", label: "Stock counts", icon: CheckSquare },
  { href: "/supplier-returns", label: "Supplier returns", icon: Truck },
];

const branchInventoryLinks: NavItem[] = [
  { href: "/inventory", label: "Medicines", icon: Pill },
  { href: "/inventory/new-draft", label: "Add draft medicine", icon: PackagePlus },
  { href: "/inventory/buy", label: "Buy stock", icon: ShoppingCart },
  { href: "/inventory/sell", label: "Sell", icon: LineChart },
  { href: "/inventory/valuation", label: "Valuation", icon: LineChart },
  { href: "/transfers", label: "Transfers", icon: Truck },
  { href: "/adjustments", label: "Adjustments", icon: ClipboardList },
  { href: "/stock-counts", label: "Stock counts", icon: CheckSquare },
  { href: "/supplier-returns", label: "Supplier returns", icon: Truck },
];

const purchasingLinks: NavItem[] = [
  { href: "/purchase-orders", label: "Purchase orders", icon: ClipboardList },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/approvals", label: "Approval inbox", icon: CheckSquare },
];

const branchPurchasingLinks: NavItem[] = [
  { href: "/purchase-orders/approvals", label: "PO approvals", icon: ClipboardList },
  { href: "/approvals", label: "Approval inbox", icon: CheckSquare },
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
  const { state, updateState } = useAuthContext();
  const router = useRouter();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const visibleInventoryLinks = isHqUser ? inventoryLinks : branchInventoryLinks;
  const visiblePurchasingLinks = isHqUser ? purchasingLinks : branchPurchasingLinks;

  const displayName = state.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const signOut = () => {
    updateState(clearAuthSession());
    router.push("/login");
  };

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

      <div className="p-4 mb-4 space-y-2">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-on_surface_variant">
          <div className="h-8 w-8 rounded-full bg-surface_container_lowest shadow-tonal flex items-center justify-center text-primary text-xs font-bold tracking-tight">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium text-on_surface truncate">{displayName}</span>
            {state.email ? (
              <span className="text-[0.6875rem] text-on_surface_variant truncate">{state.email}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-on_surface_variant hover:bg-surface_container hover:text-on_surface transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
