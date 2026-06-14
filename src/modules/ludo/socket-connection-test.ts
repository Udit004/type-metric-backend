import { IncomingMessage, Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";

interface LudoTestClientMessage {
  type: string;
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
 * Simple connection test socket (NO AUTH for now).
 * Endpoint: ws://<host>/ludo-ws-test
 */
export function attachLudoConnectionTestSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: "/ludo-ws-test",
  });

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    console.log("[LUDO WS TEST] client connected. url=", request.url);
    // Tell the client the WS is alive

    send(socket, {
      type: "ludo:test:ready",
      payload: {
        ts: Date.now(),
      },
    });

    socket.on("message", (rawData: Buffer) => {
      try {
        const parsed = JSON.parse(rawData.toString()) as LudoTestClientMessage;
        if (!parsed?.type || typeof parsed.type !== "string") {
          send(socket, {
            type: "ludo:test:error",
            payload: { message: "Missing or invalid 'type'" },
          });
          return;
        }

        switch (parsed.type) {
          case "ludo:test:ping": {
            send(socket, {
              type: "ludo:test:pong",
              payload: {
                ts: Date.now(),
              },
            });
            break;
          }

          default: {
            send(socket, {
              type: "ludo:test:error",
              payload: { message: `Unsupported type: ${parsed.type}` },
            });
          }
        }
      } catch {
        send(socket, {
          type: "ludo:test:error",
          payload: { message: "Invalid JSON" },
        });
      }
    });

    socket.on("close", () => {
      // no-op (keep simple)
    });
  });

  return wss;
}

