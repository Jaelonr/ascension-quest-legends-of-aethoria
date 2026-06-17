import { Link, useLocation } from "wouter";
import { 
  Home, 
  Apple, 
  Dumbbell, 
  Scroll, 
  Backpack, 
  BarChart3,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Status" },
  { href: "/nutrition", icon: Apple, label: "Nutrition" },
  { href: "/training", icon: Dumbbell, label: "Training" },
  { href: "/quests", icon: Scroll, label: "Quests" },
  { href: "/raids", icon: Swords, label: "Raids" },
  { href: "/inventory", icon: Backpack, label: "Store" },
  { href: "/analytics", icon: BarChart3, label: "Records" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 pb-safe">
      <nav className="flex items-center justify-around px-1 h-16 max-w-md mx-auto overflow-x-auto gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex flex-col items-center justify-center w-11 h-12 rounded-lg transition-colors cursor-pointer shrink-0",
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
