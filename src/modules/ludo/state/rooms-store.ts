import { LudoRoomState } from "../socket/events.js";

export class LudoRoomsStore {
  private rooms = new Map<string, LudoRoomState>();

  createRoom(roomId: string, hostId: string, player_count: number): LudoRoomState {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const room: LudoRoomState & { player_count: number } = {
      roomId,
      status: "waiting",
      hostId,
      player_count,
      participants: [],
      active_turn_order: [],
      current_turn: null,
      lastDiceValue: null,
      tokens_by_player: {},
    };

    this.rooms.set(roomId, room as any);
    return room as any;
  }


  getRoom(roomId: string): LudoRoomState | null {
    return this.rooms.get(roomId) ?? null;
  }

  joinRoom(roomId: string, participant: { userId: string; name: string; player_color?: string }): LudoRoomState {
    const room: (LudoRoomState & { player_count?: number }) | null = this.getRoom(roomId) as any;
    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const maxPlayers = Math.max(2, Math.min(4, Math.floor(room.player_count ?? 2)));

    // Always ensure host is present in participants[] even if join order/timing causes partial state.
    if (room.hostId && participant.userId !== room.hostId) {
      const hostAlready = room.participants.find((p) => p.userId === room.hostId);
      if (!hostAlready) {
        room.participants.push({
          userId: room.hostId,
          name: "Host", // Fallback if host didn't fully join yet
        });
      }
    }


    const already = room.participants.find((p) => p.userId === participant.userId);
    if (already) return room;

    if (room.participants.length >= maxPlayers) {
      throw new Error("ROOM_FULL");
    }

    room.participants.push(participant);
    return room;
  }


  updateRoom(room: LudoRoomState): void {
    this.rooms.set(room.roomId, room as any);
  }
}

