import { eventBus } from "../core/events/eventBus.js";
import { Events } from "../core/events/eventNames.js";
import { ActivityQueueHandler } from "../core/queue/activity/activity.queue.js";
import User from "../models/User.model.js";

eventBus.on(
    Events.SYSTEM_ACTIVITY,
    async (data) => {
        await ActivityQueueHandler.enqueueActivity({
            type: data.type || 'INFO',
            message: data.message,
            timestamp: new Date(),
            metadata: data.metadata
        });
    }
);

eventBus.on(
    Events.SYSTEM_ERROR,
    async (data) => {
        await ActivityQueueHandler.enqueueActivity({
            type: 'ERROR',
            message: data.message,
            timestamp: new Date(),
            metadata: data.metadata
        });
    }
);

eventBus.on(
    Events.TYPING_COMPLETED,
    async (data: { userId: string, sessionId: string, wpm?: number }) => {
        try {
            const user = await User.findById(data.userId).lean();
            if (user) {
                const username = (user as any).displayName || (user as any).name || 'Unknown User';
                const email = (user as any).email || 'No email';
                const wpmText = data.wpm ? ` with speed: ${data.wpm} WPM` : '';
                await ActivityQueueHandler.enqueueActivity({
                    type: 'INFO',
                    message: `Typing session completed by ${username} (${email})${wpmText}.`,
                    timestamp: new Date(),
                    metadata: { sessionId: data.sessionId, wpm: data.wpm }
                });
            }
        } catch (error) {
            console.error("Error in TYPING_COMPLETED activity listener", error);
        }
    }
);

eventBus.on(
    Events.LEADERBOARD_UPDATED,
    async (data: { board: string, totalEntries: number }) => {
        try {
            await ActivityQueueHandler.enqueueActivity({
                type: 'INFO',
                message: `Leaderboard '${data.board}' updated. Total entries: ${data.totalEntries}.`,
                timestamp: new Date(),
                metadata: { board: data.board, totalEntries: data.totalEntries }
            });
        } catch (error) {
            console.error("Error in LEADERBOARD_UPDATED activity listener", error);
        }
    }
);
