/**
 * Job data types for Kirin's BullMQ queues
 */

// Collector job data
export interface CollectorJobData {
  source: string;
  channelId?: string;
  userId?: string;
  lookbackHours: number;
  scheduledAt: string;
}

// Message from any source
export interface SourceMessage {
  id: string;
  source: 'slack' | 'signal' | 'twitter' | 'rss';
  text: string;
  author: string;
  timestamp: string;
  channelId: string;
  metadata?: Record<string, unknown>;
}

// Processing job data
export interface ProcessingJobData {
  messages: SourceMessage[];
  userId: string;
  source: string;
}

// Filtered output
export interface FilteredOutput {
  messageIds: string[];
  summary: string;
  relevanceScore: number;
  topics: string[];
  source: string;
  timestamp: string;
  userId: string;
}

// User feedback
export interface UserFeedback {
  outputId: string;
  userId: string;
  feedback: 'relevant' | 'irrelevant' | 'maybe';
  notes?: string;
  timestamp: string;
}

