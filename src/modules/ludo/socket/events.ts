export type LudoServerEvent =
  | { type: "connection:ready"; payload: { user: { userId: string; name: string } } }
  | { type: "ludo:room:created"; payload: { roomId: string; hostId: string } }
  | { type: "ludo:room:joined"; payload: { roomId: string; roomState: LudoRoomState } }
  | { type: "ludo:dice:result"; payload: { roomId: string; dice_value: number; actorUserId: string } }
  | { type: "ludo:tokens:state"; payload: { roomId: string; tokens_by_player: Record<string, unknown> } }
  | { type: "ludo:room:started"; payload: { roomId: string; roomState: LudoRoomState } }
  | { type: "ludo:token:moved"; payload: { roomId: string; player_color: string; token_index: number; steps: number } }
  | { type: "ludo:turn:changed"; payload: { roomId: string; current_turn: string } }
  | { type: "error"; payload: { code: string; message: string } };

export type LudoClientEvent =
  | { type: "ludo:room:create"; payload?: { roomId?: string } }
  | { type: "ludo:room:join"; payload: { roomId: string } }
  | { type: "ludo:room:start"; payload: { roomId: string } }
  | { type: "ludo:dice:roll"; payload: { roomId: string; player_color?: string } }
  | { type: "ludo:token:move"; payload: { roomId: string; player_color: string; token_index: number; steps: number } }
  | { type: "ludo:turn:end"; payload: { roomId: string } };

export type LudoRoomStatus = "waiting" | "playing" | "finished";

export type LudoRoomState = {
  roomId: string;
  status: LudoRoomStatus;
  hostId: string;
  participants: Array<{ userId: string; name: string; player_color?: string }>;
  active_turn_order: string[];
  current_turn: string | null;
  lastDiceValue: number | null;
  tokens_by_player: Record<string, unknown>;
};

