import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import carevaultLogo from "@/assets/carevault-logo.png";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-0">
        <div className="flex justify-center mb-4">
          <img src={carevaultLogo} alt="CareVault" className="h-16 object-contain" />
        </div>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <p className="text-sm text-muted-foreground">
                    Check your email for a password reset link.
                  </p>
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
                  <Button type="button" className="w-full" disabled={loading} onClick={handleForgotPassword}>
                    {loading && <Loader2 className="animate-spin" />}
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

        <p className="text-center text-[10px] text-muted-foreground">
          FHIR R4 Compliant · Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
