import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { validateToken } from './utils/token';
import { UserRepository } from './repositories/userRepository';

type RoomVisibility = 'public' | 'private';

type RoomState = {
  users: Set<string>;
  visibility: RoomVisibility;
  createdAt: number;
};

const rooms: Record<string, RoomState> = {};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SOCKET_BUFFER = Math.ceil(MAX_IMAGE_BYTES * 1.5);
const AI_HANDLE = 'gemini';
const AI_NAME = 'Gemini';

const genCode = () => String(crypto.randomInt(1000, 10000));

const genUniqueCode = () => {
  let code = genCode();
  while (rooms[code]) {
    code = genCode();
  }
  return code;
};

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: '*' },
    maxHttpBufferSize: MAX_SOCKET_BUFFER,
  });

  const listPublicRooms = () =>
    Object.entries(rooms)
      .filter(([, room]) => room.visibility === 'public')
      .map(([code, room]) => ({
        code,
        usersCount: room.users.size,
        createdAt: room.createdAt,
      }))
      .sort((a, b) => b.usersCount - a.usersCount);

  const emitPublicRooms = () => {
    io.emit('rooms_list', listPublicRooms());
  };

  const normalizeHandle = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const mentionsAI = (text: string) => {
    const cleaned = text.toLowerCase();
    return new RegExp(`(^|\\s)@${AI_HANDLE}\\b`).test(cleaned);
  };

  const fetchGeminiReply = async (prompt: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = response.text;
      return typeof text === 'string' ? text.trim() : null;
    } catch (error) {
      console.error('Gemini error:', error);
      return null;
    }
  };

  const getRoomUsers = (roomCode: string) => {
    const room = rooms[roomCode];
    if (!room) return [];
    const users: { id: string; username: string; profilePic: string | null }[] = [];
    room.users.forEach((id) => {
      const member = io.sockets.sockets.get(id);
      if (!member?.data?.username) return;
      users.push({
        id,
        username: member.data.username as string,
        profilePic: (member.data.profilePic as string | null) ?? null,
      });
    });
    return users;
  };

  const emitRoomUsers = (roomCode: string) => {
    const users = getRoomUsers(roomCode);
    io.to(roomCode).emit('room_users', users);
    io.to(roomCode).emit('room_user_count', users.length);
  };

  io.on('connection', async (socket) => {
    console.log('Connected ->', socket.id);

    socket.data.username = null;
    socket.data.roomCode = null;
    socket.data.roomVisibility = null;
    socket.data.profilePic = null;

    try {
      const rawToken =
        socket.handshake.auth?.token ||
        (typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization.split(' ')[1]
          : undefined);
      const payload = rawToken ? validateToken(rawToken) : null;
      if (!payload?.id) {
        socket.emit('room_error', 'Unauthorized.');
        socket.disconnect();
        return;
      }

      const user = await UserRepository.findUserById(payload.id);
      if (!user) {
        socket.emit('room_error', 'Unauthorized.');
        socket.disconnect();
        return;
      }

      socket.data.username = user.name;
      socket.data.profilePic = user.profile_pic ?? null;
    } catch (error) {
      socket.emit('room_error', 'Unauthorized.');
      socket.disconnect();
      return;
    }

    socket.on('create_room', (payload?: { visibility?: RoomVisibility }) => {
      if (!socket.data.username) {
        return socket.emit('room_error', 'Unauthorized.');
      }
      if (socket.data.roomCode) {
        return socket.emit('room_error', 'User is already in a room.');
      }

      const visibility = payload?.visibility === 'private' ? 'private' : 'public';
      const code = genUniqueCode();
      rooms[code] = { users: new Set(), visibility, createdAt: Date.now() };
      rooms[code].users.add(socket.id);
      socket.data.roomCode = code;
      socket.data.roomVisibility = visibility;
      socket.join(code);
      socket.emit('room_created', code);
      io.to(code).emit('user_joined', {
        id: socket.id,
        username: socket.data.username,
        profilePic: socket.data.profilePic,
      });
      emitRoomUsers(code);
      emitPublicRooms();
    });

    socket.on('join_room', (code) => {
      if (!socket.data.username) {
        return socket.emit('room_error', 'Unauthorized.');
      }
      if (socket.data.roomCode) {
        return socket.emit('room_error', 'User is already in a room.');
      }

      const roomCode = String(code || '').trim();
      if (!rooms[roomCode]) {
        return socket.emit('room_error', 'Room does not exist.');
      }

      rooms[roomCode].users.add(socket.id);
      socket.data.roomCode = roomCode;
      socket.data.roomVisibility = rooms[roomCode].visibility;
      socket.join(roomCode);
      socket.emit('room_joined', roomCode);
      io.to(roomCode).emit('user_joined', {
        id: socket.id,
        username: socket.data.username,
        profilePic: socket.data.profilePic,
      });
      emitRoomUsers(roomCode);
      emitPublicRooms();
    });

    socket.on('send_message', async (message) => {
      const raw =
        typeof message === 'string'
          ? { type: 'text', text: message }
          : (message as { type?: string; text?: string; message?: string; data?: string; image?: string });
      const type = raw?.type === 'image' ? 'image' : 'text';
      if (!socket.data.username) {
        return socket.emit('room_error', 'Unauthorized.');
      }
      const roomCode = socket.data.roomCode;
      if (!roomCode || !rooms[roomCode]) {
        return socket.emit('room_error', 'Join a room.');
      }

      if (type === 'image') {
        const data = String(raw?.data || raw?.image || '');
        if (!data.startsWith('data:image/') || !data.includes('base64,')) {
          return socket.emit('room_error', 'Invalid image payload.');
        }
        const base64 = data.split('base64,')[1] || '';
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const approxBytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
        if (approxBytes > MAX_IMAGE_BYTES) {
          return socket.emit('room_error', 'Image too large. Max 5MB.');
        }

        io.to(roomCode).emit('new_message', {
          id: `${socket.id}-${Date.now()}`,
          username: socket.data.username,
          profilePic: socket.data.profilePic,
          type: 'image',
          imageData: data,
          at: Date.now(),
        });
        return;
      }

      const text = String(raw?.text ?? raw?.message ?? '').trim();
      if (!text) return;

      io.to(roomCode).emit('new_message', {
        id: `${socket.id}-${Date.now()}`,
        username: socket.data.username,
        profilePic: socket.data.profilePic,
        type: 'text',
        message: text,
        at: Date.now(),
      });

      if (mentionsAI(text)) {
        const userHandle = normalizeHandle(socket.data.username || 'user');
        const prompt = `You are ${AI_NAME}. Reply in Portuguese in 1-3 short sentences. The user "${socket.data.username}" said: "${text}".`;
        const reply = await fetchGeminiReply(prompt);
        if (reply) {
          io.to(roomCode).emit('new_message', {
            id: `ai-${Date.now()}`,
            username: AI_NAME,
            type: 'text',
            message: `@${userHandle} ${reply}`,
            at: Date.now(),
          });
        } else {
          socket.emit('room_error', 'AI unavailable. Check API key or model.');
        }
      }
    });

    socket.on('leave_room', (ack?: (ok: boolean) => void) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode || !rooms[roomCode]) {
        ack?.(false);
        return;
      }

      rooms[roomCode].users.delete(socket.id);
      socket.leave(roomCode);
      socket.data.roomCode = null;
      socket.data.roomVisibility = null;
      if (rooms[roomCode].users.size === 0) {
        delete rooms[roomCode];
        emitPublicRooms();
        socket.emit('room_left', roomCode);
        ack?.(true);
        return;
      }
      socket.to(roomCode).emit('user_left', {
        id: socket.id,
        username: socket.data.username,
        profilePic: socket.data.profilePic,
      });
      emitRoomUsers(roomCode);
      emitPublicRooms();
      socket.emit('room_left', roomCode);
      ack?.(true);
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode || !rooms[roomCode]) return;

      rooms[roomCode].users.delete(socket.id);
      if (rooms[roomCode].users.size === 0) {
        delete rooms[roomCode];
        emitPublicRooms();
        return;
      }
      socket.to(roomCode).emit('user_left', {
        id: socket.id,
        username: socket.data.username,
        profilePic: socket.data.profilePic,
      });
      emitRoomUsers(roomCode);
      emitPublicRooms();
    });

    socket.on('list_rooms', () => {
      socket.emit('rooms_list', listPublicRooms());
    });
  });

  return io;
}
