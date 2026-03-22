import { ReactNode } from "react";
import Link from "next/link";
import { User, Trophy, Heart, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar — hidden on mobile, flex column on md+ */}
      <aside className="w-64 border-r border-card-border bg-card/50 backdrop-blur hidden md:flex md:flex-col">
        <div className="p-6 border-b border-card-border">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            VANTAGE
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20 transition-all hover:bg-primary/20">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">My Performance</span>
          </Link>
          <Link href="/charities" className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-card-border/50 hover:text-foreground transition-all">
            <Heart className="w-5 h-5" />
            <span className="font-medium">Impact & Charity</span>
          </Link>
          <Link href="/auth" className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-card-border/50 hover:text-foreground transition-all">
            <User className="w-5 h-5" />
            <span className="font-medium">Account Settings</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-card-border">
          <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-card-border bg-card">
          <span className="text-xl font-bold">VANTAGE</span>
          <button aria-label="Open user menu" className="text-foreground">
            <User className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
