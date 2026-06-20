export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "consistency" | "speed" | "accuracy" | "competition" | "volume";
  rarity: "common" | "rare" | "epic" | "legendary";
  sortOrder: number;
  criteria:
    | { type: "typing_sessions"; target: number }
    | { type: "current_streak"; target: number }
    | { type: "best_wpm"; target: number }
    | { type: "best_accuracy"; target: number }
    | { type: "multiplayer_races"; target: number }
    | { type: "multiplayer_wins"; target: number }
    | { type: "multiplayer_podiums"; target: number };
}

export const XP_LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200,
  5950, 6750, 7600, 8500, 9450, 10450,
];

export const MINIMUM_VALID_TYPING_DURATION_SECONDS = 20;
export const MINIMUM_VALID_TYPED_CHARACTERS = 40;
export const MINIMUM_VALID_ACCURACY = 60;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "first_session",
    name: "First Steps",
    description: "Complete your first valid typing session.",
    icon: "spark",
    category: "volume",
    rarity: "common",
    sortOrder: 1,
    criteria: { type: "typing_sessions", target: 1 },
  },
  {
    key: "sessions_10",
    name: "Daily Driver",
    description: "Complete 10 valid typing sessions.",
    icon: "keyboard",
    category: "volume",
    rarity: "common",
    sortOrder: 2,
    criteria: { type: "typing_sessions", target: 10 },
  },
  {
    key: "sessions_50",
    name: "Typing Machine",
    description: "Complete 50 valid typing sessions.",
    icon: "bolt",
    category: "volume",
    rarity: "rare",
    sortOrder: 3,
    criteria: { type: "typing_sessions", target: 50 },
  },
  {
    key: "streak_3",
    name: "On A Roll",
    description: "Reach a 3-day typing streak.",
    icon: "flame",
    category: "consistency",
    rarity: "common",
    sortOrder: 10,
    criteria: { type: "current_streak", target: 3 },
  },
  {
    key: "streak_7",
    name: "Unbroken",
    description: "Reach a 7-day typing streak.",
    icon: "calendar",
    category: "consistency",
    rarity: "rare",
    sortOrder: 11,
    criteria: { type: "current_streak", target: 7 },
  },
  {
    key: "streak_30",
    name: "Relentless",
    description: "Reach a 30-day typing streak.",
    icon: "crown",
    category: "consistency",
    rarity: "epic",
    sortOrder: 12,
    criteria: { type: "current_streak", target: 30 },
  },
  {
    key: "speed_60",
    name: "Speed Burst",
    description: "Hit 60 WPM in a typing session.",
    icon: "gauge",
    category: "speed",
    rarity: "common",
    sortOrder: 20,
    criteria: { type: "best_wpm", target: 60 },
  },
  {
    key: "speed_100",
    name: "Centurion",
    description: "Hit 100 WPM in a typing session.",
    icon: "rocket",
    category: "speed",
    rarity: "epic",
    sortOrder: 21,
    criteria: { type: "best_wpm", target: 100 },
  },
  {
    key: "accuracy_98",
    name: "Laser Focus",
    description: "Reach 98% accuracy in a typing session.",
    icon: "target",
    category: "accuracy",
    rarity: "rare",
    sortOrder: 30,
    criteria: { type: "best_accuracy", target: 98 },
  },
  {
    key: "races_10",
    name: "Grid Runner",
    description: "Finish 10 multiplayer races.",
    icon: "flag",
    category: "competition",
    rarity: "rare",
    sortOrder: 40,
    criteria: { type: "multiplayer_races", target: 10 },
  },
  {
    key: "wins_1",
    name: "First Victory",
    description: "Win your first multiplayer race.",
    icon: "trophy",
    category: "competition",
    rarity: "common",
    sortOrder: 41,
    criteria: { type: "multiplayer_wins", target: 1 },
  },
  {
    key: "podiums_10",
    name: "Podium Regular",
    description: "Finish on the podium 10 times.",
    icon: "medal",
    category: "competition",
    rarity: "rare",
    sortOrder: 42,
    criteria: { type: "multiplayer_podiums", target: 10 },
  },
];
