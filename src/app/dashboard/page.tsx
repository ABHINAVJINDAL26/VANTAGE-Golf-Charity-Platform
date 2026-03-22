"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [scores, setScores] = useState<any[]>([]);
  const [newScore, setNewScore] = useState("");
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({ drawsEntered: 0, lifetimeWinnings: 0, charityImpact: 0, charityName: "" });

  const loadScores = async (uid: string) => {
    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) console.error("Fetch error:", error);
    setScores(data || []);
  };

  const loadStats = async (uid: string) => {
    // Total draws entered = draws where this user had scores
    const { count: drawCount } = await supabase
      .from("draws")
      .select("*", { count: "exact", head: true });

    // Lifetime winnings for this user
    const { data: winningsData } = await supabase
      .from("winnings")
      .select("prize_amount")
      .eq("user_id", uid)
      .eq("status", "paid");

    const totalWon = (winningsData || []).reduce((sum, w) => sum + parseFloat(w.prize_amount || 0), 0);

    // Charity info from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("charity_name, charity_pct")
      .eq("id", uid)
      .single();

    // Charity impact = percentage of winnings donated
    const charityPct = profile?.charity_pct || 10;
    const charityAmount = totalWon * (charityPct / 100);

    setStats({
      drawsEntered: drawCount || 0,
      lifetimeWinnings: totalWon,
      charityImpact: charityAmount,
      charityName: profile?.charity_name || "No charity selected",
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        Promise.all([loadScores(uid), loadStats(uid)]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert("Please sign in first!"); return; }

    const trimmed = newScore.trim();
    const parsedScore = parseInt(trimmed, 10);
    // Reject empty, non-integer, or out-of-range values
    if (!trimmed || !Number.isInteger(parsedScore) || Number.isNaN(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      alert("Score must be a whole number between 1 and 45");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("scores")
      .insert([{ user_id: userId, score: parsedScore, date: newDate }]);

    if (error) {
      alert("Error saving score: " + error.message);
    } else {
      setNewScore("");
      setNewDate("");
      await Promise.all([loadScores(userId), loadStats(userId)]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Performance & Draws</h1>
        <p className="text-foreground/60">Your latest 5 scores automatically enter you into our monthly charity draws.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Score Entry Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1 rounded-2xl bg-card border border-card-border p-6 shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Log New Score
          </h2>
          <form className="space-y-4 relative z-10" onSubmit={handleScoreSubmit}>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Stableford Score (1-45)</label>
              <input 
                type="number" 
                min="1" max="45" 
                required
                value={newScore}
                onChange={e => setNewScore(e.target.value)}
                className="w-full bg-background border border-card-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-lg"
                placeholder="e.g. 36" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Date of Round</label>
              <input 
                type="date" 
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-background border border-card-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground/90"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Submit Score
            </button>
          </form>
        </motion.div>

        {/* Latest Scores List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="md:col-span-2 rounded-2xl bg-card border border-card-border p-6 shadow-lg"
        >
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Your Draw Numbers</h2>
              <p className="text-sm text-foreground/60 flex items-center gap-1">
                <Info className="w-4 h-4" /> 
                Only your 5 most recent scores are kept.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-foreground/60 block mb-1">Next Draw</span>
              <span className="text-primary font-mono font-bold">
                In {Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {scores.length === 0 ? (
              <div className="py-12 text-center text-foreground/40 border-2 border-dashed border-card-border rounded-xl">
                No scores logged yet. Start playing!
              </div>
            ) : (
              scores.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-background border border-card-border/50 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="block font-medium">{new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="text-xs text-foreground/50">Stableford</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <span className="text-2xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">{s.score}</span>
                    {idx === 0 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
              ))
            )}
            
            {/* The lottery number display visualization */}
            {scores.length === 5 && (
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center">
                <p className="text-sm font-medium text-foreground/80 mb-4 uppercase tracking-wider">Your Active Ticket</p>
                <div className="flex justify-center gap-3 md:gap-6">
                  {scores.map(s => (
                    <div key={`ticket-${s.id}`} className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center text-xl md:text-2xl font-bold text-primary shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                      {s.score}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Winnings & Participation Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid md:grid-cols-3 gap-6 mt-8"
      >
        <div className="rounded-2xl bg-card border border-card-border p-6">
          <p className="text-foreground/60 text-sm font-medium mb-1">Total Draws Available</p>
          <p className="text-3xl font-bold">{stats.drawsEntered}</p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-6">
          <p className="text-foreground/60 text-sm font-medium mb-1">Lifetime Winnings</p>
          <p className="text-3xl font-bold text-green-400">
            {stats.lifetimeWinnings > 0 ? `$${stats.lifetimeWinnings.toFixed(2)}` : "$0.00"}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-card-border p-6 overflow-hidden relative">
          <div className="absolute right-0 bottom-0 opacity-10 blur-xl w-32 h-32 bg-accent rounded-full" />
          <p className="text-foreground/60 text-sm font-medium mb-1">Charity Impact</p>
          <p className="text-3xl font-bold text-accent">
            {stats.charityImpact > 0 ? `$${stats.charityImpact.toFixed(2)}` : "$0.00"}
          </p>
          <p className="text-xs text-foreground/50 mt-1">To: {stats.charityName}</p>
        </div>
      </motion.div>
    </div>
  );
}
