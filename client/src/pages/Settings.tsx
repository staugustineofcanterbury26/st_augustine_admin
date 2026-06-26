import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import QRCode from "qrcode";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { KeyRound, User } from "lucide-react";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isManaging2FA, setIsManaging2FA] = useState(false);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: PasswordForm) => {
    setSaving(true);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast.success("Password changed successfully");
      form.reset();
    } catch {
      toast.error("Failed to change password. Check your current password.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    authApi
      .get2FAStatus()
      .then((res) => {
        if (!isMounted) return;
        setTwoFactorEnabled(res.data.enabled);
      })
      .catch(() => {
        if (!isMounted) return;
        setTwoFactorEnabled(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const startTwoFactorSetup = async () => {
    setIsManaging2FA(true);
    try {
      const res = await authApi.setup2FA();
      setOtpauthUrl(res.data.otpauthUrl);
      const dataUrl = await QRCode.toDataURL(res.data.otpauthUrl);
      setQrCodeDataUrl(dataUrl);
      setSetupInProgress(true);
    } catch {
      toast.error("Unable to start 2FA setup. Please try again.");
    } finally {
      setIsManaging2FA(false);
    }
  };

  const verifyTwoFactor = async () => {
    setIsManaging2FA(true);
    try {
      await authApi.verify2FA(verificationCode);
      toast.success("Two-factor authentication is now enabled.");
      setTwoFactorEnabled(true);
      updateUser({ twoFactorEnabled: true });
      setSetupInProgress(false);
      setVerificationCode("");
      setQrCodeDataUrl(null);
      setOtpauthUrl(null);
    } catch {
      toast.error("Invalid code. Please check your authenticator app and try again.");
    } finally {
      setIsManaging2FA(false);
    }
  };

  const disableTwoFactor = async () => {
    setIsManaging2FA(true);
    try {
      await authApi.disable2FA(disableCode);
      toast.success("Two-factor authentication has been disabled.");
      setTwoFactorEnabled(false);
      updateUser({ twoFactorEnabled: false });
      setDisableCode("");
    } catch {
      toast.error("Unable to disable 2FA. Please check the code and try again.");
    } finally {
      setIsManaging2FA(false);
    }
  };

  return (
    <AdminLayout title="Account Settings" description="Manage your admin account credentials.">
      <div className="max-w-xl space-y-6">
        {/* Profile details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="twoFactorAuthentication">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Protect your admin account with a time-based code from an authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorEnabled === null ? (
              <p className="text-sm text-muted-foreground">Loading 2FA status…</p>
            ) : twoFactorEnabled ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is currently enabled for your account.
                </p>
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-foreground">To disable 2FA, enter the code from your authenticator app.</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="disableCode">Current 2FA code</Label>
                    <Input
                      id="disableCode"
                      type="text"
                      placeholder="123456"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      value={disableCode}
                      onChange={(event) => setDisableCode(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={disableTwoFactor}
                    disabled={isManaging2FA || !disableCode.trim()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isManaging2FA ? "Disabling…" : "Disable 2FA"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Two-factor authentication is not enabled.</p>
                    <p>
                      Protect your admin account with a second verification step. Enabling 2FA requires a code from an authenticator app whenever you sign in.
                    </p>
                    <div className="rounded-lg border border-primary/10 bg-primary/10 p-3">
                      <p className="text-sm font-semibold text-foreground">How to set up 2FA</p>
                      <ol className="mt-2 space-y-2 pl-5 text-sm leading-6 text-muted-foreground list-decimal">
                        <li>Click "Enable 2FA" to generate your account's unique QR code and secret.</li>
                        <li>Open an authenticator app such as Google Authenticator, Authy, or Microsoft Authenticator.</li>
                        <li>Scan the QR code or enter the secret manually into your app.</li>
                        <li>Enter the 6-digit code from the app and click "Verify and enable 2FA".</li>
                      </ol>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={startTwoFactorSetup}
                      disabled={isManaging2FA}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isManaging2FA ? "Starting 2FA…" : "Enable 2FA"}
                    </Button>
                  </div>
                </div>
                {setupInProgress && qrCodeDataUrl && (
                  <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scan this QR code</p>
                      <p className="text-sm text-muted-foreground">
                        Use an authenticator app such as Google Authenticator, Authy, or Microsoft Authenticator.
                      </p>
                    </div>
                    <img src={qrCodeDataUrl} alt="2FA setup QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
                    <div className="space-y-1.5">
                      <Label htmlFor="verificationCode">Authenticator code</Label>
                      <Input
                        id="verificationCode"
                        type="text"
                        placeholder="123456"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={verifyTwoFactor}
                      disabled={isManaging2FA || !verificationCode.trim()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isManaging2FA ? "Verifying…" : "Verify and enable 2FA"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      If you prefer, you can also manually add the secret to your authenticator app:
                      <code className="block rounded bg-muted px-2 py-1 mt-2 text-xs">{otpauthUrl}</code>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>Use a strong password of at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
                {form.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                  {saving ? "Saving…" : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Environment info banner */}
        <Card className="border-primary/20 bg-orange-50/50">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-foreground mb-2">Backend Info</p>
            <p className="text-xs text-muted-foreground">
              API:{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {import.meta.env.VITE_API_URL ?? "http://localhost:5000"}
              </code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The backend is hosted separately on Render (
              <a href="https://github.com/obinovich/st_augustine_backend" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                st_augustine_backend
              </a>
              ).
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
