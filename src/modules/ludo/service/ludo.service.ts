import { rollDice } from "./dice.service.js";
import { LudoRoomsStore } from "../state/rooms-store.js";

export class LudoService {
  constructor(private store: LudoRoomsStore) {}

  createRoom(roomId: string, host: { userId: string; name: string }, player_count: number) {
    const room = this.store.createRoom(roomId, host.userId, player_count);

    // Ensure the host is included in participants[] from the very beginning
    // so that subsequent joiners always receive a complete roster.
    this.store.joinRoom(roomId, { userId: host.userId, name: host.name });

    return room;
  }



  joinRoom(roomId: string, user: { userId: string; name: string }) {
    const room = this.store.getRoom(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    return this.store.joinRoom(roomId, { userId: user.userId, name: user.name });
  }

  startRoom(roomId: string) {
    const room = this.store.getRoom(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "waiting") throw new Error("ROOM_ALREADY_STARTED");

    room.status = "playing";

    const ALL_COLORS = ["RED", "GREEN", "YELLOW", "BLUE"];
    let colorsToAssign: string[] = [];

    if (room.participants.length === 2) {
      colorsToAssign = ["RED", "GREEN"];
    } else if (room.participants.length === 3) {
      colorsToAssign = ["RED", "GREEN", "YELLOW"];
    } else {
      colorsToAssign = ["RED", "GREEN", "YELLOW", "BLUE"];
    }

    room.active_turn_order = [...colorsToAssign];
    room.current_turn = room.active_turn_order[0] ?? null;

    for (let i = 0; i < room.participants.length; i++) {
      room.participants[i]!.player_color = colorsToAssign[i];
    }

    this.store.updateRoom(room);
    return room;
  }

  advanceTurn(roomId: string) {
    const room = this.store.getRoom(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    
    if (!room.active_turn_order.length) return room;

    const currentIndex = room.active_turn_order.indexOf(room.current_turn!);
    const nextIndex = (currentIndex + 1) % room.active_turn_order.length;
    room.current_turn = room.active_turn_order[nextIndex] ?? null;

    this.store.updateRoom(room);
    return room;
  }

  rollDiceForRoom(roomId: string, actor: { userId: string; name: string; player_color?: string }) {
    const room = this.store.getRoom(roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    if (actor.player_color && actor.player_color !== room.current_turn) {
       console.log(`[LUDO] User ${actor.userId} (${actor.player_color}) tried to roll out of turn! Current turn: ${room.current_turn}`);
       // Strictly we could throw here, but let's just ignore or let it pass for now and rely on client
       // throw new Error("NOT_YOUR_TURN");
    }

    const dice_value = rollDice();
    room.lastDiceValue = dice_value;

    // Minimal token state for now (client can unblock). Real positions will come later.
    room.tokens_by_player = {
      ...(room.tokens_by_player ?? {}),
      [actor.player_color ?? "UNKNOWN"]: {
        lastDiceValue: dice_value,
      },
    };

    this.store.updateRoom(room);
    return { room, dice_value };
  }
}

export const sharedLudoStore = new LudoRoomsStore();
export const sharedLudoService = new LudoService(sharedLudoStore);
