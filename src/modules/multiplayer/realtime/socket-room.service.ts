import { ProgressUpdateInput, RoomSnapshot } from "../types.js";
import { CoreRoomService } from "../room/core-room.service.js";

/**
 * WebSocket Room Service handles all WebSocket operations.
 * Uses composition with CoreRoomService to share room state.
 * Used by gateway for real-time race management, progress updates, and room lifecycle.
 */
export class SocketRoomService {
  constructor(private core: CoreRoomService) {}

  startRace(roomId: string, userId: string): RoomSnapshot {
    return this.core.startRaceInRoom(roomId, userId);
  }

  updateProgress(roomId: string, userId: string, input: ProgressUpdateInput): RoomSnapshot {
    return this.core.updatePlayerProgress(roomId, userId, input);
  }

  leaveRoom(roomId: string, userId: string): RoomSnapshot | null {
    return this.core.removeUserFromRoom(roomId, userId);
  }

  reconnectUser(roomId: string, userId: string): RoomSnapshot {
    return this.core.reconnectUserToRoom(roomId, userId);
  }

  markDisconnected(userId: string): void {
    this.core.markUserDisconnected(userId);
  }

  setEventListener(listener: (event: any) => void): void {
    this.core.setEventListener(listener);
  }

  clearEventListener(): void {
    this.core.clearEventListener();
  }
}

export function createSocketRoomService(core: CoreRoomService): SocketRoomService {
  return new SocketRoomService(core);
}
