import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversations, messages,
  questsTable, questTasksTable,
  workoutSessionsTable, nutritionLogsTable,
  bossRaidsTable, playerStyleIdentityTable,
  personalRecordsTable, rpgGearTable,
  wearableEntriesTable, guildReportsTable,
  guildMasterMemoriesTable, worldEventsTable,
} from "@workspace/db";
import { CAMPAIGN_QUESTS, getQuestById } from "../data/campaign-quests";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, and, asc, desc, gte, count } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();
const GUILD_MASTER_CONTEXT = "guild_master";
const DAILY_MESSAGE_LIMIT = 5;

function currentWorldPressure(context: Awaited<ReturnType<typeof buildPlayerContext>>) {
  const openThreats = context.worldEvents.filter((event) => event.status === "active" || event.status === "unresolved").length;
  if (context.activeRaidCount > 0 || openThreats > 0) return "high";
  if (context.completedQuestCount >= 40) return "low";
  return "guarded";
}

function buildFallbackGuildMasterReply(content: string, context: Awaited<ReturnType<typeof buildPlayerContext>>) {
  const question = content.toLowerCase();
  const pressure = currentWorldPressure(context);
  const latestMemory = context.memories[0]?.summary;
  const latestWorldEvent = context.worldEvents[0];

  if (question.includes("system") || question.includes("aethoria") || question.includes("world") || question.includes("sovereign") || question.includes("gate")) {
    const threat = latestWorldEvent
      ? `${latestWorldEvent.title}: ${latestWorldEvent.description}`
      : "No lasting catastrophe is written in your ledger today, but the Sovereign remains the name our records give to the force that feeds on stagnation.";
    const raid = context.activeRaidCount > 0
      ? `${context.activeRaidCount} active gate incursion is on the board.`
      : "No active gate incursion is marked for you right now.";
    const memory = latestMemory ? `I have not forgotten this: ${latestMemory}` : "The Hall has only begun to learn your pattern.";
    return `Here is the state of Aethoria as the Guild can honestly name it. ${threat} ${raid} The System is still a mystery, Hunter. It measures growth and opens roads, but its maker and final intent are not known to me. ${memory}\n\nWorld pressure is ${pressure}. That means I can answer your questions, but if danger rises, I will steer us back to the next duty quickly. The Sovereign is not beaten by talk. It is beaten by repeated, recorded action.`;
  }

  if (question.includes("miss") || question.includes("failed") || question.includes("behind")) {
    return "Then we name it plainly and continue. A missed duty is not a ruined legend unless you let it become your pattern. Choose the smallest safe task still within reach, complete it, and record it before the day closes.";
  }

  if (question.includes("pain") || question.includes("injur")) {
    return "Pain changes the order of the day. Do not train through alarming symptoms or sharp worsening pain. Reduce the task to recovery, mobility, walking, hydration, and food you can actually keep consistent. If the pain is severe, unusual, or frightening, speak with a qualified professional.";
  }

  return "The Guild's scrying archive is quiet, so I will speak plainly. Ask me about Aethoria, the System, your record, your training, your food, your recovery, or the next duty, and I will answer from the ledger we have. For now: complete the next safe action within reach, record it honestly, and return with facts.";
}

// ── Context Builder ───────────────────────────────────────────────────────────

async function buildPlayerContext(playerId: number) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

  const [recentSessions, recentNutrition, allQuestStatuses, activeRaids, styleRows, recentPRs, equippedGear, recentWearables, memories, worldEvents] = await Promise.all([
    db.select({
      name: workoutSessionsTable.name,
      completedAt: workoutSessionsTable.completedAt,
      durationMinutes: workoutSessionsTable.durationMinutes,
      xpEarned: workoutSessionsTable.xpEarned,
    }).from(workoutSessionsTable)
      .where(and(eq(workoutSessionsTable.playerId, playerId), eq(workoutSessionsTable.status, "completed")))
      .orderBy(desc(workoutSessionsTable.completedAt))
      .limit(5),

    db.select({
      date: nutritionLogsTable.date,
      calories: nutritionLogsTable.calories,
      protein: nutritionLogsTable.protein,
    }).from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.playerId, playerId), gte(nutritionLogsTable.date, cutoffDate)))
      .orderBy(desc(nutritionLogsTable.date))
      .limit(21),

    db.select({ status: questsTable.status }).from(questsTable).where(eq(questsTable.playerId, playerId)),

    db.select({ id: bossRaidsTable.id, status: bossRaidsTable.status, difficulty: bossRaidsTable.difficulty })
      .from(bossRaidsTable)
      .where(eq(bossRaidsTable.playerId, playerId))
      .limit(5),

    db.select().from(playerStyleIdentityTable).where(eq(playerStyleIdentityTable.playerId, playerId)).limit(1),

    db.select({
      exerciseName: personalRecordsTable.exerciseName,
      weight: personalRecordsTable.weight,
      reps: personalRecordsTable.reps,
      achievedAt: personalRecordsTable.achievedAt,
    }).from(personalRecordsTable)
      .where(eq(personalRecordsTable.playerId, playerId))
      .orderBy(desc(personalRecordsTable.achievedAt))
      .limit(3),

    db.select({ name: rpgGearTable.name, slot: rpgGearTable.slot, rarity: rpgGearTable.rarity })
      .from(rpgGearTable)
      .where(and(eq(rpgGearTable.playerId, playerId), eq(rpgGearTable.equipped, true)))
      .limit(8),

    db.select().from(wearableEntriesTable)
      .where(and(eq(wearableEntriesTable.playerId, playerId), gte(wearableEntriesTable.date, cutoffDate)))
      .orderBy(desc(wearableEntriesTable.date))
      .limit(7),

    db.select().from(guildMasterMemoriesTable)
      .where(eq(guildMasterMemoriesTable.playerId, playerId))
      .orderBy(desc(guildMasterMemoriesTable.importance), desc(guildMasterMemoriesTable.occurredAt))
      .limit(8),

    db.select().from(worldEventsTable)
      .where(eq(worldEventsTable.playerId, playerId))
      .orderBy(desc(worldEventsTable.occurredAt))
      .limit(5),
  ]);

  const activeQuestCount = allQuestStatuses.filter(q => q.status === "active" || q.status === "completed").length;
  const completedQuestCount = allQuestStatuses.filter(q => q.status === "claimed").length;
  const activeRaidCount = activeRaids.filter(r => r.status === "active").length;
  const styleIdentity = styleRows[0] ?? null;

  return { recentSessions, recentNutrition, activeQuestCount, completedQuestCount, activeRaidCount, activeRaids, styleIdentity, recentPRs, equippedGear, recentWearables, memories, worldEvents };
}

// ── System Prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  player: { name: string; level: number; rank: string; totalXp: number; streakDays: number; baseClass: string | null },
  context: Awaited<ReturnType<typeof buildPlayerContext>>,
  narrativeMode: "technical" | "balanced" | "immersive"
): string {
  // Training history
  const trainingHistory = context.recentSessions.length > 0
    ? context.recentSessions.map(s => {
        const date = s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "unknown date";
        const dur = s.durationMinutes ? `${s.durationMinutes} min` : "";
        const xp = s.xpEarned ? `+${s.xpEarned} XP` : "";
        return `  • ${s.name} (${[date, dur, xp].filter(Boolean).join(", ")})`;
      }).join("\n")
    : "  • No completed sessions found.";

  // Nutrition summary
  const nutritionByDay: Record<string, { calories: number; protein: number }> = {};
  for (const log of context.recentNutrition) {
    if (!nutritionByDay[log.date]) nutritionByDay[log.date] = { calories: 0, protein: 0 };
    nutritionByDay[log.date].calories += log.calories;
    nutritionByDay[log.date].protein += Math.round(log.protein);
  }
  const nutritionSummary = Object.entries(nutritionByDay).slice(0, 7)
    .map(([date, d]) => `  • ${date}: ${d.calories} kcal, ${d.protein}g protein`)
    .join("\n") || "  • No nutrition logged recently.";

  // Style identity
  let styleSection = "  • Undetermined — more training data needed.";
  if (context.styleIdentity) {
    const si = context.styleIdentity;
    const styles = [
      { name: "Strength", score: si.strengthScore },
      { name: "Striking", score: si.strikingScore },
      { name: "Conditioning", score: si.conditioningScore },
      { name: "Grappling", score: si.grapplingScore },
      { name: "Recovery", score: si.recoveryScore },
      { name: "Discipline", score: si.disciplineScore },
    ].sort((a, b) => b.score - a.score).filter(s => s.score > 0);
    styleSection = `  • Dominant: ${styles[0]?.name ?? "none"} | Sessions: ${si.totalSessions}`;
    if (si.hybridArchetype) styleSection += `\n  • Archetype: ${si.hybridArchetype}`;
    if (styles.length > 1) styleSection += `\n  • Secondary: ${styles.slice(1, 3).map(s => s.name).join(", ")}`;
  }

  // PRs
  const prSection = context.recentPRs.length > 0
    ? context.recentPRs.map(pr => {
        const date = pr.achievedAt ? new Date(pr.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
        return `  • ${pr.exerciseName}: ${pr.weight} lbs × ${pr.reps} reps${date ? ` (${date})` : ""}`;
      }).join("\n")
    : "  • No personal records on file.";

  // Gear
  const gearSection = context.equippedGear.length > 0
    ? context.equippedGear.map(g => `  • ${g.slot}: ${g.name} (${g.rarity})`).join("\n")
    : "  • No gear equipped.";

  // Raids
  const raidSection = context.activeRaidCount > 0
    ? `  • ${context.activeRaidCount} active gate incursion(s)`
    : "  • No active incursions.";

  // Wearables
  const wearableSection = context.recentWearables.length > 0
    ? context.recentWearables.map(w => {
        const parts: string[] = [];
        if (w.steps) parts.push(`${w.steps.toLocaleString()} steps`);
        if (w.sleepHours) parts.push(`${w.sleepHours}h sleep`);
        if (w.hrv) parts.push(`HRV ${w.hrv}`);
        if (w.restingHr) parts.push(`RHR ${w.restingHr}bpm`);
        if (w.caloriesBurned) parts.push(`${w.caloriesBurned} kcal active`);
        if (w.activeMinutes) parts.push(`${w.activeMinutes} active min`);
        return `  • ${w.date}: ${parts.join(", ") || "entry logged"}`;
      }).join("\n")
    : "  • No wearable data synced.";

  const memorySection = context.memories.length > 0
    ? context.memories.map(memory => `  • [${memory.kind}] ${memory.summary}`).join("\n")
    : "  • No durable personal memories recorded yet.";

  const worldSection = context.worldEvents.length > 0
    ? context.worldEvents.map(event => `  • ${event.title}: ${event.description} (${event.status})`).join("\n")
    : "  • No lasting world events recorded.";

  const worldPressure = currentWorldPressure(context);
  const modeInstructions: Record<string, string> = {
    technical: `NARRATIVE MODE — TECHNICAL
Reference real fitness data and numbers directly. Say exactly what the record shows.
"You completed 3 sessions this week — bench press at 185 lbs, two conditioning days."
Use guild framing lightly. Let the data speak plainly. Aldric is in coach mode.`,

    balanced: `NARRATIVE MODE — BALANCED
Blend real metrics naturally into the guild world.
"Five sessions this week — that's solid. Your endurance work is paying off at 3.5 miles a run."
Reference actual numbers in context. Be both coach and guild master.`,

    immersive: `NARRATIVE MODE — IMMERSIVE
Translate all fitness data into guild/battle narrative. Never use: heart rate, calories, reps, sets, miles, lbs, kg, minutes, kcal.
Translation rules:
  - High heart rate → "your battle reserves were pushed to their limit"
  - Long endurance session → "you marched tirelessly across hostile territory"
  - Poor sleep → "the healers believe your body has not fully recovered its vitality"
  - Low HRV → "your reserves are strained — the body remembers every battle"
  - Strong HRV → "your recovery is formidable — your vitality deepens"
  - Improved resting HR → "your body stays calm, even before the gates open"
  - PRs → "you have surpassed your own limits once again, Hunter"
  - Missing training → "the board shows no missions recorded this week"
  - Good nutrition → "you have been diligent at the table — your body is well-fueled for the road ahead"
Stay completely in-world. The logbook holds guild records, not fitness data.`,
  };

  return `You are Grandmaster Aldric, Guild Master of the Hunter's Guild in Aethoria.

APP AND WORLD:
- The app is Ascension Quest: Legends of Aethoria.
- The Hunter was summoned by the mysterious System, an unknown force that marks, measures, and advances summoned fighters through quests, ranks, rewards, and Gates.
- The Hunter does not fully understand the System. Aldric has studied it for decades but does not pretend to know its origin.
- Aethoria is threatened by a great enemy known in current guild records as the Sovereign, an intelligence tied to stagnation, complacency, and the refusal to grow.
- Gates are ruptures where hostile forces, trials, and corrupted places spill into the world.
- The Guild Hall is a living or semi-living magical institution bound to Aldric's past. It is not merely a building or shop.
- Real training, nutrition, recovery, and discipline are how the Hunter becomes stronger in both worlds.
- The Hunter never simply chooses power. They earn identity, class, rank, titles, and legend through the record.
- Current world pressure: ${worldPressure}.

CHARACTER:
- Age: mid-60s. Silver hair, battle-scarred face, calm bearing that commands the room.
- Voice: measured, direct, warm beneath the surface. No shame. No toxic positivity. No sarcasm.
- Philosophy: growth is the only true victory; stagnation is the only true enemy.
- Backstory: former S-Rank hunter. Retired after a gate incident that cost him two fingers on his left hand. He knows what pushing too far costs — and what stopping too soon costs more.
- Never breaks character. The guild hall, gates, ranks, and quests are real to him.
- He oversees the entire guild: merchants, scholars, healers, expedition leaders. He is busy — but he makes time.

DIRECT QUESTIONS:
- You may answer direct questions about Aethoria, the System, Gates, the Sovereign, the Guild, Hall offerings, campaign state, the Hunter's record, training, nutrition, recovery, gear, titles, and what should be done next.
- Answer like a knowledgeable in-world mentor, not a menu or generic chatbot.
- When the question asks about facts outside the record, clearly separate what the Guild knows from what Aldric suspects.
- If the Hunter asks idle small talk while world pressure is high, be brief and redirect toward the next meaningful duty.
- If world pressure is low or the Sovereign has fallen, you may allow more reflective conversation and personal warmth.
- Do not invent personal memories, destroyed locations, named allies, injuries, victories, or lore revelations that are not in the record.
- If asked about the System's true origin, say the truth is not yet known. Offer the strongest current Guild theory without presenting it as certainty.

HUMILITY (use occasionally, not always):
- "This is the course I would choose, Hunter — but the decision is yours."
- "There are many paths through a gate."
- "I can offer guidance. You must walk the road."

HUNTER'S GUILD RECORD — ${player.name.toUpperCase()}:
  Level ${player.level} | ${player.rank}-Rank | Class: ${player.baseClass ?? "unassigned"}
  Total XP: ${player.totalXp.toLocaleString()}
  Training Streak: ${player.streakDays} day(s)
  Active Missions: ${context.activeQuestCount} | Completed: ${context.completedQuestCount}

RECENT TRAINING HISTORY (last 5 sessions):
${trainingHistory}

NUTRITION LOG (last 7 days):
${nutritionSummary}

GATE INCURSIONS (Boss Raids):
${raidSection}

COMBAT STYLE IDENTITY:
${styleSection}

PERSONAL RECORDS (recent):
${prSection}

ARMORY (equipped):
${gearSection}

VITALS & RECOVERY (wearable data):
${wearableSection}

ALDRIC'S DURABLE MEMORIES:
${memorySection}

LASTING WORLD STATE:
${worldSection}

${modeInstructions[narrativeMode] ?? modeInstructions.balanced}

RESPONSE GUIDELINES:
1. Keep responses 2–4 paragraphs unless a detailed plan is requested.
2. Begin new conversations with a brief acknowledgment of their current standing and one observation about recent activity.
3. Give specific, actionable advice — never just "believe in yourself."
4. Reference their actual record naturally, as if reading from the logbook.
5. When they haven't trained: state it directly but without judgment.
6. Celebrate genuine progress — results matter, not just attendance.
7. Never invent an accomplishment, injury, failure, measurement, person, or location that is not present in the record.
8. Do not diagnose, prescribe treatment, or tell the Hunter to ignore pain. For chest pain, fainting, severe breathing difficulty, signs of serious injury, or alarming symptoms, step out of fantasy language and advise urgent professional medical care.
9. When recovery data is poor, recommend reducing intensity, rest, hydration, nutrition, or professional guidance without using shame.
10. Treat small missed duties with measured disappointment. Treat recorded serious world losses with gravity proportional to the record; never manufacture a catastrophe for dramatic effect.
11. For broad world-state questions, summarize: current threat, known recent world events, active incursions, campaign standing, and the Hunter's readiness based only on the provided records.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateGMConversation(playerId: number): Promise<number> {
  const existing = await db.select().from(conversations)
    .where(and(eq(conversations.playerId, playerId), eq(conversations.context, GUILD_MASTER_CONTEXT)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const [created] = await db.insert(conversations).values({
    title: "Guild Master Session",
    context: GUILD_MASTER_CONTEXT,
    playerId,
  }).returning();
  return created.id;
}

// ── GET /guild-master/conversation ────────────────────────────────────────────

router.get("/guild-master/conversation", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const convId = await getOrCreateGMConversation(player.id);
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    res.json({
      conversationId: convId,
      messages: msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err, "guild-master conversation error");
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// ── POST /guild-master/messages ───────────────────────────────────────────────

router.post("/guild-master/messages", async (req, res) => {
  const { content, conversationId, narrativeMode = "balanced" } = req.body as {
    content: string;
    conversationId: number;
    narrativeMode?: "technical" | "balanced" | "immersive";
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.playerId, player.id)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Daily limit check
    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const [limitRow] = await db.select({ total: count() }).from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.role, "user"),
        gte(messages.createdAt, todayMidnight)
      ));
    if ((limitRow?.total ?? 0) >= DAILY_MESSAGE_LIMIT) {
      // Stream Aldric's limit message
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const limitMsg = "I have spoken with many hunters today, and the guild demands my attention elsewhere. Return tomorrow, Hunter — I will have more time for you then. Rest, and let your training do its work tonight.";
      res.write(`data: ${JSON.stringify({ content: limitMsg })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, limitReached: true })}\n\n`);
      res.end();
      return;
    }

    // Load recent history (last 20 messages for context)
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    // Save user message
    await db.insert(messages).values({ conversationId, role: "user", content: content.trim() });

    // Build enriched context
    const context = await buildPlayerContext(player.id);
    const systemPrompt = buildSystemPrompt(
      {
        name: player.name || "Hunter",
        level: player.level,
        rank: player.rank,
        totalXp: player.totalXpEarned,
        streakDays: player.streakDays,
        baseClass: (player as any).baseClass ?? null,
      },
      context,
      narrativeMode
    );

    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
      const fallback = buildFallbackGuildMasterReply(content, context);
      await db.insert(messages).values({ conversationId, role: "assistant", content: fallback });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ content: fallback, fallback: true })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fallback: true })}\n\n`);
      res.end();
      return;
    }

    const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: content.trim() },
    ];

    // Stream response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      stream: true,
      max_tokens: 600,
      temperature: 0.75,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    if (fullResponse) {
      await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });
    }
  } catch (err) {
    req.log.error(err, "guild-master message error");
    if (!res.headersSent) {
      res.status(503).json({ error: "The Guildmaster is temporarily unavailable" });
    } else {
      const fallback = "The Guild's scrying archive is quiet, so I will speak plainly: ask about Aethoria, the System, your record, or the next duty, and I will answer from the ledger we have. Complete the next safe action within reach, record it honestly, and do not train through alarming pain.";
      res.write(`data: ${JSON.stringify({ content: fallback, fallback: true })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fallback: true })}\n\n`);
      res.end();
    }
  }
});

// ── GET /guild-master/monthly-report ─────────────────────────────────────────

router.get("/guild-master/monthly-report", async (req, res) => {
  const month = parseInt(String(req.query.month)) || new Date().getMonth() + 1;
  const year = parseInt(String(req.query.year)) || new Date().getFullYear();

  if (month < 1 || month > 12 || year < 2024 || year > 2100) {
    res.status(400).json({ error: "Invalid month or year" });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    // Return cached report if it exists
    const [cached] = await db.select().from(guildReportsTable)
      .where(and(eq(guildReportsTable.playerId, player.id), eq(guildReportsTable.month, month), eq(guildReportsTable.year, year)))
      .limit(1);
    if (cached) {
      res.json({ reportText: cached.reportText, text: cached.reportText, month, year, generatedAt: cached.generatedAt.toISOString(), cached: true });
      return;
    }

    // Gather monthly stats
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const [sessions, nutrition, quests, prs, wearables] = await Promise.all([
      db.select({
        name: workoutSessionsTable.name,
        completedAt: workoutSessionsTable.completedAt,
        durationMinutes: workoutSessionsTable.durationMinutes,
        xpEarned: workoutSessionsTable.xpEarned,
      }).from(workoutSessionsTable)
        .where(and(
          eq(workoutSessionsTable.playerId, player.id),
          eq(workoutSessionsTable.status, "completed"),
          gte(workoutSessionsTable.completedAt, startDate)
        )).orderBy(desc(workoutSessionsTable.completedAt)),

      db.select({ date: nutritionLogsTable.date, calories: nutritionLogsTable.calories, protein: nutritionLogsTable.protein })
        .from(nutritionLogsTable)
        .where(and(eq(nutritionLogsTable.playerId, player.id), gte(nutritionLogsTable.date, startDateStr))),

      db.select({ status: questsTable.status, type: questsTable.type })
        .from(questsTable)
        .where(eq(questsTable.playerId, player.id)),

      db.select({ exerciseName: personalRecordsTable.exerciseName, weight: personalRecordsTable.weight, reps: personalRecordsTable.reps, achievedAt: personalRecordsTable.achievedAt })
        .from(personalRecordsTable)
        .where(and(eq(personalRecordsTable.playerId, player.id), gte(personalRecordsTable.achievedAt, startDate))),

      db.select().from(wearableEntriesTable)
        .where(and(eq(wearableEntriesTable.playerId, player.id), gte(wearableEntriesTable.date, startDateStr), gte(wearableEntriesTable.date, startDateStr)))
        .orderBy(asc(wearableEntriesTable.date)),
    ]);

    const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });
    const totalXp = sessions.reduce((s, r) => s + (r.xpEarned ?? 0), 0);
    const avgCalories = nutrition.length > 0 ? Math.round(nutrition.reduce((s, n) => s + n.calories, 0) / nutrition.length) : 0;
    const completedQuestsCount = quests.filter(q => q.status === "claimed").length;
    const avgSteps = wearables.length > 0 && wearables.some(w => w.steps)
      ? Math.round(wearables.filter(w => w.steps).reduce((s, w) => s + (w.steps ?? 0), 0) / wearables.filter(w => w.steps).length)
      : 0;
    const avgSleep = wearables.length > 0 && wearables.some(w => w.sleepHours)
      ? (wearables.filter(w => w.sleepHours).reduce((s, w) => s + (w.sleepHours ?? 0), 0) / wearables.filter(w => w.sleepHours).length).toFixed(1)
      : null;

    const reportPrompt = `You are Grandmaster Aldric. Write an official Guild Performance Report for Hunter ${player.name || "Unknown"} for the month of ${monthName} ${year}.

This is a formal in-world document, written as an official guild record.

MONTHLY DATA:
- Training sessions completed: ${sessions.length}
- Total XP earned this month: ${totalXp.toLocaleString()}
- Average session duration: ${sessions.length > 0 ? Math.round(sessions.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / sessions.length) : 0} minutes
- Nutrition days logged: ${[...new Set(nutrition.map(n => n.date))].length}
- Average daily calories: ${avgCalories}
- Quests completed: ${completedQuestsCount}
- Personal records set: ${prs.length}
- Current rank: ${player.rank} | Level: ${player.level}
- Training streak at month end: ${player.streakDays} days
${avgSteps > 0 ? `- Average daily steps: ${avgSteps.toLocaleString()}` : ""}
${avgSleep ? `- Average sleep: ${avgSleep} hours` : ""}

Write a 4–6 paragraph official guild performance review. Format it as a formal document that Aldric has signed and filed. Include:
1. A brief opening paragraph assessing overall performance
2. Observations on training consistency and results
3. Observations on nutrition/recovery (if data exists)
4. Areas of strength and areas requiring attention
5. Official recommendations for the coming month
6. A closing statement in Aldric's voice

Stay fully in-world. Translate fitness metrics into guild/battle language. This is not a chatbot response — it is an official filed document.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: reportPrompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const reportText = completion.choices[0]?.message?.content ?? "The report could not be generated at this time. Check back with the Grandmaster.";

    // Cache the report (no conflict possible — we checked above)
    await db.insert(guildReportsTable).values({
      playerId: player.id,
      month,
      year,
      reportText,
    });

    res.json({ reportText, text: reportText, month, year, generatedAt: new Date().toISOString(), cached: false });
  } catch (err) {
    req.log.error(err, "monthly report error");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ── GET /guild-master/campaign-quests ─────────────────────────────────────────

router.get("/guild-master/campaign-quests", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const rows = await db.select().from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main")));

    res.json(rows.flatMap((quest) => {
      const match = quest.title.match(/^\[Campaign\]\s+Q0*(\d+):/);
      if (!match) return [];

      return [{
        campaignId: Number(match[1]),
        questId: quest.id,
        status: quest.status,
        title: quest.title,
        completedAt: quest.completedAt?.toISOString() ?? null,
        claimedAt: quest.claimedAt?.toISOString() ?? null,
        createdAt: quest.createdAt.toISOString(),
      }];
    }));
  } catch (err) {
    req.log.error(err, "campaign quest status error");
    res.status(500).json({ error: "Failed to load campaign quest status" });
  }
});

// ── POST /guild-master/campaign-quests/:campaignId/start ──────────────────────

router.post("/guild-master/campaign-quests/:campaignId/start", async (req, res) => {
  const campaignId = parseInt(req.params.campaignId);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign quest ID" });
    return;
  }

  const questDef = getQuestById(campaignId);
  if (!questDef) {
    res.status(404).json({ error: "Campaign quest not found" });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const titlePrefix = `[Campaign] Q${String(campaignId).padStart(3, "0")}:`;

    const existing = await db.select().from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main")));
    const alreadyStarted = existing.find(q => q.title.startsWith(titlePrefix));
    if (alreadyStarted) {
      res.status(409).json({ error: "Quest already started", quest: alreadyStarted });
      return;
    }

    const [quest] = await db.insert(questsTable).values({
      playerId: player.id,
      type: "main",
      title: `${titlePrefix} ${questDef.title}`,
      description: questDef.description,
      xpReward: questDef.xpReward,
      goldReward: questDef.goldReward,
      status: "active",
    }).returning();

    await db.insert(questTasksTable).values(
      questDef.tasks.map(t => ({
        questId: quest.id,
        description: t.description,
        targetValue: t.targetValue,
        unit: t.unit,
        order: t.order,
      }))
    );

    res.status(201).json(quest);
  } catch (err) {
    req.log.error(err, "campaign quest start error");
    res.status(500).json({ error: "Failed to start campaign quest" });
  }
});

export default router;
