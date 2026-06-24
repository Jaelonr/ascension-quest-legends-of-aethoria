import { Router } from "express";
import { db } from "@workspace/db";
import {
  playerTable, playerStatsTable, titlesTable, playerTitlesTable,
  achievementsTable, playerAchievementsTable, equipmentTable,
  playerInventoryTable, storeItemsTable, dailyLoginsTable,
  playerBiometricsTable, nutritionTargetsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  getOrCreatePlayer, buildPlayerResponse, xpForLevel, rankForLevel, applyXpEvent, getClassXpMultiplier
} from "../progression";

const router = Router();

export { getOrCreatePlayer, buildPlayerResponse, xpForLevel, rankForLevel };

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

function calcSetupTargets(params: {
  sex: "male" | "female" | "other";
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  weightGoal: string;
}) {
  const { sex, ageYears, heightCm, weightKg, activityLevel, weightGoal } = params;
  const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  const bmr = sex === "male" ? maleBmr : sex === "female" ? femaleBmr : (maleBmr + femaleBmr) / 2;
  const calories = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55) + (GOAL_ADJUSTMENTS[weightGoal] ?? 0));
  const protein = Math.round(weightKg * 2.2 / 5) * 5;
  const fat = Math.round((calories * 0.25) / 9 / 5) * 5;
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4 / 5) * 5;
  return { calories, protein: Math.max(protein, 80), carbs: Math.max(carbs, 50), fat: Math.max(fat, 30) };
}

router.get("/player", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer(req.userId);
    res.json(buildPlayerResponse(player, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get player" });
  }
});

router.patch("/player", async (req, res) => {
  try {
    const { name } = req.body;
    const { player, stats } = await getOrCreatePlayer(req.userId);
    const [updated] = await db.update(playerTable)
      .set({ name: name || player.name, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();
    res.json(buildPlayerResponse(updated, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update player" });
  }
});

router.post("/player/setup", async (req, res) => {
  try {
    const { name, statBonuses, equipmentIds, baseClass, systemScan } = req.body as {
      name: string;
      statBonuses: { strength: number; agility: number; stamina: number; vitality: number; discipline: number; sense: number };
      equipmentIds: number[];
      baseClass?: string;
      systemScan?: {
        ageYears?: number;
        sex?: "male" | "female" | "other";
        heightCm?: number | null;
        weightKg?: number | null;
        activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
        weightGoal?: "lose" | "maintain" | "gain";
        equipmentTypes?: string[];
      };
    };
    const { player, stats } = await getOrCreatePlayer(req.userId);
    if (!stats) return void res.status(400).json({ error: "Player stats not found" });

    // Update name + class + mark setup complete
    await db.update(playerTable)
      .set({ name: name?.trim() || player.name, baseClass: baseClass ?? player.baseClass, setupCompleted: true, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id));

    // Add stat bonuses directly (bypasses freeStatPoints — this is a one-time setup grant)
    const str = statBonuses?.strength || 0;
    const agi = statBonuses?.agility || 0;
    const sta = statBonuses?.stamina || 0;
    const vit = statBonuses?.vitality || 0;
    const dis = statBonuses?.discipline || 0;
    const sen = statBonuses?.sense || 0;

    const [updatedStats] = await db.update(playerStatsTable).set({
      strength: stats.strength + str,
      agility: stats.agility + agi,
      stamina: stats.stamina + sta,
      vitality: stats.vitality + vit,
      discipline: stats.discipline + dis,
      sense: stats.sense + sen,
      updatedAt: new Date(),
    }).where(eq(playerStatsTable.playerId, player.id)).returning();

    const newMaxHp = 100 + (updatedStats.vitality - 5) * 10 + player.level * 5;
    await db.update(playerTable).set({
      maxHp: newMaxHp,
      hp: Math.min(player.hp, newMaxHp),
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id));

    // Unlock selected equipment
    if (Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      for (const id of equipmentIds) {
        await db.update(equipmentTable)
          .set({ owned: true })
          .where(eq(equipmentTable.id, id));
      }
    }

    if (systemScan) {
      const heightCm = typeof systemScan.heightCm === "number" && systemScan.heightCm > 0 ? systemScan.heightCm : null;
      const weightKg = typeof systemScan.weightKg === "number" && systemScan.weightKg > 0 ? systemScan.weightKg : null;
      const equipmentTypes = Array.isArray(systemScan.equipmentTypes) ? systemScan.equipmentTypes : [];

      const existingBio = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id)).limit(1);
      const bioData = {
        heightCm,
        weightKg,
        bodyFatPct: null,
        squat1rm: null,
        bench1rm: null,
        deadlift1rm: null,
        ohp1rm: null,
        row1rm: null,
        equipmentTypes,
        notes: "Recorded during initial System scan.",
        updatedAt: new Date(),
      };
      if (existingBio.length === 0) {
        await db.insert(playerBiometricsTable).values({ playerId: player.id, ...bioData });
      } else {
        await db.update(playerBiometricsTable).set(bioData).where(eq(playerBiometricsTable.playerId, player.id));
      }

      if (systemScan.sex && systemScan.ageYears && systemScan.activityLevel && systemScan.weightGoal) {
        const targetSex = systemScan.sex === "other" ? null : systemScan.sex;
        const calc = heightCm && weightKg
          ? calcSetupTargets({
              sex: systemScan.sex,
              ageYears: systemScan.ageYears,
              heightCm,
              weightKg,
              activityLevel: systemScan.activityLevel,
              weightGoal: systemScan.weightGoal,
            })
          : { calories: 2500, protein: 180, carbs: 250, fat: 80 };

        const targetData = {
          ...calc,
          sex: targetSex,
          ageYears: systemScan.ageYears,
          activityLevel: systemScan.activityLevel,
          weightGoal: systemScan.weightGoal,
          autoCalc: Boolean(heightCm && weightKg),
          updatedAt: new Date(),
        };
        const existingTargets = await db.select().from(nutritionTargetsTable).where(eq(nutritionTargetsTable.playerId, player.id)).limit(1);
        if (existingTargets.length === 0) {
          await db.insert(nutritionTargetsTable).values({ playerId: player.id, ...targetData });
        } else {
          await db.update(nutritionTargetsTable).set(targetData).where(eq(nutritionTargetsTable.playerId, player.id));
        }
      }
    }

    const { player: finalPlayer, stats: finalStats } = await getOrCreatePlayer(req.userId);
    res.json(buildPlayerResponse(finalPlayer, finalStats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to setup player" });
  }
});

router.post("/player/allocate-stats", async (req, res) => {
  try {
    const { allocations } = req.body;
    const { player, stats } = await getOrCreatePlayer(req.userId);
    if (!stats) return void res.status(400).json({ error: "Player stats not found" });

    const total = Object.values(allocations as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    if (total > player.freeStatPoints) {
      return void res.status(400).json({ error: "Not enough free stat points" });
    }

    const [updatedStats] = await db.update(playerStatsTable).set({
      strength: stats.strength + (allocations.strength || 0),
      agility: stats.agility + (allocations.agility || 0),
      stamina: stats.stamina + (allocations.stamina || 0),
      vitality: stats.vitality + (allocations.vitality || 0),
      discipline: stats.discipline + (allocations.discipline || 0),
      sense: stats.sense + (allocations.sense || 0),
      updatedAt: new Date(),
    }).where(eq(playerStatsTable.playerId, player.id)).returning();

    // Recalculate maxHp/maxMp
    const newMaxHp = 100 + (updatedStats.vitality - 5) * 10 + player.level * 5;
    const newMaxMp = 100 + player.level * 3;

    const [updatedPlayer] = await db.update(playerTable).set({
      freeStatPoints: player.freeStatPoints - total,
      maxHp: newMaxHp,
      hp: Math.min(player.hp, newMaxHp),
      maxMp: newMaxMp,
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id)).returning();

    res.json(buildPlayerResponse(updatedPlayer, updatedStats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to allocate stats" });
  }
});

router.get("/player/titles", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const earned = await db.select({
      id: titlesTable.id,
      name: titlesTable.name,
      description: titlesTable.description,
      rarity: titlesTable.rarity,
      equipped: playerTitlesTable.equipped,
      earnedAt: playerTitlesTable.earnedAt,
    })
    .from(playerTitlesTable)
    .innerJoin(titlesTable, eq(playerTitlesTable.titleId, titlesTable.id))
    .where(eq(playerTitlesTable.playerId, player.id));
    res.json(earned.map(t => ({ ...t, earnedAt: t.earnedAt?.toISOString?.() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get titles" });
  }
});

router.post("/player/titles/:id/equip", async (req, res) => {
  try {
    const titleId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer(req.userId);

    await db.update(playerTitlesTable).set({ equipped: false })
      .where(eq(playerTitlesTable.playerId, player.id));
    await db.update(playerTitlesTable).set({ equipped: true })
      .where(and(eq(playerTitlesTable.playerId, player.id), eq(playerTitlesTable.titleId, titleId)));

    const [title] = await db.select().from(titlesTable).where(eq(titlesTable.id, titleId));
    const [updatedPlayer] = await db.update(playerTable)
      .set({ activeTitle: title?.name || null, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id)).returning();

    res.json(buildPlayerResponse(updatedPlayer, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to equip title" });
  }
});

router.get("/player/achievements", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const all = await db.select().from(achievementsTable);
    const unlocked = await db.select().from(playerAchievementsTable)
      .where(eq(playerAchievementsTable.playerId, player.id));
    const unlockedIds = new Set(unlocked.map(u => u.achievementId));

    res.json(all.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      xpReward: a.xpReward,
      checkKey: a.checkKey,
      checkThreshold: a.checkThreshold,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: unlocked.find(u => u.achievementId === a.id)?.unlockedAt?.toISOString() || null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get achievements" });
  }
});

router.post("/player/grant-xp", async (req, res) => {
  try {
    const { amount, source, category } = req.body;
    const { player } = await getOrCreatePlayer(req.userId);
    const result = await applyXpEvent(
      player.id, amount, source, category || "general",
      new Date().toISOString().split("T")[0]
    );
    res.json({
      ...result,
      player: buildPlayerResponse(result.player, result.stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to grant XP" });
  }
});

router.post("/player/prestige", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer(req.userId);
    if (player.level < 100) {
      return void res.status(400).json({ error: "Must be Level 100 (Diamond Grade) to prestige" });
    }

    // Reset level to 1, keep some earned bonuses, increment prestige
    const newPrestigeLevel = (player.prestigeLevel || 0) + 1;
    const xpBonus = Math.min(150, 100 + newPrestigeLevel * 10); // Up to 150% XP at prestige 5

    const [updatedPlayer] = await db.update(playerTable).set({
      level: 1,
      rank: "E",
      xp: 0,
      freeStatPoints: 10,
      prestigeLevel: newPrestigeLevel,
      prestigeCount: (player.prestigeCount || 0) + 1,
      xpMultiplier: xpBonus,
      maxHp: 150 + newPrestigeLevel * 25,
      hp: 150 + newPrestigeLevel * 25,
      maxMp: 120 + newPrestigeLevel * 15,
      mp: 120 + newPrestigeLevel * 15,
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id)).returning();

    // Stats reset to prestige bonus baseline
    const prestigeBase = 5 + newPrestigeLevel * 3;
    const [updatedStats] = await db.update(playerStatsTable).set({
      strength: prestigeBase,
      agility: prestigeBase,
      stamina: prestigeBase,
      vitality: prestigeBase,
      discipline: prestigeBase,
      sense: prestigeBase,
      updatedAt: new Date(),
    }).where(eq(playerStatsTable.playerId, player.id)).returning();

    res.json({
      message: `Prestige ${newPrestigeLevel} achieved! XP gain now ${xpBonus}%.`,
      prestigeLevel: newPrestigeLevel,
      xpMultiplier: xpBonus,
      player: buildPlayerResponse(updatedPlayer, updatedStats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to prestige" });
  }
});

router.post("/player/change-class", async (req, res) => {
  try {
    const COST = 5000;
    const { baseClass } = req.body as { baseClass?: string };
    const { player, stats } = await getOrCreatePlayer(req.userId);
    if (player.gold < COST) {
      return void res.status(400).json({ error: `Not enough gold. Class change costs ${COST.toLocaleString()} gold.` });
    }
    const [updated] = await db.update(playerTable)
      .set({ gold: player.gold - COST, baseClass: baseClass ?? player.baseClass, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();
    res.json({ success: true, player: buildPlayerResponse(updated, stats), goldSpent: COST });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to change class" });
  }
});

router.post("/player/respec", async (req, res) => {
  try {
    const { method } = req.body as { method: "gold" | "scroll" };
    const GOLD_COST = 2500;
    const { player, stats } = await getOrCreatePlayer(req.userId);

    if (method === "scroll") {
      const scrolls = await db.select({ inv: playerInventoryTable, store: storeItemsTable })
        .from(playerInventoryTable)
        .innerJoin(storeItemsTable, eq(playerInventoryTable.itemId, storeItemsTable.id))
        .where(and(
          eq(playerInventoryTable.playerId, player.id),
          eq(storeItemsTable.name, "Respec Scroll"),
        ));
      if (scrolls.length === 0) {
        return void res.status(400).json({ error: "No Respec Scroll in inventory" });
      }
      const scroll = scrolls[0];
      if (scroll.inv.quantity <= 1) {
        await db.delete(playerInventoryTable).where(eq(playerInventoryTable.id, scroll.inv.id));
      } else {
        await db.update(playerInventoryTable)
          .set({ quantity: scroll.inv.quantity - 1 })
          .where(eq(playerInventoryTable.id, scroll.inv.id));
      }
    } else {
      if (player.gold < GOLD_COST) {
        return void res.status(400).json({ error: `Not enough gold. Respec costs ${GOLD_COST.toLocaleString()} gold.` });
      }
      await db.update(playerTable)
        .set({ gold: player.gold - GOLD_COST, updatedAt: new Date() })
        .where(eq(playerTable.id, player.id));
    }

    const BASE = 5;
    const invested =
      Math.max(0, stats.strength - BASE) +
      Math.max(0, stats.agility - BASE) +
      Math.max(0, stats.stamina - BASE) +
      Math.max(0, stats.vitality - BASE) +
      Math.max(0, stats.discipline - BASE) +
      Math.max(0, stats.sense - BASE);

    const [updatedStats] = await db.update(playerStatsTable)
      .set({ strength: BASE, agility: BASE, stamina: BASE, vitality: BASE, discipline: BASE, sense: BASE, updatedAt: new Date() })
      .where(eq(playerStatsTable.playerId, player.id))
      .returning();

    const newMaxHp = 100 + player.level * 5;
    const [updatedPlayer] = await db.update(playerTable)
      .set({
        freeStatPoints: player.freeStatPoints + invested,
        maxHp: newMaxHp,
        hp: Math.min(player.hp, newMaxHp),
        updatedAt: new Date(),
      })
      .where(eq(playerTable.id, player.id))
      .returning();

    res.json({ success: true, player: buildPlayerResponse(updatedPlayer, updatedStats), pointsReturned: invested });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to respec" });
  }
});

router.post("/player/reset", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);

    // Reset player to default values
    await db.update(playerTable).set({
      name: "Adventurer",
      level: 1,
      rank: "E",
      xp: 0,
      gold: 500,
      hp: 100,
      maxHp: 100,
      freeStatPoints: 0,
      xpMultiplier: 100,
      baseClass: null,
      activeTitle: null,
      setupCompleted: false,
      updatedAt: new Date(),
    }).where(eq(playerTable.id, player.id));

    // Reset stats to base 5s
    await db.update(playerStatsTable).set({
      strength: 5, agility: 5, stamina: 5,
      vitality: 5, discipline: 5, sense: 5,
      updatedAt: new Date(),
    }).where(eq(playerStatsTable.playerId, player.id));

    // Clear inventory
    await db.delete(playerInventoryTable).where(eq(playerInventoryTable.playerId, player.id));

    // Reset equipment to unowned
    await db.update(equipmentTable).set({ owned: false });

    // Clear achievements and titles
    await db.delete(playerAchievementsTable).where(eq(playerAchievementsTable.playerId, player.id));
    await db.delete(playerTitlesTable).where(eq(playerTitlesTable.playerId, player.id));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reset player" });
  }
});

// ── Daily Login Reward ─────────────────────────────────────────────────────

const DAILY_REWARDS: Array<{ day: number; type: string; amount: number; label: string }> = [
  { day: 1,  type: "gold", amount: 50,   label: "50 Gold" },
  { day: 2,  type: "xp",   amount: 100,  label: "100 XP" },
  { day: 3,  type: "gold", amount: 150,  label: "150 Gold" },
  { day: 4,  type: "xp",   amount: 200,  label: "200 XP" },
  { day: 5,  type: "gold", amount: 250,  label: "250 Gold" },
  { day: 6,  type: "xp",   amount: 300,  label: "300 XP" },
  { day: 7,  type: "gold", amount: 700,  label: "700 Gold (Week Bonus!)" },
  { day: 14, type: "xp",   amount: 1000, label: "1,000 XP (2-Week Bonus!)" },
  { day: 30, type: "gold", amount: 3000, label: "3,000 Gold (Monthly Bonus!)" },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getRewardForDay(streakDay: number) {
  const milestones = [30, 14, 7];
  for (const m of milestones) {
    if (streakDay % m === 0) {
      return DAILY_REWARDS.find(r => r.day === m) ?? DAILY_REWARDS[(streakDay - 1) % 7];
    }
  }
  return DAILY_REWARDS[(streakDay - 1) % 7];
}

router.get("/player/daily-reward", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const today = getTodayDate();
    const alreadyClaimed = player.lastLoginDate === today;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakBroken = player.lastLoginDate && player.lastLoginDate < yesterday;
    const currentStreak = streakBroken ? 0 : (player.loginStreak ?? 0);
    const nextStreakDay = currentStreak + 1;
    const reward = getRewardForDay(nextStreakDay);

    // Build a 7-day calendar preview
    const calendar = Array.from({ length: 7 }, (_, i) => {
      const day = (currentStreak % 7) + i + 1;
      const r = DAILY_REWARDS[(day - 1) % 7];
      return { day, reward: r, claimed: i < (currentStreak % 7), isToday: i === (currentStreak % 7) };
    });

    res.json({
      alreadyClaimed,
      currentStreak,
      nextStreakDay,
      reward,
      calendar,
      lastClaimedDate: player.lastLoginDate ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get daily reward status" });
  }
});

router.post("/player/daily-reward/claim", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const today = getTodayDate();

    if (player.lastLoginDate === today) {
      res.status(400).json({ error: "Already claimed today" });
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakBroken = player.lastLoginDate && player.lastLoginDate < yesterday;
    const newStreak = streakBroken ? 1 : (player.loginStreak ?? 0) + 1;
    const reward = getRewardForDay(newStreak);

    const updates: Record<string, any> = { lastLoginDate: today, loginStreak: newStreak };
    if (reward.type === "gold") {
      updates.gold = (player.gold ?? 0) + reward.amount;
    }

    await db.update(playerTable).set(updates).where(eq(playerTable.id, player.id));

    if (reward.type === "xp") {
      await applyXpEvent(player.id, reward.amount, "daily_login", "general", today);
    }

    await db.insert(dailyLoginsTable).values({
      playerId: player.id,
      claimedDate: today,
      streakDay: newStreak,
      rewardType: reward.type,
      rewardAmount: reward.amount,
      rewardLabel: reward.label,
    });

    res.json({
      success: true,
      streakDay: newStreak,
      rewardType: reward.type,
      rewardAmount: reward.amount,
      rewardLabel: reward.label,
      isMilestone: [7, 14, 30].includes(newStreak % 30 === 0 ? 30 : newStreak),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

export default router;
