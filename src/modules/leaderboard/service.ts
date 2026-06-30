import LeaderboardSnapshot, {
  ILeaderboardSnapshot,
} from "../../models/LeaderboardSnapshot.model.js";
import MultiplayerRaceResult from "../../models/MultiplayerRaceResult.model.js";
import TypingSession from "../../models/TypingSession.model.js";
import { getRedisClient } from "../../config/redis.js";
import {
  compareLeaderboardEntries,
  LeaderboardCandidateEntry,
  pickBetterEntry,
  rankLeaderboardEntries,
} from "./ranking.js";
import {
  DEFAULT_LEADERBOARD_LIMIT,
  LeaderboardBoard,
  LeaderboardResponse,
  LEADERBOARD_WINDOW,
} from "./types.js";
import { eventBus } from "../../core/events/eventBus.js";
import { Events } from "../../core/events/eventNames.js";

interface SoloAggregateRow {
  userId: string;
  name: string;
  bestWpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  sourceId: string;
  achievedAt: Date;
}

interface MultiplayerAggregateRow {
  userId: string;
  name: string;
  bestWpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  sourceId: string;
  achievedAt: Date;
}

function getSnapshotCacheKey(board: LeaderboardBoard): string {
  return `leaderboard:${LEADERBOARD_WINDOW}:${board}`;
}

function toResponse(snapshot: Pick<
  ILeaderboardSnapshot,
  "board" | "window" | "generatedAt" | "totalEntries" | "entries"
>): LeaderboardResponse {
  return {
    board: snapshot.board,
    window: snapshot.window,
    generatedAt: snapshot.generatedAt.toISOString(),
    totalEntries: snapshot.totalEntries,
    entries: snapshot.entries.map((entry) => ({
      rank: entry.rank,
      userId: entry.userId,
      name: entry.name,
      bestWpm: entry.bestWpm,
      accuracy: entry.accuracy,
      mistakes: entry.mistakes,
      correctCharacters: entry.correctCharacters,
      sourceMode: entry.sourceMode,
      sourceId: entry.sourceId,
      achievedAt: entry.achievedAt.toISOString(),
    })),
  };
}

function applyLimit(
  snapshot: LeaderboardResponse,
  limit: number
): LeaderboardResponse {
  return {
    ...snapshot,
    entries: snapshot.entries.slice(0, limit),
  };
}

function serializeSnapshot(snapshot: LeaderboardResponse): string {
  return JSON.stringify(snapshot);
}

function deserializeSnapshot(raw: string): LeaderboardResponse {
  return JSON.parse(raw) as LeaderboardResponse;
}

function toCandidateEntry(
  row: SoloAggregateRow | MultiplayerAggregateRow,
  sourceMode: "single-player" | "multiplayer"
): LeaderboardCandidateEntry {
  return {
    userId: row.userId,
    name: row.name,
    bestWpm: row.bestWpm,
    accuracy: row.accuracy,
    mistakes: row.mistakes,
    correctCharacters: row.correctCharacters,
    sourceMode,
    sourceId: row.sourceId,
    achievedAt: new Date(row.achievedAt),
  };
}

async function buildBestSoloEntries(): Promise<LeaderboardCandidateEntry[]> {
  const rows = await TypingSession.aggregate<SoloAggregateRow>([
    {
      $sort: {
        user: 1,
        wpm: -1,
        accuracy: -1,
        mistakes: 1,
        correctCharacters: -1,
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$user",
        doc: { $first: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "doc.user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        userId: { $toString: "$doc.user" },
        name: { $ifNull: ["$user.displayName", "$user.name"] },
        bestWpm: "$doc.wpm",
        accuracy: "$doc.accuracy",
        mistakes: "$doc.mistakes",
        correctCharacters: "$doc.correctCharacters",
        sourceId: { $toString: "$doc._id" },
        achievedAt: "$doc.createdAt",
      },
    },
  ]);

  return rows.map((row) => toCandidateEntry(row, "single-player"));
}

async function buildBestMultiplayerEntries(): Promise<LeaderboardCandidateEntry[]> {
  const rows = await MultiplayerRaceResult.aggregate<MultiplayerAggregateRow>([
    {
      $sort: {
        userId: 1,
        wpm: -1,
        accuracy: -1,
        mistakes: 1,
        correctCharacters: -1,
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$userId",
        doc: { $first: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$doc.userId",
        name: "$doc.name",
        bestWpm: "$doc.wpm",
        accuracy: "$doc.accuracy",
        mistakes: "$doc.mistakes",
        correctCharacters: "$doc.correctCharacters",
        sourceId: { $toString: "$doc._id" },
        achievedAt: "$doc.createdAt",
      },
    },
  ]);

  return rows.map((row) => toCandidateEntry(row, "multiplayer"));
}

export function buildCombinedLeaderboardEntriesFromSources(
  soloEntries: LeaderboardCandidateEntry[],
  multiplayerEntries: LeaderboardCandidateEntry[]
): LeaderboardCandidateEntry[] {
  const bestByUserId = new Map<string, LeaderboardCandidateEntry>();

  for (const entry of [...soloEntries, ...multiplayerEntries]) {
    bestByUserId.set(
      entry.userId,
      pickBetterEntry(bestByUserId.get(entry.userId), entry)
    );
  }

  return Array.from(bestByUserId.values()).sort(compareLeaderboardEntries);
}

export async function buildLeaderboardEntries(
  board: LeaderboardBoard
): Promise<LeaderboardCandidateEntry[]> {
  if (board === "solo") {
    return buildBestSoloEntries();
  }

  if (board === "multiplayer") {
    return buildBestMultiplayerEntries();
  }

  const [soloEntries, multiplayerEntries] = await Promise.all([
    buildBestSoloEntries(),
    buildBestMultiplayerEntries(),
  ]);

  return buildCombinedLeaderboardEntriesFromSources(
    soloEntries,
    multiplayerEntries
  );
}

function haveLeaderboardsChanged(
  oldEntries: any[],
  newEntries: any[]
): boolean {
  if (oldEntries.length !== newEntries.length) return true;

  for (let i = 0; i < newEntries.length; i++) {
    const old = oldEntries[i];
    const current = newEntries[i];

    if (
      old.rank !== current.rank ||
      old.userId !== current.userId ||
      old.bestWpm !== current.bestWpm ||
      old.accuracy !== current.accuracy
    ) {
      return true;
    }
  }

  return false;
}

export async function rebuildLeaderboardSnapshot(
  board: LeaderboardBoard
): Promise<LeaderboardResponse> {
  const rankedEntries = rankLeaderboardEntries(await buildLeaderboardEntries(board));
  
  const previousSnapshot = await LeaderboardSnapshot.findOne({ 
    board, 
    window: LEADERBOARD_WINDOW 
  }).lean();

  const entriesChanged = !previousSnapshot || 
    haveLeaderboardsChanged(previousSnapshot.entries || [], rankedEntries);

  if (!entriesChanged) {
    return toResponse(previousSnapshot as ILeaderboardSnapshot);
  }

  const generatedAt = new Date();

  const snapshotDoc = {
    board,
    window: LEADERBOARD_WINDOW,
    generatedAt,
    totalEntries: rankedEntries.length,
    entries: rankedEntries,
  } satisfies Pick<
    ILeaderboardSnapshot,
    "board" | "window" | "generatedAt" | "totalEntries" | "entries"
  >;

  await LeaderboardSnapshot.updateOne(
    { board, window: LEADERBOARD_WINDOW },
    {
      $set: snapshotDoc,
    },
    { upsert: true }
  );

  const snapshot = toResponse(snapshotDoc);
  const redis = getRedisClient();

  if (redis?.isReady) {
    await redis.set(getSnapshotCacheKey(board), serializeSnapshot(snapshot));
  }

  // Emit event for background workers
  eventBus.emit(Events.LEADERBOARD_UPDATED, {
    board,
    totalEntries: rankedEntries.length
  });

  return snapshot;
}

export async function refreshLeaderboardSnapshots(
  boards: LeaderboardBoard[]
): Promise<void> {
  const uniqueBoards = [...new Set(boards)];
  await Promise.all(uniqueBoards.map((board) => rebuildLeaderboardSnapshot(board)));
}

async function readRedisSnapshot(
  board: LeaderboardBoard
): Promise<LeaderboardResponse | null> {
  const redis = getRedisClient();

  if (!redis?.isReady) {
    return null;
  }

  const cachedSnapshot = await redis.get(getSnapshotCacheKey(board));
  return cachedSnapshot ? deserializeSnapshot(cachedSnapshot) : null;
}

async function readMongoSnapshot(
  board: LeaderboardBoard
): Promise<LeaderboardResponse | null> {
  const snapshot = await LeaderboardSnapshot.findOne({
    board,
    window: LEADERBOARD_WINDOW,
  })
    .select("board window generatedAt totalEntries entries")
    .lean();

  if (!snapshot) {
    return null;
  }

  const response = toResponse(snapshot);
  const redis = getRedisClient();

  if (redis?.isReady) {
    await redis.set(getSnapshotCacheKey(board), serializeSnapshot(response));
  }

  return response;
}

export async function getLeaderboardSnapshot(
  board: LeaderboardBoard,
  limit = DEFAULT_LEADERBOARD_LIMIT
): Promise<LeaderboardResponse> {
  const cached = await readRedisSnapshot(board);

  if (cached) {
    return applyLimit(cached, limit);
  }

  const mongoSnapshot = await readMongoSnapshot(board);

  if (mongoSnapshot) {
    return applyLimit(mongoSnapshot, limit);
  }

  return applyLimit(await rebuildLeaderboardSnapshot(board), limit);
}
