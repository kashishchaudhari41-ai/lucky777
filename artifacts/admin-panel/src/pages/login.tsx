import React, { useState } from "react";
import { useLocation } from "wouter";
import { setAdminToken, getAdminToken } from "@/lib/auth";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Lock, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useAdminLogin();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  React.useEffect(() => {
    if (getAdminToken()) {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Error", description: "Username and password are required", variant: "destructive" });
      return;
    }

    try {
      const res = await loginMutation.mutateAsync({ data: { username, password } });
      setAdminToken(res.token);
      toast({ title: "Welcome to Lucky777", description: "Login successful" });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ 
        title: "Login Failed", 
        description: err.message || "Invalid credentials", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1a4718] rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#83a561] rounded-full mix-blend-screen filter blur-[128px] opacity-20" />

      <div className="w-full max-w-md relative z-10 p-8 rounded-2xl bg-[#111111]/80 backdrop-blur-xl border border-[#2a2a2a] shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-[#1a4718] to-[#48723e] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-[#48723e]/20">
            <Trophy className="h-8 w-8 text-[#bfdb81]" />
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white">LUCKY777</h1>
          <p className="text-[#83a561] mt-2 font-mono text-sm uppercase">Admin Command Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-[#a0a0a0]" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#48723e] focus:ring-[#48723e]"
                data-testid="input-username"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-[#a0a0a0]" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#48723e] focus:ring-[#48723e]"
                data-testid="input-password"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#1a4718] to-[#48723e] hover:from-[#48723e] hover:to-[#83a561] text-white font-bold h-12 text-lg shadow-lg shadow-[#1a4718]/30 transition-all duration-300"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "ENTER COMMAND CENTER"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2a2a2a] text-center">
          <p className="text-xs text-[#a0a0a0] mb-2">Demo Credentials</p>
          <div className="inline-block bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-sm text-[#bfdb81] font-mono">
            ourempire / Ourempire@#000#@
          </div>
        </div>
      </div>
    </div>
  );
}
