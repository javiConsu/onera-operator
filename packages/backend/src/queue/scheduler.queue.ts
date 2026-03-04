import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export interface SchedulerJob {
  type: "agent-loop" | "daily-report";
  projectId?: string;
}

let schedulerQueue: Queue<SchedulerJob> | null = null;
let reportQueue: Queue<SchedulerJob> | null = null;

export function getSchedulerQueue(): Queue<SchedulerJob> {
  if (!schedulerQueue) {
    schedulerQueue = new Queue<SchedulerJob>("agent-scheduler", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    });
  }
  return schedulerQueue;
}

export function getReportQueue(): Queue<SchedulerJob> {
  if (!reportQueue) {
    reportQueue = new Queue<SchedulerJob>("report-scheduler", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    });
  }
  return reportQueue;
}

/**
 * Set up recurring scheduled jobs.
 * Call this once during server startup.
 */
export async function setupScheduledJobs(): Promise<void> {
  const agentQueue = getSchedulerQueue();
  const rptQueue = getReportQueue();

  // Remove any existing repeatable jobs to avoid duplicates
  const existingAgentJobs = await agentQueue.getRepeatableJobs();
  for (const job of existingAgentJobs) {
    await agentQueue.removeRepeatableByKey(job.key);
  }
  const existingReportJobs = await rptQueue.getRepeatableJobs();
  for (const job of existingReportJobs) {
    await rptQueue.removeRepeatableByKey(job.key);
  }

  // Agent loop: runs on the configured cron schedule
  const agentLoopCron =
    process.env.AGENT_LOOP_INTERVAL_CRON || "0 */4 * * *";
  await agentQueue.add(
    "agent-loop",
    { type: "agent-loop" },
    { repeat: { pattern: agentLoopCron } }
  );
  console.log(
    `[onera-scheduler] Agent loop scheduled with cron: ${agentLoopCron}`
  );

  // Daily report: runs on its own dedicated queue
  const reportCron = process.env.DAILY_REPORT_CRON || "0 18 * * *";
  await rptQueue.add(
    "daily-report",
    { type: "daily-report" },
    { repeat: { pattern: reportCron } }
  );
  console.log(
    `[onera-scheduler] Daily report scheduled with cron: ${reportCron}`
  );
}
