import React, { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, Link2, CalendarCheck, Layers, BookOpen, Menu, X, LayoutDashboard, Bot, Gamepad2, FlaskConical, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard, group: "apps" },
  { name: "Job Tracker", href: "/jobs", icon: Briefcase, group: "apps" },
  { name: "Link Vault", href: "/links", icon: Link2, group: "apps" },
  { name: "Habit Chain", href: "/habits", icon: Layers, group: "apps" },
  { name: "Event Board", href: "/events", icon: CalendarCheck, group: "apps" },
  { name: "Study Deck", href: "/flashcards", icon: BookOpen, group: "apps" },
  { name: "AI Assistant", href: "/ai", icon: Bot, group: "extras" },
  { name: "AI Studio", href: "/ai-studio", icon: FlaskConical, group: "extras" },
  { name: "Space Shooter", href: "/game", icon: Gamepad2, group: "extras" },
  { name: "Asteroids", href: "/asteroids", icon: Rocket, group: "extras" },
];

const extrasColor: Record<string, string> = {
  "/ai": "purple",
  "/ai-studio": "pink",
  "/game": "green",
  "/asteroids": "cyan",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl z-20">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tight">Portfolio Hub</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Applications</p>
          {navItems.filter(i => i.group === "apps").map((item) => (
            <Link key={item.name} href={item.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive(item.href) ? "scale-110" : "group-hover:scale-110"
                )} />
                <span>{item.name}</span>
              </div>
            </Link>
          ))}
          <div className="pt-4 pb-2">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Extras</p>
            {navItems.filter(i => i.group === "extras").map((item) => {
              const color = extrasColor[item.href] || "purple";
              return (
                <Link key={item.name} href={item.href} className="block">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                      isActive(item.href)
                        ? `bg-${color}-500/10 text-${color}-400 font-medium`
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive(item.href) ? "scale-110" : "group-hover:scale-110"
                    )} />
                    <span>{item.name}</span>
                    {(item.href === "/ai" || item.href === "/ai-studio") && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-${color}-500/20 text-${color}-400`}>AI</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
              <span className="text-xs font-medium">JD</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Jane Doe</span>
              <span className="text-xs text-muted-foreground">Pro Member</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">Hub</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-foreground"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-20 bg-background pt-16"
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl",
                    isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  )}>
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-hidden relative">
        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
