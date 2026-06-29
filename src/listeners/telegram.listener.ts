import { NotificationQueueHandler } from "../core/queue/notifications/notification.queue.js";
import { eventBus } from "../core/events/eventBus.js";

import { Events } from "../core/events/eventNames.js";

eventBus.on(
    Events.USER_CREATED,
    async (user) => {
        await NotificationQueueHandler.enqueueTelegram({
            message: `New User Registered : ${user.username}`
        });
    }
);

eventBus.on(
    Events.USER_LOGIN,
    async (user) => {
        await NotificationQueueHandler.enqueueTelegram({
            message: `User Logged In : ${user.username}`
        });
    }
);

eventBus.on(
    Events.USER_LOGOUT,
    async (user) => {
        await NotificationQueueHandler.enqueueTelegram({
            message: `User Logged Out : ${user.username}`
        });
    }
);

eventBus.on(
    Events.PAYMENT_SUCCESS,
    async (user) => {
        await NotificationQueueHandler.enqueueTelegram({
            message: `Payment Success : ${user.username}`
        });
    }
);