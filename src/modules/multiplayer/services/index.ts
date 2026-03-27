// Core service - shared singleton
export { CoreRoomService, getCoreRoomService, coreRoomService } from "./core-room.service.js";

// REST service - uses composition with CoreRoomService
export { RestRoomService, createRestRoomService } from "./rest-room.service.js";

// WebSocket service - uses composition with CoreRoomService
export { SocketRoomService, createSocketRoomService } from "./socket-room.service.js";
