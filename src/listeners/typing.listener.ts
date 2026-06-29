import { eventBus } from "../core/events/eventBus.js";
import { Events } from "../core/events/eventNames.js";
import { GamificationQueueHandler } from "../core/queue/gamification/gamification.queue.js";
import { LeaderboardQueueHandler } from "../core/queue/leaderboard/leaderboard.queue.js";

eventBus.on(
    Events.TYPING_COMPLETED,
    async ({ userId }) => {
        console.log(`Processing TYPING_COMPLETED event for user: ${userId}`);
        
        // Offload Gamification rebuild to background worker
        await GamificationQueueHandler.enqueueRebuild(userId);
        
        // Offload Leaderboard refresh to background worker
        await LeaderboardQueueHandler.enqueueRefresh();
    }
);
