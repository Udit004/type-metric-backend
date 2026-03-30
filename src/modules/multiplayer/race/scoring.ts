import { RaceResult } from "../types.js";
import { InternalRoom } from "../room/internal-types.js";

const SCORE_WEIGHTS = {
  wpm: 0.6,
  accuracy: 0.3,
  completion: 0.1,
  mistakePenalty: 0.35,
  finishBonus: 2,
};

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildRaceResults(room: InternalRoom): RaceResult[] {
  const promptLength = Math.max(1, room.promptText.length);

  const scoreByUserId = new Map<string, number>();

  for (const participant of room.participants.values()) {
    const completionRatio = Math.min(1, participant.progress.typedCharacters / promptLength);
    const completionScore = completionRatio * 100;
    const rawScore =
      participant.progress.wpm * SCORE_WEIGHTS.wpm +
      participant.progress.accuracy * SCORE_WEIGHTS.accuracy +
      completionScore * SCORE_WEIGHTS.completion -
      participant.progress.mistakes * SCORE_WEIGHTS.mistakePenalty +
      (participant.progress.finishedAt !== null ? SCORE_WEIGHTS.finishBonus : 0);

    scoreByUserId.set(participant.userId, roundToTwo(Math.max(0, rawScore)));
  }

  return Array.from(room.participants.values())
    .sort((a, b) => {
      const aScore = scoreByUserId.get(a.userId) ?? 0;
      const bScore = scoreByUserId.get(b.userId) ?? 0;

      if (bScore !== aScore) {
        return bScore - aScore;
      }

      if (b.progress.accuracy !== a.progress.accuracy) {
        return b.progress.accuracy - a.progress.accuracy;
      }

      if (b.progress.wpm !== a.progress.wpm) {
        return b.progress.wpm - a.progress.wpm;
      }

      const aFinished = a.progress.finishedAt ?? Number.MAX_SAFE_INTEGER;
      const bFinished = b.progress.finishedAt ?? Number.MAX_SAFE_INTEGER;

      if (aFinished !== bFinished) {
        return aFinished - bFinished;
      }

      return a.joinedAt - b.joinedAt;
    })
    .map((participant, index) => ({
      userId: participant.userId,
      name: participant.name,
      rank: index + 1,
      score: scoreByUserId.get(participant.userId) ?? 0,
      typedCharacters: participant.progress.typedCharacters,
      correctCharacters: participant.progress.correctCharacters,
      mistakes: participant.progress.mistakes,
      accuracy: participant.progress.accuracy,
      wpm: participant.progress.wpm,
      finishedAt: participant.progress.finishedAt,
    }));
}
