"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTING_CATEGORY_LABELS } from "@setting-category";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  House,
  Menu,
  MapPin,
  PlaneTakeoff,
  ConciergeBell,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  title: string;
  href: string;
  icon: typeof BarChart3;
  disabled?: boolean;
  children?: { title: string; href: string; icon: typeof BarChart3 }[];
};

const adminNavItems: AdminNavItem[] = [
  // {
  //   title: "Dashboard",
  //   href: "/admin",
  //   icon: BarChart3,
  //   disabled: true,
  // },
  {
    title: "Tours",
    href: "/admin/tours",
    icon: PlaneTakeoff,
  },
  {
    title: "Điểm đến",
    href: "/admin/destinations",
    icon: MapPin,
  },
  {
    title: "Dịch vụ",
    href: "/admin/services",
    icon: ConciergeBell,
  },
  // {
  //   title: "Bookings",
  //   href: "/admin/bookings",
  //   icon: ShoppingBag,
  //   disabled: true,
  // },
  // {
  //   title: "Customers",
  //   href: "/admin/customers",
  //   icon: Users,
  //   disabled: true,
  // },
  // {
  //   title: "Media",
  //   href: "/admin/media",
  //   icon: ImageIcon,
  //   disabled: true,
  // },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { title: SETTING_CATEGORY_LABELS.home, href: "/admin/settings/home", icon: House },
      { title: SETTING_CATEGORY_LABELS.general, href: "/admin/settings/general", icon: SlidersHorizontal },
    ],
  },
] as const;

function isNavItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-700 text-white shadow-[0_14px_28px_-18px_rgba(14,116,144,0.95)]">
        <MapPin className="size-5" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-heading font-semibold leading-tight text-slate-950">Travel Admin</p>
          <p className="truncate text-xs font-medium text-slate-700">Điều hành nội dung</p>
        </div>
      )}
    </div>
  );
}

function AdminNavigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5" aria-label="Admin navigation">
      {adminNavItems.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
            {!collapsed && item.disabled && (
              <span className="ml-auto rounded-full border border-white/55 bg-white/50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                Sắp có
              </span>
            )}
          </>
        );

        const className = cn(
          "group flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all",
          collapsed && "justify-center px-0",
          active
            ? "bg-cyan-950 text-white shadow-[0_14px_34px_-22px_rgba(8,47,73,0.9)]"
            : "text-slate-700 hover:bg-cyan-50/90 hover:text-cyan-950",
          item.disabled && "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-slate-600",
        );

        if (item.disabled) {
          return (
            <span key={item.href} className={className} title={collapsed ? item.title : undefined}>
              {content}
            </span>
          );
        }

        if (item.children) {
          return (
            <div key={item.href} className="space-y-1.5">
              <Link
                href={item.href}
                className={className}
                title={collapsed ? item.title : undefined}
                aria-label={collapsed ? item.title : undefined}
                onClick={onNavigate}
              >
                {content}
              </Link>
              <ul aria-label="Nhóm cấu hình" className={cn("space-y-1", !collapsed && "ml-5 border-l border-cyan-900/15 pl-3")}>
                {item.children.map((child) => {
                  const childActive = isNavItemActive(pathname, child.href);
                  const ChildIcon = child.icon;
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        aria-label={collapsed ? `Settings: ${child.title}` : undefined}
                        title={collapsed ? child.title : undefined}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-xl px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700",
                          collapsed && "justify-center px-0",
                          childActive ? "bg-cyan-100 font-semibold text-cyan-950" : "text-slate-700 hover:bg-cyan-50 hover:text-cyan-950",
                        )}
                      >
                        <ChildIcon className="size-4 shrink-0" aria-hidden="true" />
                        {!collapsed && child.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={className}
            title={collapsed ? item.title : undefined}
            aria-label={collapsed ? item.title : undefined}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-aurora relative min-h-screen overflow-hidden text-slate-950">
      <aside
        className={cn(
          "glass-panel fixed inset-y-4 left-4 z-40 hidden flex-col overflow-y-auto rounded-[28px] p-3 transition-all duration-300 md:flex",
          collapsed ? "w-20" : "w-68",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-1 pb-5 pt-1">
          <BrandMark collapsed={collapsed} />
          {!collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full bg-cyan-50/90 text-cyan-950 hover:bg-cyan-100"
              aria-label="Thu gọn sidebar"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mx-auto mb-4 rounded-full bg-cyan-50/90 text-cyan-950 hover:bg-cyan-100"
            aria-label="Mở rộng sidebar"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight className="size-4" />
          </Button>
        )}

        <AdminNavigation collapsed={collapsed} />

     
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="admin-aurora w-[21rem] max-w-[86vw] gap-0 border p-0 text-slate-950">
          <SheetHeader className="glass-panel rounded-none border-x-0 border-t-0 p-4 pr-12 text-left">
            <BrandMark />
            <SheetTitle className="sr-only">Admin menu</SheetTitle>
            <SheetDescription className="sr-only">Điều hướng các khu vực quản trị</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <AdminNavigation onNavigate={() => setMobileOpen(false)} />
            {/* <div className="mt-auto rounded-3xl border bg-white p-3">
              <UserBadge username={username} />
            </div> */}
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "relative flex min-h-screen flex-col transition-[padding] duration-300",
          collapsed ? "md:pl-[4.5rem]" : "md:pl-[16.5rem]",
        )}
      >
        <div className="px-4 pt-4 sm:px-6 md:hidden">
          <Button type="button" variant="outline" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden="true" /> Menu
          </Button>
        </div>
        <main className="relative flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
