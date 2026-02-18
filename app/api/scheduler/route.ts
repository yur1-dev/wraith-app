import { NextRequest, NextResponse } from "next/server";

// In-memory schedule store (use Redis/DB in production)
interface ScheduledFlow {
  scheduleId: string;
  flowId: string;
  name: string;
  nodes: any[];
  edges: any[];
  walletAddress: string;
  walletType: string;
  cronExpression: string; // "daily:03:00" | "hourly" | "once:2024-01-01T03:00"
  scheduleType: "daily" | "hourly" | "weekly" | "once";
  scheduleTime: string; // "03:00"
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun: string;
  runCount: number;
}

export const schedules = new Map<string, ScheduledFlow>();
const runningTimers = new Map<string, NodeJS.Timeout>();

function computeNextRun(scheduleType: string, scheduleTime: string): string {
  const now = new Date();
  const [h, m] = scheduleTime.split(":").map(Number);

  if (scheduleType === "hourly") {
    const next = new Date(now);
    next.setMinutes(m || 0, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 1);
    return next.toISOString();
  }

  if (scheduleType === "daily") {
    const next = new Date(now);
    next.setHours(h || 3, m || 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (scheduleType === "weekly") {
    const next = new Date(now);
    next.setHours(h || 3, m || 0, 0, 0);
    next.setDate(next.getDate() + 7);
    return next.toISOString();
  }

  // once — run in 1 minute for demo
  const next = new Date(now.getTime() + 60_000);
  return next.toISOString();
}

function msUntil(isoDate: string): number {
  return Math.max(0, new Date(isoDate).getTime() - Date.now());
}

async function triggerExecution(schedule: ScheduledFlow) {
  try {
    console.log(`🕐 Scheduler triggering flow: ${schedule.name}`);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: schedule.nodes,
          edges: schedule.edges,
          walletAddress: schedule.walletAddress,
          walletType: schedule.walletType,
        }),
      },
    );
    const data = await res.json();
    console.log(`✅ Scheduled run complete: ${data.status}`);

    // Update schedule
    schedule.lastRun = new Date().toISOString();
    schedule.runCount += 1;

    if (schedule.scheduleType !== "once") {
      schedule.nextRun = computeNextRun(
        schedule.scheduleType,
        schedule.scheduleTime,
      );
      armTimer(schedule);
    } else {
      schedule.enabled = false;
    }
    schedules.set(schedule.scheduleId, schedule);
  } catch (err) {
    console.error(`❌ Scheduled run failed:`, err);
  }
}

function armTimer(schedule: ScheduledFlow) {
  // Clear existing timer
  const existing = runningTimers.get(schedule.scheduleId);
  if (existing) clearTimeout(existing);

  if (!schedule.enabled) return;

  const delay = msUntil(schedule.nextRun);
  console.log(
    `⏰ Arming timer for "${schedule.name}" in ${Math.round(delay / 1000)}s`,
  );

  const timer = setTimeout(() => triggerExecution(schedule), delay);
  runningTimers.set(schedule.scheduleId, timer);
}

// GET — list all schedules
export async function GET() {
  const list = Array.from(schedules.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json({ schedules: list, total: list.length });
}

// POST — create a new schedule
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    nodes,
    edges,
    walletAddress,
    walletType,
    scheduleType,
    scheduleTime,
  } = body;

  if (!walletAddress)
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  if (!nodes?.length)
    return NextResponse.json({ error: "No nodes" }, { status: 400 });

  const scheduleId = crypto.randomUUID();
  const nextRun = computeNextRun(
    scheduleType || "daily",
    scheduleTime || "03:00",
  );

  const schedule: ScheduledFlow = {
    scheduleId,
    flowId: `flow-${Date.now()}`,
    name: name || "Unnamed Flow",
    nodes,
    edges: edges || [],
    walletAddress,
    walletType: walletType || "metamask",
    cronExpression: `${scheduleType}:${scheduleTime}`,
    scheduleType: scheduleType || "daily",
    scheduleTime: scheduleTime || "03:00",
    enabled: true,
    createdAt: new Date().toISOString(),
    nextRun,
    runCount: 0,
  };

  schedules.set(scheduleId, schedule);
  armTimer(schedule);

  return NextResponse.json(schedule);
}

// PATCH — toggle enable/disable OR rename
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { scheduleId, enabled, name } = body;
  const schedule = schedules.get(scheduleId);
  if (!schedule)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rename
  if (name !== undefined) {
    schedule.name = name;
    schedules.set(scheduleId, schedule);
    return NextResponse.json(schedule);
  }

  // Toggle
  schedule.enabled = enabled;
  if (enabled) {
    schedule.nextRun = computeNextRun(
      schedule.scheduleType,
      schedule.scheduleTime,
    );
    armTimer(schedule);
  } else {
    const timer = runningTimers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      runningTimers.delete(scheduleId);
    }
  }

  schedules.set(scheduleId, schedule);
  return NextResponse.json(schedule);
}

// DELETE — remove schedule
export async function DELETE(request: NextRequest) {
  const { scheduleId } = await request.json();
  const timer = runningTimers.get(scheduleId);
  if (timer) {
    clearTimeout(timer);
    runningTimers.delete(scheduleId);
  }
  schedules.delete(scheduleId);
  return NextResponse.json({ deleted: true });
}
