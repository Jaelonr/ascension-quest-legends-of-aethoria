import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5 border-b border-[#6d4a25] pb-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-bold tracking-wide text-[#e5c386]">{title}</h1>
          {subtitle && <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#9f9586]">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
