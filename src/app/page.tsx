"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Trophy, HeartPulse, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="z-10 w-full max-w-6xl px-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-card-border bg-card/50 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium tracking-wide">
            Turn your scores into global impact.
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Elevate Your Game. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Change The World.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="max-w-2xl text-lg md:text-xl text-foreground/70 mb-10"
        >
          A premium subscription platform where your last 5 Stableford scores become your numbers for our monthly charity draws. Play golf, win big, and support the causes you love.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/subscription"
            className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all duration-300"
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/charities"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-card px-8 py-4 text-foreground font-semibold border border-card-border hover:bg-card-border hover:scale-105 transition-all duration-300"
          >
            <HeartPulse className="w-5 h-5 text-accent" />
            Explore Charities
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1, ease: "easeOut" }}
        className="absolute bottom-10 flex gap-12 text-foreground/50 text-sm font-medium"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Monthly Prize Draws
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> 10%+ Charity Donation
        </div>
      </motion.div>
    </main>
  );
}
