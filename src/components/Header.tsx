"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
    router.push("/auth");
    router.refresh();
  };

  const handleAdminSignOut = () => {
    sessionStorage.removeItem("adminAuth");
    setIsAdmin(false);
    setMobileMenuOpen(false);
    router.push("/auth");
  };

  const avatarLetter = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0];

  return (
    <header className="w-full border-b border-card-border bg-background/80 backdrop-blur top-0 z-50 sticky px-4 sm:px-6 py-4">
      <div className="flex justify-between items-center w-full">
        <a href="/" className="text-xl font-bold tracking-tight text-primary">VANTAGE</a>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80">
          <a href="/charities" className="hover:text-primary transition-colors">Charities</a>
          <a href="/subscription" className="hover:text-primary transition-colors">Pricing</a>

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
                  <LogOut className="w-3.5 h-3.5" />
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
                  <LogOut className="w-3.5 h-3.5" />
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

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-foreground/80 hover:text-primary transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-card-border mt-4"
          >
            <nav className="flex flex-col py-4 gap-4 text-sm font-medium text-foreground/80">
              <a href="/charities" className="w-full py-2 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>Charities</a>
              <a href="/subscription" className="w-full py-2 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              
              <div className="my-2 border-t border-card-border" />

              {isAdmin ? (
                <div className="flex flex-col gap-4">
                  <a href="/admin" className="w-full text-center py-2.5 bg-accent/20 text-accent font-semibold rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Admin Panel
                  </a>
                  <button onClick={handleAdminSignOut} className="w-full flex justify-center items-center gap-2 py-2.5 text-red-400 font-medium bg-red-500/10 rounded-lg">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : user ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-black font-bold text-xs">
                      {avatarLetter}
                    </div>
                    <span>{displayName}</span>
                  </div>
                  <a href="/dashboard" className="w-full text-center py-2.5 bg-primary/20 text-primary font-semibold rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </a>
                  <button onClick={handleSignOut} className="w-full flex justify-center items-center gap-2 py-2.5 text-red-400 font-medium bg-red-500/10 rounded-lg">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <a href="/auth" className="w-full text-center py-2.5 bg-card border border-card-border rounded-lg" onClick={() => setMobileMenuOpen(false)}>Sign In</a>
                  <a href="/auth" className="w-full text-center py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </a>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
