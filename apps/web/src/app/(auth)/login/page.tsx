"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useForgotPassword } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, accessToken, isResearcher } = useAuth();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect after AuthContext has actually applied the new profile —
  // reading isResearcher synchronously after signIn() captures the stale value.
  useEffect(() => {
    if (accessToken) {
      router.replace(isResearcher ? "/research" : "/dashboard");
    }
  }, [accessToken, isResearcher, router]);

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    // Always show the same outcome regardless of whether the email exists, to
    // prevent enumeration. Both success and failure resolve to the same UI.
    forgot.mutate(email, {
      onSettled: () => {
        setResetSent(true);
        toast.success("If that email exists, a reset link has been sent");
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Signed in successfully");
      // The redirect happens in the effect above once context updates.
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-0">
        <div className="flex justify-center mb-4">
          <span className="text-2xl font-bold text-primary tracking-tight">CareVault</span>
        </div>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">{forgotMode ? "Reset Password" : "Sign In"}</CardTitle>
            <CardDescription>
              {forgotMode
                ? "Enter your email to receive a reset link"
                : "Enter your credentials to access the platform"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={forgotMode ? handleForgotPassword : handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.ng"
                  required
                />
              </div>

              {!forgotMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={12}
                  />
                </div>
              )}

              {!forgotMode ? (
                <>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="animate-spin" />}
                    Sign In
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="w-full text-xs text-primary hover:underline mt-2"
                  >
                    Forgot your password?
                  </button>
                </>
              ) : resetSent ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setResetSent(false); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <Button type="submit" className="w-full" disabled={forgot.isPending}>
                    {forgot.isPending && <Loader2 className="animate-spin" />}
                    Send Reset Link
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-xs text-primary hover:underline mt-2"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Contact your facility administrator to request access
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground mt-3">
          FHIR R4 Compliant · Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
