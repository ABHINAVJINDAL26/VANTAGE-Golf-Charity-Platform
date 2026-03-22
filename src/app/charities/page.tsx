"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Search, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

const charities = [
  { id: "ocean-cleanup", name: "Ocean Cleanup Foundation", desc: "Removing plastic from the world's oceans and rivers.", category: "Environment", url: "https://theoceancleanup.com", backers: 324 },
  { id: "global-edu", name: "Global Education Initiative", desc: "Providing quality schooling for underprivileged children worldwide.", category: "Education", url: "https://unicef.org", backers: 218 },
  { id: "cancer-research", name: "Cancer Research Trust", desc: "Funding cutting-edge oncology research to find cures.", category: "Health", url: "https://cancerresearch.org", backers: 189 },
  { id: "veterans", name: "Veterans Support Network", desc: "Assisting veterans with housing, mental health, and employment.", category: "Social", url: "https://veteransupport.org", backers: 142 },
  { id: "wwf", name: "World Wildlife Fund", desc: "Protecting endangered species and their natural habitats.", category: "Environment", url: "https://wwf.org", backers: 276 },
  { id: "red-cross", name: "Red Cross International", desc: "Emergency disaster relief and humanitarian assistance globally.", category: "Humanitarian", url: "https://redcross.org", backers: 401 },
];

const categoryColors: Record<string, string> = {
  Environment: "bg-green-500/15 text-green-400",
  Education: "bg-blue-500/15 text-blue-400",
  Health: "bg-red-500/15 text-red-400",
  Social: "bg-yellow-500/15 text-yellow-400",
  Humanitarian: "bg-orange-500/15 text-orange-400",
};

export default function CharitiesPage() {
  const [search, setSearch] = useState("");
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("charity_name").eq("id", session.user.id).single();
      if (data?.charity_name) setSelectedCharity(data.charity_name);
    });
  }, []);

  const handleSelect = async (charityName: string) => {
    if (!userId) { alert("Please sign in first!"); return; }
    setSaving(charityName);
    await supabase.from("profiles").update({ charity_name: charityName }).eq("id", userId);
    setSelectedCharity(charityName);
    setSaving(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const filtered = charities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 p-6 md:p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto py-10">
        <div className="flex items-center justify-center w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl mx-auto mb-5">
          <Heart className="w-7 h-7 text-accent" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Choose Your Impact</h1>
        <p className="text-foreground/60 text-lg">A portion of your subscription goes to a charity of your choice. Select once — we donate every month on your behalf.</p>
      </div>

      {/* Currently selected */}
      {selectedCharity && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent">Your selected charity</p>
            <p className="text-foreground/80 text-sm">{selectedCharity}</p>
          </div>
          {saved && <span className="ml-auto text-xs text-green-400 font-semibold">✓ Saved!</span>}
        </motion.div>
      )}

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search charities or causes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-card-border rounded-full pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-foreground"
        />
      </div>

      {/* Charity Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map((c, i) => {
          const isSelected = selectedCharity === c.name;
          const isSaving = saving === c.name;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`group rounded-2xl bg-card border p-6 shadow-lg transition-all ${isSelected ? "border-accent/60 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "border-card-border hover:border-accent/30"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${categoryColors[c.category] || "bg-card-border text-foreground/50"}`}>
                  {c.category}
                </span>
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  className="text-foreground/40 hover:text-primary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <h3 className={`text-xl font-bold mb-2 transition-colors ${isSelected ? "text-accent" : "group-hover:text-accent"}`}>{c.name}</h3>
              <p className="text-foreground/60 text-sm mb-5">{c.desc}</p>

              <div className="h-1.5 w-full bg-background rounded-full overflow-hidden mb-2">
                <div className="h-full bg-accent/60 rounded-full" style={{ width: `${Math.min((c.backers / 500) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-foreground/40 mb-5">{c.backers} active backers</p>

              <button
                onClick={() => handleSelect(c.name)}
                disabled={isSelected || !!saving}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isSelected
                    ? "bg-accent/20 text-accent border border-accent/30 cursor-default"
                    : "bg-card-border hover:bg-accent hover:text-white disabled:opacity-50"
                }`}
              >
                {isSaving ? "Saving..." : isSelected ? "✓ Your Current Choice" : "Select This Charity"}
              </button>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-foreground/30">No charities match your search.</div>
      )}
    </div>
  );
}
