import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

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
