"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, LayoutDashboard, Gift, AlertCircle,
  PlayCircle, Settings2, LogOut, ChevronRight, RefreshCw, X
} from "lucide-react";
import { executeMonthlyDraw } from "../actions/platform";
import { fetchAdminData } from "../actions/admin";

type Section = "overview" | "users" | "charities" | "draw";

export default function AdminDashboard() {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [drawLoading, setDrawLoading] = useState(false);
  const router = useRouter();

  // Draw Animation State
  const [showDrawAnimation, setShowDrawAnimation] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[] | null>(null);

  // Real data state
  const [stats, setStats] = useState({ users: 0, activeUsers: 0, charities: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [charities, setCharities] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("adminAuth") === "true";
    setAdminLoggedIn(isAdmin);
    setChecking(false);
  }, []);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const { profiles, charities: charitiesData, draws: drawsData } = await fetchAdminData();
      
      const activeCount = profiles.filter((p: any) => p.sub_status === "active").length;

      setUsers(profiles);
      setStats({
        users: profiles.length,
        activeUsers: activeCount,
        charities: charitiesData.length,
      });
      setCharities(charitiesData);
      setDraws(drawsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch real data once admin is verified
  useEffect(() => {
    if (adminLoggedIn) fetchData();
  }, [adminLoggedIn, fetchData]);

  // Auth check redirect
  useEffect(() => {
    if (!checking && !adminLoggedIn) {
      router.replace("/auth");
    }
  }, [checking, adminLoggedIn, router]);

  const handleSignOut = () => {
    sessionStorage.removeItem("adminAuth");
    setAdminLoggedIn(false);
    router.push("/auth");
  };

  const handleRunDraw = async () => {
    setDrawLoading(true);
    setShowDrawAnimation(true);
    setDrawnNumbers(null);

    const res = await executeMonthlyDraw(new Date().toISOString().slice(0, 7) + "-01");
    
    if (res?.error) {
      alert("Error: " + res.error);
      setShowDrawAnimation(false);
    } else {
      // Delay closing and show the number sequence
      setDrawnNumbers(res?.draw?.winning_numbers);
      fetchData(); // refresh list in background
    }
    setDrawLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!adminLoggedIn) {
    return null; // Mounts nothing while the effect triggers the redirect
  }

  const navItems: { key: Section; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "users", label: `Users (${stats.users})`, icon: Users },
    { key: "charities", label: `Charities (${stats.charities})`, icon: Gift },
    { key: "draw", label: "Draw Simulator", icon: Settings2 },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-65px)] bg-background text-foreground">
      {/* Mobile Top Navigation Tab Bar */}
      <div className="md:hidden flex overflow-x-auto p-4 gap-2 border-b border-card-border bg-card/80 backdrop-blur sticky top-0 z-40 hide-scrollbar scroll-smooth">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shrink-0 ${
              activeSection === key
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-background border border-card-border text-foreground/70 hover:bg-card-border/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        <button onClick={fetchData} className="whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shrink-0 bg-background border border-card-border text-foreground/70 hover:bg-card-border/50">
           <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={handleSignOut} className="whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shrink-0 bg-red-500/10 border border-red-500/20 text-red-500">
           <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar (Desktop Hidden on Mobile) */}
      <aside className="w-64 border-r border-card-border bg-card/80 backdrop-blur-md hidden md:flex flex-col shrink-0 sticky top-[65px] h-[calc(100vh-65px)]">
        <div className="p-6 border-b border-card-border">
          <span className="text-xl font-bold tracking-tight text-primary">VANTAGE</span>
          <span className="block text-xs uppercase tracking-widest text-foreground/40 mt-0.5">Admin Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                activeSection === key
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-foreground/60 hover:bg-card-border/40 hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {activeSection === key && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-card-border space-y-1 bg-card/80">
          <button onClick={fetchData} disabled={dataLoading}
            className="w-full flex items-center gap-3 px-4 py-3 text-foreground/50 hover:bg-card-border/40 rounded-lg text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        {dataLoading && (
          <div className="flex items-center gap-2 text-foreground/40 text-sm mb-6">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading live data...
          </div>
        )}

        {/* Draw Full-Screen Animation Overlay */}
        <AnimatePresence>
          {showDrawAnimation && (
            <DrawAnimationOverlay 
              drawnNumbers={drawnNumbers} 
              onClose={() => setShowDrawAnimation(false)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeSection === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-8">System Overview</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {[
                  { label: "Total Users", value: stats.users, color: "text-primary" },
                  { label: "Active Subscribers", value: stats.activeUsers, color: "text-green-400" },
                  { label: "Charities Listed", value: stats.charities, color: "text-accent" },
                  { label: "Draws Run", value: draws.length, color: "text-foreground", alert: draws.some(d => d.status === "pending") }
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-card border border-card-border p-5 rounded-2xl relative">
                    {stat.alert && <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />}
                    <span className="block text-foreground/50 text-xs font-medium uppercase tracking-wide mb-3">{stat.label}</span>
                    <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Recent Draws */}
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Recent Draws
              </h2>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-8">
                {draws.length === 0 ? (
                  <p className="p-6 text-foreground/40 text-sm">No draws have been run yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-card-border bg-card-border/20">
                      <tr>{["Draw Month", "Status", "Winning Numbers", "Prize Pool"].map(h => (
                        <th key={h} className="p-4 font-medium text-foreground/50">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40">
                      {draws.map((draw, i) => (
                        <tr key={i} className="hover:bg-card-border/10 transition-colors">
                          <td className="p-4 font-medium">{new Date(draw.draw_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                          <td className="p-4"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${draw.status === "published" ? "bg-green-500/15 text-green-400" : draw.status === "simulated" ? "bg-amber-500/15 text-amber-400" : "bg-card-border text-foreground/50"}`}>{draw.status}</span></td>
                          <td className="p-4 font-mono text-primary">{draw.winning_numbers?.join(" - ") || "—"}</td>
                          <td className="p-4 text-green-400 font-mono">${draw.total_prize_pool || "0.00"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === "users" && (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-8 flex items-center gap-3"><Users className="w-6 h-6 text-primary" /> User Management</h1>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                {users.length === 0 ? (
                  <p className="p-6 text-foreground/40 text-sm">No users found. Make sure Supabase schema is set up and users have signed up.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-card-border bg-card-border/20">
                      <tr>{["Name", "Email", "Subscription", "Charity", "Joined"].map(h => (
                        <th key={h} className="p-4 font-medium text-foreground/50">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40">
                      {users.map((u, i) => (
                        <tr key={i} className="hover:bg-card-border/10 transition-colors">
                          <td className="p-4 font-semibold">{u.full_name || "—"}</td>
                          <td className="p-4 text-foreground/60">{u.email}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${u.sub_status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                              {u.sub_status || "inactive"}
                            </span>
                          </td>
                          <td className="p-4 text-foreground/70">{u.charity_name || "—"}</td>
                          <td className="p-4 text-foreground/50">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === "charities" && (
            <motion.div key="charities" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-8 flex items-center gap-3"><Gift className="w-6 h-6 text-accent" /> Charity Manager</h1>
              {charities.length === 0 ? (
                <div className="bg-card border border-card-border p-8 rounded-2xl text-center">
                  <p className="text-foreground/40 text-sm mb-4">No charities in database yet.</p>
                  <p className="text-foreground/30 text-xs">Run this SQL in Supabase to add sample charities:</p>
                  <pre className="mt-3 text-left bg-background p-4 rounded-xl text-xs text-accent overflow-auto">{`INSERT INTO charities (name, description, website_url) VALUES\n('Ocean Cleanup Foundation', 'Cleaning the oceans', 'https://theoceancleanup.com'),\n('UNICEF', 'Children worldwide', 'https://unicef.org'),\n('WWF', 'Wildlife conservation', 'https://wwf.org');`}</pre>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {charities.map((c, i) => (
                    <div key={i} className="bg-card border border-card-border p-5 rounded-2xl">
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      <p className="text-foreground/50 text-sm mt-1">{c.description || "No description"}</p>
                      {c.website_url && (
                        <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-2 block">{c.website_url}</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSection === "draw" && (
            <motion.div key="draw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold mb-8 flex items-center gap-3"><PlayCircle className="w-6 h-6 text-primary" /> Draw Simulator</h1>
              <div className="bg-card border border-primary/20 p-8 rounded-3xl relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 blur-3xl pointer-events-none" />
                <h2 className="text-xl font-bold mb-2 relative z-10">Run Monthly Draw</h2>
                <p className="text-foreground/60 text-sm mb-6 relative z-10">This will pick 5 random numbers and check all subscribed users' scores for matches.</p>
                <div className="flex gap-4 relative z-10 flex-wrap">
                  <button disabled={drawLoading} onClick={handleRunDraw}
                    className="px-6 py-3 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none">
                    {drawLoading ? "Simulating Virtual Draw..." : "🎲 Run Draw Simulator"}
                  </button>
                </div>
              </div>

              {/* Past Draws */}
              <h2 className="text-lg font-bold mb-4">Draw History</h2>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                {draws.length === 0 ? (
                  <p className="p-6 text-foreground/40 text-sm">No draws yet. Run your first simulation above.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-card-border bg-card-border/20">
                      <tr>{["Month", "Numbers", "Status", "Prize Pool"].map(h => <th key={h} className="p-4 font-medium text-foreground/50">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/40">
                      {draws.map((d, i) => (
                        <tr key={i} className="hover:bg-card-border/10">
                          <td className="p-4">{new Date(d.draw_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</td>
                          <td className="p-4 font-mono text-primary text-xs tracking-wider">{d.winning_numbers?.join(" · ") || "—"}</td>
                          <td className="p-4"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${d.status === "published" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>{d.status}</span></td>
                          <td className="p-4 text-green-400 font-mono">${d.total_prize_pool || "0.00"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// Custom Draw Animation Overlay & Golf Ball Mechanics
// ----------------------------------------------------------------------
const DrawAnimationOverlay = ({ drawnNumbers, onClose }: { drawnNumbers: number[] | null, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        className="bg-card border border-primary/20 shadow-2xl shadow-primary/20 p-8 md:p-12 rounded-3xl max-w-3xl w-full mx-4 text-center relative overflow-hidden"
      >
        <button onClick={drawnNumbers ? onClose : () => {}} className={`absolute top-6 right-6 text-foreground/50 hover:text-foreground transition-opacity ${!drawnNumbers ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <X className="w-6 h-6" />
        </button>

        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/20 blur-[120px] rounded-full pointer-events-none" />

        <h2 className="text-3xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent relative z-10">
          Randomizing Draw
        </h2>
        
        <p className="text-foreground/50 mb-12 max-w-md mx-auto relative z-10">
          Simulation engine running. Selecting 5 secure random winning numbers from the smart contract generator...
        </p>

        {/* Bouncing Golf Balls Row */}
        <div className="flex justify-center gap-3 sm:gap-6 mb-12 relative z-10">
          {[0, 1, 2, 3, 4].map((index) => (
            <GolfBall 
              key={index} 
              index={index} 
              finalNumber={drawnNumbers ? drawnNumbers[index] : null} 
            />
          ))}
        </div>

        {drawnNumbers ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}>
            <h3 className="text-xl font-bold text-foreground mb-6">Simulation Complete</h3>
            <button 
               onClick={onClose}
               className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 hover:scale-105 transition-all shadow-lg"
            >
              Finish & Refresh
            </button>
          </motion.div>
        ) : (
          <div className="h-14 flex items-center justify-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
             <div className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
             <div className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Creates a realistic rolling numbers effect that settles on the final drawn number
const GolfBall = ({ finalNumber, index }: { finalNumber: number | null, index: number }) => {
  const [num, setNum] = useState<number>(Math.floor(Math.random() * 45) + 1);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // If not final yet, keep spinning rapidly
    if (!finalNumber) {
      setSettled(false);
      const interval = setInterval(() => {
        setNum(Math.floor(Math.random() * 45) + 1);
      }, 50 + (index * 15)); // offset spin rates slightly
      return () => clearInterval(interval);
    } 
    // Once final number arrives, cascade the stops like a real slot machine
    else {
      const stopTargetTime = 400 + (index * 400); // Ball 1 stops at 400ms, Ball 5 stops at 2000ms
      const timeout = setTimeout(() => {
        setNum(finalNumber);
        setSettled(true);
      }, stopTargetTime);
      
      // Before it officially settled, keep it spinning (if we switched `settled` dependencies)
      const interSpin = setInterval(() => {
        if (!settled) setNum(Math.floor(Math.random() * 45) + 1);
      }, 50 + (index * 15));

      return () => {
        clearTimeout(timeout);
        clearInterval(interSpin);
      };
    }
  }, [finalNumber, index, settled]);

  return (
    <motion.div
       animate={
         settled 
          ? { scale: [1, 1.25, 1], rotate: [0, 15, -15, 0], y: [0, -20, 0] } 
          : { y: [0, -5, 0] }
       }
       transition={{ duration: settled ? 0.6 : 0.2, repeat: settled ? 0 : Infinity }}
       className={`
         w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center
         text-2xl sm:text-4xl font-black font-mono transition-all duration-300
         ${settled 
            ? "bg-primary text-black border-4 border-white shadow-[0_0_40px_rgba(var(--primary),0.8),inset_0_-10px_20px_rgba(0,0,0,0.2)]" 
            : "bg-card-border/60 text-foreground/40 border-2 border-foreground/10 shadow-inner"
         }
       `}
    >
      <span className={settled ? "drop-shadow-md" : ""}>
        {num.toString().padStart(2, '0')}
      </span>
    </motion.div>
  );
};
