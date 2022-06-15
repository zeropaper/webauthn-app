import { Application, RequestHandler, Response } from 'express';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { Session, SessionData } from "express-session";
import { Server as SocketIoServer, ServerOptions, Socket } from 'socket.io'

declare module "http" {
  interface IncomingMessage {
    cookieHolder?: string,
    session: Session & SessionData & {
    }
  }
}

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  sessionSocketsChange: (session: any, callback: (e: number) => void) => void;
  [key: string]: (...args: any[]) => void;
}

interface ClientToServerEvents {
  hello: () => void;
  bindSession: (ack: Function) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

function unique(arr: string[]): string[] {
  return arr.reduce((acc, item) => {
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, [])
}

export async function emitToSessionSockets(io: IO, socketIds: string[], eventName: string, ...args: any[]): Promise<void> {
  const sockets = await io.fetchSockets()
  if (!socketIds) return;
  socketIds.forEach((socketId) => {
    const socket = sockets.find(s => s.id === socketId);
    if (!socket) return;
    socket.emit(eventName, ...args);
  })
}

function bindSession(app: Application, socket: Socket): Promise<void> {
  const { session } = socket.request;
  const io: IO = app.get('io');

  if (!session) {
    return Promise.resolve();
  }

  return new Promise(async (resolve, reject) => {
    const sessionDb = await app.get('sequelize').model('Session').findByPk(session.id);
    const data = JSON.parse(sessionDb?.getDataValue('data') || '{}');

    session.socketIds = unique([
      ...(session.socketIds || []),
      ...(data.socketIds || [])
    ])
    if (!session?.socketIds?.includes(socket.id)) {
      session.socketIds.push(socket.id);
    }

    sessionDb?.setDataValue('data', JSON.stringify({
      ...data,
      socketIds: session.socketIds,
    }));
    await sessionDb?.save()

    session.userId = session.userId || data.userId;
    session.save((e) => {
      if (e) return reject(e);
      emitToSessionSockets(io, session.socketIds, 'sessionBound', {
        sessionId: session.id,
        userId: session.userId,
        socketIds: session.socketIds,
      });
      resolve()
    })
  })
}

function unbindSession(app: Application, socket: Socket): Promise<void> {
  const io: IO = app.get('io');
  const { session } = socket.request;
  if (!session || !session?.socketIds?.includes(socket.id)) {
    return Promise.resolve();
  }

  return new Promise(async (resolve, reject) => {
    const sessionDb = await app.get('sequelize').model('Session').findByPk(session.id);
    const data = JSON.parse(sessionDb?.getDataValue('data') || '{}');

    session.socketIds = unique([
      ...(session.socketIds || []),
      ...(data.socketIds || [])
    ])
      .filter(id => id !== socket.id);

    sessionDb?.setDataValue('data', JSON.stringify({
      ...data,
      socketIds: session.socketIds,
    }));
    await sessionDb?.save()

    session.userId = session.userId || data.userId;
    session.save((e) => {
      if (e) return reject(e);
      emitToSessionSockets(io, session.socketIds, 'sessionUnbound', {
        sessionId: session.id,
        userId: session.userId,
        socketIds: session.socketIds,
      });
      resolve()
    })
  });
}

export type IO = SocketIoServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export default function addSockets(app: Application, server: HTTPServer, options?: Partial<ServerOptions>) {
  const io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, options);

  io.on('connection', (socket) => {
    console.log('[io]', 'a user connected', socket.request.session.id);
    bindSession(app, socket).catch(e => console.error('[io]', 'bindSession', e));
    socket.on('disconnect', () => {
      console.log('[io]', 'user disconnected');
      unbindSession(app, socket)
        .catch((err) => console.error('[io] unbindSession error', err));
    });
  });

  // convert a connect middleware to a Socket.IO middleware
  const wrap = (middleware: RequestHandler) => (socket, next) => middleware(socket.request, <Response>{}, next);

  io.use(wrap(app.get('session')));

  // only allow authenticated users
  // io.use((socket, next) => {
  //   bindSession(app, socket).then(() => next()).catch(next);
  // });

  // io.engine.on("initial_headers", (headers: { [key: string]: string }, req: IncomingMessage) => {
  //   if (req.cookieHolder) {
  //     headers["set-cookie"] = req.cookieHolder;
  //     delete req.cookieHolder;
  //   }
  // });

  app.set('io', io);
}