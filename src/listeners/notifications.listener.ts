import { eventBus } from "../core/events/eventBus.js";
import { Events } from "../core/events/eventNames.js";
import { NotificationGateway } from "../core/notifications/NotificationGateway.js";
import Friendship from "../models/Friendship.model.js";
import PlayerProfileStats from "../models/PlayerProfileStats.model.js";
import User from "../models/User.model.js";
import { Types } from "mongoose";

eventBus.on(
    Events.TYPING_COMPLETED,
    async (data: { userId: string; sessionId: string; wpm?: number; accuracy?: number }) => {
        try {
            if (!data.wpm) return;

            const user = await User.findById(data.userId).lean();
            if (!user) return;

            // 1. Find all accepted friends
            const userObjectId = new Types.ObjectId(data.userId);
            const friendships = await Friendship.find({
                status: "accepted",
                $or: [{ requester: userObjectId }, { recipient: userObjectId }],
            });

            const friendIds = friendships.map(f => 
                String(f.requester) === data.userId ? String(f.recipient) : String(f.requester)
            );

            // 2. Check who this user just beat
            const friendsStats = await PlayerProfileStats.find({
                userId: { $in: friendIds }
            }).lean();

            for (const stats of friendsStats) {
                if (data.wpm > stats.typing.bestWpm) {
                    // This user beat this friend's record!
                    await NotificationGateway.sendNotification(stats.userId, {
                        type: "RECORD_BEATEN",
                        message: `${user.displayName || user.name} just beat your best WPM record with ${data.wpm} WPM!`,
                        metadata: { 
                            beatenWpm: stats.typing.bestWpm, 
                            newWpm: data.wpm,
                            senderId: data.userId 
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error in notification trigger for TYPING_COMPLETED:", error);
        }
    }
);
