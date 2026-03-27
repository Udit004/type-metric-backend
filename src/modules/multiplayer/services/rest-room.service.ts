import {
  MultiplayerUser,
  RoomSnapshot,
} from "../types.js";
import { getRandomPrompt } from "../constants/typingPrompts.js";
import { CoreRoomService } from "./core-room.service.js";

/**
 * REST Room Service handles all REST API operations.
 * Uses composition with CoreRoomService to share room state.
 * Used by HTTP controllers for createRoom, joinRoom, and getRoom endpoints.
 */
export class RestRoomService {
  constructor(private core: CoreRoomService) {}

  /**
   * Create a new room
   * POST /rooms
   */
  createRoom(user: MultiplayerUser, promptText?: string): RoomSnapshot {
    return this.core.createRoomForUser(user, promptText);
  }

  /**
   * Get room by ID
   * GET /rooms/:roomId
   */
  getRoom(roomId: string): RoomSnapshot | null {
    return this.core.getRoomSnapshot(roomId);
  }

  /**
   * Check if user is a participant in the room
   */
  isParticipant(roomId: string, userId: string): boolean {
    return this.core.isUserParticipant(roomId, userId);
  }

  /**
   * Join an existing room
   * POST /rooms/:roomId/join
   */
  joinRoom(roomId: string, user: MultiplayerUser): RoomSnapshot {
    return this.core.joinUserToRoom(roomId, user);
  }

  // Event listener delegation
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
