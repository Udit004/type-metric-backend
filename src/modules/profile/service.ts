import { Types } from "mongoose";

import Friendship from "../../models/Friendship.model.js";
import MultiplayerRaceResult from "../../models/MultiplayerRaceResult.model.js";
import TypingSession from "../../models/TypingSession.model.js";
import User from "../../models/User.model.js";

type FavoriteMode = "solo" | "multiplayer" | "hybrid";

interface BasicUserRecord {
  _id: unknown;
  name: string;
  email: string;
  tagline: string;
  bio: string;
  country: string;
  favoriteMode: FavoriteMode;
  avatarColor: string;
  createdAt: Date;
}

export interface ProfileIdentity {
  id: string;
  name: string;
  email: string;
  tagline: string;
  bio: string;
  country: string;
  favoriteMode: FavoriteMode;
  avatarColor: string;
  memberSince: string;
}

export interface ProfileFriend {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
  tagline: string;
  avatarColor: string;
  favoriteMode: FavoriteMode;
  createdAt: string;
}

export interface ProfileStats {
  sessionsCount: number;
  bestWpm: number;
  averageWpm: number;
  bestAccuracy: number;
  averageAccuracy: number;
  totalMistakes: number;
}

export interface RacingStats extends ProfileStats {
  winsCount: number;
  podiumCount: number;
}

export interface RecentTypingSession {
  id: string;
  wpm: number;
  accuracy: number;
  mistakes: number;
  elapsedMs: number;
  durationSeconds: number;
  completionReason: "time_up" | "text_completed";
  createdAt: string;
}

export interface RecentRace {
  id: string;
  roomId: string;
  raceNumber: number;
  rank: number;
  score: number;
  wpm: number;
  accuracy: number;
  mistakes: number;
  typedCharacters: number;
  createdAt: string;
}

export interface SearchUserResult {
  id: string;
  name: string;
  email: string;
  tagline: string;
  avatarColor: string;
  favoriteMode: FavoriteMode;
  relationshipStatus: "none" | "friends" | "incoming_request" | "outgoing_request";
  requestId: string | null;
}

export interface ProfileDashboard {
  profile: ProfileIdentity;
  typingStats: ProfileStats;
  racingStats: RacingStats;
  recentTypingSessions: RecentTypingSession[];
  recentRaces: RecentRace[];
  friends: ProfileFriend[];
  incomingRequests: ProfileFriend[];
  outgoingRequests: ProfileFriend[];
}

interface FriendshipRecord {
  _id: unknown;
  requester: unknown;
  recipient: unknown;
  pairKey?: string;
  status: "pending" | "accepted";
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date | null;
}

interface AggregateStatsResult {
  sessionsCount?: number;
  bestWpm?: number;
  averageWpm?: number;
  bestAccuracy?: number;
  averageAccuracy?: number;
  totalMistakes?: number;
  winsCount?: number;
  podiumCount?: number;
}

const PROFILE_SEARCH_LIMIT = 8;

function normalizeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function buildPairKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

function assertObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error("Invalid user id");
  }

  return new Types.ObjectId(value);
}

function toProfileIdentity(user: BasicUserRecord): ProfileIdentity {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    tagline: user.tagline,
    bio: user.bio,
    country: user.country,
    favoriteMode: user.favoriteMode,
    avatarColor: user.avatarColor,
    memberSince: user.createdAt.toISOString(),
  };
}

function toProfileFriend(
  friendshipId: unknown,
  user: BasicUserRecord,
  createdAt: Date
): ProfileFriend {
  return {
    friendshipId: String(friendshipId),
    id: String(user._id),
    name: user.name,
    email: user.email,
    tagline: user.tagline,
    avatarColor: user.avatarColor,
    favoriteMode: user.favoriteMode,
    createdAt: createdAt.toISOString(),
  };
}

function emptyProfileStats(): ProfileStats {
  return {
    sessionsCount: 0,
    bestWpm: 0,
    averageWpm: 0,
    bestAccuracy: 0,
    averageAccuracy: 0,
    totalMistakes: 0,
  };
}

function emptyRacingStats(): RacingStats {
  return {
    ...emptyProfileStats(),
    winsCount: 0,
    podiumCount: 0,
  };
}

function roundMetric(value: number | undefined): number {
  return Number((value ?? 0).toFixed(2));
}

async function findUserOrThrow(userId: string): Promise<BasicUserRecord> {
  const user = await User.findById(userId)
    .select("name email tagline bio country favoriteMode avatarColor createdAt")
    .lean<BasicUserRecord | null>();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getUsersMap(userIds: string[]): Promise<Map<string, BasicUserRecord>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: userIds } })
    .select("name email tagline bio country favoriteMode avatarColor createdAt")
    .lean<BasicUserRecord[]>();

  return new Map(users.map((user) => [String(user._id), user]));
}

async function getTypingStats(userObjectId: Types.ObjectId): Promise<ProfileStats> {
  const [stats] = await TypingSession.aggregate<AggregateStatsResult>([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: null,
        sessionsCount: { $sum: 1 },
        bestWpm: { $max: "$wpm" },
        averageWpm: { $avg: "$wpm" },
        bestAccuracy: { $max: "$accuracy" },
        averageAccuracy: { $avg: "$accuracy" },
        totalMistakes: { $sum: "$mistakes" },
      },
    },
  ]);

  if (!stats) {
    return emptyProfileStats();
  }

  return {
    sessionsCount: stats.sessionsCount ?? 0,
    bestWpm: roundMetric(stats.bestWpm),
    averageWpm: roundMetric(stats.averageWpm),
    bestAccuracy: roundMetric(stats.bestAccuracy),
    averageAccuracy: roundMetric(stats.averageAccuracy),
    totalMistakes: stats.totalMistakes ?? 0,
  };
}

async function getRacingStats(userId: string): Promise<RacingStats> {
  const [stats] = await MultiplayerRaceResult.aggregate<AggregateStatsResult>([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        sessionsCount: { $sum: 1 },
        bestWpm: { $max: "$wpm" },
        averageWpm: { $avg: "$wpm" },
        bestAccuracy: { $max: "$accuracy" },
        averageAccuracy: { $avg: "$accuracy" },
        totalMistakes: { $sum: "$mistakes" },
        winsCount: {
          $sum: { $cond: [{ $eq: ["$rank", 1] }, 1, 0] },
        },
        podiumCount: {
          $sum: { $cond: [{ $lte: ["$rank", 3] }, 1, 0] },
        },
      },
    },
  ]);

  if (!stats) {
    return emptyRacingStats();
  }

  return {
    sessionsCount: stats.sessionsCount ?? 0,
    bestWpm: roundMetric(stats.bestWpm),
    averageWpm: roundMetric(stats.averageWpm),
    bestAccuracy: roundMetric(stats.bestAccuracy),
    averageAccuracy: roundMetric(stats.averageAccuracy),
    totalMistakes: stats.totalMistakes ?? 0,
    winsCount: stats.winsCount ?? 0,
    podiumCount: stats.podiumCount ?? 0,
  };
}

async function getRecentTypingSessions(
  userObjectId: Types.ObjectId
): Promise<RecentTypingSession[]> {
  const sessions = await TypingSession.find({ user: userObjectId })
    .sort({ createdAt: -1 })
    .limit(8)
    .select(
      "wpm accuracy mistakes elapsedMs durationSeconds completionReason createdAt"
    )
    .lean();

  return sessions.map((session) => ({
    id: String(session._id),
    wpm: session.wpm,
    accuracy: session.accuracy,
    mistakes: session.mistakes,
    elapsedMs: session.elapsedMs,
    durationSeconds: session.durationSeconds,
    completionReason: session.completionReason,
    createdAt: session.createdAt.toISOString(),
  }));
}

async function getRecentRaces(userId: string): Promise<RecentRace[]> {
  const races = await MultiplayerRaceResult.find({ userId })
    .sort({ createdAt: -1 })
    .limit(8)
    .select("roomId raceNumber rank score wpm accuracy mistakes typedCharacters createdAt")
    .lean();

  return races.map((race) => ({
    id: String(race._id),
    roomId: race.roomId,
    raceNumber: race.raceNumber,
    rank: race.rank,
    score: race.score,
    wpm: race.wpm,
    accuracy: race.accuracy,
    mistakes: race.mistakes,
    typedCharacters: race.typedCharacters,
    createdAt: race.createdAt.toISOString(),
  }));
}

async function getFriendshipCollections(userId: string): Promise<{
  friends: ProfileFriend[];
  incomingRequests: ProfileFriend[];
  outgoingRequests: ProfileFriend[];
}> {
  const userObjectId = assertObjectId(userId);
  const friendships = (await Friendship.collection
    .find({
      $or: [{ requester: userObjectId }, { recipient: userObjectId }],
    })
    .sort({ updatedAt: -1 })
    .toArray()) as unknown as FriendshipRecord[];

  const counterpartIds = friendships.map((friendship) =>
    String(friendship.requester) === userId ? friendship.recipient : friendship.requester
  );
  const usersMap = await getUsersMap(counterpartIds.map((id) => String(id)));

  const friends: ProfileFriend[] = [];
  const incomingRequests: ProfileFriend[] = [];
  const outgoingRequests: ProfileFriend[] = [];

  for (const friendship of friendships) {
    const counterpartId =
      String(friendship.requester) === userId
        ? String(friendship.recipient)
        : String(friendship.requester);
    const counterpart = usersMap.get(counterpartId);

    if (!counterpart) {
      continue;
    }

    const view = toProfileFriend(friendship._id, counterpart, friendship.createdAt);

    if (friendship.status === "accepted") {
      friends.push(view);
      continue;
    }

    if (String(friendship.recipient) === userId) {
      incomingRequests.push(view);
    } else {
      outgoingRequests.push(view);
    }
  }

  return { friends, incomingRequests, outgoingRequests };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getProfileDashboard(userId: string): Promise<ProfileDashboard> {
  const userObjectId = assertObjectId(userId);
  const user = await findUserOrThrow(userId);

  const [typingStats, racingStats, recentTypingSessions, recentRaces, friendshipCollections] =
    await Promise.all([
      getTypingStats(userObjectId),
      getRacingStats(userId),
      getRecentTypingSessions(userObjectId),
      getRecentRaces(userId),
      getFriendshipCollections(userId),
    ]);

  return {
    profile: toProfileIdentity(user),
    typingStats,
    racingStats,
    recentTypingSessions,
    recentRaces,
    friends: friendshipCollections.friends,
    incomingRequests: friendshipCollections.incomingRequests,
    outgoingRequests: friendshipCollections.outgoingRequests,
  };
}

export async function updateProfile(
  userId: string,
  payload: {
    name?: unknown;
    tagline?: unknown;
    bio?: unknown;
    country?: unknown;
    favoriteMode?: unknown;
    avatarColor?: unknown;
  }
): Promise<ProfileIdentity> {
  const update: Partial<BasicUserRecord> = {};

  if (payload.name !== undefined) {
    const name = normalizeString(payload.name, 60);
    if (!name) {
      throw new Error("name is required");
    }
    update.name = name;
  }

  if (payload.tagline !== undefined) {
    update.tagline = normalizeString(payload.tagline, 80);
  }

  if (payload.bio !== undefined) {
    update.bio = normalizeString(payload.bio, 220);
  }

  if (payload.country !== undefined) {
    update.country = normalizeString(payload.country, 56);
  }

  if (payload.favoriteMode !== undefined) {
    if (
      payload.favoriteMode !== "solo" &&
      payload.favoriteMode !== "multiplayer" &&
      payload.favoriteMode !== "hybrid"
    ) {
      throw new Error("favoriteMode must be solo, multiplayer, or hybrid");
    }

    update.favoriteMode = payload.favoriteMode;
  }

  if (payload.avatarColor !== undefined) {
    const avatarColor = normalizeString(payload.avatarColor, 7);

    if (!/^#?[0-9a-fA-F]{6}$/.test(avatarColor)) {
      throw new Error("avatarColor must be a valid hex color");
    }

    update.avatarColor = avatarColor.startsWith("#")
      ? avatarColor
      : `#${avatarColor}`;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select("name email tagline bio country favoriteMode avatarColor createdAt")
    .lean<BasicUserRecord | null>();

  if (!user) {
    throw new Error("User not found");
  }

  return toProfileIdentity(user);
}

export async function searchProfileUsers(
  userId: string,
  query: string
): Promise<SearchUserResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const regex = new RegExp(escapeRegex(trimmedQuery), "i");
  const users = await User.find({
    _id: { $ne: userId },
    $or: [{ name: regex }, { email: regex }],
  })
    .select("name email tagline favoriteMode avatarColor")
    .sort({ name: 1 })
    .limit(PROFILE_SEARCH_LIMIT)
    .lean<
      Pick<
        BasicUserRecord,
        "_id" | "name" | "email" | "tagline" | "favoriteMode" | "avatarColor"
      >[]
    >();

  const pairKeys = users.map((user) => buildPairKey(userId, String(user._id)));
  const friendships = (await Friendship.collection
    .find({ pairKey: { $in: pairKeys } })
    .project({ _id: 1, requester: 1, recipient: 1, status: 1, pairKey: 1 })
    .toArray()) as unknown as FriendshipRecord[];

  const friendshipByPairKey = new Map(
    friendships.map((friendship) => [friendship.pairKey, friendship])
  );

  return users.map((user) => {
    const pairKey = buildPairKey(userId, String(user._id));
    const friendship = friendshipByPairKey.get(pairKey);

    let relationshipStatus: SearchUserResult["relationshipStatus"] = "none";
    let requestId: string | null = null;

    if (friendship) {
      requestId = String(friendship._id);

      if (friendship.status === "accepted") {
        relationshipStatus = "friends";
      } else if (String(friendship.recipient) === userId) {
        relationshipStatus = "incoming_request";
      } else {
        relationshipStatus = "outgoing_request";
      }
    }

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      tagline: user.tagline,
      avatarColor: user.avatarColor,
      favoriteMode: user.favoriteMode,
      relationshipStatus,
      requestId,
    };
  });
}

export async function sendFriendRequest(
  requesterUserId: string,
  recipientUserId: string
): Promise<{ requestId: string }> {
  if (requesterUserId === recipientUserId) {
    throw new Error("You cannot add yourself");
  }

  const requesterObjectId = assertObjectId(requesterUserId);
  const recipientObjectId = assertObjectId(recipientUserId);

  const recipient = await User.findById(recipientUserId).select("_id").lean();

  if (!recipient) {
    throw new Error("Target user not found");
  }

  const pairKey = buildPairKey(requesterUserId, recipientUserId);
  const existing = (await Friendship.collection.findOne({
    pairKey,
  })) as unknown as FriendshipRecord | null;

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("You are already friends");
    }

    if (String(existing.requester) === requesterUserId) {
      throw new Error("Friend request already sent");
    }

    throw new Error("This user already sent you a friend request");
  }

  const request = await Friendship.collection.insertOne({
    requester: requesterObjectId,
    recipient: recipientObjectId,
    pairKey,
    status: "pending",
    acceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    requestId: String(request.insertedId),
  };
}

export async function acceptFriendRequest(
  currentUserId: string,
  requestId: string
): Promise<void> {
  const currentUserObjectId = assertObjectId(currentUserId);
  const requestObjectId = assertObjectId(requestId);

  const updated = await Friendship.collection.findOneAndUpdate(
    {
      _id: requestObjectId,
      recipient: currentUserObjectId,
      status: "pending",
    },
    {
      $set: {
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  if (!updated) {
    throw new Error("Friend request not found");
  }
}

export async function deleteFriendRequest(
  currentUserId: string,
  requestId: string
): Promise<void> {
  const currentUserObjectId = assertObjectId(currentUserId);
  const requestObjectId = assertObjectId(requestId);

  const deleted = await Friendship.collection.findOneAndDelete({
    _id: requestObjectId,
    status: "pending",
    $or: [
      { requester: currentUserObjectId },
      { recipient: currentUserObjectId },
    ],
  });

  if (!deleted) {
    throw new Error("Friend request not found");
  }
}

export async function removeFriend(
  currentUserId: string,
  friendUserId: string
): Promise<void> {
  const pairKey = buildPairKey(currentUserId, friendUserId);

  const deleted = await Friendship.collection.findOneAndDelete({
    pairKey,
    status: "accepted",
  });

  if (!deleted) {
    throw new Error("Friendship not found");
  }
}
