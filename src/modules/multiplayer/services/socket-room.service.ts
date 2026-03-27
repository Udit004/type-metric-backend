import {
  ProgressUpdateInput,
  RoomSnapshot,
} from "../types.js";
import { CoreRoomService } from "./core-room.service.js";

/**
 * WebSocket Room Service handles all WebSocket operations.
 * Uses composition with CoreRoomService to share room state.
 * Used by gateway for real-time race management, progress updates, and room lifecycle.
 */
export class SocketRoomService {
  constructor(private core: CoreRoomService) {}

  /**
   * Start a race (countdown phase)
   * WS: room:start
   */
  startRace(roomId: string, userId: string): RoomSnapshot {
    return this.core.startRaceInRoom(roomId, userId);
  }

  /**
   * Update player progress during race
   * WS: race:progress
   */
  updateProgress(roomId: string, userId: string, input: ProgressUpdateInput): RoomSnapshot {
    return this.core.updatePlayerProgress(roomId, userId, input);
  }

  /**
   * Leave a room
   * WS: room:leave
   */
  leaveRoom(roomId: string, userId: string): RoomSnapshot | null {
    return this.core.removeUserFromRoom(roomId, userId);
  }

  /**
   * Reconnect a user to their room
   * WS: reconnect
   */
  reconnectUser(roomId: string, userId: string): RoomSnapshot {
    return this.core.reconnectUserToRoom(roomId, userId);
  }

  /**
   * Mark user as disconnected across all rooms
   */
  markDisconnected(userId: string): void {
    this.core.markUserDisconnected(userId);
  }

  // Event listener delegation
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
