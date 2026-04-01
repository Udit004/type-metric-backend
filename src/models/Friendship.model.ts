import { HydratedDocument, Model, Schema, model } from "mongoose";

export type FriendshipStatus = "pending" | "accepted";

export interface IFriendship {
  requester: Schema.Types.ObjectId;
  recipient: Schema.Types.ObjectId;
  pairKey: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date | null;
}

type FriendshipModel = Model<IFriendship>;
export type FriendshipDocument = HydratedDocument<IFriendship>;

const friendshipSchema = new Schema<IFriendship, FriendshipModel>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pairKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      required: true,
      default: "pending",
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

friendshipSchema.index({ requester: 1, status: 1, createdAt: -1 });
friendshipSchema.index({ recipient: 1, status: 1, createdAt: -1 });

const Friendship = model<IFriendship, FriendshipModel>(
  "Friendship",
  friendshipSchema
);

export default Friendship;
