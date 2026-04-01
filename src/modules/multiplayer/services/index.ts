import { getCoreRoomService } from "./core-room.service.js";
import { createRestRoomService } from "./rest-room.service.js";
import { createSocketRoomService } from "./socket-room.service.js";
import type { MultiplayerUser, ProgressUpdateInput, RoomSnapshot } from "../types.js";

// Shared core service
const coreService = getCoreRoomService();
const restService = createRestRoomService(coreService);
const socketService = createSocketRoomService(coreService);

/**
 * Unified Multiplayer Room Service
 * 
 * Combines both REST and WebSocket operations in a single, simple interface.
 * All services share the same CoreRoomService singleton for consistent room state.
 */
export const multiplayerRoomService = {
  // REST operations (HTTP)
  createRoom: restService.createRoom.bind(restService),
  getRoom: restService.getRoom.bind(restService),
  isParticipant: restService.isParticipant.bind(restService),
  joinRoom: restService.joinRoom.bind(restService),
  
  // WebSocket operations (Real-time)
  startRace: socketService.startRace.bind(socketService),
  updateProgress: socketService.updateProgress.bind(socketService),
  leaveRoom: socketService.leaveRoom.bind(socketService),
  reconnectUser: socketService.reconnectUser.bind(socketService),
  markDisconnected: socketService.markDisconnected.bind(socketService),
  sendChatMessage: socketService.sendChatMessage.bind(socketService),
  sendChatTyping: socketService.sendChatTyping.bind(socketService),
  
  // Event listener management
  setEventListener: coreService.setEventListener.bind(coreService),
  clearEventListener: coreService.clearEventListener.bind(coreService),
};

// Export individual services if needed directly
export { CoreRoomService, getCoreRoomService, coreRoomService } from "./core-room.service.js";
export { RestRoomService, createRestRoomService } from "./rest-room.service.js";
export { SocketRoomService, createSocketRoomService } from "./socket-room.service.js";
