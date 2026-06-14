import { randomInt } from "crypto";

export type DiceRollResult = {
  dice_value: number;
};

export function rollDice(): DiceRollResult {
  // ludo dice: 1..6
  return { dice_value: randomInt(1, 7) };
}

