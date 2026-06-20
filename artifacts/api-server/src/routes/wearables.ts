import { Router } from "express";
import { db } from "@workspace/db";
import { healthImportsTable, wearableEntriesTable } from "@workspace/db";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
const router = Router();

const VALID_SOURCES = ["manual", "apple_health", "health_connect", "fitbit", "garmin", "samsung_health"] as const;
type WearableSource = typeof VALID_SOURCES[number];

interface WearableInput {
  date: string;
  steps?: number | null;
  sleepHours?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  caloriesBurned?: number | null;
  activeMinutes?: number | null;
  weight?: number | null;
  source?: WearableSource;
  notes?: string | null;
}

interface HealthImportInput {
  externalId: string;
  recordedAt: string;
  steps?: number | null;
  sleepHours?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  caloriesBurned?: number | null;
  activeMinutes?: number | null;
  weight?: number | null;
}

function validateWearableInput(body: unknown): { data: WearableInput; error: null } | { data: null; error: string } {
  if (!body || typeof body !== "object") return { data: null, error: "Invalid body" };
  const b = body as Record<string, unknown>;
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return { data: null, error: "date must be YYYY-MM-DD" };
  const source: WearableSource = (VALID_SOURCES as readonly string[]).includes(String(b.source ?? "")) ? b.source as WearableSource : "manual";
  const optNum = (v: unknown, min: number, max: number) => {
    if (v == null) return null;
    const n = Number(v);
    if (isNaN(n) || n < min || n > max) return null;
    return n;
  };
  return {
    data: {
      date: b.date,
      steps: optNum(b.steps, 0, 100000),
      sleepHours: optNum(b.sleepHours, 0, 24),
      hrv: optNum(b.hrv, 0, 300),
      restingHr: optNum(b.restingHr, 20, 250),
      caloriesBurned: optNum(b.caloriesBurned, 0, 10000),
      activeMinutes: optNum(b.activeMinutes, 0, 1440),
      weight: optNum(b.weight, 20, 500),
      source,
      notes: typeof b.notes === "string" ? b.notes.slice(0, 500) : null,
    },
    error: null,
  };
}

// GET /api/wearables — list entries (optional ?days=N)
router.get("/wearables", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const days = Math.min(parseInt(String(req.query.days ?? "30")), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const entries = await db.select().from(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, player.id), gte(wearableEntriesTable.date, sinceStr)))
      .orderBy(desc(wearableEntriesTable.date));

    res.json(entries);
  } catch (err) {
    req.log.error(err, "wearables list error");
    res.status(500).json({ error: "Failed to load wearable data" });
  }
});

// POST /api/wearables — upsert entry for a date
router.post("/wearables", async (req, res) => {
  const parsed = validateWearableInput(req.body);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const data = parsed.data!;

    // Check for existing entry on that date
    const [existing] = await db.select({ id: wearableEntriesTable.id })
      .from(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, player.id), eq(wearableEntriesTable.date, data.date)))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(wearableEntriesTable)
        .set({
          steps: data.steps ?? undefined,
          sleepHours: data.sleepHours ?? undefined,
          hrv: data.hrv ?? undefined,
          restingHr: data.restingHr ?? undefined,
          caloriesBurned: data.caloriesBurned ?? undefined,
          activeMinutes: data.activeMinutes ?? undefined,
          weight: data.weight ?? undefined,
          source: data.source,
          notes: data.notes ?? undefined,
        })
        .where(and(eq(wearableEntriesTable.id, existing.id)))
        .returning();
      res.json(updated);
      return;
    }

    const [created] = await db.insert(wearableEntriesTable).values({
      playerId: player.id,
      date: data.date,
      steps: data.steps ?? null,
      sleepHours: data.sleepHours ?? null,
      hrv: data.hrv ?? null,
      restingHr: data.restingHr ?? null,
      caloriesBurned: data.caloriesBurned ?? null,
      activeMinutes: data.activeMinutes ?? null,
      weight: data.weight ?? null,
      source: data.source,
      notes: data.notes ?? null,
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error(err, "wearables create error");
    res.status(500).json({ error: "Failed to save wearable entry" });
  }
});

// GET /api/wearables/today — today's entry
router.get("/wearables/today", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const today = new Date().toISOString().split("T")[0];

    const [entry] = await db.select().from(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, player.id), eq(wearableEntriesTable.date, today)))
      .limit(1);

    res.json(entry ?? null);
  } catch (err) {
    req.log.error(err, "wearables today error");
    res.status(500).json({ error: "Failed to load today's entry" });
  }
});

// GET /api/wearables/summary — 7-day averages
router.get("/wearables/summary", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split("T")[0];

    const entries = await db.select().from(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, player.id), gte(wearableEntriesTable.date, sinceStr)))
      .orderBy(asc(wearableEntriesTable.date));

    const withSteps = entries.filter(e => e.steps != null);
    const withSleep = entries.filter(e => e.sleepHours != null);
    const withHrv = entries.filter(e => e.hrv != null);
    const withRhr = entries.filter(e => e.restingHr != null);

    res.json({
      days: entries.length,
      avgSteps: withSteps.length > 0 ? Math.round(withSteps.reduce((s, e) => s + (e.steps ?? 0), 0) / withSteps.length) : null,
      avgSleepHours: withSleep.length > 0 ? +(withSleep.reduce((s, e) => s + (e.sleepHours ?? 0), 0) / withSleep.length).toFixed(1) : null,
      avgHrv: withHrv.length > 0 ? +(withHrv.reduce((s, e) => s + (e.hrv ?? 0), 0) / withHrv.length).toFixed(1) : null,
      avgRestingHr: withRhr.length > 0 ? Math.round(withRhr.reduce((s, e) => s + (e.restingHr ?? 0), 0) / withRhr.length) : null,
      entries,
    });
  } catch (err) {
    req.log.error(err, "wearables summary error");
    res.status(500).json({ error: "Failed to load summary" });
  }
});

// POST /api/health/import — normalized, idempotent Apple Health / Health Connect batch import
router.post("/health/import", async (req, res) => {
  const source = String(req.body?.source ?? "");
  const events = Array.isArray(req.body?.events) ? req.body.events as HealthImportInput[] : [];
  if (!(["apple_health", "health_connect"] as const).includes(source as "apple_health" | "health_connect")) {
    return void res.status(400).json({ error: "source must be apple_health or health_connect" });
  }
  if (events.length === 0 || events.length > 500) {
    return void res.status(400).json({ error: "events must contain between 1 and 500 records" });
  }
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    let imported = 0;
    let duplicates = 0;
    await db.transaction(async (tx) => {
      for (const event of events) {
        if (!event.externalId || !event.recordedAt || Number.isNaN(Date.parse(event.recordedAt))) {
          throw new Error("Each event requires externalId and a valid recordedAt timestamp");
        }
        const recordedAt = new Date(event.recordedAt);
        const [receipt] = await tx.insert(healthImportsTable).values({
          playerId: player.id,
          source,
          externalId: event.externalId.slice(0, 200),
          recordedAt,
          payload: event as unknown as Record<string, unknown>,
        }).onConflictDoNothing().returning();
        if (!receipt) {
          duplicates += 1;
          continue;
        }
        imported += 1;
        const date = recordedAt.toISOString().slice(0, 10);
        const [existing] = await tx.select().from(wearableEntriesTable).where(and(
          eq(wearableEntriesTable.playerId, player.id),
          eq(wearableEntriesTable.date, date),
        )).limit(1);
        const add = (current: number | null, value: number | null | undefined, max: number) =>
          value == null ? current : Math.min(max, (current ?? 0) + Math.max(0, Number(value)));
        const values = {
          steps: add(existing?.steps ?? null, event.steps, 100000),
          sleepHours: add(existing?.sleepHours ?? null, event.sleepHours, 24),
          caloriesBurned: add(existing?.caloriesBurned ?? null, event.caloriesBurned, 10000),
          activeMinutes: add(existing?.activeMinutes ?? null, event.activeMinutes, 1440),
          hrv: event.hrv ?? existing?.hrv ?? null,
          restingHr: event.restingHr ?? existing?.restingHr ?? null,
          weight: event.weight ?? existing?.weight ?? null,
          source,
        };
        if (existing) {
          await tx.update(wearableEntriesTable).set(values).where(eq(wearableEntriesTable.id, existing.id));
        } else {
          await tx.insert(wearableEntriesTable).values({ playerId: player.id, date, ...values });
        }
      }
    });
    res.json({ source, imported, duplicates, total: events.length });
  } catch (error) {
    req.log.error(error, "health import error");
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import health data" });
  }
});

export default router;
