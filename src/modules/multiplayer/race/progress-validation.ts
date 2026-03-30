import { ProgressUpdateInput } from "../types.js";
import { InternalProgress } from "../room/internal-types.js";

export function validateProgressUpdate(input: ProgressUpdateInput, previous: InternalProgress): void {
  const numericFields = [
    input.typedCharacters,
    input.correctCharacters,
    input.mistakes,
    input.accuracy,
    input.wpm,
  ];

  if (numericFields.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Progress fields must be non-negative numbers");
  }

  if (!Number.isInteger(input.typedCharacters) || !Number.isInteger(input.correctCharacters)) {
    throw new Error("typedCharacters and correctCharacters must be integers");
  }

  if (!Number.isInteger(input.mistakes)) {
    throw new Error("mistakes must be an integer");
  }

  if (input.correctCharacters > input.typedCharacters) {
    throw new Error("correctCharacters cannot be greater than typedCharacters");
  }

  if (input.accuracy > 100) {
    throw new Error("accuracy cannot exceed 100");
  }

  if (input.wpm > 350) {
    throw new Error("wpm is unrealistically high");
  }

  if (input.typedCharacters < previous.typedCharacters) {
    throw new Error("typedCharacters cannot decrease");
  }

  if (input.correctCharacters < previous.correctCharacters) {
    throw new Error("correctCharacters cannot decrease");
  }
}
