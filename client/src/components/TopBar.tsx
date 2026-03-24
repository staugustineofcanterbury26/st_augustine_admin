import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, KeyRound, ExternalLink, Menu } from "lucide-react";
import { Link } from "wouter";

interface TopBarProps {
  title: string;
  description?: string;
  onOpenSidebar?: () => void;
}

export default function TopBar({ title, description, onOpenSidebar }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Mobile: hamburger opens sidebar drawer */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" onClick={() => onOpenSidebar?.()} aria-label="Open navigation" className="p-2">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <div>
        <h1 className="text-xl font-semibold font-playfair text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Link to public site */}
        <a
          href={import.meta.env.VITE_FRONTEND_URL ?? "https://your-parish.vercel.app"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ExternalLink className="h-3 w-3" />
            View Site
          </Button>
        </a>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium hidden sm:block">{user?.name ?? user?.email ?? "Dev User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer gap-2">
                <KeyRound className="h-4 w-4" />
                Change Password
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
