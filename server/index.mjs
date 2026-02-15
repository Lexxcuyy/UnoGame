import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map();
const socketState = new Map();

const COLORS = ['red', 'yellow', 'green', 'blue'];
const TABLE_ORDER = ['bottom', 'right', 'top', 'left'];
const MAX_PLAYERS = 4;

const makeCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
};

const createUniqueCode = () => {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  return code;
};

const shuffle = array => {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const buildDeck = mode => {
  let deck = [];
  let idCounter = 0;
  const addCard = (color, type, value, count = 1) => {
    for (let i = 0; i < count; i += 1) {
      deck.push({ id: `card-${idCounter++}`, color, type, value });
    }
  };

  if (mode === 'no-mercy') {
    // === UNO No Mercy deck: 168 cards ===
    // Numbers: 2 of each 0-9 per color = 80
    COLORS.forEach(color => {
      addCard(color, 'number', 0, 2);
      for (let i = 1; i <= 9; i += 1) addCard(color, 'number', i, 2);
    });
    // Action cards (colored)
    COLORS.forEach(color => {
      addCard(color, 'skip', undefined, 3);       // 12
      addCard(color, 'reverse', undefined, 3);     // 12
      addCard(color, 'draw2', undefined, 2);       // 8
      addCard(color, 'draw4', undefined, 2);       // 8  (colored, not wild)
      addCard(color, 'skipAll', undefined, 2);     // 8
      addCard(color, 'discardAll', undefined, 3);  // 12
    });
    // Wild cards
    addCard('black', 'wild', undefined, 14);       // 14 (includes substitutes for unimplemented wild types)
    addCard('black', 'draw6', undefined, 8);       // 8
    addCard('black', 'draw10', undefined, 4);      // 4
    addCard('black', 'x2', undefined, 2);          // 2  (custom)
    // Total: 80+12+12+8+8+8+12+14+8+4+2 = 168
  } else {
    // === Classic UNO deck: 108 cards ===
    COLORS.forEach(color => {
      addCard(color, 'number', 0, 1);
      for (let i = 1; i <= 9; i += 1) addCard(color, 'number', i, 2);
      addCard(color, 'skip', undefined, 2);
      addCard(color, 'reverse', undefined, 2);
      addCard(color, 'draw2', undefined, 2);
    });
    addCard('black', 'wild', undefined, 4);
    addCard('black', 'draw4', undefined, 4);
  }
  return shuffle(deck);
};

const getDrawPower = card => {
  if (card.type === 'draw2') return 2;
  if (card.type === 'draw4') return 4;
  if (card.type === 'draw6') return 6;
  if (card.type === 'draw10') return 10;
  return 0;
};

const canStackCard = (card, topCard, mode) => {
  const cardPower = getDrawPower(card);
  const topPower = getDrawPower(topCard);
  const isMultiplier = card.type === 'x2';
  const topIsMultiplier = topCard.type === 'x2';
  if (mode === 'no-mercy' && (isMultiplier || topIsMultiplier)) return isMultiplier || cardPower > 0;
  if (cardPower === 0 || topPower === 0) return false;
  if (mode === 'no-mercy') return cardPower >= topPower;
  return true;
};

const canPlayCard = (card, game) => {
  const topCard = game.discardPile[game.discardPile.length - 1];
  if (!topCard) return false;
  if (game.stackAccumulation > 0) return canStackCard(card, topCard, game.mode);
  if (card.type === 'x2') return false;
  const colorMatch = card.color === game.activeColor;
  const isWild = card.color === 'black';
  const valueMatch = card.type === 'number' && topCard.type === 'number' && card.value === topCard.value;
  const typeMatch = card.type !== 'number' && card.type === topCard.type;
  return colorMatch || isWild || valueMatch || typeMatch;
};

const drawFromDeck = game => {
  if (game.deck.length > 0) return;
  if (game.discardPile.length <= 1) return;
  const top = game.discardPile.pop();
  game.deck = shuffle(game.discardPile);
  game.discardPile = [top];
};

const drawCards = (game, playerId, amount) => {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return 0;
  let drawn = 0;
  for (let i = 0; i < amount; i += 1) {
    drawFromDeck(game);
    const card = game.deck.shift();
    if (!card) break;
    player.hand.push(card);
    drawn += 1;
  }
  return drawn;
};

const advanceTurn = (game, skip = false) => {
  const idx = game.order.indexOf(game.currentPlayerId);
  if (idx < 0) return;
  const move = game.direction === 'cw' ? 1 : -1;
  const steps = skip ? 2 : 1;
  let nextIdx = (idx + move * steps) % game.order.length;
  if (nextIdx < 0) nextIdx += game.order.length;
  game.currentPlayerId = game.order[nextIdx];
};

const resolveStackAutoHit = game => {
  if (game.stackAccumulation <= 0) return;
  const current = game.players.find(p => p.id === game.currentPlayerId);
  const topCard = game.discardPile[game.discardPile.length - 1];
  if (!current || !topCard) return;
  const hasCounter = current.hand.some(c => canStackCard(c, topCard, game.mode));
  if (hasCounter) return;
  const hit = drawCards(game, current.id, game.stackAccumulation);
  game.lastEvent = { type: 'draw', playerId: current.id, count: hit };
  game.lastAction = `${current.name} drew ${hit} cards`;
  game.stackAccumulation = 0;
  advanceTurn(game, false);
};

const createGame = (room, mode) => {
  let deck = buildDeck(mode);
  const players = room.players.map(p => ({ id: p.id, name: p.name, hand: [] }));
  players.forEach(p => {
    p.hand = deck.splice(0, 7);
  });

  let firstCard = deck.shift();
  while (firstCard && (firstCard.color === 'black' || firstCard.type === 'x2')) {
    deck.push(firstCard);
    deck = shuffle(deck);
    firstCard = deck.shift();
  }
  const activeColor = firstCard.color === 'black' ? COLORS[Math.floor(Math.random() * COLORS.length)] : firstCard.color;

  return {
    mode,
    order: players.map(p => p.id),
    players,
    deck,
    discardPile: [firstCard],
    currentPlayerId: players[0].id,
    direction: 'cw',
    stackAccumulation: 0,
    activeColor,
    winner: null,
    lastEvent: null,
    lastAction: `${players[0].name} starts`,
  };
};

const aliasForIndex = idx => (idx === 0 ? 'user' : `bot${idx}`);
const avatars = ['https://picsum.photos/104/104', 'https://picsum.photos/101/101', 'https://picsum.photos/102/102', 'https://picsum.photos/103/103'];

const toPerspective = (room, socketId) => {
  const game = room.game;
  const selfIdx = game.order.indexOf(socketId);
  if (selfIdx === -1) return null;

  const cwOthers = [];
  for (let i = 1; i < game.order.length; i += 1) {
    cwOthers.push(game.order[(selfIdx + i) % game.order.length]);
  }
  const viewOrder = [socketId, ...cwOthers];

  const positionsByCount = {
    2: ['bottom', 'top'],
    3: ['bottom', 'right', 'top'],
    4: ['bottom', 'right', 'top', 'left'],
  };
  const positions = positionsByCount[viewOrder.length] || TABLE_ORDER;

  const idMap = new Map();
  viewOrder.forEach((id, idx) => idMap.set(id, aliasForIndex(idx)));

  const players = viewOrder.map((canonicalId, idx) => {
    const p = game.players.find(x => x.id === canonicalId);
    const alias = aliasForIndex(idx);
    return {
      id: alias,
      name: p?.name || alias,
      avatar: avatars[idx % avatars.length],
      cardCount: p?.hand.length || 0,
      isBot: alias !== 'user',
      position: positions[idx],
      hand: alias === 'user' ? (p?.hand || []) : [],
    };
  });

  const winnerAlias = game.winner ? idMap.get(game.winner) || null : null;
  const event = game.lastEvent
    ? { ...game.lastEvent, playerId: idMap.get(game.lastEvent.playerId) || 'user' }
    : null;

  return {
    gameMode: game.mode,
    players,
    deck: [],
    discardPile: game.discardPile,
    currentPlayerId: idMap.get(game.currentPlayerId) || 'user',
    direction: game.direction,
    stackAccumulation: game.stackAccumulation,
    winner: winnerAlias,
    activeColor: game.activeColor,
    drawCount: 0,
    isChoosingColor: false,
    pendingCardPlayed: null,
    isSwapping: false,
    error: null,
    isStackingChoice: false,
    lastEvent: event,
    lastAction: game.lastAction,
  };
};

const emitRoomState = code => {
  const room = rooms.get(code);
  if (!room) return;
  room.players.forEach(player => {
    const payload = toPerspective(room, player.id);
    if (payload) io.to(player.id).emit('game:state', payload);
  });
};

const roomPayload = room => ({
  code: room.code,
  hostId: room.hostId,
  status: room.status,
  players: room.players,
});

const leaveRoomInternal = socket => {
  const state = socketState.get(socket.id);
  if (!state?.roomCode) return;
  const room = rooms.get(state.roomCode);
  if (!room) {
    socketState.set(socket.id, { ...state, roomCode: null });
    return;
  }

  room.players = room.players.filter(p => p.id !== socket.id);
  socket.leave(room.code);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    socketState.set(socket.id, { ...state, roomCode: null });
    return;
  }
  if (room.hostId === socket.id) room.hostId = room.players[0].id;
  if (room.game) {
    room.game.players = room.game.players.filter(p => p.id !== socket.id);
    room.game.order = room.game.order.filter(id => id !== socket.id);
    if (room.game.currentPlayerId === socket.id && room.game.order.length > 0) {
      room.game.currentPlayerId = room.game.order[0];
    }
  }

  socketState.set(socket.id, { ...state, roomCode: null });
  io.to(room.code).emit('room:state', roomPayload(room));
  if (room.game) emitRoomState(room.code);
};

const getRoomBySocket = socketId => {
  const state = socketState.get(socketId);
  if (!state?.roomCode) return null;
  return rooms.get(state.roomCode) || null;
};

io.on('connection', socket => {
  socketState.set(socket.id, { name: 'Player', roomCode: null });

  socket.on('profile:set', payload => {
    const curr = socketState.get(socket.id) || { roomCode: null, name: 'Player' };
    const name = String(payload?.name || '').trim().slice(0, 24) || 'Player';
    socketState.set(socket.id, { ...curr, name });
    socket.emit('profile:ack', { name });
  });

  socket.on('room:create', payload => {
    leaveRoomInternal(socket);
    const name = String(payload?.name || '').trim().slice(0, 24) || 'Player';
    const code = createUniqueCode();
    const room = { code, hostId: socket.id, status: 'lobby', players: [{ id: socket.id, name }], game: null };
    rooms.set(code, room);
    socket.join(code);
    socketState.set(socket.id, { name, roomCode: code });
    socket.emit('room:joined', roomPayload(room));
    io.to(code).emit('room:state', roomPayload(room));
  });

  socket.on('room:join', payload => {
    const code = String(payload?.code || '').toUpperCase().trim();
    const name = String(payload?.name || '').trim().slice(0, 24) || 'Player';
    const room = rooms.get(code);
    if (!room) return socket.emit('room:error', { message: 'Room tidak ditemukan.' });
    if (room.players.length >= MAX_PLAYERS) return socket.emit('room:error', { message: 'Room penuh (max 4).' });
    if (room.status !== 'lobby') return socket.emit('room:error', { message: 'Game sudah dimulai.' });

    leaveRoomInternal(socket);
    socket.join(code);
    room.players.push({ id: socket.id, name });
    socketState.set(socket.id, { name, roomCode: code });
    socket.emit('room:joined', roomPayload(room));
    io.to(code).emit('room:state', roomPayload(room));
  });

  socket.on('room:start', payload => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2) return socket.emit('room:error', { message: 'Butuh minimal 2 pemain.' });
    const mode = payload?.mode === 'no-mercy' ? 'no-mercy' : 'classic';
    room.status = 'playing';
    room.game = createGame(room, mode);
    io.to(room.code).emit('room:start', { mode, room: roomPayload(room) });
    io.to(room.code).emit('room:state', roomPayload(room));
    emitRoomState(room.code);
  });

  socket.on('game:requestState', () => {
    const room = getRoomBySocket(socket.id);
    if (!room?.game) return;
    const perspective = toPerspective(room, socket.id);
    if (perspective) socket.emit('game:state', perspective);
  });

  socket.on('game:play', payload => {
    const room = getRoomBySocket(socket.id);
    if (!room?.game) return;
    const game = room.game;
    if (game.winner) return;
    if (game.currentPlayerId !== socket.id) return;

    const actor = game.players.find(p => p.id === socket.id);
    if (!actor) return;
    const card = actor.hand.find(c => c.id === payload?.cardId);
    if (!card) return;
    if (!canPlayCard(card, game)) return;

    actor.hand = actor.hand.filter(c => c.id !== card.id);
    game.discardPile.push({ ...card, playedBy: actor.id });

    if (card.color === 'black') {
      if (card.type === 'x2') {
        // keep
      } else {
        const chosen = COLORS.includes(payload?.chosenColor) ? payload.chosenColor : COLORS[Math.floor(Math.random() * COLORS.length)];
        game.activeColor = chosen;
      }
    } else {
      game.activeColor = card.color;
    }

    if (card.type === 'draw2') game.stackAccumulation += 2;
    if (card.type === 'draw4') game.stackAccumulation += 4;
    if (card.type === 'draw6') game.stackAccumulation += 6;
    if (card.type === 'draw10') game.stackAccumulation += 10;
    if (card.type === 'x2' && game.stackAccumulation > 0) game.stackAccumulation *= 2;

    game.lastEvent = { type: 'play', playerId: actor.id, cardId: card.id };
    game.lastAction = `${actor.name} played ${card.type === 'number' ? card.value : card.type}`;

    if (actor.hand.length === 0) {
      game.winner = actor.id;
      emitRoomState(room.code);
      return;
    }

    if (card.type === 'reverse') game.direction = game.direction === 'cw' ? 'ccw' : 'cw';
    let skip = card.type === 'skip' || card.type === 'skipAll';
    if (card.type === 'reverse' && game.order.length === 2) skip = true;
    if (card.type !== 'skipAll') {
      advanceTurn(game, skip);
      resolveStackAutoHit(game);
    }
    emitRoomState(room.code);
  });

  socket.on('game:draw', () => {
    const room = getRoomBySocket(socket.id);
    if (!room?.game) return;
    const game = room.game;
    if (game.winner) return;
    if (game.currentPlayerId !== socket.id) return;

    const amount = game.stackAccumulation > 0 ? game.stackAccumulation : 1;
    const drawn = drawCards(game, socket.id, amount);
    const actor = game.players.find(p => p.id === socket.id);
    game.lastEvent = { type: 'draw', playerId: socket.id, count: drawn };
    game.lastAction = `${actor?.name || 'Player'} drew ${drawn} cards`;
    game.stackAccumulation = 0;
    advanceTurn(game, false);
    emitRoomState(room.code);
  });

  socket.on('room:leave', () => {
    leaveRoomInternal(socket);
    socket.emit('room:left');
  });

  socket.on('disconnect', () => {
    leaveRoomInternal(socket);
    socketState.delete(socket.id);
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UNO online server running on :${PORT}`);
});
