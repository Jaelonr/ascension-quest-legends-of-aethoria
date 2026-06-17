import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable, playerBiometricsTable, exerciseCategoryEnum } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();

// GET /exercises — list all with optional search
router.get("/exercises", async (req, res) => {
  const { q } = req.query as { q?: string };
  let rows;
  if (q && q.trim()) {
    rows = await db.select().from(exercisesTable)
      .where(or(
        ilike(exercisesTable.name, `%${q}%`),
        ilike(exercisesTable.muscleGroup, `%${q}%`)
      ))
      .orderBy(exercisesTable.name);
  } else {
    rows = await db.select().from(exercisesTable).orderBy(exercisesTable.name);
  }
  res.json(rows.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

// POST /exercises/search-ai — call OpenAI to find an exercise, save it if new
router.post("/exercises/search-ai", async (req, res) => {
  const { query } = req.body as { query: string };
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  // Check if we already have it locally first
  const existing = await db.select().from(exercisesTable)
    .where(ilike(exercisesTable.name, `%${query.trim()}%`));
  if (existing.length > 0) {
    return res.json({ source: "database", exercises: existing.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })) });
  }

  // Load player biometrics for weight context
  const { player } = await getOrCreatePlayer(req.userId);
  const [bio] = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id));

  try {
    // Lazy import so the server doesn't crash if env vars are missing
    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const validCategories = ["barbell", "dumbbell", "machine", "bodyweight", "cable", "cardio", "martial_arts"];

    const prompt = `You are a fitness expert. The user is searching for the exercise: "${query}".

Return a JSON array of 1-3 exercises that match this search. For each exercise provide:
- name: string (official exercise name)
- muscleGroup: string (primary muscle group, e.g. "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Glutes", "Hamstrings")
- category: one of exactly: barbell, dumbbell, machine, bodyweight, cable, cardio, martial_arts
- instructions: string (2-3 sentences on how to perform the exercise safely)
- difficulty: "beginner" | "intermediate" | "advanced"
- equipmentNeeded: string[] (list of equipment names needed, empty array for bodyweight)
${bio?.squat1rm || bio?.bench1rm || bio?.deadlift1rm ? `
The user's 1RM maxes: squat=${bio?.squat1rm ?? "?"}kg, bench=${bio?.bench1rm ?? "?"}kg, deadlift=${bio?.deadlift1rm ?? "?"}kg, OHP=${bio?.ohp1rm ?? "?"}kg.
Also include: recommendedWeightKg: number | null (the working weight in kg for this user at RPE 7-8, null if bodyweight)` : ""}

Respond with ONLY valid JSON array, no markdown, no extra text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Array<{
      name: string;
      muscleGroup: string;
      category: string;
      instructions: string;
      equipmentNeeded: string[];
      recommendedWeightKg?: number | null;
    }>;

    // Save each exercise to DB if not already present, collect results
    const saved = [];
    for (const ex of parsed) {
      const cat = validCategories.includes(ex.category) ? ex.category as typeof exerciseCategoryEnum.enumValues[number] : "bodyweight";

      // Check exact name match to avoid dupes
      const [dupe] = await db.select().from(exercisesTable)
        .where(ilike(exercisesTable.name, ex.name));
      if (dupe) {
        saved.push({ ...dupe, recommendedWeightKg: ex.recommendedWeightKg ?? null, source: "existing", createdAt: dupe.createdAt.toISOString() });
        continue;
      }

      const [inserted] = await db.insert(exercisesTable).values({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        category: cat,
        instructions: ex.instructions,
        equipmentIds: [],
      }).returning();

      saved.push({ ...inserted, recommendedWeightKg: ex.recommendedWeightKg ?? null, source: "ai", createdAt: inserted.createdAt.toISOString() });
    }

    return res.json({ source: "ai", exercises: saved });
  } catch (err) {
    req.log.error(err, "AI exercise search failed");
    return res.status(502).json({ error: "AI lookup failed. Check your exercise name or try again." });
  }
});

export default router;
