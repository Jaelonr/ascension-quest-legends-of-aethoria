import { Link, useLocation } from "wouter";
import { Apple, BookOpen, Dumbbell, Landmark, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/guild-hall", icon: Landmark, label: "Hall" },
  { href: "/training", icon: Dumbbell, label: "Training" },
  { href: "/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/chronicle", icon: BookOpen, label: "Chronicle" },
  { href: "/character", icon: Shield, label: "Character" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card pb-safe md:bottom-auto md:top-4 md:left-1/2 md:right-auto md:w-[min(56rem,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-md md:border md:pb-0">
      <nav className="grid h-16 max-w-md grid-cols-5 items-center gap-1 px-1 mx-auto md:max-w-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex h-12 min-w-0 flex-col items-center justify-center rounded-md transition-colors cursor-pointer",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
