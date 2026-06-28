import { sendTelegramMessage } from "../core/notifications/TelegramBot.js";
import { eventBus } from "../core/events/eventBus.js";

import { Events } from "../core/events/eventNames.js";


eventBus.on(

    Events.USER_CREATED,

    async (user) => {
        await sendTelegramMessage(
            `New User Registered : ${user.username}`
        );
    }
);


eventBus.on(

    Events.USER_LOGIN,

    async (user) => {
        await sendTelegramMessage(
            `User Logged In : ${user.username}`
        );
    }
);


eventBus.on(

    Events.USER_LOGOUT,

    async (user) => {
        await sendTelegramMessage(
            `User Logged Out : ${user.username}`
        );
    }
);


eventBus.on(

    Events.PAYMENT_SUCCESS,

    async (user) => {
        await sendTelegramMessage(
            `Payment Success : ${user.username}`
        );
    }
);