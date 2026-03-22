"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AlertCircle, User, Mail, Lock, Eye, EyeOff, ShieldCheck, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "signin" | "signup" | "admin";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@vantage.golf";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "VantageAdmin@2026";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) { alert("Supabase not configured. Update .env.local."); return; }
    if (tab === "signup" && password !== confirmPassword) { alert("Passwords do not match!"); return; }
    setLoading(true);
    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
        setLoading(false);
      } else {
        setLoading(false); // clear before redirect
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } }
      });
      if (error) { alert(error.message); setLoading(false); }
      else { alert("Account created! Check your email to confirm."); setTab("signin"); setLoading(false); }
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // small delay for UX

    // Simple credential check — no Supabase account needed
    if (
      adminEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      adminPassword === ADMIN_PASSWORD
    ) {
      // Store a simple admin flag in sessionStorage
      sessionStorage.setItem("adminAuth", "true");
      router.push("/admin");
    } else {
      alert("Access Denied: Invalid admin credentials.");
    }
    setLoading(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "signin", label: "Sign In" },
    { key: "signup", label: "Create Account" },
    { key: "admin", label: "🔐 Admin" },
  ];

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-accent/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center mb-10"
        >
          <div className="relative w-20 h-20 mb-6 group cursor-default">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary via-accent to-primary opacity-30 blur-xl group-hover:opacity-50 transition-opacity duration-500"
            />
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-card to-background border border-white/10 shadow-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 group-hover:scale-105 transition-all duration-500">
              <Trophy className="w-10 h-10 text-transparent fill-primary/20 stroke-primary drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white drop-shadow-md">
            VANTAGE<span className="text-primary">.</span>
          </h1>
          <p className="text-xs font-semibold text-foreground/40 tracking-[0.3em] uppercase mt-2">
            Secure Platform Access
          </p>
        </motion.div>

        {/* Tab Selector */}
        <div className="flex bg-card border border-card-border rounded-2xl p-1 mb-6 gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tab === key
                  ? key === "admin"
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {(tab === "signin" || tab === "signup") && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-card border border-card-border rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-1">
                {tab === "signin" ? "Welcome back 👋" : "Join the movement 🌍"}
              </h2>
              <p className="text-foreground/50 text-sm mb-6">
                {tab === "signin" ? "Sign in to your golf charity account." : "Create your account and start making an impact."}
              </p>

              {!isSupabaseConfigured && (
                <div className="mb-4 flex gap-2 items-start bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-xs text-yellow-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>Setup Required:</strong> Update <code>.env.local</code> with your Supabase credentials.</span>
                </div>
              )}

              <form onSubmit={handleUserAuth} className="space-y-4">
                <AnimatePresence>
                  {tab === "signup" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-sm font-medium mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input type="text" required={tab === "signup"} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
                          className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                      className="w-full bg-background border border-card-border rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {tab === "signup" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input type={showPassword ? "text" : "password"} required={tab === "signup"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password"
                          className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-60">
                  {loading ? "Please wait..." : tab === "signin" ? "Sign In →" : "Create Account →"}
                </button>
              </form>
            </motion.div>
          )}

          {tab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-card border border-accent/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl mx-auto mb-5">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-center mb-1">Admin Portal</h2>
              <p className="text-foreground/50 text-sm text-center mb-6">Restricted access. Admin credentials only.</p>

              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@vantage.golf"
                      className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Admin Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                    <input type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20 disabled:opacity-60">
                  {loading ? "Verifying..." : "Access Admin Panel →"}
                </button>
              </form>
              <p className="text-center text-xs text-foreground/25 mt-5">Unauthorized access is strictly prohibited.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
