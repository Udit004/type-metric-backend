import { randomInt } from "crypto";

export function rollDice(): number {
  return randomInt(1, 7);
}

