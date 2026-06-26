import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TwoFactorReminderProps {
  className?: string;
  title?: string;
  description?: string;
  bullets?: string[];
}

export default function TwoFactorReminder({
  className,
  title = "Protect your admin account",
  description =
    "Two-factor authentication (2FA) is strongly recommended for admin users. It is not required to sign in yet, but enabling it adds an extra layer of protection.",
  bullets = [
    "Use a mobile authenticator app such as Google Authenticator, Authy, or Microsoft Authenticator.",
    "Enable 2FA in your identity provider or account security settings when available.",
    "Save recovery codes securely so you can still sign in if you lose your device.",
  ],
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
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900/85 list-disc list-inside">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
