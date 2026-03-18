/**
 * Queue Manager
 *
 * Centralized job queue management using Bull for:
 * - Scheduled post publishing
 * - Automated interactions (likes, comments, retweets, follows)
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Concurrency control to prevent API overload
 * - Duplicate job prevention
 * - Job status monitoring
 */

import Bull from 'bull';
import type { Job, Queue, JobOptions } from 'bull';
import { createLogger } from "./utils/logger";

const logger = createLogger("queue-manager");

// Queue names
export const QUEUE_NAMES = {
  SCHEDULED_POSTS: 'scheduled-posts',
  INTERACTIONS: 'interactions',
  AGENT_SCHEDULER: 'agent-scheduler',
  AUTO_ENGAGEMENT: 'auto-engagement',
  GROWTH_LOOP: 'growth-loop',
} as const;

// Job types
export interface ScheduledPostJob {
  postId: number;
  accountId: number;
  scheduledTime: string;
}

export interface InteractionJob {
  interactionId: number;
  type: 'like' | 'comment' | 'retweet' | 'follow';
  fromDeviceId: string;
  fromAccountId: number;
  targetUrl?: string;
  targetUsername?: string;
  projectId?: number;
}

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const defaultJobOptions: JobOptions = {
  attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 seconds
  },
  removeOnComplete: {
    age: 24 * 60 * 60, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
  },
};

// Repeatable job intervals
const AGENT_SCHEDULER_INTERVAL_MS = 60 * 1000;         // 60 seconds
const AUTO_ENGAGEMENT_INTERVAL_MS = 5 * 60 * 1000;     // 300 seconds
const GROWTH_LOOP_INTERVAL_MS = 6 * 60 * 60 * 1000;    // 6 hours

// Singleton queue instances
let scheduledPostsQueue: Queue<ScheduledPostJob> | null = null;
let interactionsQueue: Queue<InteractionJob> | null = null;
let agentSchedulerQueue: Queue<Record<string, never>> | null = null;
let autoEngagementQueue: Queue<Record<string, never>> | null = null;
let growthLoopQueue: Queue<Record<string, never>> | null = null;

/**
 * Get or create the scheduled posts queue
 */
export function getScheduledPostsQueue(): Queue<ScheduledPostJob> {
  if (!scheduledPostsQueue) {
    scheduledPostsQueue = new Bull<ScheduledPostJob>(QUEUE_NAMES.SCHEDULED_POSTS, REDIS_URL, {
      defaultJobOptions,
      limiter: {
        max: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
        duration: 1000, // 3 jobs per second
      },
    });

    // Global event handlers
    scheduledPostsQueue.on('error', (error) => {
      logger.error({ err: error }, "Scheduled posts queue error");
    });

    scheduledPostsQueue.on('waiting', (jobId) => {
      logger.info({ jobId }, "Job waiting");
    });

    scheduledPostsQueue.on('active', (job) => {
      logger.info({ jobId: job.id, postId: job.data.postId }, "Processing scheduled post job");
    });

    scheduledPostsQueue.on('completed', (job, result) => {
      logger.info({ jobId: job.id, success: result?.success }, "Scheduled post job completed");
    });

    scheduledPostsQueue.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Scheduled post job failed");
    });

    scheduledPostsQueue.on('stalled', (job) => {
      logger.warn({ jobId: job.id }, "Scheduled post job stalled");
    });
  }
  return scheduledPostsQueue;
}

/**
 * Get or create the interactions queue
 */
export function getInteractionsQueue(): Queue<InteractionJob> {
  if (!interactionsQueue) {
    interactionsQueue = new Bull<InteractionJob>(QUEUE_NAMES.INTERACTIONS, REDIS_URL, {
      defaultJobOptions,
      limiter: {
        max: parseInt(process.env.QUEUE_CONCURRENCY || '2', 10),
        duration: 5000, // 2 jobs per 5 seconds (slower for interactions)
      },
    });

    // Global event handlers
    interactionsQueue.on('error', (error) => {
      logger.error({ err: error }, "Interactions queue error");
    });

    interactionsQueue.on('active', (job) => {
      logger.info({ jobId: job.id, type: job.data.type }, "Processing interaction job");
    });

    interactionsQueue.on('completed', (job, result) => {
      logger.info({ jobId: job.id, success: result?.success }, "Interaction job completed");
    });

    interactionsQueue.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Interaction job failed");
    });

    interactionsQueue.on('stalled', (job) => {
      logger.warn({ jobId: job.id }, "Interaction job stalled");
    });
  }
  return interactionsQueue;
}

/**
 * Get or create the agent scheduler queue
 */
export function getAgentSchedulerQueue(): Queue<Record<string, never>> {
  if (!agentSchedulerQueue) {
    agentSchedulerQueue = new Bull<Record<string, never>>(QUEUE_NAMES.AGENT_SCHEDULER, REDIS_URL, {
      defaultJobOptions,
    });

    // Global event handlers
    agentSchedulerQueue.on('error', (error) => {
      logger.error({ err: error }, "Agent scheduler queue error");
    });

    agentSchedulerQueue.on('active', (job) => {
      logger.info({ jobId: job.id }, "Processing agent scheduler job");
    });

    agentSchedulerQueue.on('completed', (job, result) => {
      logger.info({ jobId: job.id, executed: result?.executed, failed: result?.failed }, "Agent scheduler job completed");
    });

    agentSchedulerQueue.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Agent scheduler job failed");
    });

    agentSchedulerQueue.on('stalled', (job) => {
      logger.warn({ jobId: job.id }, "Agent scheduler job stalled");
    });
  }
  return agentSchedulerQueue;
}

/**
 * Get or create the auto-engagement queue
 */
export function getAutoEngagementQueue(): Queue<Record<string, never>> {
  if (!autoEngagementQueue) {
    autoEngagementQueue = new Bull<Record<string, never>>(QUEUE_NAMES.AUTO_ENGAGEMENT, REDIS_URL, {
      defaultJobOptions,
    });

    // Global event handlers
    autoEngagementQueue.on('error', (error) => {
      logger.error({ err: error }, "Auto-engagement queue error");
    });

    autoEngagementQueue.on('active', (job) => {
      logger.info({ jobId: job.id }, "Processing auto-engagement job");
    });

    autoEngagementQueue.on('completed', (job, result) => {
      logger.info({ jobId: job.id }, "Auto-engagement job completed");
    });

    autoEngagementQueue.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Auto-engagement job failed");
    });

    autoEngagementQueue.on('stalled', (job) => {
      logger.warn({ jobId: job.id }, "Auto-engagement job stalled");
    });
  }
  return autoEngagementQueue;
}

/**
 * Get or create the growth loop queue
 */
export function getGrowthLoopQueue(): Queue<Record<string, never>> {
  if (!growthLoopQueue) {
    growthLoopQueue = new Bull<Record<string, never>>(QUEUE_NAMES.GROWTH_LOOP, REDIS_URL, {
      defaultJobOptions,
    });

    // Global event handlers
    growthLoopQueue.on('error', (error) => {
      logger.error({ err: error }, "Growth loop queue error");
    });

    growthLoopQueue.on('active', (job) => {
      logger.info({ jobId: job.id }, "Processing growth loop job");
    });

    growthLoopQueue.on('completed', (job, result) => {
      logger.info({ jobId: job.id, evaluated: result?.evaluated, actionsGenerated: result?.actionsGenerated }, "Growth loop job completed");
    });

    growthLoopQueue.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, err: error }, "Growth loop job failed");
    });

    growthLoopQueue.on('stalled', (job) => {
      logger.warn({ jobId: job.id }, "Growth loop job stalled");
    });
  }
  return growthLoopQueue;
}

/**
 * Register growth loop as a Bull repeatable job (every 6 hours)
 */
export async function registerGrowthLoopRepeatableJob(): Promise<void> {
  const queue = getGrowthLoopQueue();
  await queue.add(
    {},
    {
      repeat: { every: GROWTH_LOOP_INTERVAL_MS },
      jobId: 'growth-loop-repeatable',
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 24 * 60 * 60 },
    }
  );
  logger.info({ intervalHours: GROWTH_LOOP_INTERVAL_MS / (60 * 60 * 1000) }, "Growth loop repeatable job registered");
}

/**
 * Register agent scheduler as a BullMQ repeatable job (every 60 seconds)
 */
export async function registerAgentSchedulerRepeatableJob(): Promise<void> {
  const queue = getAgentSchedulerQueue();
  await queue.add(
    {},
    {
      repeat: { every: AGENT_SCHEDULER_INTERVAL_MS },
      jobId: 'agent-scheduler-repeatable',
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 24 * 60 * 60 },
    }
  );
  logger.info({ intervalSeconds: AGENT_SCHEDULER_INTERVAL_MS / 1000 }, "Agent scheduler repeatable job registered");
}

/**
 * Register auto-engagement as a BullMQ repeatable job (every 300 seconds)
 */
export async function registerAutoEngagementRepeatableJob(): Promise<void> {
  const queue = getAutoEngagementQueue();
  await queue.add(
    {},
    {
      repeat: { every: AUTO_ENGAGEMENT_INTERVAL_MS },
      jobId: 'auto-engagement-repeatable',
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 24 * 60 * 60 },
    }
  );
  logger.info({ intervalSeconds: AUTO_ENGAGEMENT_INTERVAL_MS / 1000 }, "Auto-engagement repeatable job registered");
}

/**
 * Add a scheduled post job to the queue
 */
export async function addScheduledPostJob(
  data: ScheduledPostJob,
  options?: Partial<JobOptions>
): Promise<Job<ScheduledPostJob>> {
  const queue = getScheduledPostsQueue();

  // Use postId as job ID to prevent duplicates
  const jobId = `post-${data.postId}`;

  // Check if job already exists
  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    logger.info({ postId: data.postId }, "Job for post already exists, skipping");
    return existingJob;
  }

  return queue.add(data, {
    ...options,
    jobId,
  });
}

/**
 * Add an interaction job to the queue
 */
export async function addInteractionJob(
  data: InteractionJob,
  options?: Partial<JobOptions>
): Promise<Job<InteractionJob>> {
  const queue = getInteractionsQueue();

  // Use interactionId as job ID to prevent duplicates
  const jobId = `interaction-${data.interactionId}`;

  // Check if job already exists
  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    logger.info({ interactionId: data.interactionId }, "Job for interaction already exists, skipping");
    return existingJob;
  }

  // Add delay for natural timing
  const delayMs = options?.delay || calculateInteractionDelay(data.type);

  return queue.add(data, {
    ...options,
    jobId,
    delay: delayMs,
  });
}

/**
 * Calculate delay for interaction based on type
 */
function calculateInteractionDelay(type: InteractionJob['type']): number {
  const delays = {
    like: [5, 30], // 5-30 minutes
    comment: [10, 60], // 10-60 minutes
    retweet: [5, 30], // 5-30 minutes
    follow: [30, 180], // 30-180 minutes
  };

  const [min, max] = delays[type] || [5, 30];
  const randomMinutes = min + Math.random() * (max - min);
  return Math.floor(randomMinutes * 60 * 1000);
}

/**
 * Get queue status for monitoring
 */
export async function getQueueStatus(): Promise<{
  scheduledPosts: QueueStats;
  interactions: QueueStats;
}> {
  const postsQueue = getScheduledPostsQueue();
  const interactionsQ = getInteractionsQueue();

  const [postsStats, interactionsStats] = await Promise.all([
    getQueueStats(postsQueue),
    getQueueStats(interactionsQ),
  ]);

  return {
    scheduledPosts: postsStats,
    interactions: interactionsStats,
  };
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

async function getQueueStats(queue: Queue): Promise<QueueStats> {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return { waiting, active, completed, failed, delayed, paused };
}

/**
 * Gracefully shutdown all queues
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (scheduledPostsQueue) {
    closePromises.push(scheduledPostsQueue.close());
    scheduledPostsQueue = null;
  }

  if (interactionsQueue) {
    closePromises.push(interactionsQueue.close());
    interactionsQueue = null;
  }

  if (agentSchedulerQueue) {
    closePromises.push(agentSchedulerQueue.close());
    agentSchedulerQueue = null;
  }

  if (autoEngagementQueue) {
    closePromises.push(autoEngagementQueue.close());
    autoEngagementQueue = null;
  }

  if (growthLoopQueue) {
    closePromises.push(growthLoopQueue.close());
    growthLoopQueue = null;
  }

  await Promise.all(closePromises);
  logger.info("All queues closed");
}

/**
 * Clear all jobs from queues (use with caution)
 */
export async function clearQueues(): Promise<void> {
  const postsQueue = getScheduledPostsQueue();
  const interactionsQ = getInteractionsQueue();

  await Promise.all([
    postsQueue.empty(),
    postsQueue.clean(0, 'completed'),
    postsQueue.clean(0, 'failed'),
    interactionsQ.empty(),
    interactionsQ.clean(0, 'completed'),
    interactionsQ.clean(0, 'failed'),
  ]);

  logger.info("All queues cleared");
}

/**
 * Pause/Resume queues
 */
export async function pauseQueues(): Promise<void> {
  const postsQueue = getScheduledPostsQueue();
  const interactionsQ = getInteractionsQueue();

  await Promise.all([
    postsQueue.pause(),
    interactionsQ.pause(),
  ]);

  logger.info("All queues paused");
}

export async function resumeQueues(): Promise<void> {
  const postsQueue = getScheduledPostsQueue();
  const interactionsQ = getInteractionsQueue();

  await Promise.all([
    postsQueue.resume(),
    interactionsQ.resume(),
  ]);

  logger.info("All queues resumed");
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(queueName: keyof typeof QUEUE_NAMES): Promise<number> {
  const queue = queueName === 'SCHEDULED_POSTS'
    ? getScheduledPostsQueue()
    : getInteractionsQueue();

  const failedJobs = await queue.getFailed();
  let retried = 0;

  for (const job of failedJobs) {
    await job.retry();
    retried++;
  }

  logger.info({ retried, queueName }, "Retried failed jobs");
  return retried;
}
