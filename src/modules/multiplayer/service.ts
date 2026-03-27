/**
 * Multiplayer Service - Main Export
 *
 * This file maintains backwards compatibility by re-exporting services.
 * Implementation details have been moved to the services/ folder:
 * - core-room.service.ts: Core room state and validation logic
 * - rest-room.service.ts: REST API operations
 * - socket-room.service.ts: WebSocket real-time operations
 */

export type { InternalRoom } from "./services/core-room.service.js";
export { MultiplayerRoomService, multiplayerRoomService } from "./multiplayer-room.service.js";
