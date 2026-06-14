import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";

import { rollDice } from "./dice.js";

interface WsClientMessage {
  type?: string;
  payload?: unknown;
}

function isOpenSocket(socket: WebSocket): boolean {
  return socket.readyState === WebSocket.OPEN;
}

function send(socket: WebSocket, message: unknown): void {
  if (!isOpenSocket(socket)) return;
  socket.send(JSON.stringify(message));
}

/**
 * Ludo WS dice handler (NO AUTH).
 * Endpoint: ws://<host>:<port>/ws?test=ludo
 */
export function attachLudoDiceSocket(httpServer: any): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ludo-ws",
  });


  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const url = request.url ?? "";
    const wantsLudo = url.includes("test=ludo");

    if (!wantsLudo) {
      // Let multiplayer gateway handle non-ludo connections.
      // We just ignore.
      return;
    }

    send(socket, {
      type: "connection:ready",
      payload: { user: { userId: "test-user", name: "LudoDice" } },
    });

    socket.on("message", (rawData: Buffer) => {
      try {
        const parsed = JSON.parse(rawData.toString()) as WsClientMessage;
        if (!parsed?.type || typeof parsed.type !== "string") {
          send(socket, {
            type: "error",
            payload: { code: "BAD_REQUEST", message: "Missing or invalid 'type'" },
          });
          return;
        }

        switch (parsed.type) {
          case "ludo:dice:roll": {
            const res = rollDice();
            send(socket, {
              type: "ludo:dice:result",
              payload: { dice_value: res.dice_value },
            });
            break;
          }

          default: {
            send(socket, {
              type: "error",
              payload: { code: "BAD_REQUEST", message: `Unsupported type: ${parsed.type}` },
            });
          }
        }
      } catch {
        send(socket, {
          type: "error",
          payload: { code: "BAD_REQUEST", message: "Invalid JSON" },
        });
      }
    });
  });

  return wss;
}

