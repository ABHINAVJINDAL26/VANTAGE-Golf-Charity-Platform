"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Crown, Zap, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      // Fetch user's current plan
      const { data } = await supabase
        .from("profiles")
        .select("sub_status, stripe_subscription_id")
        .eq("id", session.user.id)
        .single();
      if (data?.sub_status === "active") {
        setCurrentPlan(data.stripe_subscription_id?.includes("yearly") ? "yearly" : "monthly");
      }
    });
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!userId) { router.push("/auth"); return; }
    setLoading(planId);
    // Mark plan in profile (simulate — real Stripe would go here)
    await supabase.from("profiles").update({
      sub_status: "active",
      stripe_subscription_id: `sim_${planId}_${Date.now()}`,
      charity_pct: planId === "yearly" ? 15 : 10,
    }).eq("id", userId);

    setCurrentPlan(planId);
    setLoading(null);
    router.push("/dashboard");
  };

  const plans = [
    {
      id: "monthly",
      name: "Monthly Impact",
      price: "$29",
      period: "/month",
      icon: Zap,
      color: "text-accent",
      borderActive: "border-accent shadow-[0_0_30px_rgba(168,85,247,0.2)]",
      btnClass: "bg-card-border text-foreground hover:bg-foreground hover:text-background",
      features: [
        { text: "1 Draw entry per month", highlight: true },
        { text: "Record unlimited scores", highlight: false },
        { text: "10% minimum charity donation", highlight: false },
        { text: "Access to leaderboard", highlight: false },
        { text: "Cancel anytime", highlight: false },
      ],
      cta: "Subscribe Monthly",
      isPopular: false,
      note: "Billed monthly. Flexibility first."
    },
    {
      id: "yearly",
      name: "Annual Benefactor",
      price: "$290",
      period: "/year",
      icon: Crown,
      color: "text-primary",
      borderActive: "border-primary shadow-[0_0_40px_rgba(0,240,255,0.2)]",
      btnClass: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105",
      features: [
        { text: "12 draw entries — 1 every month", highlight: true },
        { text: "Record unlimited scores", highlight: false },
        { text: "15% charity donation (upgraded)", highlight: true },
        { text: "Premium member badge", highlight: true },
        { text: "Save 16% — 2 months FREE 🎁", highlight: true },
      ],
      cta: "Subscribe Annually",
      isPopular: true,
      note: "Best value. Committed to change."
    }
  ];

  return (
    <div className="py-16 px-6 max-w-6xl mx-auto flex flex-col items-center">
      {/* Hero */}
      <div className="text-center mb-14 max-w-3xl">
        <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full mb-5">Membership Plans</span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">Choose Your Level of Impact</h1>
        <p className="text-lg text-foreground/60">Every subscription funds charity, enters you into monthly draws, and keeps the platform running. Pick the plan that fits your game.</p>
      </div>

      {/* How money splits */}
      <div className="w-full max-w-4xl bg-card border border-card-border rounded-2xl p-6 mb-12 grid grid-cols-3 gap-6 text-center">
        <div>
          <span className="text-2xl font-bold text-primary">60%</span>
          <p className="text-xs text-foreground/50 mt-1 uppercase tracking-wide">Prize Pool</p>
          <p className="text-foreground/70 text-sm mt-1">Monthly draw pot</p>
        </div>
        <div className="border-x border-card-border">
          <span className="text-2xl font-bold text-accent">25%</span>
          <p className="text-xs text-foreground/50 mt-1 uppercase tracking-wide">Your Charity</p>
          <p className="text-foreground/70 text-sm mt-1">Goes to chosen cause</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-foreground/70">15%</span>
          <p className="text-xs text-foreground/50 mt-1 uppercase tracking-wide">Platform</p>
          <p className="text-foreground/70 text-sm mt-1">Keeps platform running</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mb-12">
        {plans.map((plan, idx) => {
          const Icon = plan.icon;
          const isActive = currentPlan === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={`relative p-8 rounded-3xl border flex flex-col transition-all ${
                isActive ? plan.borderActive : plan.isPopular ? "bg-primary/5 border-primary/40" : "bg-card border-card-border"
              }`}
            >
              {plan.isPopular && !isActive && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                  Most Popular
                </span>
              )}
              {isActive && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full">
                  ✓ Active Plan
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-card-border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <h2 className="text-xl font-bold">{plan.name}</h2>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="text-foreground/50">{plan.period}</span>
              </div>
              <p className="text-xs text-foreground/40 mb-8">{plan.note}</p>

              <ul className="space-y-3 mb-10 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-3 text-sm ${f.highlight ? "text-foreground font-medium" : "text-foreground/60"}`}>
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${f.highlight ? plan.color : "text-foreground/30"}`} />
                    {f.text}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loading || isActive}
                className={`w-full py-4 rounded-xl font-bold text-center transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  isActive ? "bg-green-500/20 text-green-400 border border-green-500/30" : plan.btnClass
                }`}
              >
                {loading === plan.id ? "Processing..." : isActive ? "✓ Current Plan" : plan.cta}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Draw eligibility note */}
      <div className="max-w-4xl w-full bg-card border border-amber-500/20 rounded-2xl p-5 flex gap-4 items-start mb-8">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-400 text-sm mb-1">Draw Eligibility Rules</p>
          <p className="text-foreground/60 text-sm">
            <strong className="text-foreground">Monthly plan:</strong> You get 1 draw entry per month — your 5 most recent scores count. &nbsp;
            <strong className="text-foreground">Annual plan:</strong> Same, but you're guaranteed entries for all 12 months — never miss a draw even if payment is late.
            <br />Only <strong className="text-foreground">active subscribers</strong> are eligible. Cancelled accounts lose eligibility from the next draw.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-foreground/40 text-sm">
        <ShieldCheck className="w-4 h-4" />
        Secure payments. Cancel anytime. No hidden fees.
      </div>
    </div>
  );
}
