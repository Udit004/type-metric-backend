import { Schema, model, Document, Types } from "mongoose";

export interface INotification {
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  type: "FRIEND_ONLINE" | "RECORD_BEATEN" | "BADGE_EARNED" | "SYSTEM" | "FRIEND_REQUEST";
  message: string;
  metadata: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  type: {
    type: String,
    enum: ["FRIEND_ONLINE", "RECORD_BEATEN", "BADGE_EARNED", "SYSTEM", "FRIEND_REQUEST"],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index for fetching unread notifications for a user quickly
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = model<INotificationDocument>("Notification", notificationSchema);

export default Notification;
