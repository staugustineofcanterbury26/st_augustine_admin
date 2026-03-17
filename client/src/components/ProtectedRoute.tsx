import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/** Redirects unauthenticated visitors to /login */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // TODO: remove DEV_BYPASS when backend auth is wired up
  const DEV_BYPASS = import.meta.env.DEV;

  useEffect(() => {
    if (!DEV_BYPASS && !isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [DEV_BYPASS, isAuthenticated, isLoading, setLocation]);

  if (!DEV_BYPASS && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!DEV_BYPASS && !isAuthenticated) return null;

  return <>{children}</>;
}
