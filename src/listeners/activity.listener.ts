import { eventBus } from "../core/events/eventBus.js";
import { Events } from "../core/events/eventNames.js";
import { ActivityQueueHandler } from "../core/queue/activity/activity.queue.js";

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
