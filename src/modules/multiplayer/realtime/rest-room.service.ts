import { MultiplayerUser, RoomSnapshot } from "../types.js";
import { CoreRoomService } from "../room/core-room.service.js";

/**
 * REST Room Service handles all REST API operations.
 * Uses composition with CoreRoomService to share room state.
 * Used by HTTP controllers for createRoom, joinRoom, and getRoom endpoints.
 */
export class RestRoomService {
  constructor(private core: CoreRoomService) {}

  createRoom(user: MultiplayerUser, promptText?: string): RoomSnapshot {
    return this.core.createRoomForUser(user, promptText);
  }

  getRoom(roomId: string): RoomSnapshot | null {
    return this.core.getRoomSnapshot(roomId);
  }

  isParticipant(roomId: string, userId: string): boolean {
    return this.core.isUserParticipant(roomId, userId);
  }

  joinRoom(roomId: string, user: MultiplayerUser): RoomSnapshot {
    return this.core.joinUserToRoom(roomId, user);
  }

  setEventListener(listener: (event: any) => void): void {
    this.core.setEventListener(listener);
  }

  clearEventListener(): void {
    this.core.clearEventListener();
  }
}

export function createRestRoomService(core: CoreRoomService): RestRoomService {
  return new RestRoomService(core);
}
