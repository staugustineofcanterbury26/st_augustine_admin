import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import React, { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Images,
  FileText,
  Church,
  UserCircle,
  HandHeart,
  Building2,
  BookOpen,
  Settings,
  Mail,
  ChevronRight,
  ChevronLeft,
  LayoutTemplate,
  Users,
  HardDrive,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/mass-times", label: "Mass Times", icon: Clock },
      { href: "/events", label: "Events", icon: CalendarDays },
      { href: "/sacraments", label: "Sacraments", icon: BookOpen },
      { href: "/priest", label: "Parish Priest", icon: UserCircle },
    ],
  },
  {
    label: "Media",
    items: [
      { href: "/gallery", label: "Photo Gallery", icon: Images },
      { href: "/bulletins", label: "Bulletins & Docs", icon: FileText },
      { href: "/pages", label: "Pages", icon: LayoutTemplate },
      { href: "/storage", label: "Storage", icon: HardDrive },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/ministries", label: "Get Involved", icon: HandHeart },
      { href: "/rentals", label: "Rentals", icon: Building2 },
      { href: "/pastoral-unit", label: "Pastoral Unit", icon: Church },
      { href: "/contact-messages", label: "Contact Messages", icon: Mail },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/parish-info", label: "Parish Info", icon: Church },
      { href: "/settings", label: "Account", icon: Settings },
    ],
  },
];

const adminOnlyItems = [
  { href: "/users", label: "Users", icon: Users },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [hoverExpand, setHoverExpand] = useState(false);

  const effectiveCollapsed = !!collapsed && !hoverExpand;

  const allGroups = navGroups.map((group) => {
    if (group.label !== "Settings") return group;
    // Inject Users link for admins only
    const extra = user?.role === "admin" ? adminOnlyItems : [];
    return { ...group, items: [...group.items, ...extra] };
  });

  const navJSX = (
    <nav className="space-y-6">
      {allGroups.map((group) => (
        <div key={group.label}>
          <p
            className={cn(
              "px-3 mb-1.5 text-xs font-medium uppercase tracking-widest",
              effectiveCollapsed ? "sr-only" : ""
            )}
            style={{ color: "oklch(0.5 0.01 65)" }}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer group",
                        effectiveCollapsed ? "justify-center px-2" : "",
                        isActive ? "font-medium" : "hover:opacity-90"
                      )}
                      style={
                        isActive
                          ? {
                              background: "var(--sidebar-accent)",
                              color: "var(--sidebar-accent-foreground)",
                            }
                          : { color: "var(--sidebar-foreground)" }
                      }
                    >
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{item.label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className={cn("flex-1", effectiveCollapsed ? "hidden" : "")}>{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Separator className="mt-4 opacity-20" />
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop / wide screens: persistent sidebar */}
      <aside
        onMouseEnter={() => setHoverExpand(true)}
        onMouseLeave={() => setHoverExpand(false)}
        className={cn(
          "hidden md:flex h-screen flex-col transition-all duration-200",
          effectiveCollapsed ? "w-16" : "w-64"
        )}
        style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      >
        {/* Logo and collapse toggle */}
        <div className={cn("flex items-center justify-between border-b px-4 py-4", effectiveCollapsed ? "justify-center" : "")} style={{ borderColor: "var(--sidebar-border)" }}>
          <img src="/logo.png" alt="Saint Augustine of Canterbury" className={cn(effectiveCollapsed ? "h-8" : "h-20 w-auto")} style={{ filter: "brightness(0) invert(1)" }} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse?.()}
            aria-label="Toggle sidebar"
            className={cn("p-1.5", effectiveCollapsed ? "hidden" : "")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          {navJSX}
        </ScrollArea>
      </aside>

      {/* Mobile: off-canvas drawer using Radix Dialog */}
      <Dialog.Root open={!!isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar p-4 md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full duration-300"
            onEscapeKeyDown={() => onClose?.()}
            aria-hidden={!isOpen}
          >
            <div className="flex items-center justify-between mb-4">
              <img src="/logo.png" alt="Saint Augustine of Canterbury" className="h-12 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
              <button onClick={() => onClose?.()} aria-label="Close navigation" className="rounded p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ScrollArea className="h-[calc(100vh-72px)] px-3 py-2">
              {navJSX}
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
