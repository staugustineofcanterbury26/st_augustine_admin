import { useEffect } from "react";
import { toast } from "sonner";
import { contactMessagesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Module-level flag to prevent multiple checks across component instances
let globalHasChecked = false;

/**
 * Hook that shows a toast notification if there are unread contact messages.
 * Only triggers once per session after authentication.
 */
export function useUnreadMessagesNotification() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only check once per session after auth is confirmed
    if (isLoading || !isAuthenticated || globalHasChecked) return;

    // Check if we already showed the notification this session
    const sessionKey = "unread_messages_notified";
    if (sessionStorage.getItem(sessionKey)) {
      globalHasChecked = true;
      return;
    }

    globalHasChecked = true;

    contactMessagesApi
      .getStats()
      .then((res) => {
        const unreadCount = res.data.unread ?? 0;
        if (unreadCount > 0) {
          sessionStorage.setItem(sessionKey, "true");
          toast.info(
            `You have ${unreadCount} unread contact message${unreadCount === 1 ? "" : "s"}`,
            {
              description: "Click to view messages",
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = "/contact-messages";
                },
              },
              duration: 8000,
            }
          );
        }
      })
      .catch(() => {
        // Silently fail - notification is non-critical
      });
  }, [isAuthenticated, isLoading]);
}
