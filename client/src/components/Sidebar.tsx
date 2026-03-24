import { Link, useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
  ChevronRight,
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

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const allGroups = navGroups.map((group) => {
    if (group.label !== "Settings") return group;
    // Inject Users link for admins only
    const extra = user?.role === "admin" ? adminOnlyItems : [];
    return { ...group, items: [...group.items, ...extra] };
  });

  return (
    <aside className="flex h-screen w-64 flex-col" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <img src="/logo.png" alt="Saint Augustine of Canterbury" className="h-10 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {allGroups.map((group) => (
            <div key={group.label}>
              <p
                className="px-3 mb-1.5 text-xs font-medium uppercase tracking-widest"
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
                            isActive
                              ? "font-medium"
                              : "hover:opacity-90"
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
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
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
      </ScrollArea>
    </aside>
  );
}
