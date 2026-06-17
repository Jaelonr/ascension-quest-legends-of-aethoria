import { db } from "@workspace/db";
import {
  playerTable, playerStatsTable, achievementsTable, playerAchievementsTable,
  titlesTable, playerTitlesTable, xpHistoryTable, workoutSessionsTable,
  personalRecordsTable, questsTable, playerSkillNodesTable
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";

export function xpForLevel(level: number): number {
  if (level < 10) return level * 100;
  if (level < 20) return 1000 + (level - 9) * 200;
  if (level < 35) return 3000 + (level - 19) * 400;
  if (level < 50) return 9000 + (level - 34) * 600;
  if (level < 75) return 18000 + (level - 49) * 1000;
  if (level < 100) return 43000 + (level - 74) * 2000;
  return 93000 + (level - 99) * 5000;
}

export function rankForLevel(level: number): "E" | "D" | "C" | "B" | "A" | "S" | "National-Level" {
  if (level >= 100) return "National-Level";
  if (level >= 75) return "S";
  if (level >= 50) return "A";
  if (level >= 35) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

export function buildPlayerResponse(player: any, stats: any) {
  const xpNeeded = xpForLevel(player.level + 1);
  return {
    id: player.id,
    name: player.name,
    level: player.level,
    rank: player.rank,
    xp: player.xp,
    xpToNextLevel: xpNeeded,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    gold: player.gold,
    freeStatPoints: player.freeStatPoints,
    streakDays: player.streakDays,
    longestStreak: player.longestStreak || 0,
    activeTitle: player.activeTitle,
    penaltyQuestActive: player.penaltyQuestActive,
    totalXpEarned: player.totalXpEarned || 0,
    totalWorkouts: player.totalWorkouts || 0,
    totalQuests: player.totalQuests || 0,
    totalPrs: player.totalPrs || 0,
    prestigeLevel: player.prestigeLevel || 0,
    xpMultiplier: player.xpMultiplier || 100,
    createdAt: player.createdAt.toISOString(),
    stats: stats ? {
      strength: stats.strength,
      agility: stats.agility,
      stamina: stats.stamina,
      vitality: stats.vitality,
      discipline: stats.discipline,
      sense: stats.sense,
    } : { strength: 5, agility: 5, stamina: 5, vitality: 5, discipline: 5, sense: 5 },
  };
}

export interface XpEventResult {
  player: any;
  stats: any;
  levelsGained: number;
  leveledUp: boolean;
  rankedUp: boolean;
  newRank: string | null;
  newAchievements: Array<{ id: number; name: string; description: string; xpReward: number }>;
  newTitles: Array<{ id: number; name: string; description: string; rarity: string }>;
  totalXpAwarded: number;
}

export async function applyXpEvent(
  playerId: number,
  baseXp: number,
  source: string,
  category: string,
  date: string
): Promise<XpEventResult> {
  const [player] = await db.select().from(playerTable).where(eq(playerTable.id, playerId));
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.playerId, playerId));

  // Apply XP multiplier from prestige/boosts
  const multiplier = (player.xpMultiplier || 100) / 100;
  const xpAwarded = Math.round(baseXp * multiplier);

  // Record in history
  await db.insert(xpHistoryTable).values({
    playerId,
    amount: xpAwarded,
    source,
    category,
    date,
  });

  let currentXp = player.xp + xpAwarded;
  let currentLevel = player.level;
  let levelsGained = 0;
  let statBonusStr = 0, statBonusAgi = 0, statBonusSta = 0, statBonusVit = 0, statBonusDis = 0, statBonusSen = 0;
  let freePointsGained = 0;

  // Level up loop
  while (true) {
    const needed = xpForLevel(currentLevel + 1);
    if (currentXp >= needed) {
      currentXp -= needed;
      currentLevel++;
      levelsGained++;
      // +1 to all stats per level
      statBonusStr++; statBonusAgi++; statBonusSta++;
      statBonusVit++; statBonusDis++; statBonusSen++;
      // +5 free stat points per level
      freePointsGained += 5;
    } else {
      break;
    }
  }

  const oldRank = player.rank;
  const newRank = rankForLevel(currentLevel);
  const rankedUp = newRank !== oldRank;

  // Compute new HP/MP maxes based on vitality
  const newVitality = (stats?.vitality || 5) + statBonusVit;
  const newMaxHp = 100 + (newVitality - 5) * 10 + currentLevel * 5;
  const newMaxMp = 100 + currentLevel * 3;

  // Update player
  const [updatedPlayer] = await db.update(playerTable).set({
    xp: currentXp,
    level: currentLevel,
    rank: newRank,
    totalXpEarned: player.totalXpEarned + xpAwarded,
    freeStatPoints: player.freeStatPoints + freePointsGained,
    maxHp: newMaxHp,
    hp: Math.min(player.hp, newMaxHp),
    maxMp: newMaxMp,
    mp: Math.min(player.mp, newMaxMp),
    updatedAt: new Date(),
  }).where(eq(playerTable.id, playerId)).returning();

  // Update stats if leveled up
  let updatedStats = stats;
  if (levelsGained > 0 && stats) {
    const [s] = await db.update(playerStatsTable).set({
      strength: stats.strength + statBonusStr,
      agility: stats.agility + statBonusAgi,
      stamina: stats.stamina + statBonusSta,
      vitality: stats.vitality + statBonusVit,
      discipline: stats.discipline + statBonusDis,
      sense: stats.sense + statBonusSen,
      updatedAt: new Date(),
    }).where(eq(playerStatsTable.playerId, playerId)).returning();
    updatedStats = s;
  }

  // Check achievements
  const { newAchievements, newTitles } = await checkAndGrantAchievements(playerId, updatedPlayer, updatedStats);

  return {
    player: updatedPlayer,
    stats: updatedStats,
    levelsGained,
    leveledUp: levelsGained > 0,
    rankedUp,
    newRank: rankedUp ? newRank : null,
    newAchievements,
    newTitles,
    totalXpAwarded: xpAwarded,
  };
}

// Achievement check keys map to player counters or computed values
async function checkAndGrantAchievements(
  playerId: number,
  player: any,
  stats: any
): Promise<{ newAchievements: any[]; newTitles: any[] }> {
  const allAchievements = await db.select().from(achievementsTable);
  const unlocked = await db.select().from(playerAchievementsTable)
    .where(eq(playerAchievementsTable.playerId, playerId));
  const unlockedIds = new Set(unlocked.map(u => u.achievementId));

  const newAchievements: any[] = [];
  const newTitles: any[] = [];

  // Gather current stats for checking
  const totalWorkouts = player.totalWorkouts || 0;
  const totalPrs = player.totalPrs || 0;
  const totalQuests = player.totalQuests || 0;
  const streakDays = player.streakDays || 0;
  const gold = player.gold || 0;
  const level = player.level || 1;

  // Count skill nodes unlocked
  const [skillCount] = await db.select({ c: sql<number>`count(*)` })
    .from(playerSkillNodesTable)
    .where(eq(playerSkillNodesTable.playerId, playerId));

  const checkValues: Record<string, number> = {
    total_workouts: totalWorkouts,
    total_prs: totalPrs,
    total_quests: totalQuests,
    streak_days: streakDays,
    gold: gold,
    level: level,
    skills_unlocked: Number(skillCount?.c || 0),
  };

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;
    if (!achievement.checkKey || achievement.checkThreshold == null) continue;

    const currentVal = checkValues[achievement.checkKey] ?? 0;
    if (currentVal >= achievement.checkThreshold) {
      await db.insert(playerAchievementsTable).values({
        playerId,
        achievementId: achievement.id,
      });
      newAchievements.push(achievement);

      // Grant XP for achievement (don't recurse to avoid loops)
      if (achievement.xpReward > 0) {
        await db.insert(xpHistoryTable).values({
          playerId,
          amount: achievement.xpReward,
          source: `Achievement: ${achievement.name}`,
          category: "achievement",
          date: new Date().toISOString().split("T")[0],
        });
        await db.update(playerTable).set({
          xp: sql`${playerTable.xp} + ${achievement.xpReward}`,
          totalXpEarned: sql`${playerTable.totalXpEarned} + ${achievement.xpReward}`,
        }).where(eq(playerTable.id, playerId));
      }
    }
  }

  // Check rank-based title awards
  if (player.rank === "D") await grantTitleIfExists(playerId, "Rank D Hunter", newTitles);
  if (player.rank === "C") await grantTitleIfExists(playerId, "Shadow Walker", newTitles);
  if (player.rank === "B") await grantTitleIfExists(playerId, "Iron Gate Breaker", newTitles);
  if (player.rank === "A") await grantTitleIfExists(playerId, "A-Rank Sovereign", newTitles);
  if (player.rank === "S") await grantTitleIfExists(playerId, "Iron Sovereign", newTitles);
  if (player.rank === "National-Level") await grantTitleIfExists(playerId, "National-Level Hunter", newTitles);

  return { newAchievements, newTitles };
}

async function grantTitleIfExists(playerId: number, titleName: string, newTitles: any[]) {
  const [title] = await db.select().from(titlesTable).where(eq(titlesTable.name, titleName));
  if (!title) return;
  const existing = await db.select().from(playerTitlesTable)
    .where(and(eq(playerTitlesTable.playerId, playerId), eq(playerTitlesTable.titleId, title.id)));
  if (existing.length === 0) {
    await db.insert(playerTitlesTable).values({ playerId, titleId: title.id, equipped: false });
    newTitles.push(title);
  }
}

export async function getOrCreatePlayer(clerkId: string) {
  const existing = await db.select().from(playerTable)
    .where(eq(playerTable.clerkId, clerkId)).limit(1);
  if (existing.length > 0) {
    const player = existing[0];
    const stats = await db.select().from(playerStatsTable).where(eq(playerStatsTable.playerId, player.id)).limit(1);
    return { player, stats: stats[0] || null };
  }
  const [player] = await db.insert(playerTable).values({
    clerkId,
    name: "Hunter",
    level: 1,
    rank: "E",
    xp: 0,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    gold: 500,
    freeStatPoints: 0,
    streakDays: 0,
    activeTitle: "The Awakened",
    xpMultiplier: 100,
  }).returning();
  const [stats] = await db.insert(playerStatsTable).values({
    playerId: player.id,
    strength: 5, agility: 5, stamina: 5, vitality: 5, discipline: 5, sense: 5,
  }).returning();
  return { player, stats };
}

export async function updateStreak(playerId: number, activityDate: string) {
  const [player] = await db.select().from(playerTable).where(eq(playerTable.id, playerId));
  if (!player) return null;

  const last = player.lastActivityDate;
  const today = activityDate;
  const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split("T")[0];

  let newStreak = player.streakDays;
  if (last === yesterday) {
    newStreak = player.streakDays + 1;
  } else if (last === today) {
    newStreak = player.streakDays; // Already counted today
  } else if (!last || last < yesterday) {
    newStreak = 1; // Streak broken or first time
  }

  const newLongest = Math.max(newStreak, player.longestStreak);

  const [updated] = await db.update(playerTable).set({
    streakDays: newStreak,
    longestStreak: newLongest,
    lastActivityDate: today,
    updatedAt: new Date(),
  }).where(eq(playerTable.id, playerId)).returning();

  return updated;
}
