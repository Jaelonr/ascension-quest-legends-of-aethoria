import { useEffect, useRef, useState } from "react";
import { useGetPlayer } from "@workspace/api-client-react";

export interface LevelUpInfo {
  newLevel: number;
  prevLevel: number;
  newRank: string;
  levelsGained: number;
  statPointsGained: number;
  rankedUp: boolean;
  prevRank: string;
}

export function useLevelUpDetector() {
  const { data: player } = useGetPlayer({ query: { queryKey: ["/api/player"] } });
  const prevLevelRef = useRef<number | null>(null);
  const prevRankRef = useRef<string | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);

  useEffect(() => {
    if (!player) return;

    if (prevLevelRef.current !== null && player.level > prevLevelRef.current) {
      const levelsGained = player.level - prevLevelRef.current;
      setLevelUpInfo({
        newLevel: player.level,
        prevLevel: prevLevelRef.current,
        newRank: player.rank,
        levelsGained,
        statPointsGained: levelsGained * 5,
        rankedUp: player.rank !== prevRankRef.current,
        prevRank: prevRankRef.current ?? player.rank,
      });
    }

    prevLevelRef.current = player.level;
    prevRankRef.current = player.rank;
  }, [player?.level, player?.rank]);

  const dismiss = () => setLevelUpInfo(null);

  return { levelUpInfo, dismiss };
}
