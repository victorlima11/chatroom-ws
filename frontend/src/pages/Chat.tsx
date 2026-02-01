import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getToken, getUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ChevronRight, ImagePlus, Link2Icon, LogOutIcon, Sparkles } from 'lucide-react';

type Message = {
  id: string;
  username?: string;
  profilePic?: string | null;
  type?: 'text' | 'image';
  imageData?: string | null;
  message: string;
  at: number;
  system?: boolean;
};

type RoomVisibility = 'public' | 'private';

type PendingAction =
  | { mode: 'create'; visibility: RoomVisibility }
  | { mode: 'join'; code: string };

type RoomUser = {
  id: string;
  username: string;
  profilePic?: string | null;
};

let sharedSocket: Socket | null = null;
let sharedSocketUrl: string | null = null;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const AI_HANDLE = 'gemini';
const AI_NAME = 'Gemini';

const chatCache: {
  roomCode: string | null;
  messages: Message[];
  status: 'idle' | 'connecting' | 'connected';
  userCount: number | null;
} = {
  roomCode: null,
  messages: [],
  status: 'idle',
  userCount: null,
};

export default function Chat() {
  const [searchParams] = useSearchParams();
  const user = getUser();
  const defaultName = user?.name || 'Guest';

  const [messages, setMessages] = useState<Message[]>(() => chatCache.messages);
  const [roomCode, setRoomCode] = useState<string | null>(() => chatCache.roomCode);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>(() => chatCache.status);
  const [userCount, setUserCount] = useState<number | null>(() => chatCache.userCount);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mentionState, setMentionState] = useState<{ at: number | null; query: string }>({
    at: null,
    query: '',
  });

  const socketRef = useRef<Socket | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);

  const socketUrl = useMemo(() => {
    return import.meta.env.VITE_SOCKET_URL || window.location.origin;
  }, []);

  useEffect(() => {
    chatCache.messages = messages;
  }, [messages]);

  useEffect(() => {
    chatCache.roomCode = roomCode;
  }, [roomCode]);

  useEffect(() => {
    chatCache.status = status;
  }, [status]);

  useEffect(() => {
    chatCache.userCount = userCount;
  }, [userCount]);

  useEffect(() => {
    if (!roomCode) {
      setRoomUsers([]);
    }
  }, [roomCode]);

  useEffect(() => {
    document.body.classList.add('solid-surface');
    return () => {
      document.body.classList.remove('solid-surface');
    };
  }, []);

  useEffect(() => {
    const socket =
      sharedSocket && sharedSocketUrl === socketUrl
        ? sharedSocket
        : io(socketUrl, {
            autoConnect: false,
            auth: {
              token: getToken(),
            },
          });
    sharedSocket = socket;
    sharedSocketUrl = socketUrl;
    socketRef.current = socket;
    socket.removeAllListeners();

    socket.on('connect', () => {
      setStatus('connected');
      setError('');
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        if (action.mode === 'create') {
          socket.emit('create_room', { visibility: action.visibility });
        } else {
          socket.emit('join_room', action.code);
        }
      }
    });

    socket.on('disconnect', () => {
      setStatus('idle');
    });

    socket.on('room_error', (message: string) => {
      setError(message);
    });

    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          message: `Room created. Share code ${code}.`,
          at: Date.now(),
          system: true,
        },
      ]);
    });

    socket.on('room_joined', (code: string) => {
      setRoomCode(code);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          message: `Joined room ${code}.`,
          at: Date.now(),
          system: true,
        },
      ]);
    });

    socket.on('room_left', () => {
      setRoomCode(null);
      setStatus('idle');
      setUserCount(null);
      setRoomUsers([]);
    });

    socket.on('user_joined', (payload: { id: string; username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `join-${payload.id}-${Date.now()}`,
          message: `${payload.username} joined the room.`,
          at: Date.now(),
          system: true,
        },
      ]);
    });

    socket.on('user_left', (payload: { id: string; username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `left-${payload.id}-${Date.now()}`,
          message: `${payload.username} left the room.`,
          at: Date.now(),
          system: true,
        },
      ]);
    });

    socket.on('room_user_count', (count: number) => {
      setUserCount(count);
    });

    socket.on('room_users', (users: RoomUser[]) => {
      setRoomUsers(users);
      setUserCount(users.length);
    });

    socket.on(
      'new_message',
      (payload: {
        id: string;
        username: string;
        profilePic?: string | null;
        type?: 'text' | 'image';
        message?: string;
        imageData?: string | null;
        at: number;
      }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: payload.id,
            username: payload.username,
            profilePic: payload.profilePic,
            type: payload.type,
            message: payload.message || '',
            imageData: payload.imageData,
            at: payload.at,
          },
        ]);
      }
    );

    return () => {
      socket.removeAllListeners();
    };
  }, [socketUrl]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomCode || socket.connected) return;
    startAction({ mode: 'join', code: roomCode });
  }, [roomCode]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const code = searchParams.get('code');
    if (!mode) return;

    if (mode === 'create') {
      const visibility = searchParams.get('visibility') === 'private' ? 'private' : 'public';
      startAction({ mode: 'create', visibility });
    } else if (mode === 'join' && code) {
      startAction({ mode: 'join', code });
    }
  }, [searchParams]);

  const startAction = (action: PendingAction) => {
    const socket = socketRef.current;
    pendingActionRef.current = action;
    if (!socket) return;
    if (!socket.connected) {
      setStatus('connecting');
      socket.connect();
      return;
    }

    if (action.mode === 'create') {
      socket.emit('create_room', { visibility: action.visibility });
    } else {
      socket.emit('join_room', action.code);
    }
  };

  const onSend = (event: React.FormEvent) => {
    event.preventDefault();
    const socket = socketRef.current;
    if (!socket || !text.trim()) return;
    setError('');
    socket.emit('send_message', { type: 'text', text: text.trim() });
    setText('');
    setMentionState({ at: null, query: '' });
  };

  const onPickImage = () => {
    fileInputRef.current?.click();
  };

  const formatTimestamp = (value: number) =>
    new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const onImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image too large. Max 5MB.');
      return;
    }
    const socket = socketRef.current;
    if (!socket || status !== 'connected') {
      setError('Connect to a room before sending images.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setError('Failed to read image.');
        return;
      }
      setError('');
      socket.emit('send_message', { type: 'image', data: result });
      setMentionState({ at: null, query: '' });
    };
    reader.onerror = () => {
      setError('Failed to read image.');
    };
    reader.readAsDataURL(file);
  };

  const onCopyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
  };

  const normalizedName = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const isAIUser = (value: string) => normalizedName(value) === AI_HANDLE;

  const mentionSuggestions = useMemo(() => {
    if (mentionState.at === null) return [];
    const query = normalizedName(mentionState.query);
    const aiUser: RoomUser = { id: AI_HANDLE, username: AI_NAME, profilePic: null };
    const candidates = [aiUser, ...roomUsers].filter((member) => member.username);
    const filtered = query
      ? candidates.filter((member) => normalizedName(member.username).startsWith(query))
      : candidates;
    const unique = filtered.filter(
      (member, index, list) =>
        list.findIndex((candidate) => normalizedName(candidate.username) === normalizedName(member.username)) ===
        index
    );
    return unique.slice(0, 3);
  }, [mentionState.at, mentionState.query, roomUsers]);

  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setText(value);

    const cursor = event.target.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionState({ at: null, query: '' });
      return;
    }
    const prevChar = atIndex > 0 ? beforeCursor[atIndex - 1] : ' ';
    if (prevChar && !/\s/.test(prevChar)) {
      setMentionState({ at: null, query: '' });
      return;
    }
    const query = beforeCursor.slice(atIndex + 1);
    if (query.includes(' ') || query.includes('\n')) {
      setMentionState({ at: null, query: '' });
      return;
    }
    setMentionState({ at: atIndex, query });
  };

  const insertMention = (username: string) => {
    if (mentionState.at === null) return;
    const handle = normalizedName(username);
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionState.at);
    const after = text.slice(cursor);
    const next = `${before}@${handle} ${after}`;
    setText(next);
    setMentionState({ at: null, query: '' });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const caret = (before + `@${handle} `).length;
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const onLeaveRoom = () => {
    const socket = socketRef.current;
    if (socket) {
      let finished = false;
      const finalize = () => {
        if (finished) return;
        finished = true;
        socket.disconnect();
      };
      socket.emit('leave_room', () => {
        finalize();
      });
      window.setTimeout(finalize, 250);
    }
    sharedSocket = null;
    sharedSocketUrl = null;
    pendingActionRef.current = null;
    chatCache.roomCode = null;
    chatCache.messages = [];
    chatCache.status = 'idle';
    chatCache.userCount = null;
    setRoomUsers([]);
    setUserCount(null);
    setRoomCode(null);
    setMessages([]);
    setText('');
    setError('');
    setStatus('idle');
    navigate('/chat', { replace: true });
  };

  const hasRoom = Boolean(roomCode);
  const canChat = hasRoom && status === 'connected';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Chat</p>
          <h2 className="text-2xl font-semibold">{hasRoom ? `Room ${roomCode}` : 'Select a room'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {userCount !== null ? <span>{userCount} online</span> : null}
          <span>{defaultName}</span>
          {hasRoom ? (
            <Button variant="ghost" size="sm" onClick={onLeaveRoom} aria-label="Leave room">
              <LogOutIcon className="h-4 w-4 text-red-400" />
            </Button>
          ) : null}
        </div>
      </div>

      {hasRoom ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Room code</span>
          <Button className='bg-transparent hover:bg-white/10' onClick={onCopyCode}>
            <Link2Icon
              color='white' 
            />
            <span className="font-mono text-white text-base">{roomCode}</span>
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
           in Rooms to start chatting.
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/rooms')}>
              Go to rooms
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="flex-1 min-h-0 overflow-y-auto py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {!canChat ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
              {hasRoom ? 'Connecting to room...' : 'No room selected.'}
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((message) => {
              const isSelf = message.username === defaultName;
              if (message.system) {
                return (
                  <div
                    key={message.id}
                    className="animate-fade-up text-center text-xs text-muted-foreground"
                  >
                    {message.message}
                  </div>
                );
              }

              const displayName = message.username || 'Anonymous';
              const initials = displayName.slice(0, 2).toUpperCase();
              const isAI = isAIUser(displayName);

              const selfHandle = normalizedName(defaultName || '');
              const isMentioned =
                Boolean(selfHandle) &&
                message.type !== 'image' &&
                message.message?.toLowerCase().includes(`@${selfHandle}`);

              return (
                <div
                  key={message.id}
                  className={cn(
                    'animate-fade-up w-full',
                    isSelf ? 'flex justify-end' : 'flex justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'grid max-w-[85%] items-start gap-x-3 gap-y-1',
                      isSelf ? 'grid-cols-[minmax(0,1fr)_48px]' : 'grid-cols-[48px_minmax(0,1fr)]'
                    )}
                  >
                    <div
                      className={cn(
                        'row-start-1 flex items-start justify-center',
                        isSelf ? 'col-start-2' : 'col-start-1'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        {message.profilePic && !isAI ? <AvatarImage src={message.profilePic} /> : null}
                        <AvatarFallback>
                          {isAI ? <Sparkles className="h-4 w-4" aria-hidden="true" /> : initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span
                      className={cn(
                        'row-start-2 max-w-[64px] truncate text-center text-[11px] leading-tight text-muted-foreground',
                        isSelf ? 'col-start-2' : 'col-start-1'
                      )}
                    >
                      {displayName}
                    </span>
                    <div
                      className={cn(
                        'min-w-0',
                        isSelf ? 'col-start-1 justify-self-end text-right' : 'col-start-2 justify-self-start'
                      )}
                    >
                      <div
                        className={cn(
                          'w-fit max-w-full break-words whitespace-pre-wrap rounded-2xl border border-white/10 px-4 py-3 text-sm leading-relaxed transition',
                          isSelf ? 'bg-white/10' : 'bg-card',
                          isMentioned && 'mention-wave border-white/20 text-foreground'
                        )}
                      >
                        {message.type === 'image' && message.imageData ? (
                          <img
                            src={message.imageData}
                            alt="Shared"
                            className="max-h-80 w-auto max-w-full rounded-xl object-contain"
                            loading="lazy"
                          />
                        ) : (
                          message.message
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] text-muted-foreground',
                        isSelf ? 'col-start-1 justify-self-end text-right' : 'col-start-2 justify-self-start'
                      )}
                    >
                      {formatTimestamp(message.at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {canChat ? (
        <form className="relative mt-2 border-t border-white/10 pb-2 pt-4" onSubmit={onSend}>
          {mentionSuggestions.length > 0 ? (
            <div className="absolute inset-x-0 bottom-full z-30 mb-3">
              <div className="mx-auto w-full max-w-3xl">
                <div className="rounded-xl border border-white/10 bg-background/95 p-2 text-sm shadow-glow">
                  <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Mention
                  </p>
                  <div className="grid gap-1">
                    {mentionSuggestions.map((member) => {
                      const isGemini = isAIUser(member.username);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => insertMention(member.username)}
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                        >
                          <Avatar className="h-6 w-6">
                            {member.profilePic && !isGemini ? (
                              <AvatarImage src={member.profilePic} />
                            ) : null}
                            <AvatarFallback>
                              {isGemini ? (
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                member.username.slice(0, 2).toUpperCase() || 'U'
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.username}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mx-auto flex w-full max-w-3xl gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageSelected}
            />
            <Button type="button" size="icon" aria-label="Attach image" onClick={onPickImage}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Input
              ref={inputRef}
              placeholder="Type a message"
              value={text}
              onChange={onTextChange}
            />
            <Button type="submit" size="icon" aria-label="Send message">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
