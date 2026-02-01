import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getToken, getUser } from '@/lib/auth';

type PublicRoom = {
  code: string;
  usersCount: number;
  createdAt: number;
};

export default function Rooms() {
  const navigate = useNavigate();
  const user = getUser();
  const [roomCode, setRoomCode] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<number | null>(null);

  const socketUrl = useMemo(() => {
    return import.meta.env.VITE_SOCKET_URL || window.location.origin;
  }, []);

  const cleanupSocket = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
    }
  }, []);

  const refreshRooms = useCallback(() => {
    const token = getToken();
    if (!token) {
      setPublicRooms([]);
      setLoadingRooms(false);
      return;
    }

    cleanupSocket();
    setLoadingRooms(true);

    const socket: Socket = io(socketUrl, {
      auth: { token },
      timeout: 4000,
      reconnection: false,
      forceNew: true,
    });
    socketRef.current = socket;

    let finished = false;
    const finalize = (rooms: PublicRoom[]) => {
      if (finished) return;
      finished = true;
      setPublicRooms(rooms);
      setLoadingRooms(false);
      cleanupSocket();
    };

    timerRef.current = window.setTimeout(() => {
      finalize([]);
    }, 3500);

    socket.on('connect', () => {
      socket.emit('list_rooms');
    });

    socket.on('rooms_list', (rooms: PublicRoom[]) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      finalize(rooms);
    });

    socket.on('connect_error', () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      finalize([]);
    });
  }, [cleanupSocket, socketUrl]);

  useEffect(() => {
    document.body.classList.add('solid-surface');
    return () => {
      document.body.classList.remove('solid-surface');
    };
  }, []);

  useEffect(() => {
    refreshRooms();
    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket, refreshRooms]);

  const onCreate = () => {
    navigate(`/chat?mode=create&visibility=${visibility}`);
  };

  const onJoin = () => {
    if (!roomCode.trim()) return;
    navigate(`/chat?mode=join&code=${encodeURIComponent(roomCode.trim())}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rooms</p>
          <h2 className="text-2xl font-semibold">Your spaces</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{user?.name || 'Turista'}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-white/10 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Create</p>
            <h3 className="mt-2 text-lg font-semibold">Start a room</h3>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 p-1 text-sm">
            <Button
              type="button"
              variant={visibility === 'public' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setVisibility('public')}
            >
              Public
            </Button>
            <Button
              type="button"
              variant={visibility === 'private' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setVisibility('private')}
            >
              Private
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Room codes are temporary and vanish when the last member leaves.
          </p>
          <Button className="w-full" onClick={onCreate}>
            Create room
          </Button>
        </section>

        <section className="space-y-4 rounded-xl border border-white/10 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Join</p>
            <h3 className="mt-2 text-lg font-semibold">Enter a room code</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room code</Label>
            <Input
              id="roomCode"
              placeholder="1234"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value)}
            />
          </div>
          <Button className="w-full" variant="secondary" onClick={onJoin}>
            Join room
          </Button>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Public rooms</h3>
            <p className="text-sm text-muted-foreground">Live rooms visible to everyone.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshRooms} disabled={loadingRooms}>
            {loadingRooms ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        {loadingRooms ? (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
            Loading rooms...
          </div>
        ) : publicRooms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
            No public rooms found right now.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {publicRooms.map((room) => (
              <div
                key={room.code}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Room</p>
                  <p className="font-mono text-lg">{room.code}</p>
                  <p className="text-xs text-muted-foreground">{room.usersCount} online</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/chat?mode=join&code=${room.code}`)}>
                  Join
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
