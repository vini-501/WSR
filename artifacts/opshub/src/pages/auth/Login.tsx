import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, User, Users, Briefcase, Key } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, demoSignIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'management' | 'department_head' | 'employee', roleLabel: string) => {
    setIsLoading(true);
    try {
      await demoSignIn(role);
      toast({
        title: `Signed in as ${roleLabel}`,
        description: `Switched workspace active session to ${roleLabel}.`,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Demo login failed",
        description: error.message || "Failed demo auth",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showDemoLogin = true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-1 text-primary-foreground font-bold text-xl shadow-md">
            EO
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            Sign in to OpsHub
          </CardTitle>
          <CardDescription className="text-xs">
            Weekly Company Reporting & Workflow Automation Platform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Quick Demo Logins Banner - Only rendered if hidden flag demo mode enabled */}
          {showDemoLogin && (
            <>
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Key className="h-3.5 w-3.5" /> Instant Demo Role Logins:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("admin", "Admin")}
                    disabled={isLoading}
                    className="h-8 text-[11px] font-medium justify-start gap-1.5 bg-card hover:bg-primary/10 border-primary/20"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-600" /> Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("management", "Manager")}
                    disabled={isLoading}
                    className="h-8 text-[11px] font-medium justify-start gap-1.5 bg-card hover:bg-primary/10 border-primary/20"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600" /> Manager
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("department_head", "Dept Head")}
                    disabled={isLoading}
                    className="h-8 text-[11px] font-medium justify-start gap-1.5 bg-card hover:bg-primary/10 border-primary/20"
                  >
                    <Users className="h-3.5 w-3.5 text-blue-600" /> Dept Head
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("employee", "Employee")}
                    disabled={isLoading}
                    className="h-8 text-[11px] font-medium justify-start gap-1.5 bg-card hover:bg-primary/10 border-primary/20"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-600" /> Employee
                  </Button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t w-full border-muted/50" />
                <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase font-semibold shrink-0">
                  or enter credentials
                </span>
                <div className="border-t w-full border-muted/50" />
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@ellipsonic.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" className="w-full h-9 text-xs font-medium shadow" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}