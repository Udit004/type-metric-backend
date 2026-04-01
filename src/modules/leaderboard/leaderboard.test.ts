import test from "node:test";
import assert from "node:assert/strict";

import {
  compareLeaderboardEntries,
  pickBetterEntry,
  rankLeaderboardEntries,
} from "./ranking.js";
import { parseLeaderboardQuery } from "./query.js";
import { buildCombinedLeaderboardEntriesFromSources } from "./service.js";

function createEntry(overrides: Partial<Parameters<typeof pickBetterEntry>[1]> = {}) {
  return {
    userId: "user-1",
    name: "Player One",
    bestWpm: 100,
    accuracy: 96,
    mistakes: 4,
    correctCharacters: 420,
    sourceMode: "single-player" as const,
    sourceId: "source-1",
    achievedAt: new Date("2026-04-01T10:00:00.000Z"),
    ...overrides,
  };
}

test("compareLeaderboardEntries orders by WPM, then accuracy, then mistakes", () => {
  const slower = createEntry({ bestWpm: 98, accuracy: 99, mistakes: 1 });
  const faster = createEntry({ userId: "user-2", bestWpm: 110, accuracy: 90 });
  const sameWpmHigherAccuracy = createEntry({
    userId: "user-3",
    bestWpm: 110,
    accuracy: 95,
    mistakes: 8,
  });

  const ranked = [slower, faster, sameWpmHigherAccuracy].sort(compareLeaderboardEntries);

  assert.deepEqual(
    ranked.map((entry) => entry.userId),
    ["user-3", "user-2", "user-1"]
  );
});

test("pickBetterEntry prefers the stronger candidate", () => {
  const current = createEntry({
    userId: "user-1",
    bestWpm: 103,
    accuracy: 94,
    sourceMode: "single-player",
  });
  const candidate = createEntry({
    userId: "user-1",
    bestWpm: 103,
    accuracy: 97,
    sourceMode: "multiplayer",
    sourceId: "source-2",
  });

  const chosen = pickBetterEntry(current, candidate);

  assert.equal(chosen.sourceMode, "multiplayer");
  assert.equal(chosen.sourceId, "source-2");
});

test("buildCombinedLeaderboardEntriesFromSources keeps the better run per user", () => {
  const soloEntries = [
    createEntry({
      userId: "shared-user",
      bestWpm: 108,
      accuracy: 92,
      sourceMode: "single-player",
    }),
    createEntry({
      userId: "solo-only",
      bestWpm: 99,
      sourceId: "solo-only-source",
    }),
  ];

  const multiplayerEntries = [
    createEntry({
      userId: "shared-user",
      bestWpm: 112,
      accuracy: 91,
      sourceMode: "multiplayer",
      sourceId: "multi-shared-source",
    }),
    createEntry({
      userId: "multi-only",
      bestWpm: 105,
      accuracy: 95,
      sourceMode: "multiplayer",
      sourceId: "multi-only-source",
    }),
  ];

  const combined = buildCombinedLeaderboardEntriesFromSources(
    soloEntries,
    multiplayerEntries
  );

  assert.deepEqual(
    combined.map((entry) => [entry.userId, entry.sourceMode]),
    [
      ["shared-user", "multiplayer"],
      ["multi-only", "multiplayer"],
      ["solo-only", "single-player"],
    ]
  );
});

test("rankLeaderboardEntries assigns sequential ranks after sorting", () => {
  const ranked = rankLeaderboardEntries([
    createEntry({ userId: "user-b", bestWpm: 105 }),
    createEntry({ userId: "user-a", bestWpm: 120 }),
    createEntry({ userId: "user-c", bestWpm: 102 }),
  ]);

  assert.deepEqual(
    ranked.map((entry) => [entry.rank, entry.userId]),
    [
      [1, "user-a"],
      [2, "user-b"],
      [3, "user-c"],
    ]
  );
});

test("parseLeaderboardQuery applies defaults and clamps limit", () => {
  assert.deepEqual(parseLeaderboardQuery({}), {
    board: "combined",
    limit: 50,
  });

  assert.deepEqual(
    parseLeaderboardQuery({
      board: "solo",
      limit: "999",
    }),
    {
      board: "solo",
      limit: 100,
    }
  );
});

test("parseLeaderboardQuery rejects invalid board and invalid limit", () => {
  assert.throws(
    () =>
      parseLeaderboardQuery({
        board: "invalid",
      }),
    /board must be one of combined, solo, or multiplayer/
  );

  assert.throws(
    () =>
      parseLeaderboardQuery({
        board: "combined",
        limit: "0",
      }),
    /limit must be a positive integer up to 100/
  );
});
