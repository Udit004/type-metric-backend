import MultiplayerRaceResult, {
  IMultiplayerRaceResult,
} from "../../models/MultiplayerRaceResult.model.js";
import PlayerBadge from "../../models/PlayerBadge.model.js";
import PlayerDailyActivity, {
  IPlayerDailyActivity,
} from "../../models/PlayerDailyActivity.model.js";
import PlayerProfileStats, {
  IPlayerProfileStats,
} from "../../models/PlayerProfileStats.model.js";
import TypingSession, { ITypingSession } from "../../models/TypingSession.model.js";
import User, { IUser } from "../../models/User.model.js";
import {
  BADGE_DEFINITIONS,
  BadgeDefinition,
  MINIMUM_VALID_ACCURACY,
  MINIMUM_VALID_TYPED_CHARACTERS,
  MINIMUM_VALID_TYPING_DURATION_SECONDS,
  XP_LEVEL_THRESHOLDS,
} from "./config.js";
import { generateUniqueUsername, normalizeUsernameCandidate } from "./username.js";

type LeanUserIdentity = Pick<
  IUser,
  | "name"
  | "displayName"
  | "email"
  | "username"
  | "timezone"
  | "profileVisibility"
  | "favoriteMode"
  | "avatarColor"
  | "country"
  | "bio"
  | "tagline"
  | "gamificationVersion"
> & {
  _id: unknown;
  createdAt: Date;
};

interface MutableDailyActivity {
  userId: string;
  activityDate: string;
  timezone: string;
  typingSessionsCount: number;
  multiplayerRacesCount: number;
  charactersTyped: number;
  correctCharacters: number;
  mistakes: number;
  activeSeconds: number;
  xpEarned: number;
  bestWpm: number;
  bestAccuracy: number;
  completedDay: boolean;
  heatScore: number;
  firstActivityAt: Date;
  lastActivityAt: Date;
}

interface BuiltProfile {
  stats: Omit<IPlayerProfileStats, "createdAt" | "updatedAt">;
  activities: Omit<IPlayerDailyActivity, "createdAt" | "updatedAt">[];
  badges: {
    badgeKey: string;
    progressCurrent: number;
    progressTarget: number;
    isCompleted: boolean;
    awardedAt: Date | null;
    lastProgressAt: Date | null;
  }[];
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

export function getUserDisplayName(user: Pick<IUser, "displayName" | "name">): string {
  return user.displayName?.trim() || user.name.trim();
}

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone: string | undefined | null): string {
  if (!timezone) {
    return "UTC";
  }

  return isValidTimezone(timezone.trim()) ? timezone.trim() : "UTC";
}

export async function ensureUserIdentityFields(userId: string): Promise<LeanUserIdentity> {
  const user = await User.findById(userId).lean<LeanUserIdentity | null>();

  if (!user) {
    throw new Error("User not found");
  }

  const update: Partial<IUser> = {};
  let hasUpdate = false;

  if (!user.username) {
    update.username = await generateUniqueUsername(user.email || user.name || "player");
    hasUpdate = true;
  }

  if (!user.displayName?.trim()) {
    update.displayName = user.name;
    hasUpdate = true;
  }

  const normalizedTimezone = normalizeTimezone(user.timezone);
  if (user.timezone !== normalizedTimezone) {
    update.timezone = normalizedTimezone;
    hasUpdate = true;
  }

  if (!user.profileVisibility) {
    update.profileVisibility = "public";
    hasUpdate = true;
  }

  if (typeof user.gamificationVersion !== "number") {
    update.gamificationVersion = 1;
    hasUpdate = true;
  }

  if (hasUpdate) {
    await User.updateOne({ _id: userId }, { $set: update });
    return (await User.findById(userId).lean<LeanUserIdentity | null>()) as LeanUserIdentity;
  }

  return user;
}

export function isTypingSessionGamificationEligible(
  session: Pick<ITypingSession, "durationSeconds" | "typedCharactersCount" | "accuracy">
): boolean {
  return (
    session.durationSeconds >= MINIMUM_VALID_TYPING_DURATION_SECONDS &&
    session.typedCharactersCount >= MINIMUM_VALID_TYPED_CHARACTERS &&
    session.accuracy >= MINIMUM_VALID_ACCURACY
  );
}

function calculateStreakBonusMultiplier(streak: number): number {
  if (streak >= 30) {
    return 1.5;
  }

  if (streak >= 7) {
    return 1.25;
  }

  if (streak >= 3) {
    return 1.1;
  }

  return 1;
}

export function calculateSoloSessionXp(
  session: Pick<ITypingSession, "wpm" | "accuracy" | "durationSeconds" | "typedCharactersCount">,
  streak: number
): number {
  if (!isTypingSessionGamificationEligible(session)) {
    return 0;
  }

  const accuracyBonus =
    session.accuracy >= 98 ? 12 : session.accuracy >= 95 ? 8 : session.accuracy >= 90 ? 5 : 2;
  const speedBonus = Math.floor(session.wpm / 10);
  const staminaBonus = Math.min(10, Math.floor(session.durationSeconds / 30));
  const baseXp = 10 + speedBonus + accuracyBonus + staminaBonus;

  return Math.max(0, Math.round(baseXp * calculateStreakBonusMultiplier(streak)));
}

export function calculateMultiplayerRaceXp(
  race: Pick<IMultiplayerRaceResult, "rank" | "wpm" | "accuracy">
): number {
  const placementBonus = race.rank === 1 ? 18 : race.rank === 2 ? 12 : race.rank === 3 ? 8 : 4;
  const speedBonus = Math.floor(race.wpm / 12);
  const accuracyBonus = race.accuracy >= 98 ? 10 : race.accuracy >= 95 ? 6 : race.accuracy >= 90 ? 3 : 1;
  return 8 + placementBonus + speedBonus + accuracyBonus;
}

function getDayKey(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function daysBetween(previousDay: string, nextDay: string): number {
  const previous = new Date(`${previousDay}T00:00:00.000Z`);
  const next = new Date(`${nextDay}T00:00:00.000Z`);
  return Math.round((next.getTime() - previous.getTime()) / 86400000);
}

function getLevelForXp(xp: number): { level: number; levelProgressPercent: number } {
  let level = 1;

  while (level < XP_LEVEL_THRESHOLDS.length && xp >= XP_LEVEL_THRESHOLDS[level]) {
    level += 1;
  }

  const levelIndex = level - 1;
  const currentThreshold =
    XP_LEVEL_THRESHOLDS[levelIndex] ?? XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1];
  const nextThreshold =
    XP_LEVEL_THRESHOLDS[levelIndex + 1] ?? currentThreshold + 1000;
  const range = nextThreshold - currentThreshold;
  const progress = range <= 0 ? 100 : ((xp - currentThreshold) / range) * 100;

  return {
    level,
    levelProgressPercent: roundMetric(Math.max(0, Math.min(100, progress))),
  };
}

function toHeatScore(xpEarned: number): number {
  if (xpEarned <= 0) {
    return 0;
  }

  if (xpEarned < 20) {
    return 1;
  }

  if (xpEarned < 40) {
    return 2;
  }

  if (xpEarned < 80) {
    return 3;
  }

  return 4;
}

function createDailyActivity(userId: string, timezone: string, date: string, createdAt: Date): MutableDailyActivity {
  return {
    userId,
    activityDate: date,
    timezone,
    typingSessionsCount: 0,
    multiplayerRacesCount: 0,
    charactersTyped: 0,
    correctCharacters: 0,
    mistakes: 0,
    activeSeconds: 0,
    xpEarned: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    completedDay: false,
    heatScore: 0,
    firstActivityAt: createdAt,
    lastActivityAt: createdAt,
  };
}

function getBadgeProgress(
  definition: BadgeDefinition,
  stats: BuiltProfile["stats"]
): number {
  switch (definition.criteria.type) {
    case "typing_sessions":
      return stats.typing.sessionsCount;
    case "current_streak":
      return stats.engagement.currentStreak;
    case "best_wpm":
      return stats.typing.bestWpm;
    case "best_accuracy":
      return stats.typing.bestAccuracy;
    case "multiplayer_races":
      return stats.multiplayer.racesCount;
    case "multiplayer_wins":
      return stats.multiplayer.winsCount;
    case "multiplayer_podiums":
      return stats.multiplayer.podiumCount;
    default:
      return 0;
  }
}

function buildBadges(
  stats: BuiltProfile["stats"],
  lastActivityAt: Date | null
): BuiltProfile["badges"] {
  return BADGE_DEFINITIONS.map((definition) => {
    const progressCurrent = Math.min(
      definition.criteria.target,
      getBadgeProgress(definition, stats)
    );
    const isCompleted = progressCurrent >= definition.criteria.target;

    return {
      badgeKey: definition.key,
      progressCurrent,
      progressTarget: definition.criteria.target,
      isCompleted,
      awardedAt: isCompleted ? lastActivityAt : null,
      lastProgressAt: progressCurrent > 0 ? lastActivityAt : null,
    };
  });
}

function sortActivities(activities: Map<string, MutableDailyActivity>): MutableDailyActivity[] {
  return Array.from(activities.values()).sort((left, right) =>
    left.activityDate.localeCompare(right.activityDate)
  );
}

function buildEmptyStats(user: LeanUserIdentity): BuiltProfile["stats"] {
  return {
    userId: String(user._id),
    usernameSnapshot: user.username,
    displayNameSnapshot: getUserDisplayName(user),
    typing: {
      sessionsCount: 0,
      bestWpm: 0,
      averageWpm: 0,
      bestAccuracy: 0,
      averageAccuracy: 0,
      totalCharactersTyped: 0,
      totalCorrectCharacters: 0,
      totalMistakes: 0,
      totalActiveSeconds: 0,
      lastSessionAt: null,
    },
    multiplayer: {
      racesCount: 0,
      winsCount: 0,
      podiumCount: 0,
      bestRank: null,
      bestWpm: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      totalScore: 0,
      lastRaceAt: null,
    },
    engagement: {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: null,
      activeDaysCount: 0,
    },
    progression: {
      xp: 0,
      level: 1,
      levelProgressPercent: 0,
      earnedBadgeCount: 0,
    },
  };
}

function buildUserGamificationFromSources(
  user: LeanUserIdentity,
  sessions: ITypingSession[],
  races: IMultiplayerRaceResult[]
): BuiltProfile {
  const timezone = normalizeTimezone(user.timezone);
  const userId = String(user._id);
  const stats = buildEmptyStats(user);
  const activities = new Map<string, MutableDailyActivity>();

  let streak = 0;
  let longestStreak = 0;
  let lastCompletedDay: string | null = null;

  const sortedSessions = [...sessions].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
  );

  for (const session of sortedSessions) {
    const activityDate = getDayKey(session.createdAt, timezone);
    const activity =
      activities.get(activityDate) ?? createDailyActivity(userId, timezone, activityDate, session.createdAt);
    activities.set(activityDate, activity);

    activity.typingSessionsCount += 1;
    activity.charactersTyped += session.typedCharactersCount;
    activity.correctCharacters += session.correctCharacters;
    activity.mistakes += session.mistakes;
    activity.activeSeconds += session.durationSeconds;
    activity.bestWpm = Math.max(activity.bestWpm, session.wpm);
    activity.bestAccuracy = Math.max(activity.bestAccuracy, session.accuracy);
    activity.firstActivityAt =
      activity.firstActivityAt.getTime() <= session.createdAt.getTime()
        ? activity.firstActivityAt
        : session.createdAt;
    activity.lastActivityAt =
      activity.lastActivityAt.getTime() >= session.createdAt.getTime()
        ? activity.lastActivityAt
        : session.createdAt;

    stats.typing.sessionsCount += 1;
    stats.typing.bestWpm = Math.max(stats.typing.bestWpm, session.wpm);
    stats.typing.bestAccuracy = Math.max(stats.typing.bestAccuracy, session.accuracy);
    stats.typing.totalCharactersTyped += session.typedCharactersCount;
    stats.typing.totalCorrectCharacters += session.correctCharacters;
    stats.typing.totalMistakes += session.mistakes;
    stats.typing.totalActiveSeconds += session.durationSeconds;
    stats.typing.lastSessionAt = session.createdAt;

    const isEligible = isTypingSessionGamificationEligible(session);

    if (isEligible && !activity.completedDay) {
      if (!lastCompletedDay) {
        streak = 1;
      } else {
        const gap = daysBetween(lastCompletedDay, activityDate);
        streak = gap === 1 ? streak + 1 : 1;
      }

      lastCompletedDay = activityDate;
      longestStreak = Math.max(longestStreak, streak);
      activity.completedDay = true;
    }

    activity.xpEarned += calculateSoloSessionXp(session, streak);
  }

  const sortedRaces = [...races].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
  );

  for (const race of sortedRaces) {
    const activityDate = getDayKey(race.createdAt, timezone);
    const activity =
      activities.get(activityDate) ?? createDailyActivity(userId, timezone, activityDate, race.createdAt);
    activities.set(activityDate, activity);

    activity.multiplayerRacesCount += 1;
    activity.charactersTyped += race.typedCharacters;
    activity.correctCharacters += race.correctCharacters;
    activity.mistakes += race.mistakes;
    activity.bestWpm = Math.max(activity.bestWpm, race.wpm);
    activity.bestAccuracy = Math.max(activity.bestAccuracy, race.accuracy);
    activity.firstActivityAt =
      activity.firstActivityAt.getTime() <= race.createdAt.getTime()
        ? activity.firstActivityAt
        : race.createdAt;
    activity.lastActivityAt =
      activity.lastActivityAt.getTime() >= race.createdAt.getTime()
        ? activity.lastActivityAt
        : race.createdAt;
    activity.xpEarned += calculateMultiplayerRaceXp(race);

    stats.multiplayer.racesCount += 1;
    stats.multiplayer.winsCount += race.rank === 1 ? 1 : 0;
    stats.multiplayer.podiumCount += race.rank <= 3 ? 1 : 0;
    stats.multiplayer.bestRank =
      stats.multiplayer.bestRank === null
        ? race.rank
        : Math.min(stats.multiplayer.bestRank, race.rank);
    stats.multiplayer.bestWpm = Math.max(stats.multiplayer.bestWpm, race.wpm);
    stats.multiplayer.totalScore += race.score;
    stats.multiplayer.lastRaceAt = race.createdAt;
  }

  stats.typing.averageWpm = stats.typing.sessionsCount
    ? roundMetric(
        sortedSessions.reduce((sum, session) => sum + session.wpm, 0) /
          stats.typing.sessionsCount
      )
    : 0;
  stats.typing.averageAccuracy = stats.typing.sessionsCount
    ? roundMetric(
        sortedSessions.reduce((sum, session) => sum + session.accuracy, 0) /
          stats.typing.sessionsCount
      )
    : 0;

  stats.multiplayer.averageWpm = stats.multiplayer.racesCount
    ? roundMetric(
        sortedRaces.reduce((sum, race) => sum + race.wpm, 0) /
          stats.multiplayer.racesCount
      )
    : 0;
  stats.multiplayer.averageAccuracy = stats.multiplayer.racesCount
    ? roundMetric(
        sortedRaces.reduce((sum, race) => sum + race.accuracy, 0) /
          stats.multiplayer.racesCount
      )
    : 0;

  const activityList = sortActivities(activities).map((activity) => ({
    ...activity,
    heatScore: toHeatScore(activity.xpEarned),
  }));

  stats.engagement.currentStreak = streak;
  stats.engagement.longestStreak = longestStreak;
  stats.engagement.lastActiveDay = lastCompletedDay;
  stats.engagement.activeDaysCount = activityList.filter((activity) => activity.completedDay).length;

  const xp = activityList.reduce((sum, activity) => sum + activity.xpEarned, 0);
  const level = getLevelForXp(xp);
  stats.progression.xp = xp;
  stats.progression.level = level.level;
  stats.progression.levelProgressPercent = level.levelProgressPercent;

  const lastProgressAt =
    activityList.length > 0 ? activityList[activityList.length - 1].lastActivityAt : null;
  const badges = buildBadges({ stats, activities: [], badges: [] }.stats, lastProgressAt);

  stats.progression.earnedBadgeCount = badges.filter((badge) => badge.isCompleted).length;

  return {
    stats,
    activities: activityList,
    badges,
  };
}

async function persistBuiltProfile(built: BuiltProfile): Promise<void> {
  await PlayerProfileStats.updateOne(
    { userId: built.stats.userId },
    { $set: built.stats },
    { upsert: true }
  );

  await PlayerDailyActivity.deleteMany({ userId: built.stats.userId });
  if (built.activities.length > 0) {
    await PlayerDailyActivity.insertMany(built.activities, { ordered: true });
  }

  await PlayerBadge.deleteMany({ userId: built.stats.userId });
  if (built.badges.length > 0) {
    await PlayerBadge.insertMany(
      built.badges.map((badge) => ({
        userId: built.stats.userId,
        ...badge,
      })),
      { ordered: true }
    );
  }
}

export async function rebuildUserGamification(userId: string): Promise<void> {
  const user = await ensureUserIdentityFields(userId);

  const [sessions, races] = await Promise.all([
    TypingSession.find({ user: userId }).sort({ createdAt: 1 }).lean<ITypingSession[]>(),
    MultiplayerRaceResult.find({ userId }).sort({ createdAt: 1 }).lean<IMultiplayerRaceResult[]>(),
  ]);

  const built = buildUserGamificationFromSources(user, sessions, races);
  await persistBuiltProfile(built);
}

export async function rebuildAllGamificationForUsers(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    await rebuildUserGamification(userId);
  }
}

export async function getPlayerProfileStats(userId: string): Promise<IPlayerProfileStats | null> {
  const stats = await PlayerProfileStats.findOne({ userId }).lean<IPlayerProfileStats | null>();

  if (stats) {
    return stats;
  }

  await rebuildUserGamification(userId);
  return PlayerProfileStats.findOne({ userId }).lean<IPlayerProfileStats | null>();
}

export async function getPublicGamificationByUsername(username: string): Promise<{
  user: LeanUserIdentity;
  stats: IPlayerProfileStats;
  activities: IPlayerDailyActivity[];
  badges: Awaited<ReturnType<typeof PlayerBadge.find>> extends infer _ ? unknown : never;
}> {
  const normalizedUsername = normalizeUsernameCandidate(username);
  const userDoc = await User.findOne({ username: normalizedUsername }).lean<LeanUserIdentity | null>();

  if (!userDoc) {
    throw new Error("Profile not found");
  }

  await ensureUserIdentityFields(String(userDoc._id));
  const [stats, activities, badges] = await Promise.all([
    getPlayerProfileStats(String(userDoc._id)),
    PlayerDailyActivity.find({ userId: String(userDoc._id) })
      .sort({ activityDate: 1 })
      .lean<IPlayerDailyActivity[]>(),
    PlayerBadge.find({ userId: String(userDoc._id) }).lean(),
  ]);

  if (!stats) {
    throw new Error("Profile stats not found");
  }

  return {
    user: (await User.findById(userDoc._id).lean<LeanUserIdentity | null>()) as LeanUserIdentity,
    stats,
    activities,
    badges,
  };
}

export async function syncIdentitySnapshots(userId: string): Promise<void> {
  const user = await ensureUserIdentityFields(userId);
  await PlayerProfileStats.updateOne(
    { userId },
    {
      $set: {
        usernameSnapshot: user.username,
        displayNameSnapshot: getUserDisplayName(user),
      },
    }
  );
}
