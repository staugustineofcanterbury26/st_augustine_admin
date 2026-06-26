import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TwoFactorReminderProps {
  className?: string;
  title?: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
}

export default function TwoFactorReminder({
  className,
  title = "Protect your admin account",
  description =
    "Two-factor authentication is strongly recommended. Enable 2FA in account settings to add a second verification step and keep your admin access secure.",
  linkHref = "/settings#twoFactorAuthentication",
  linkLabel = "Go to 2FA settings",
}: TwoFactorReminderProps) {
  return (
    <Card className={cn("border-amber-200 bg-amber-50 text-amber-950 shadow-none", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/85">{description}</p>
            <a href={linkHref} className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary/80">
              {linkLabel}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
