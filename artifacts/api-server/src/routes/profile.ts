import { Router } from "express";
import { db } from "@workspace/db";
import { playerBiometricsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();

// GET /profile/biometrics
router.get("/profile/biometrics", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const rows = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id));
    if (rows.length === 0) {
      // Return empty biometrics object
      return void res.json({
        heightCm: null,
        weightKg: null,
        bodyFatPct: null,
        squat1rm: null,
        bench1rm: null,
        deadlift1rm: null,
        ohp1rm: null,
        row1rm: null,
        equipmentTypes: [],
        notes: null,
      });
    }
    const b = rows[0]!;
    return void res.json({
      heightCm: b.heightCm,
      weightKg: b.weightKg,
      bodyFatPct: b.bodyFatPct,
      squat1rm: b.squat1rm,
      bench1rm: b.bench1rm,
      deadlift1rm: b.deadlift1rm,
      ohp1rm: b.ohp1rm,
      row1rm: b.row1rm,
      equipmentTypes: b.equipmentTypes ?? [],
      notes: b.notes,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch biometrics" });
  }
});

// PUT /profile/biometrics
router.put("/profile/biometrics", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const {
      heightCm,
      weightKg,
      bodyFatPct,
      squat1rm,
      bench1rm,
      deadlift1rm,
      ohp1rm,
      row1rm,
      equipmentTypes,
      notes,
    } = req.body as {
      heightCm?: number | null;
      weightKg?: number | null;
      bodyFatPct?: number | null;
      squat1rm?: number | null;
      bench1rm?: number | null;
      deadlift1rm?: number | null;
      ohp1rm?: number | null;
      row1rm?: number | null;
      equipmentTypes?: string[];
      notes?: string | null;
    };

    const existing = await db.select().from(playerBiometricsTable).where(eq(playerBiometricsTable.playerId, player.id));

    const data = {
      heightCm: heightCm ?? null,
      weightKg: weightKg ?? null,
      bodyFatPct: bodyFatPct ?? null,
      squat1rm: squat1rm ?? null,
      bench1rm: bench1rm ?? null,
      deadlift1rm: deadlift1rm ?? null,
      ohp1rm: ohp1rm ?? null,
      row1rm: row1rm ?? null,
      equipmentTypes: equipmentTypes ?? [],
      notes: notes ?? null,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const [row] = await db.insert(playerBiometricsTable).values({ playerId: player.id, ...data }).returning();
      return void res.json(row);
    } else {
      const [row] = await db.update(playerBiometricsTable)
        .set(data)
        .where(eq(playerBiometricsTable.playerId, player.id))
        .returning();
      return void res.json(row);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update biometrics" });
  }
});

export default router;
