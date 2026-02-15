import { create } from 'zustand';
import { ICard, Player, GameMode, CardColor, CardType } from '../types';
import { getBestMove } from '../utils/aiLogic';
import { canPlayCard, canStackCard } from '../utils/rules';

// --- Constants & Types ---

export type GameEvent =
  | { type: 'draw', playerId: string, count: number }
  | { type: 'play', playerId: string, cardId: string }
  | { type: 'stack', playerId: string, count: number };

interface GameState {
  deck: ICard[];
  discardPile: ICard[];
  players: Player[];
  currentPlayerId: string;
  direction: 'cw' | 'ccw';
  gameMode: GameMode;
  stackAccumulation: number;
  winner: string | null;
  drawCount: number;

  // Logic Repair States
  activeColor: CardColor; // The effective color of the top card (resolves Wilds)
  isChoosingColor: boolean; // Triggers UI Modal
  pendingCardPlayed: ICard | null; // Card waiting for color selection
  isSwapping: boolean; // 7 Rule
  error: string | null;

  // Visual Events
  lastEvent: GameEvent | null;
  clearLastEvent: () => void;
  lastAction: string | null; // Log for UI Banner

  // Stacking Logic (Choice)
  isStackingChoice: boolean; // Triggers UI Modal for User
  resolveStackChoice: (choice: 'stack' | 'take') => void;

  // Actions
  initializeGame: (mode: GameMode) => void;
  playCard: (cardId: string) => void;
  confirmColorSelection: (color: CardColor) => void; // New Action
  drawCard: (forcedCount?: number) => void;
  passTurn: () => void;
  resetGame: () => void;
  aiPlay: () => void;
  swapHands: (targetPlayerId: string) => void;
  clearError: () => void;

  // Internal (exposed for get() usage and potential advanced UI needs)
  doPlayCardInternal: (card: ICard, playerIndex: number, chosenColor?: CardColor) => void;
  advanceTurn: (skip: boolean) => void;
}

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const TABLE_TURN_ORDER: Player['position'][] = ['bottom', 'right', 'top', 'left'];

const getTurnRing = (players: Player[]): string[] => {
  // Build ring from table positions, not raw array index order.
  const sorted = [...players].sort((a, b) => {
    const ai = TABLE_TURN_ORDER.indexOf(a.position);
    const bi = TABLE_TURN_ORDER.indexOf(b.position);
    return ai - bi;
  });
  return sorted.map(p => p.id);
};

const getNextPlayerId = (
  players: Player[],
  currentPlayerId: string,
  direction: 'cw' | 'ccw',
  steps: number
): string => {
  const ring = getTurnRing(players);
  if (ring.length === 0) return currentPlayerId;

  let idx = ring.indexOf(currentPlayerId);
  if (idx === -1) idx = 0;

  const move = direction === 'cw' ? 1 : -1;
  idx = (idx + move * steps) % ring.length;
  if (idx < 0) idx += ring.length;

  return ring[idx];
};

// --- Helper Functions ---

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const generateDeck = (mode: GameMode): ICard[] => {
  let deck: ICard[] = [];
  let idCounter = 0;
  const getId = () => `card-${idCounter++}`;

  const addCard = (color: CardColor, type: CardType, value?: number, count = 1) => {
    for (let i = 0; i < count; i++) {
      deck.push({ id: getId(), color, type, value });
    }
  };

  if (mode === 'no-mercy') {
    // === UNO No Mercy deck: 168 cards ===
    // Numbers: 2 of each 0-9 per color = 80
    COLORS.forEach(color => {
      addCard(color, 'number', 0, 2);
      for (let i = 1; i <= 9; i++) addCard(color, 'number', i, 2);
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
      for (let i = 1; i <= 9; i++) addCard(color, 'number', i, 2);
      addCard(color, 'skip', undefined, 2);
      addCard(color, 'reverse', undefined, 2);
      addCard(color, 'draw2', undefined, 2);
    });
    addCard('black', 'wild', undefined, 4);
    addCard('black', 'draw4', undefined, 4);
  }

  return shuffle(deck);
};

// --- Store Implementation ---

export const useGameStore = create<GameState>((set, get) => ({
  deck: [],
  discardPile: [],
  players: [],
  currentPlayerId: '',
  direction: 'cw',
  gameMode: 'classic',
  stackAccumulation: 0,
  winner: null,
  drawCount: 0,
  activeColor: 'black',
  isChoosingColor: false,
  pendingCardPlayed: null,
  isSwapping: false,
  error: null,
  lastEvent: null,
  isStackingChoice: false,
  lastAction: null,

  initializeGame: (mode: GameMode) => {
    let deck = generateDeck(mode);
    const players: Player[] = [
      { id: 'user', name: 'You', avatar: 'https://picsum.photos/104/104', cardCount: 7, isBot: false, position: 'bottom', hand: [] },
      { id: 'bot1', name: 'Bot 1', avatar: 'https://picsum.photos/101/101', cardCount: 7, isBot: true, position: 'top', hand: [] },
      { id: 'bot2', name: 'Bot 2', avatar: 'https://picsum.photos/102/102', cardCount: 7, isBot: true, position: 'left', hand: [] },
      { id: 'bot3', name: 'Bot 3', avatar: 'https://picsum.photos/103/103', cardCount: 7, isBot: true, position: 'right', hand: [] },
    ];

    players.forEach(p => {
      p.hand = deck.splice(0, mode === 'no-mercy' ? 7 : 7);
      p.cardCount = p.hand.length;
    });

    let firstCard = deck.shift()!;
    // Avoid unplayable/ambiguous opener for special stack-only cards.
    while (firstCard && (firstCard.color === 'black' || firstCard.type === 'x2')) {
      deck.push(firstCard);
      deck = shuffle(deck);
      firstCard = deck.shift()!;
    }
    let startColor = firstCard.color;
    // Ensure activeColor is NEVER black at start
    if (startColor === 'black' || startColor === 'purple') {
      startColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    set({
      deck,
      discardPile: [firstCard],
      players,
      currentPlayerId: 'user',
      direction: 'cw',
      gameMode: mode,
      stackAccumulation: 0,
      winner: null,
      drawCount: 0,
      activeColor: startColor,
      isChoosingColor: false,
      pendingCardPlayed: null,
      isSwapping: false,
      error: null,
      lastEvent: null,
      lastAction: 'Game Started! Good Luck!',
      isStackingChoice: false
    });
  },

  clearLastEvent: () => set({ lastEvent: null }),
  clearError: () => set({ error: null }),

  playCard: (cardId: string) => {
    const { players, currentPlayerId, discardPile, stackAccumulation, gameMode, activeColor, isChoosingColor, isStackingChoice } = get();
    if (isChoosingColor || isStackingChoice) return;

    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1) return;

    const player = players[playerIndex];
    const cardIndex = player.hand!.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand![cardIndex];
    const topCard = discardPile[discardPile.length - 1];
    if (!topCard) return;
    const isValid = canPlayCard(card, {
      topCard,
      activeColor,
      stackAccumulation,
      mode: gameMode
    });

    if (!isValid) {
      set({ error: "Invalid Move! Check color or value." });
      setTimeout(() => get().clearError(), 2000);
      return;
    }

    // --- Pending Color Choice for User ---
    if (!player.isBot && (card.color === 'black' && card.type !== 'x2')) {
      set({ isChoosingColor: true, pendingCardPlayed: card });
      return;
    }

    get().doPlayCardInternal(card, playerIndex);
  },

  doPlayCardInternal: (card: ICard, playerIndex: number, chosenColor?: CardColor) => {
    const { players, discardPile, direction, stackAccumulation, activeColor } = get();
    const player = players[playerIndex];

    const newHand = player.hand!.filter(c => c.id !== card.id);
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    const newDiscard = [...discardPile, { ...card, playedBy: player.id }];

    let newActiveColor = card.color;
    if (chosenColor) newActiveColor = chosenColor;
    else if (card.color === 'black') {
      newActiveColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    } else if (card.type === 'x2') {
      // Keep the running color; x2 is a stack modifier, not a color setter.
      newActiveColor = activeColor;
    }

    let newStack = stackAccumulation;
    if (card.type === 'draw2') newStack += 2;
    if (card.type === 'draw4') newStack += 4;
    if (card.type === 'draw6') newStack += 6;
    if (card.type === 'draw10') newStack += 10;
    if (card.type === 'x2' && newStack > 0) newStack *= 2;

    if (newHand.length === 0) {
      set({
        winner: player.id,
        players: newPlayers,
        discardPile: newDiscard,
        activeColor: newActiveColor,
        lastEvent: { type: 'play', playerId: player.id, cardId: card.id }
      });
      return;
    }

    let newDirection = direction;
    if (card.type === 'reverse') newDirection = direction === 'cw' ? 'ccw' : 'cw';

    // Action Log
    let actionMsg = `${player.name} played ${card.color} ${card.type === 'number' ? card.value : card.type}`;
    if (card.color === 'black') {
      actionMsg = `${player.name} played Wild (Chose ${newActiveColor.toUpperCase()})`;
    } else if (card.type === 'draw2') {
      actionMsg = `${player.name} played +2`;
    } else if (card.type === 'x2') {
      actionMsg = `${player.name} played x2 (Stack => ${newStack})`;
    }

    set({
      players: newPlayers,
      discardPile: newDiscard,
      direction: newDirection,
      stackAccumulation: newStack,
      activeColor: newActiveColor,
      drawCount: 0,
      pendingCardPlayed: null,
      isChoosingColor: false,
      isSwapping: false,
      lastAction: actionMsg,
      lastEvent: { type: 'play', playerId: player.id, cardId: card.id }
    });

    let skip = card.type === 'skip' || card.type === 'skipAll';
    if (card.type === 'reverse' && players.length === 2) skip = true;

    if (card.type === 'skipAll') return;
    get().advanceTurn(skip);
  },

  confirmColorSelection: (color: CardColor) => {
    const { pendingCardPlayed, players, currentPlayerId } = get();
    if (!pendingCardPlayed) return;
    const idx = players.findIndex(p => p.id === currentPlayerId);
    get().doPlayCardInternal(pendingCardPlayed, idx, color);
  },

  resolveStackChoice: (choice: 'stack' | 'take') => {
    const { currentPlayerId, stackAccumulation } = get();
    // Verify it's the user
    if (currentPlayerId !== 'user') return;

    if (choice === 'take') {
      get().drawCard(stackAccumulation);
      set({ isStackingChoice: false, stackAccumulation: 0 });
    } else {
      // User chose to stack - UI handles the card play interaction
      // Just close the modal
      set({ isStackingChoice: false });
    }
  },

  advanceTurn: (skip: boolean) => {
    const { players, currentPlayerId, direction, stackAccumulation, gameMode, discardPile } = get();
    let steps = 1;
    if (skip) steps = 2;

    const nextPlayerId = getNextPlayerId(players, currentPlayerId, direction, steps);
    const nextPlayer = players.find(p => p.id === nextPlayerId);
    if (!nextPlayer) return;

    set({ currentPlayerId: nextPlayer.id });

    // --- Stacking / Auto-Hit Logic ---
    if (stackAccumulation > 0) {
      // Check if next player has a valid counter
      const topCard = discardPile[discardPile.length - 1]; // Actually recent played card

      const hasCounter = nextPlayer.hand!.some(card => canStackCard(card, topCard, gameMode));

      if (hasCounter) {
        if (!nextPlayer.isBot) {
          // User: Show Choice Modal
          set({ isStackingChoice: true });
        }
        // Bots: Will handle in aiPlay (they prioritize stacking)
      } else {
        // No Counter: Auto-Hit
        setTimeout(() => {
          get().drawCard(stackAccumulation);
        }, 1000); // Delay for user to see whose turn it is
      }
    }
  },

  drawCard: (forcedCount?: number) => {
    const { deck, discardPile, players, currentPlayerId, stackAccumulation, gameMode, direction } = get();
    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1) return;

    let newDeck = [...deck];
    let newDiscard = [...discardPile];

    const drawAmount = forcedCount || (stackAccumulation > 0 ? stackAccumulation : 1);
    const drawnCards: ICard[] = [];
    for (let i = 0; i < drawAmount; i++) {
      // Reshuffle discard pile into deck if deck is empty
      if (newDeck.length === 0) {
        if (newDiscard.length <= 1) break;
        const top = newDiscard.pop()!;
        newDeck = shuffle(newDiscard);
        newDiscard = [top];
      }
      if (newDeck.length === 0) break;
      drawnCards.push(newDeck.shift()!);
    }

    // --- Strict Draw & Pass Logic ---
    // If it was a natural draw (stackAccumulation === 0), force the pass immediately
    // and do NOT allow playing the drawn card.
    const isNaturalDraw = stackAccumulation === 0;

    // Emit Event
    set({ lastEvent: { type: 'draw', playerId: currentPlayerId, count: drawAmount } });

    const player = players[playerIndex];
    const newHand = [...player.hand!, ...drawnCards];
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    // Log Action
    const drawMsg = `${player.name} drew ${drawAmount} card${drawAmount > 1 ? 's' : ''}`;
    set({ lastAction: drawMsg });

    // --- Mercy Rule Check ---
    if (gameMode === 'no-mercy' && newHand.length > 25) {
      if (player.id === 'user') {
        set({ winner: 'mercy_eliminated' });
        return;
      } else {
        newPlayers.splice(playerIndex, 1);
        set({ players: newPlayers, deck: newDeck, discardPile: newDiscard, stackAccumulation: 0 });
        const nextId = getNextPlayerId(newPlayers, player.id, direction, 1);
        set({ currentPlayerId: nextId });
        return;
      }
    }

    // Capture stack BEFORE resetting
    const stackWasActive = stackAccumulation > 0;

    set({
      deck: newDeck,
      discardPile: newDiscard,
      players: newPlayers,
      stackAccumulation: 0,
    });

    if (stackWasActive || isNaturalDraw) {
      get().passTurn();
      return;
    }
  },

  passTurn: () => {
    get().advanceTurn(false);
  },

  resetGame: () => {
    set({
      deck: [],
      discardPile: [],
      players: [],
      winner: null,
      stackAccumulation: 0,
      activeColor: 'black',
      isChoosingColor: false,
      isSwapping: false,
      error: null
    });
  },

  aiPlay: () => {
    const { players, currentPlayerId, discardPile, stackAccumulation, gameMode, activeColor } = get();
    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1 || !players[playerIndex].isBot) return;

    const player = players[playerIndex];
    const topCard = discardPile[discardPile.length - 1];
    if (!topCard) return;

    const result = getBestMove(player.hand!, topCard, stackAccumulation, gameMode, activeColor);

    if (result && canPlayCard(result.card, { topCard, activeColor, stackAccumulation, mode: gameMode })) {
      get().doPlayCardInternal(result.card, playerIndex, result.chosenColor as CardColor);
    } else {
      // FORCE DRAW & PASS
      // Since drawCard now auto-passes on natural draws, this will end the turn.
      get().drawCard();
    }
  },

  swapHands: (targetPlayerId: string) => {
    const { players, currentPlayerId } = get();
    const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
    const targetPlayerIndex = players.findIndex(p => p.id === targetPlayerId);

    if (currentPlayerIndex === -1 || targetPlayerIndex === -1) return;

    const newPlayers = [...players];
    const playerHand = [...newPlayers[currentPlayerIndex].hand!];
    const targetHand = [...newPlayers[targetPlayerIndex].hand!];

    newPlayers[currentPlayerIndex].hand = targetHand;
    newPlayers[currentPlayerIndex].cardCount = targetHand.length;

    newPlayers[targetPlayerIndex].hand = playerHand;
    newPlayers[targetPlayerIndex].cardCount = playerHand.length;

    set({ players: newPlayers, isSwapping: false });
    get().advanceTurn(false);
  }

}));
