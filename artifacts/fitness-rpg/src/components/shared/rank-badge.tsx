import { cn } from "@/lib/utils";
import { GRADE_LABELS } from "@/lib/ranks";
import { motion } from "framer-motion";

interface RankBadgeProps {
  rank: string;
  className?: string;
  animate?: boolean;
}

const rankColors: Record<string, string> = {
  "E": "text-[hsl(var(--rank-e))] border-[hsl(var(--rank-e))]/30 bg-[hsl(var(--rank-e))]/10 shadow-[0_0_10px_rgba(128,128,128,0.2)]",
  "D": "text-[hsl(var(--rank-d))] border-[hsl(var(--rank-d))]/30 bg-[hsl(var(--rank-d))]/10 shadow-[0_0_10px_rgba(0,180,100,0.2)]",
  "C": "text-[hsl(var(--rank-c))] border-[hsl(var(--rank-c))]/30 bg-[hsl(var(--rank-c))]/10 shadow-[0_0_10px_rgba(0,150,255,0.2)]",
  "B": "text-[hsl(var(--rank-b))] border-[hsl(var(--rank-b))]/30 bg-[hsl(var(--rank-b))]/10 shadow-[0_0_10px_rgba(150,50,255,0.2)]",
  "A": "text-[hsl(var(--rank-a))] border-[hsl(var(--rank-a))]/30 bg-[hsl(var(--rank-a))]/10 shadow-[0_0_10px_rgba(255,150,0,0.2)]",
  "S": "text-[hsl(var(--rank-s))] border-[hsl(var(--rank-s))]/30 bg-[hsl(var(--rank-s))]/10 shadow-[0_0_15px_rgba(255,200,0,0.3)]",
  "National-Level": "text-[hsl(var(--rank-national))] border-[hsl(var(--rank-national))]/50 bg-[hsl(var(--rank-national))]/20 shadow-[0_0_20px_rgba(255,0,50,0.4)]",
};

export function RankBadge({ rank, className, animate = true }: RankBadgeProps) {
  const colorClass = rankColors[rank] || rankColors["E"];
  const displayRank = GRADE_LABELS[rank] ?? rank;

  const content = (
    <div className={cn(
      "flex items-center justify-center font-bold font-serif italic border rounded-sm px-1 text-center leading-none",
      colorClass,
      className
    )}>
      {displayRank}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
