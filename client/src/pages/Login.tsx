import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Already authenticated — go to dashboard
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const onCredentialsSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      setLocation("/");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.errorCode === "TWO_FACTOR_REQUIRED") {
        setPendingEmail(data.email);
        setPendingPassword(data.password);
        setTotpCode("");
        setRequiresTwoFactor(true);
        toast.info("Enter your 2FA code to complete sign-in.");
      } else {
        const message =
          axios.isAxiosError(error)
            ? (error.response?.data?.error ?? error.message)
            : error instanceof Error
              ? error.message
              : "Invalid email or password. Please try again.";
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTwoFactorSubmit = async () => {
    if (!totpCode.trim()) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(pendingEmail, pendingPassword, totpCode.trim());
      setLocation("/");
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? (error.response?.data?.error ?? error.message)
          : error instanceof Error
            ? error.message
            : "Unable to verify the authentication code. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, oklch(0.96 0.003 65) 0%, oklch(0.92 0.01 50) 100%)" }}
    >
      {/* Background cross pattern */}
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, oklch(0.72 0.19 78) 40px, oklch(0.72 0.19 78) 41px),
                            repeating-linear-gradient(90deg, transparent, transparent 40px, oklch(0.72 0.19 78) 40px, oklch(0.72 0.19 78) 41px)`,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Saint Augustine of Canterbury Parish" className="h-40 w-auto" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-foreground">
            St. Augustine of Canterbury
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Parish Admin Portal</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              {requiresTwoFactor ? "Two-Factor Verification" : "Sign In"}
            </CardTitle>
            <CardDescription>
              {requiresTwoFactor
                ? "Enter the 6-digit code from your authenticator app to complete sign-in."
                : "Enter your administrator credentials to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requiresTwoFactor ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onTwoFactorSubmit();
                }}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="totpCode">Authentication Code</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    maxLength={6}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      setRequiresTwoFactor(false);
                      setTotpCode("");
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Verifying…" : "Verify Code"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onCredentialsSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@staugustine.ca"
                      className="pl-9"
                      autoComplete="email"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      autoComplete="current-password"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          St. Augustine of Canterbury Parish &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
