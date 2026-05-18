import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import carevaultLogo from "@/assets/carevault-logo.png";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for auth events to detect recovery/invite tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setIsInvite(false);
      }
      // Invited users get signed in automatically when they click the link
      if (event === "SIGNED_IN") {
        // Check URL hash for invite type
        const hash = window.location.hash;
        if (hash.includes("type=invite") || hash.includes("type=signup")) {
          setReady(true);
          setIsInvite(true);
        }
      }
    });

    // Also check the URL hash on mount for invite/recovery tokens
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else if (hash.includes("type=invite") || hash.includes("type=signup")) {
      setReady(true);
      setIsInvite(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(isInvite ? "Account set up successfully!" : "Password updated successfully!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-0">
          <div className="flex justify-center mb-0">
            <img src={carevaultLogo} alt="CareVault" className="h-32 object-contain" />
          </div>
          <Card className="border-border/50 shadow-md">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Verifying your link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-0">
        <div className="flex justify-center mb-0">
          <img src={carevaultLogo} alt="CareVault" className="h-32 object-contain" />
        </div>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {isInvite ? "Set Up Your Account" : "Reset Password"}
            </CardTitle>
            <CardDescription>
              {isInvite
                ? "Create a password to complete your account setup"
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isInvite ? "Create Account" : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          FHIR R4 Compliant · Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
