import { Types } from "mongoose";

import Friendship from "../../models/Friendship.model.js";
import MultiplayerRaceResult from "../../models/MultiplayerRaceResult.model.js";
import PlayerBadge, { IPlayerBadge } from "../../models/PlayerBadge.model.js";
import PlayerDailyActivity, {
  IPlayerDailyActivity,
} from "../../models/PlayerDailyActivity.model.js";
import PlayerProfileStats, {
  IPlayerProfileStats,
} from "../../models/PlayerProfileStats.model.js";
import TypingSession from "../../models/TypingSession.model.js";
import User, { IUser } from "../../models/User.model.js";
import { cloudinary } from "../../config/cloudinary.js";
import {
  BADGE_DEFINITIONS,
  BadgeDefinition,
} from "../gamification/config.js";
import {
  ensureUserIdentityFields,
  getPlayerProfileStats,
  getPublicGamificationByUsername,
  normalizeTimezone,
  rebuildUserGamification,
  syncIdentitySnapshots,
  getUserDisplayName,
} from "../gamification/service.js";
import { generateUniqueUsername, normalizeUsernameCandidate } from "../gamification/username.js";
import { eventBus } from "../../core/events/eventBus.js";
import { Events } from "../../core/events/eventNames.js";

type FavoriteMode = "solo" | "multiplayer" | "hybrid";
type ProfileVisibility = "public" | "private";

interface BasicUserRecord {
  _id: unknown;
  name: string;
  displayName: string;
  username: string;
  avatarImageUrl?: string;
  email: string;
  tagline: string;
  bio: string;
  country: string;
  timezone: string;
  profileVisibility: ProfileVisibility;
  usernameUpdatedAt?: Date | null;
  favoriteMode: FavoriteMode;
  avatarColor: string;
  createdAt: Date;
}

export interface ProfileIdentity {
  id: string;
  name: string;
  displayName: string;
  username: string;
  avatarImageUrl?: string;
  email: string;
  tagline: string;
  bio: string;
  country: string;
  timezone: string;
  profileVisibility: ProfileVisibility;
  favoriteMode: FavoriteMode;
  avatarColor: string;
  memberSince: string;
}

export interface PublicProfileIdentity {
  id: string;
  name: string;
  displayName: string;
  username: string;
  tagline: string;
  bio: string;
  country: string;
  timezone: string;
  favoriteMode: FavoriteMode;
  avatarColor: string;
  avatarImageUrl?: string;
  memberSince: string;
}

export interface ProfileFriend {
  friendshipId: string;
  id: string;
  name: string;
  displayName: string;
  username: string;
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

export interface GamificationSummary {
  xp: number;
  level: number;
  levelProgressPercent: number;
  currentStreak: number;
  longestStreak: number;
  activeDaysCount: number;
  earnedBadgeCount: number;
}

export interface ActivityGridCell {
  activityDate: string;
  heatScore: number;
  xpEarned: number;
  completedDay: boolean;
  typingSessionsCount: number;
  multiplayerRacesCount: number;
  bestWpm: number;
  bestAccuracy: number;
}

export interface PublicBadgeView {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeDefinition["category"];
  rarity: BadgeDefinition["rarity"];
  sortOrder: number;
  progressCurrent: number;
  progressTarget: number;
  isCompleted: boolean;
  awardedAt: string | null;
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
  displayName: string;
  username: string;
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
  gamification: GamificationSummary;
  activityGrid: ActivityGridCell[];
  badges: PublicBadgeView[];
  recentTypingSessions: RecentTypingSession[];
  recentRaces: RecentRace[];
  friends: ProfileFriend[];
  incomingRequests: ProfileFriend[];
  outgoingRequests: ProfileFriend[];
}

export interface PublicProfileView {
  profile: PublicProfileIdentity;
  typingStats: ProfileStats;
  racingStats: RacingStats;
  gamification: GamificationSummary;
  activityGrid: ActivityGridCell[];
  badges: PublicBadgeView[];
  recentTypingSessions: RecentTypingSession[];
  recentRaces: RecentRace[];
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

const PROFILE_SEARCH_LIMIT = 8;
const DEFAULT_ACTIVITY_GRID_DAYS = 180;
const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

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
  const displayName = getUserDisplayName(user);

  return {
    id: String(user._id),
    name: displayName,
    displayName,
    username: user.username,
    avatarImageUrl: user.avatarImageUrl ?? undefined,
    email: user.email,
    tagline: user.tagline,
    bio: user.bio,
    country: user.country,
    timezone: user.timezone,
    profileVisibility: user.profileVisibility,
    favoriteMode: user.favoriteMode,
    avatarColor: user.avatarColor,
    memberSince: user.createdAt.toISOString(),
  };
}

function toPublicProfileIdentity(user: BasicUserRecord): PublicProfileIdentity {
  const displayName = getUserDisplayName(user);

  return {
    id: String(user._id),
    name: displayName,
    displayName,
    username: user.username,
    tagline: user.tagline,
    bio: user.bio,
    country: user.country,
    timezone: user.timezone,
    favoriteMode: user.favoriteMode,
    avatarColor: user.avatarColor,
    avatarImageUrl: user.avatarImageUrl ?? undefined,
    memberSince: user.createdAt.toISOString(),
  };
}

function toProfileFriend(friendshipId: unknown, user: BasicUserRecord, createdAt: Date): ProfileFriend {
  const displayName = getUserDisplayName(user);

  return {
    friendshipId: String(friendshipId),
    id: String(user._id),
    name: displayName,
    displayName,
    username: user.username,
    tagline: user.tagline,
    avatarColor: user.avatarColor,
    favoriteMode: user.favoriteMode,
    createdAt: createdAt.toISOString(),
  };
}

function toTypingStats(stats: IPlayerProfileStats | null): ProfileStats {
  return {
    sessionsCount: stats?.typing.sessionsCount ?? 0,
    bestWpm: stats?.typing.bestWpm ?? 0,
    averageWpm: stats?.typing.averageWpm ?? 0,
    bestAccuracy: stats?.typing.bestAccuracy ?? 0,
    averageAccuracy: stats?.typing.averageAccuracy ?? 0,
    totalMistakes: stats?.typing.totalMistakes ?? 0,
  };
}

function toRacingStats(stats: IPlayerProfileStats | null): RacingStats {
  return {
    sessionsCount: stats?.multiplayer.racesCount ?? 0,
    bestWpm: stats?.multiplayer.bestWpm ?? 0,
    averageWpm: stats?.multiplayer.averageWpm ?? 0,
    bestAccuracy: stats?.typing.bestAccuracy ?? 0,
    averageAccuracy: stats?.multiplayer.averageAccuracy ?? 0,
    totalMistakes: 0,
    winsCount: stats?.multiplayer.winsCount ?? 0,
    podiumCount: stats?.multiplayer.podiumCount ?? 0,
  };
}

function toGamificationSummary(stats: IPlayerProfileStats | null): GamificationSummary {
  return {
    xp: stats?.progression.xp ?? 0,
    level: stats?.progression.level ?? 1,
    levelProgressPercent: stats?.progression.levelProgressPercent ?? 0,
    currentStreak: stats?.engagement.currentStreak ?? 0,
    longestStreak: stats?.engagement.longestStreak ?? 0,
    activeDaysCount: stats?.engagement.activeDaysCount ?? 0,
    earnedBadgeCount: stats?.progression.earnedBadgeCount ?? 0,
  };
}

function toActivityCell(activity: IPlayerDailyActivity): ActivityGridCell {
  return {
    activityDate: activity.activityDate,
    heatScore: activity.heatScore,
    xpEarned: activity.xpEarned,
    completedDay: activity.completedDay,
    typingSessionsCount: activity.typingSessionsCount,
    multiplayerRacesCount: activity.multiplayerRacesCount,
    bestWpm: activity.bestWpm,
    bestAccuracy: activity.bestAccuracy,
  };
}

function toBadgeView(badge: IPlayerBadge): PublicBadgeView | null {
  const definition = BADGE_DEFINITIONS.find((candidate) => candidate.key === badge.badgeKey);

  if (!definition) {
    return null;
  }

  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    category: definition.category,
    rarity: definition.rarity,
    sortOrder: definition.sortOrder,
    progressCurrent: badge.progressCurrent,
    progressTarget: badge.progressTarget,
    isCompleted: badge.isCompleted,
    awardedAt: badge.awardedAt ? badge.awardedAt.toISOString() : null,
  };
}

async function findUserOrThrowById(userId: string): Promise<BasicUserRecord> {
  await ensureUserIdentityFields(userId);

  const user = await User.findById(userId)
    .select(
      "name displayName username email tagline bio country timezone profileVisibility favoriteMode avatarColor avatarImageUrl usernameUpdatedAt createdAt"
    )
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
    .select(
      "name displayName username email tagline bio country timezone profileVisibility favoriteMode avatarColor avatarImageUrl createdAt"
    )
    .lean<BasicUserRecord[]>();

  return new Map(users.map((user) => [String(user._id), user]));
}

async function getRecentTypingSessions(userObjectId: Types.ObjectId): Promise<RecentTypingSession[]> {
  const sessions = await TypingSession.find({ user: userObjectId })
    .sort({ createdAt: -1 })
    .limit(8)
    .select("wpm accuracy mistakes elapsedMs durationSeconds completionReason createdAt")
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

function toBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

function getActivityRange(days: number): { from: Date; fromDateKey: string } {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(0, days - 1));
  const fromDateKey = from.toISOString().slice(0, 10);
  return { from, fromDateKey };
}

async function getActivityGrid(userId: string, limitDays = DEFAULT_ACTIVITY_GRID_DAYS): Promise<ActivityGridCell[]> {
  const { fromDateKey } = getActivityRange(limitDays);

  const activities = await PlayerDailyActivity.find({
    userId,
    activityDate: { $gte: fromDateKey },
  })
    .sort({ activityDate: 1 })
    .lean<IPlayerDailyActivity[]>();

  return activities.map(toActivityCell);
}

async function getBadgeViews(userId: string): Promise<PublicBadgeView[]> {
  const badges = await PlayerBadge.find({ userId }).lean<IPlayerBadge[]>();

  return badges
    .map(toBadgeView)
    .filter((badge): badge is PublicBadgeView => Boolean(badge))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getProfileDashboard(userId: string): Promise<ProfileDashboard> {
  const userObjectId = assertObjectId(userId);
  const user = await findUserOrThrowById(userId);
  await rebuildUserGamification(userId);

  const [profileStats, recentTypingSessions, recentRaces, friendshipCollections, activityGrid, badges] =
    await Promise.all([
      getPlayerProfileStats(userId),
      getRecentTypingSessions(userObjectId),
      getRecentRaces(userId),
      getFriendshipCollections(userId),
      getActivityGrid(userId),
      getBadgeViews(userId),
    ]);

  return {
    profile: toProfileIdentity(user),
    typingStats: toTypingStats(profileStats),
    racingStats: toRacingStats(profileStats),
    gamification: toGamificationSummary(profileStats),
    activityGrid,
    badges,
    recentTypingSessions,
    recentRaces,
    friends: friendshipCollections.friends,
    incomingRequests: friendshipCollections.incomingRequests,
    outgoingRequests: friendshipCollections.outgoingRequests,
  };
}

export async function updateProfileIdentity(
  userId: string,
  payload: {
    displayName?: unknown;
    tagline?: unknown;
    bio?: unknown;
    country?: unknown;
    timezone?: unknown;
    favoriteMode?: unknown;
    avatarColor?: unknown;
    profileVisibility?: unknown;
    name?: unknown;
  }
): Promise<ProfileIdentity> {
  const update: Partial<IUser> = {};

  if (payload.displayName !== undefined || payload.name !== undefined) {
    const displayName = normalizeString(payload.displayName ?? payload.name, 60);
    if (!displayName) {
      throw new Error("displayName is required");
    }
    update.displayName = displayName;
    update.name = displayName;
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

  if (payload.timezone !== undefined) {
    update.timezone = normalizeTimezone(normalizeString(payload.timezone, 64));
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

  if (payload.profileVisibility !== undefined) {
    if (payload.profileVisibility !== "public" && payload.profileVisibility !== "private") {
      throw new Error("profileVisibility must be public or private");
    }

    update.profileVisibility = payload.profileVisibility;
  }

  if (payload.avatarColor !== undefined) {
    const avatarColor = normalizeString(payload.avatarColor, 7);

    if (!/^#?[0-9a-fA-F]{6}$/.test(avatarColor)) {
      throw new Error("avatarColor must be a valid hex color");
    }

    update.avatarColor = avatarColor.startsWith("#") ? avatarColor : `#${avatarColor}`;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select(
      "name displayName username email tagline bio country timezone profileVisibility favoriteMode avatarColor createdAt"
    )
    .lean<BasicUserRecord | null>();

  if (!user) {
    throw new Error("User not found");
  }

  await syncIdentitySnapshots(userId);
  return toProfileIdentity(user);
}

export async function checkUsernameAvailability(
  userId: string,
  payload: { username?: unknown }
): Promise<{ available: boolean }> {

  const nextUsername = normalizeUsernameCandidate(normalizeString(payload.username, 40));

  if (!nextUsername) {
    throw new Error("username is required");
  }

  const user = await User.findById(userId).select("_id username").lean<IUser | null>();
  if (!user) {
    throw new Error("User not found");
  }

  // Always allow your own current username.
  if (user.username === nextUsername) {
    return { available: true };
  }

  const existing = await User.findOne({ username: nextUsername }).select("_id").lean();
  if (existing && String(existing._id) !== userId) {
    return { available: false };
  }

  return { available: true };
}

export async function updateProfileUsername(
  userId: string,
  payload: { username?: unknown }
): Promise<ProfileIdentity> {

  const nextUsername = normalizeUsernameCandidate(normalizeString(payload.username, 40));

  if (!nextUsername) {
    throw new Error("username is required");
  }

  const user = await findUserOrThrowById(userId);
  const now = new Date();

  if (user.username === nextUsername) {
    return toProfileIdentity(user);
  }

  if (user.usernameUpdatedAt) {
    const nextAllowedAt = new Date(user.usernameUpdatedAt);
    nextAllowedAt.setUTCDate(nextAllowedAt.getUTCDate() + USERNAME_CHANGE_COOLDOWN_DAYS);

    if (now.getTime() < nextAllowedAt.getTime()) {
      throw new Error("Username can only be changed every 30 days");
    }
  }

  const existing = await User.findOne({ username: nextUsername }).select("_id").lean();

  if (existing && String(existing._id) !== userId) {
    throw new Error("Username is already taken");
  }

  const finalUsername =
    existing && String(existing._id) === userId
      ? nextUsername
      : await generateUniqueUsername(nextUsername);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        username: finalUsername,
        usernameUpdatedAt: now,
      },
      $inc: {
        usernameChangeCount: 1,
      },
    },
    { new: true }
  )
    .select(
      "name displayName username email tagline bio country timezone profileVisibility favoriteMode avatarColor createdAt"
    )
    .lean<BasicUserRecord | null>();

  if (!updated) {
    throw new Error("User not found");
  }

  await syncIdentitySnapshots(userId);
  return toProfileIdentity(updated);
}

export async function getPublicProfile(username: string): Promise<PublicProfileView> {
  const { user, stats, activities } = await getPublicGamificationByUsername(username);

  if (user.profileVisibility === "private") {
    throw new Error("Profile not found");
  }

  const [badges, recentTypingSessions, recentRaces] = await Promise.all([
    getBadgeViews(String(user._id)),
    getRecentTypingSessions(assertObjectId(String(user._id))),
    getRecentRaces(String(user._id)),
  ]);

  return {
    profile: toPublicProfileIdentity(user as unknown as BasicUserRecord),
    typingStats: toTypingStats(stats),
    racingStats: toRacingStats(stats),
    gamification: toGamificationSummary(stats),
    activityGrid: activities.map(toActivityCell),
    badges,
    recentTypingSessions,
    recentRaces,
  };
}

export async function getPublicProfileActivity(
  username: string,
  options?: { from?: string; to?: string }
): Promise<ActivityGridCell[]> {
  const normalizedUsername = normalizeUsernameCandidate(username);
  const user = await User.findOne({ username: normalizedUsername })
    .select("_id profileVisibility")
    .lean<Pick<BasicUserRecord, "_id" | "profileVisibility"> | null>();

  if (!user || user.profileVisibility === "private") {
    throw new Error("Profile not found");
  }

  const query: Record<string, unknown> = { userId: String(user._id) };

  if (options?.from || options?.to) {
    query.activityDate = {};

    if (options.from) {
      (query.activityDate as Record<string, string>).$gte = options.from;
    }

    if (options.to) {
      (query.activityDate as Record<string, string>).$lte = options.to;
    }
  }

  const activities = await PlayerDailyActivity.find(query)
    .sort({ activityDate: 1 })
    .lean<IPlayerDailyActivity[]>();

  return activities.map(toActivityCell);
}

export async function getPublicProfileBadges(username: string): Promise<PublicBadgeView[]> {
  const normalizedUsername = normalizeUsernameCandidate(username);
  const user = await User.findOne({ username: normalizedUsername })
    .select("_id profileVisibility")
    .lean<Pick<BasicUserRecord, "_id" | "profileVisibility"> | null>();

  if (!user || user.profileVisibility === "private") {
    throw new Error("Profile not found");
  }

  return getBadgeViews(String(user._id));
}

export async function searchProfileUsers(userId: string, query: string): Promise<SearchUserResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const regex = new RegExp(escapeRegex(trimmedQuery), "i");
  const users = await User.find({
    _id: { $ne: userId },
    profileVisibility: "public",
    $or: [{ username: regex }, { displayName: regex }],
  })
    .select("name displayName username tagline favoriteMode avatarColor")
    .sort({ username: 1 })
    .limit(PROFILE_SEARCH_LIMIT)
    .lean<
      Pick<
        BasicUserRecord,
        "_id" | "name" | "displayName" | "username" | "tagline" | "favoriteMode" | "avatarColor"
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
      name: user.displayName || user.name,
      displayName: user.displayName || user.name,
      username: user.username,
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

  const requester = await User.findById(requesterUserId).select("name displayName").lean();
  const requesterName = requester ? (requester.displayName || requester.name) : "Someone";

  eventBus.emit(Events.FRIEND_REQUEST_SENT, {
    requesterUserId,
    recipientUserId,
    requesterName,
  });

  return {
    requestId: String(request.insertedId),
  };
}

export async function acceptFriendRequest(currentUserId: string, requestId: string): Promise<void> {
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

export async function deleteFriendRequest(currentUserId: string, requestId: string): Promise<void> {
  const currentUserObjectId = assertObjectId(currentUserId);
  const requestObjectId = assertObjectId(requestId);

  const deleted = await Friendship.collection.findOneAndDelete({
    _id: requestObjectId,
    status: "pending",
    $or: [{ requester: currentUserObjectId }, { recipient: currentUserObjectId }],
  });

  if (!deleted) {
    throw new Error("Friend request not found");
  }
}

export async function removeFriend(currentUserId: string, friendUserId: string): Promise<void> {
  const pairKey = buildPairKey(currentUserId, friendUserId);

  const deleted = await Friendship.collection.findOneAndDelete({
    pairKey,
    status: "accepted",
  });

  if (!deleted) {
    throw new Error("Friendship not found");
  }
}

export async function updateMyAvatar(
  userId: string,
  buffer: Buffer,
  mimetype: string
): Promise<void> {
  const user = await User.findById(userId).select("_id").lean<IUser | null>();
  if (!user) {
    throw new Error("User not found");
  }

  if (!buffer || buffer.length === 0) {
    throw new Error("Avatar file is empty");
  }

  // More robust upload: stream the buffer to Cloudinary (avoids data-uri parsing issues)
  const uploadResult = await new Promise<{
    secure_url?: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "typemetric/avatars",
        resource_type: "image",
        overwrite: true,
        public_id: userId, // overwrite previous avatar for the user
        // cloudinary doesn't strictly require it, but helps for some types
        transformation: [{ quality: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as { secure_url?: string });
      }
    );

    stream.end(buffer);
  });

  if (!uploadResult?.secure_url) {
    throw new Error("Cloudinary upload succeeded but secure_url was missing");
  }

  await User.findByIdAndUpdate(userId, {
    $set: { avatarImageUrl: uploadResult.secure_url },
  });
}

export async function addFcmToken(userId: string, token: string): Promise<void> {
  if (!token || token.trim().length === 0) {
    throw new Error("FCM token is required");
  }
  await User.findByIdAndUpdate(userId, {
    $addToSet: { fcmTokens: token }
  });
}

export async function removeFcmToken(userId: string, token: string): Promise<void> {
  if (!token || token.trim().length === 0) {
    throw new Error("FCM token is required");
  }
  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: token }
  });
}
