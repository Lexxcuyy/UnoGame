import React from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { GameMode } from '../types';
import { getSocket } from '../utils/socket';

interface RoomPlayer {
  id: string;
  name: string;
}

interface RoomState {
  code: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: RoomPlayer[];
}

interface FriendsLobbyProps {
  profileName: string;
  onProfileNameChange: (name: string) => void;
  onBack: () => void;
  onStartOnlineGame: (mode: GameMode) => void;
}

const FriendsLobby: React.FC<FriendsLobbyProps> = ({
  profileName,
  onProfileNameChange,
  onBack,
  onStartOnlineGame,
}) => {
  const socket = React.useMemo(() => getSocket(), []);
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [room, setRoom] = React.useState<RoomState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<GameMode>('classic');
  const [mySocketId, setMySocketId] = React.useState<string>('');
  const [isConnected, setIsConnected] = React.useState<boolean>(socket.connected);
  const normalizeRoomCode = React.useCallback((value: string) => (
    value
      .normalize('NFKC')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6)
  ), []);

  React.useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
      setMySocketId(socket.id || '');
      socket.emit('profile:set', { name: profileName });
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };
    const onConnectError = () => {
      setIsConnected(false);
      setError('Tidak bisa terhubung ke server room. Jalankan `npm run server` dulu.');
    };
    const onRoomJoined = (payload: RoomState) => setRoom(payload);
    const onRoomState = (payload: RoomState) => setRoom(payload);
    const onRoomLeft = () => setRoom(null);
    const onRoomError = (payload: { message?: string }) => setError(payload?.message || 'Terjadi kesalahan.');
    const onRoomStart = (payload: { mode: GameMode }) => onStartOnlineGame(payload.mode);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:state', onRoomState);
    socket.on('room:left', onRoomLeft);
    socket.on('room:error', onRoomError);
    socket.on('room:start', onRoomStart);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:state', onRoomState);
      socket.off('room:left', onRoomLeft);
      socket.off('room:error', onRoomError);
      socket.off('room:start', onRoomStart);
    };
  }, [socket, profileName, onStartOnlineGame]);

  React.useEffect(() => {
    socket.emit('profile:set', { name: profileName });
  }, [profileName, socket]);

  const createRoom = () => {
    if (!socket.connected) {
      setError('Server room belum terhubung. Jalankan `npm run server`.');
      return;
    }
    setError(null);
    socket.emit('room:create', { name: profileName });
  };

  const joinRoom = () => {
    if (!socket.connected) {
      setError('Server room belum terhubung. Jalankan `npm run server`.');
      return;
    }
    const normalized = normalizeRoomCode(roomCodeInput);
    if (normalized.length < 4) {
      setError('Room code tidak valid.');
      return;
    }
    setError(null);
    socket.emit('room:join', { code: normalized, name: profileName });
  };

  const leaveRoom = () => {
    socket.emit('room:leave');
    setRoom(null);
  };

  const startRoom = () => {
    if (!room) return;
    socket.emit('room:start', { mode: selectedMode });
  };

  const isHost = room?.hostId === mySocketId;

  return (
    <div className="relative h-full w-full bg-slate-900 text-white px-6 pt-10 pb-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className={clsx('text-xs font-bold px-2 py-1 rounded-full border', isConnected ? 'text-green-300 border-green-400/40 bg-green-500/10' : 'text-red-300 border-red-400/40 bg-red-500/10')}>
          {isConnected ? 'SERVER CONNECTED' : 'SERVER OFFLINE'}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 mb-5">
        <label className="block text-sm text-slate-300 mb-2">Nama Kamu</label>
        <input
          value={profileName}
          onChange={e => onProfileNameChange(e.target.value)}
          maxLength={24}
          className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white outline-none focus:border-blue-400"
        />
      </div>

      {!room ? (
        <div className="space-y-4">
          <button
            onClick={createRoom}
            disabled={!isConnected}
            className={clsx('w-full rounded-2xl font-bold py-3', isConnected ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed')}
          >
            Create Room
          </button>
          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
            <label className="block text-sm text-slate-300 mb-2">Room Code</label>
            <input
              value={roomCodeInput}
              onChange={e => setRoomCodeInput(normalizeRoomCode(e.target.value))}
              placeholder="ABCDEF"
              inputMode="text"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 mb-3 text-white tracking-widest uppercase outline-none focus:border-blue-400"
            />
            <button
              onClick={joinRoom}
              disabled={!isConnected}
              className={clsx('w-full rounded-xl font-bold py-2.5', isConnected ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed')}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Room Code</div>
                <div className="text-2xl font-black tracking-widest">{room.code}</div>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(room.code)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
            <div className="inline-flex items-center gap-2 text-sm text-slate-300 mb-3">
              <Users size={14} />
              Players ({room.players.length}/4)
            </div>
            <div className="space-y-2">
              {room.players.map(player => (
                <div key={player.id} className="rounded-xl bg-slate-900/80 px-3 py-2 flex items-center justify-between">
                  <span>{player.name}</span>
                  <span className={clsx('text-xs font-bold', player.id === room.hostId ? 'text-yellow-300' : 'text-slate-400')}>
                    {player.id === room.hostId ? 'HOST' : 'PLAYER'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
            <div className="text-sm text-slate-300 mb-2">Game Mode</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedMode('classic')}
                className={clsx('rounded-xl px-3 py-2 border', selectedMode === 'classic' ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-white/10')}
              >
                Classic
              </button>
              <button
                onClick={() => setSelectedMode('no-mercy')}
                className={clsx('rounded-xl px-3 py-2 border', selectedMode === 'no-mercy' ? 'bg-purple-700 border-purple-500' : 'bg-slate-900 border-white/10')}
              >
                No Mercy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={leaveRoom} className="rounded-xl border border-white/20 py-2.5">
              Leave
            </button>
            <button
              onClick={startRoom}
              disabled={!isHost}
              className={clsx(
                'rounded-xl py-2.5 font-bold',
                isHost ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              )}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-4 text-sm text-red-300">{error}</div>}
      <div className="mt-6 text-xs text-slate-500">
        Catatan: ini MVP room/lobby realtime. Logic game utama tetap pakai sistem sekarang.
      </div>
    </div>
  );
};

export default FriendsLobby;
