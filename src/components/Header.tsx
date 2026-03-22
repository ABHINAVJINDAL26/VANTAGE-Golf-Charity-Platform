"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Admin is authenticated via sessionStorage only
    const adminAuth = sessionStorage.getItem("adminAuth") === "true";
    setIsAdmin(adminAuth);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const handleAdminSignOut = () => {
    sessionStorage.removeItem("adminAuth");
    setIsAdmin(false);
    router.push("/auth");
  };

  const avatarLetter = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0];

  return (
    <header className="w-full border-b border-card-border bg-background/80 backdrop-blur top-0 z-50 sticky px-6 py-4 flex justify-between items-center">
      <a href="/" className="text-xl font-bold tracking-tight text-primary">VANTAGE</a>
      <nav className="flex items-center gap-6 text-sm font-medium text-foreground/80">
        <a href="/charities" className="hover:text-primary transition-colors hidden sm:block">Charities</a>
        <a href="/subscription" className="hover:text-primary transition-colors hidden sm:block">Pricing</a>

        {/* Admin session (sessionStorage-based) */}
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <a href="/admin" className="px-4 py-2 bg-accent/20 text-accent border border-accent/50 rounded-full hover:bg-accent hover:text-white transition-all font-semibold">
              Admin Panel
            </a>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg cursor-default" title="Admin">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <button
                onClick={handleAdminSignOut}
                className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        ) : user ? (
          /* Regular user session */
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="px-4 py-2 bg-primary/20 text-primary border border-primary/50 rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
              Dashboard
            </a>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-black font-bold text-sm shadow-lg cursor-default" title={displayName}>
                {avatarLetter}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Logged out */
          <div className="flex items-center gap-3">
            <a href="/auth" className="hover:text-primary transition-colors">Sign In</a>
            <a href="/auth" className="px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 hover:scale-105 transition-all font-semibold">
              Get Started
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
