import { NextRequest, NextResponse } from 'next/server';
import { queues } from '@/lib/bullBoard';

// Basic API to get queue stats
export async function GET(request: NextRequest) {
  try {
    const stats = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
        };
      })
    );

    return NextResponse.json({ queues: stats });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}

