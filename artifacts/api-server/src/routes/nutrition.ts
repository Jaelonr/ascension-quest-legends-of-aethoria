import { Router } from "express";
import { db } from "@workspace/db";
import {
  nutritionLogsTable, nutritionTargetsTable, savedMealsTable, weightEntriesTable, playerBiometricsTable
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getOrCreatePlayer } from "./player";
import { searchFoodMacroDatabase, type FoodMacroItem } from "../data/food-macro-database";

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

function calcTargets(params: {
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
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55);
  const calories = Math.round(tdee + (GOAL_ADJUSTMENTS[weightGoal] ?? 0));
  const protein = Math.round(weightKg * 2.2 / 5) * 5;
  const fat = Math.round((calories * 0.25) / 9 / 5) * 5;
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4 / 5) * 5;
  return { calories, protein: Math.max(protein, 80), carbs: Math.max(carbs, 50), fat: Math.max(fat, 30) };
}

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function toFoodSearchResult(item: FoodMacroItem) {
  return {
    id: item.id,
    name: item.name,
    calories100g: item.calories100g,
    protein100g: item.protein100g,
    carbs100g: item.carbs100g,
    fat100g: item.fat100g,
    fiber100g: item.fiber100g ?? null,
    sugar100g: item.sugar100g ?? null,
    sodiumMg100g: item.sodiumMg100g ?? null,
    servingSize: item.servingSize,
    servingGrams: item.servingGrams,
    category: item.category,
    source: item.source,
  };
}

router.get("/nutrition/targets", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const targets = await db.select().from(nutritionTargetsTable)
      .where(eq(nutritionTargetsTable.playerId, player.id)).limit(1);
    if (targets.length === 0) {
      const [created] = await db.insert(nutritionTargetsTable)
        .values({ playerId: player.id, calories: 2500, protein: 180, carbs: 250, fat: 80 })
        .returning();
      return void res.json(created);
    }
    res.json(targets[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get targets" });
  }
});

router.patch("/nutrition/targets", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { calories, protein, carbs, fat, sex, ageYears, activityLevel, weightGoal } = req.body as {
      calories?: number; protein?: number; carbs?: number; fat?: number;
      sex?: "male" | "female" | "other"; ageYears?: number;
      activityLevel?: string; weightGoal?: string;
    };

    let resolvedCalories = calories;
    let resolvedProtein = protein;
    let resolvedCarbs = carbs;
    let resolvedFat = fat;
    let autoCalc = false;

    if (sex && ageYears && activityLevel && weightGoal) {
      const biometrics = await db.select().from(playerBiometricsTable)
        .where(eq(playerBiometricsTable.playerId, player.id)).limit(1);
      const bio = biometrics[0];
      if (bio?.heightCm && bio?.weightKg) {
        const calc = calcTargets({ sex, ageYears, heightCm: bio.heightCm, weightKg: bio.weightKg, activityLevel, weightGoal });
        resolvedCalories = calc.calories;
        resolvedProtein = calc.protein;
        resolvedCarbs = calc.carbs;
        resolvedFat = calc.fat;
        autoCalc = true;
      }
    }

    const existing = await db.select().from(nutritionTargetsTable)
      .where(eq(nutritionTargetsTable.playerId, player.id)).limit(1);

    const values = {
      ...(resolvedCalories !== undefined && { calories: resolvedCalories }),
      ...(resolvedProtein !== undefined && { protein: resolvedProtein }),
      ...(resolvedCarbs !== undefined && { carbs: resolvedCarbs }),
      ...(resolvedFat !== undefined && { fat: resolvedFat }),
      ...(sex !== undefined && { sex: sex === "other" ? null : sex }),
      ...(ageYears !== undefined && { ageYears }),
      ...(activityLevel !== undefined && { activityLevel: activityLevel as "sedentary" | "light" | "moderate" | "active" | "very_active" }),
      ...(weightGoal !== undefined && { weightGoal: weightGoal as "lose" | "maintain" | "gain" }),
      autoCalc,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const [created] = await db.insert(nutritionTargetsTable)
        .values({ playerId: player.id, calories: resolvedCalories ?? 2500, protein: resolvedProtein ?? 180, carbs: resolvedCarbs ?? 250, fat: resolvedFat ?? 80, ...values })
        .returning();
      return void res.json(created);
    }
    const [updated] = await db.update(nutritionTargetsTable)
      .set(values)
      .where(eq(nutritionTargetsTable.playerId, player.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update targets" });
  }
});

router.get("/nutrition/today", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const today = getTodayStr();
    const entries = await db.select().from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, today)))
      .orderBy(nutritionLogsTable.createdAt);

    const targets = await db.select().from(nutritionTargetsTable)
      .where(eq(nutritionTargetsTable.playerId, player.id)).limit(1);
    const t = targets[0] || { calories: 2500, protein: 180, carbs: 250, fat: 80 };

    const totals = entries.reduce((acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    res.json({
      date: today,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      targetCalories: t.calories,
      targetProtein: t.protein,
      targetCarbs: t.carbs,
      targetFat: t.fat,
      remainingCalories: t.calories - totals.calories,
      entries: entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get today nutrition" });
  }
});

router.get("/nutrition/logs", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const date = (req.query.date as string) || getTodayStr();
    const logs = await db.select().from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, date)))
      .orderBy(nutritionLogsTable.createdAt);
    res.json(logs.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get logs" });
  }
});

router.post("/nutrition/logs", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { date, mealName, calories, protein, carbs, fat, mealType, notes } = req.body;
    const [log] = await db.insert(nutritionLogsTable).values({
      playerId: player.id,
      date: date || getTodayStr(),
      mealName, calories, protein, carbs, fat,
      mealType: mealType || "snack",
      notes,
    }).returning();
    res.status(201).json({ ...log, createdAt: log.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to log meal" });
  }
});

router.patch("/nutrition/logs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { mealName, calories, protein, carbs, fat, mealType, notes } = req.body;
    const [updated] = await db.update(nutritionLogsTable)
      .set({ mealName, calories, protein, carbs, fat, mealType, notes })
      .where(eq(nutritionLogsTable.id, id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update log" });
  }
});

router.delete("/nutrition/logs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(nutritionLogsTable).where(eq(nutritionLogsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete log" });
  }
});

router.get("/nutrition/meals/saved", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const meals = await db.select().from(savedMealsTable)
      .where(eq(savedMealsTable.playerId, player.id));
    res.json(meals);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get saved meals" });
  }
});

router.post("/nutrition/meals/saved", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { name, calories, protein, carbs, fat, mealType } = req.body;
    const [meal] = await db.insert(savedMealsTable)
      .values({ playerId: player.id, name, calories, protein, carbs, fat, mealType })
      .returning();
    res.status(201).json(meal);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save meal" });
  }
});

router.delete("/nutrition/meals/saved/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(savedMealsTable).where(eq(savedMealsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete saved meal" });
  }
});

router.post("/nutrition/copy-yesterday", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const today = getTodayStr();

    const yesterdayLogs = await db.select().from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, player.id), eq(nutritionLogsTable.date, yesterdayStr)));

    if (yesterdayLogs.length === 0) {
      return void res.json({ copied: 0 });
    }

    const newLogs = yesterdayLogs.map(l => ({
      playerId: player.id,
      date: today,
      mealName: l.mealName,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      mealType: l.mealType,
      notes: l.notes,
    }));

    await db.insert(nutritionLogsTable).values(newLogs);
    res.json({ copied: newLogs.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to copy meals" });
  }
});

router.get("/nutrition/weekly-averages", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const allLogs = await db.select().from(nutritionLogsTable)
      .where(and(
        eq(nutritionLogsTable.playerId, player.id),
        gte(nutritionLogsTable.date, days[0]),
        lte(nutritionLogsTable.date, days[days.length - 1])
      ));

    const dailyData = days.map(date => {
      const dayLogs = allLogs.filter(l => l.date === date);
      return {
        date,
        calories: dayLogs.reduce((s, l) => s + l.calories, 0),
        protein: dayLogs.reduce((s, l) => s + l.protein, 0),
        carbs: dayLogs.reduce((s, l) => s + l.carbs, 0),
        fat: dayLogs.reduce((s, l) => s + l.fat, 0),
      };
    });

    const daysLogged = dailyData.filter(d => d.calories > 0).length;
    const divisor = daysLogged || 1;

    res.json({
      avgCalories: dailyData.reduce((s, d) => s + d.calories, 0) / divisor,
      avgProtein: dailyData.reduce((s, d) => s + d.protein, 0) / divisor,
      avgCarbs: dailyData.reduce((s, d) => s + d.carbs, 0) / divisor,
      avgFat: dailyData.reduce((s, d) => s + d.fat, 0) / divisor,
      daysLogged,
      dailyData,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get weekly averages" });
  }
});

router.get("/nutrition/weight", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const entries = await db.select().from(weightEntriesTable)
      .where(eq(weightEntriesTable.playerId, player.id))
      .orderBy(desc(weightEntriesTable.date));
    res.json(entries.map(e => ({ ...e, createdAt: e.createdAt?.toISOString?.() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get weight entries" });
  }
});

router.post("/nutrition/weight", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { weight, date, unit, notes } = req.body;
    const [entry] = await db.insert(weightEntriesTable)
      .values({ playerId: player.id, weight, date, unit: unit || "lbs", notes })
      .returning();
    res.status(201).json({ ...entry, createdAt: entry.createdAt?.toISOString?.() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to log weight" });
  }
});

// Food search proxy — Open Food Facts (no auth required)
router.get("/nutrition/food-search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) { res.json([]); return; }

    const localResults = searchFoodMacroDatabase(q, 16).map(toFoodSearchResult);

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=true&page_size=20&action=process&fields=id,product_name,brands,nutriments,serving_size,product_quantity`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!resp.ok) { res.json(localResults); return; }
    const data = await resp.json() as any;

    const results = (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .map((p: any) => ({
        id: p.id ?? p.code ?? "",
        name: [p.product_name, p.brands].filter(Boolean).join(" · "),
        calories100g: Math.round(p.nutriments["energy-kcal_100g"] ?? 0),
        protein100g:  Math.round((p.nutriments["proteins_100g"] ?? 0) * 10) / 10,
        carbs100g:    Math.round((p.nutriments["carbohydrates_100g"] ?? 0) * 10) / 10,
        fat100g:      Math.round((p.nutriments["fat_100g"] ?? 0) * 10) / 10,
        servingSize:  p.serving_size ?? null,
      }))
      .slice(0, 12);
    const seen = new Set<string>();
    const merged = [...localResults, ...results.map((item: any) => ({
      ...item,
      fiber100g: null,
      sugar100g: null,
      sodiumMg100g: null,
      servingGrams: null,
      category: "Packaged Food",
      source: "open_food_facts",
    }))]
      .filter(item => {
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 24);
    res.json(merged);
  } catch (err) {
    req.log.error(err, "food-search failed");
    const q = String(req.query.q ?? "").trim();
    res.json(q ? searchFoodMacroDatabase(q, 16).map(toFoodSearchResult) : []);
  }
});

export default router;
