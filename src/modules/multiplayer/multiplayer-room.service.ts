import { MultiplayerUser, ProgressUpdateInput, RoomSnapshot } from "./types.js";
import { getCoreRoomService } from "./services/core-room.service.js";
import { createRestRoomService } from "./services/rest-room.service.js";
import { createSocketRoomService } from "./services/socket-room.service.js";
import type { RestRoomService } from "./services/rest-room.service.js";
import type { SocketRoomService } from "./services/socket-room.service.js";

/**
 * Multiplayer Room Service - Unified Interface
 *
 * This class combines both REST and WebSocket services into a single interface
 * for backwards compatibility. Both services share the same underlying
 * CoreRoomService instance, ensuring consistent room state management.
 *
 * ARCHITECTURE:
 * - CoreRoomService: Singleton managing shared room state (Map<roomId, InternalRoom>)
 * - RestRoomService: Delegates REST operations to CoreRoomService
 * - SocketRoomService: Delegates WebSocket operations to CoreRoomService
 * - MultiplayerRoomService: Unified facade for backwards compatibility
 *
 * For new code, use the specific services directly:
 * - getRestRoomService() for REST operations
 * - getSocketRoomService() for WebSocket operations
 */
export class MultiplayerRoomService {
  private restService: RestRoomService;
  private socketService: SocketRoomService;

  constructor() {
    // Get the shared CoreRoomService singleton
    const core = getCoreRoomService();

    // Create service instances that share the same core
    this.restService = createRestRoomService(core);
    this.socketService = createSocketRoomService(core);
  }

  // ========== REST Operations (HTTP) ==========

  createRoom(user: MultiplayerUser, promptText?: string): RoomSnapshot {
    return this.restService.createRoom(user, promptText);
  }

  getRoom(roomId: string): RoomSnapshot | null {
    return this.restService.getRoom(roomId);
  }

  isParticipant(roomId: string, userId: string): boolean {
    return this.restService.isParticipant(roomId, userId);
  }

  joinRoom(roomId: string, user: MultiplayerUser): RoomSnapshot {
    return this.restService.joinRoom(roomId, user);
  }

  // ========== WebSocket Operations (Real-time) ==========

  startRace(roomId: string, userId: string): RoomSnapshot {
    return this.socketService.startRace(roomId, userId);
  }

  updateProgress(roomId: string, userId: string, input: ProgressUpdateInput): RoomSnapshot {
    return this.socketService.updateProgress(roomId, userId, input);
  }

  leaveRoom(roomId: string, userId: string): RoomSnapshot | null {
    return this.socketService.leaveRoom(roomId, userId);
  }

  reconnectUser(roomId: string, userId: string): RoomSnapshot {
    return this.socketService.reconnectUser(roomId, userId);
  }

  markDisconnected(userId: string): void {
    this.socketService.markDisconnected(userId);
  }

  // ========== Event Listener Management ==========

  setEventListener(listener: (event: any) => void): void {
    // Share the same listener with both services
    this.restService.setEventListener(listener);
    this.socketService.setEventListener(listener);
  }

  clearEventListener(): void {
    this.restService.clearEventListener();
    this.socketService.clearEventListener();
  }
}

// Singleton instance for backwards compatibility
let multiplayerRoomServiceInstance: MultiplayerRoomService | null = null;

export function getMultiplayerRoomService(): MultiplayerRoomService {
  if (!multiplayerRoomServiceInstance) {
    multiplayerRoomServiceInstance = new MultiplayerRoomService();
  }
  return multiplayerRoomServiceInstance;
}

export const multiplayerRoomService = getMultiplayerRoomService();
