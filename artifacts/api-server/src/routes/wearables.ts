import { Router } from "express";
import { db } from "@workspace/db";
import { guildMasterMemoriesTable, healthImportsTable, wearableEntriesTable, worldEventsTable } from "@workspace/db";
import { eq, and, gte, desc, asc, inArray } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
import { buildWearableSystemAnalysis } from "../wearable-interpretation";
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
  provider?: string | null;
  recordType?: string | null;
  steps?: number | null;
  sleepHours?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  caloriesBurned?: number | null;
  activeMinutes?: number | null;
  weight?: number | null;
}

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function recentWearableEntries(playerId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];
  return db.select().from(wearableEntriesTable)
    .where(and(eq(wearableEntriesTable.playerId, playerId), gte(wearableEntriesTable.date, sinceStr)))
    .orderBy(asc(wearableEntriesTable.date));
}

async function recordWearableMilestones(playerId: number, entries: Array<typeof wearableEntriesTable.$inferSelect>, source: string) {
  const latest = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return;
  const sourceLabel = latest.source === "samsung_health" ? "Samsung Health" : latest.source === "health_connect" ? "Health Connect" : source.replace(/_/g, " ");
  await db.insert(worldEventsTable).values({
    playerId,
    worldKey: `wearable:first-sync:${source}`,
    title: "First synced recovery record",
    description: `${sourceLabel} records reached the Guild ledger. Future commissions can now account for steps, rest, and recovery signals when available.`,
    status: "recorded",
    severity: "minor",
    reversible: true,
    metadata: { source, sourceLabel },
  }).onConflictDoNothing();

  if ((latest.steps ?? 0) >= 10000) {
    await db.insert(worldEventsTable).values({
      playerId,
      worldKey: `wearable:long-travel:${latest.date}`,
      title: "Long travel day recorded",
      description: `Your steps on ${latest.date} carried the expedition forward. The Guild counts the road, but does not pretend a continent was crossed on foot.`,
      status: "recorded",
      severity: "minor",
      reversible: true,
      metadata: { date: latest.date, steps: latest.steps, source: latest.source },
    }).onConflictDoNothing();
  }

  const poorSleep = entries.filter((entry) => entry.sleepHours != null && entry.sleepHours < 6);
  if (poorSleep.length >= 2) {
    await db.insert(guildMasterMemoriesTable).values({
      playerId,
      kind: "recovery",
      sourceKey: `wearable:poor-sleep:${poorSleep[poorSleep.length - 1].date}`,
      summary: "Recent synced records show repeated short sleep; Aldric should favor recovery-first counsel until the pattern improves.",
      importance: 2,
    }).onConflictDoNothing();
  }
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
    const today = isoDate();

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
    const entries = await recentWearableEntries(player.id, 7);

    const withSteps = entries.filter(e => e.steps != null);
    const withSleep = entries.filter(e => e.sleepHours != null);
    const withHrv = entries.filter(e => e.hrv != null);
    const withRhr = entries.filter(e => e.restingHr != null);

    const analysis = buildWearableSystemAnalysis(entries, isoDate());
    res.json({
      days: entries.length,
      avgSteps: withSteps.length > 0 ? Math.round(withSteps.reduce((s, e) => s + (e.steps ?? 0), 0) / withSteps.length) : null,
      avgSleepHours: withSleep.length > 0 ? +(withSleep.reduce((s, e) => s + (e.sleepHours ?? 0), 0) / withSleep.length).toFixed(1) : null,
      avgHrv: withHrv.length > 0 ? +(withHrv.reduce((s, e) => s + (e.hrv ?? 0), 0) / withHrv.length).toFixed(1) : null,
      avgRestingHr: withRhr.length > 0 ? Math.round(withRhr.reduce((s, e) => s + (e.restingHr ?? 0), 0) / withRhr.length) : null,
      lastSyncedAt: analysis.lastSyncedAt,
      readiness: analysis,
      entries,
    });
  } catch (err) {
    req.log.error(err, "wearables summary error");
    res.status(500).json({ error: "Failed to load summary" });
  }
});

router.get("/wearables/status", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const [entries, imports] = await Promise.all([
      recentWearableEntries(player.id, 30),
      db.select().from(healthImportsTable)
        .where(eq(healthImportsTable.playerId, player.id))
        .orderBy(desc(healthImportsTable.processedAt))
        .limit(100),
    ]);
    const analysis = buildWearableSystemAnalysis(entries, isoDate());
    const sources = [...new Set([
      ...entries.map((entry) => entry.source),
      ...imports.map((entry) => entry.source),
    ].filter(Boolean))];
    res.json({
      connected: imports.length > 0,
      sources,
      lastSyncedAt: imports[0]?.processedAt?.toISOString() ?? analysis.lastSyncedAt,
      importCount: imports.length,
      diagnostics: {
        healthConnect: {
          supported: true,
          status: sources.includes("health_connect") || sources.includes("samsung_health") ? "records_imported" : "permission_required_on_device",
          samsungPath: "Galaxy Watch -> Samsung Health -> Health Connect -> Ascension Quest",
        },
        appleHealth: { supported: false, status: "ios_build_required" },
        fitbit: { supported: false, status: "post_v1_direct_integration" },
        garmin: { supported: false, status: "post_v1_direct_integration" },
      },
      analysis,
    });
  } catch (err) {
    req.log.error(err, "wearables status error");
    res.status(500).json({ error: "Failed to load wearable status" });
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
  const samsungHealthEvents = events.filter((event) => event.provider === "samsung_health_via_health_connect").length;
  const healthConnectEvents = events.length - samsungHealthEvents;
  const recordTypes = events.reduce<Record<string, number>>((counts, event) => {
    const key = event.recordType ?? "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
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
        const keepBestSleep = (current: number | null, value: number | null | undefined) => {
          if (value == null) return current;
          const next = Math.min(14, Math.max(0, Number(value)));
          return Math.max(current ?? 0, next);
        };
        const mergeSource = (current: string | null | undefined) => {
          if (event.provider === "samsung_health_via_health_connect") return "samsung_health";
          if (current === "samsung_health") return current;
          return source;
        };
        const values = {
          steps: add(existing?.steps ?? null, event.steps, 100000),
          sleepHours: keepBestSleep(existing?.sleepHours ?? null, event.sleepHours),
          caloriesBurned: add(existing?.caloriesBurned ?? null, event.caloriesBurned, 10000),
          activeMinutes: add(existing?.activeMinutes ?? null, event.activeMinutes, 1440),
          hrv: event.hrv ?? existing?.hrv ?? null,
          restingHr: event.restingHr ?? existing?.restingHr ?? null,
          weight: event.weight ?? existing?.weight ?? null,
          source: mergeSource(existing?.source),
        };
        if (existing) {
          await tx.update(wearableEntriesTable).set(values).where(eq(wearableEntriesTable.id, existing.id));
        } else {
          await tx.insert(wearableEntriesTable).values({ playerId: player.id, date, ...values });
        }
      }
    });
    const entries = await recentWearableEntries(player.id, 7);
    await recordWearableMilestones(player.id, entries, source);
    const analysis = buildWearableSystemAnalysis(entries, isoDate());
    res.json({
      source,
      imported,
      duplicates,
      total: events.length,
      samsungHealthEvents,
      healthConnectEvents,
      recordTypes,
      lastSyncedAt: analysis.lastSyncedAt,
      readiness: analysis,
    });
  } catch (error) {
    req.log.error(error, "health import error");
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import health data" });
  }
});

function deleteSourcesFor(source: string) {
  if (source === "all") return VALID_SOURCES.filter((item) => item !== "manual");
  if (source === "health_connect" || source === "samsung_health") return ["health_connect", "samsung_health"] as const;
  if ((VALID_SOURCES as readonly string[]).includes(source)) return [source as WearableSource];
  return null;
}

async function clearImportedHealthData(playerId: number, source: string) {
  const sources = deleteSourcesFor(source);
  if (!sources) return null;
  await db.transaction(async (tx) => {
    await tx.delete(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, playerId), inArray(wearableEntriesTable.source, [...sources])));
    const importSources = sources.includes("samsung_health") ? [...new Set([...sources, "health_connect"])] : [...sources];
    await tx.delete(healthImportsTable)
      .where(and(eq(healthImportsTable.playerId, playerId), inArray(healthImportsTable.source, importSources)));
  });
  return sources;
}

router.delete("/health/imports", async (req, res) => {
  try {
    const source = String(req.query.source ?? "all");
    const { player } = await getOrCreatePlayer(req.userId!);
    const sources = await clearImportedHealthData(player.id, source);
    if (!sources) {
      return void res.status(400).json({ error: "Unsupported source" });
    }
    res.json({
      disconnected: source !== "manual",
      deleted: true,
      source,
      message: source === "all"
        ? "Imported health records were removed. Manual logs remain."
        : `${source.replace(/_/g, " ")} records were removed. You can reconnect later.`,
    });
  } catch (err) {
    req.log.error(err, "health import delete error");
    res.status(500).json({ error: "Failed to delete imported health data" });
  }
});

router.post("/health/disconnect", async (req, res) => {
  try {
    const source = String(req.body?.source ?? "health_connect");
    const { player } = await getOrCreatePlayer(req.userId!);
    const sources = await clearImportedHealthData(player.id, source);
    if (!sources) {
      return void res.status(400).json({ error: "Unsupported source" });
    }
    res.json({
      disconnected: true,
      source,
      message: "The wearable source has been disconnected from the Guild ledger. You may continue with manual logging.",
    });
  } catch (err) {
    req.log.error(err, "health disconnect error");
    res.status(500).json({ error: "Failed to disconnect wearable source" });
  }
});

export default router;
