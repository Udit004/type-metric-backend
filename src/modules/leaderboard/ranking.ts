import { LeaderboardBoard, LeaderboardSourceMode } from "./types.js";

export interface LeaderboardCandidateEntry {
  userId: string;
  name: string;
  bestWpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  sourceMode: LeaderboardSourceMode;
  sourceId: string;
  achievedAt: Date;
}

export interface RankedLeaderboardEntry extends LeaderboardCandidateEntry {
  rank: number;
}

function compareAchievedAtDesc(a: Date, b: Date): number {
  return b.getTime() - a.getTime();
}

export function compareLeaderboardEntries(
  a: LeaderboardCandidateEntry,
  b: LeaderboardCandidateEntry
): number {
  if (b.bestWpm !== a.bestWpm) {
    return b.bestWpm - a.bestWpm;
  }

  if (b.accuracy !== a.accuracy) {
    return b.accuracy - a.accuracy;
  }

  if (a.mistakes !== b.mistakes) {
    return a.mistakes - b.mistakes;
  }

  if (b.correctCharacters !== a.correctCharacters) {
    return b.correctCharacters - a.correctCharacters;
  }

  return compareAchievedAtDesc(a.achievedAt, b.achievedAt);
}

export function pickBetterEntry(
  current: LeaderboardCandidateEntry | undefined,
  candidate: LeaderboardCandidateEntry
): LeaderboardCandidateEntry {
  if (!current) {
    return candidate;
  }

  return compareLeaderboardEntries(current, candidate) <= 0 ? current : candidate;
}

export function rankLeaderboardEntries(
  entries: LeaderboardCandidateEntry[]
): RankedLeaderboardEntry[] {
  return [...entries]
    .sort(compareLeaderboardEntries)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function isLeaderboardBoard(value: unknown): value is LeaderboardBoard {
  return (
    value === "combined" ||
    value === "solo" ||
    value === "multiplayer"
  );
}
