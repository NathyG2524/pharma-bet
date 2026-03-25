'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@drug-store/ui';
import { Pill, Users, PackagePlus, ShoppingCart, Activity, Search, LineChart, Stethoscope } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainLinks: NavItem[] = [
  { href: '/', label: 'Overview', icon: Activity },
];

const patientLinks: NavItem[] = [
  { href: '/patients/lookup', label: 'Lookup patient', icon: Search },
  { href: '/patients/new', label: 'New patient', icon: Users },
];

const inventoryLinks: NavItem[] = [
  { href: '/inventory', label: 'Medicines', icon: Pill },
  { href: '/inventory/new', label: 'Add medicine', icon: PackagePlus },
  { href: '/inventory/buy', label: 'Buy stock', icon: ShoppingCart },
  { href: '/inventory/sell', label: 'Sell', icon: LineChart },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn("h-4 w-4", active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600")} />
      {label}
    </Link>
  );
}

export function AppSidebar() {
  return (
    <aside className="w-64 flex flex-col border-r border-gray-200 bg-white min-h-screen">
      <div className="flex h-16 items-center border-b border-gray-100 px-6 gap-3">
        <div className="flex items-center justify-center p-1.5 bg-emerald-50 rounded-lg">
          <Stethoscope className="h-6 w-6 text-emerald-600" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">Drug Store</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-auto px-4 py-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Dashboard
          </p>
          <div className="space-y-1">
            {mainLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Patients
          </p>
          <div className="space-y-1">
            {patientLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Inventory
          </p>
          <div className="space-y-1">
            {inventoryLinks.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold tracking-tight">
            JD
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">John Doe</span>
            <span className="text-xs text-gray-500">Pharmacist</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
