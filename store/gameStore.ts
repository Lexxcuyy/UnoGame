import { create } from 'zustand';
import { ICard, Player, GameMode, CardColor, CardType } from '../types';
import { getBestMove } from '../utils/aiLogic';

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

  COLORS.forEach(color => {
    addCard(color, 'number', 0, 1);
    for (let i = 1; i <= 9; i++) addCard(color, 'number', i, 2);
    addCard(color, 'skip', undefined, 2);
    addCard(color, 'reverse', undefined, 2);
    addCard(color, 'draw2', undefined, 2);
  });

  addCard('black', 'wild', undefined, 4);
  addCard('black', 'draw4', undefined, 4);

  if (mode === 'no-mercy') {
    COLORS.forEach(color => {
      addCard(color, 'skip', undefined, 2);
      addCard(color, 'reverse', undefined, 2);
      addCard(color, 'draw2', undefined, 2);
    });
    addCard('red', 'draw6', undefined, 2);
    addCard('blue', 'draw6', undefined, 2);
    addCard('green', 'draw6', undefined, 2);
    addCard('yellow', 'draw6', undefined, 2);
    addCard('black', 'draw10', undefined, 4);
    COLORS.forEach(color => addCard(color, 'skipAll', undefined, 1));
    COLORS.forEach(color => addCard(color, 'discardAll', undefined, 1));
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

  initializeGame: (mode: GameMode) => {
    const deck = generateDeck(mode);
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

    const firstCard = deck.shift()!;
    let startColor = firstCard.color;
    if (startColor === 'black') startColor = COLORS[Math.floor(Math.random() * COLORS.length)];

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
      isStackingChoice: false
    });
  },

  clearLastEvent: () => set({ lastEvent: null }),
  clearError: () => set({ error: null }),

  playCard: (cardId: string) => {
    const { players, currentPlayerId, discardPile, stackAccumulation, gameMode, activeColor } = get();
    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1) return;

    const player = players[playerIndex];
    const cardIndex = player.hand!.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand![cardIndex];
    const topCard = discardPile[discardPile.length - 1];

    // --- Validation Logic ---
    let isValid = false;
    let newStack = stackAccumulation;

    if (stackAccumulation > 0) {
      if (gameMode === 'no-mercy') {
        const getPower = (c: ICard) => {
          if (c.type === 'draw2') return 2;
          if (c.type === 'draw4') return 4;
          if (c.type === 'draw6') return 6;
          if (c.type === 'draw10') return 10;
          return 0;
        };
        const cardPower = getPower(card);
        const topPower = getPower(topCard);

        if (cardPower >= topPower && cardPower > 0) {
          isValid = true;
          newStack += cardPower;
        }
      }
    } else {
      // Normal Play
      const colorMatch = card.color === activeColor || card.color === 'black' || activeColor === 'black';
      const valueMatch = (card.type === 'number' && card.value === topCard.value);
      const typeMatch = card.type === topCard.type;

      if (colorMatch || valueMatch || typeMatch || card.type.startsWith('wild') || card.type === 'draw4' || card.type === 'draw10') {
        isValid = true;
        if (card.type === 'draw2') newStack += 2;
        if (card.type === 'draw4') newStack += 4;
        if (card.type === 'draw6') newStack += 6;
        if (card.type === 'draw10') newStack += 10;
      }
    }

    if (!isValid) {
      set({ error: "Invalid Move! Check color or value." });
      setTimeout(() => get().clearError(), 2000);
      return;
    }

    // --- Pending Color Choice for User ---
    if (!player.isBot && (card.color === 'black' || card.type.startsWith('wild') || card.type === 'draw4' || card.type === 'draw10')) {
      set({ isChoosingColor: true, pendingCardPlayed: card });
      return;
    }

    get().doPlayCardInternal(card, playerIndex);
  },

  doPlayCardInternal: (card: ICard, playerIndex: number, chosenColor?: CardColor) => {
    const { players, discardPile, direction, stackAccumulation } = get();
    const player = players[playerIndex];

    const newHand = player.hand!.filter(c => c.id !== card.id);
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    const newDiscard = [...discardPile, card];

    let newActiveColor = card.color;
    if (chosenColor) newActiveColor = chosenColor;
    else if (card.color === 'black') {
      newActiveColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    let newStack = stackAccumulation;
    if (card.type === 'draw2') newStack += 2;
    if (card.type === 'draw4') newStack += 4;
    if (card.type === 'draw6') newStack += 6;
    if (card.type === 'draw10') newStack += 10;

    if (newHand.length === 0) {
      set({ winner: player.id, players: newPlayers, discardPile: newDiscard, activeColor: newActiveColor });
      return;
    }

    let newDirection = direction;
    if (card.type === 'reverse') newDirection = direction === 'cw' ? 'ccw' : 'cw';

    // 0/7 Logic
    let swapping = false;
    if (card.type === 'number' && card.value === 7) swapping = true;
    if (card.type === 'number' && card.value === 0) {
      const hands = newPlayers.map(p => p.hand!);
      if (newDirection === 'cw') {
        const last = hands.pop()!;
        hands.unshift(last);
      } else {
        const first = hands.shift()!;
        hands.push(first);
      }
      newPlayers.forEach((p, i) => { p.hand = hands[i]; p.cardCount = p.hand.length; });
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
      isSwapping: swapping
    });

    let skip = card.type === 'skip' || card.type === 'skipAll';
    if (card.type === 'reverse' && players.length === 2) skip = true;

    if (card.type === 'skipAll') return;

    if (!swapping) {
      get().advanceTurn(skip);
    }
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
      set({ isStackingChoice: false, stackAccumulation: 0 }); // Reset stack
      get().passTurn();
    } else {
      // User chose to stack - UI handles the card play interaction
      // Just close the modal
      set({ isStackingChoice: false });
    }
  },

  advanceTurn: (skip: boolean) => {
    const { players, currentPlayerId, direction, stackAccumulation, gameMode, deck, discardPile } = get();
    let idx = players.findIndex(p => p.id === currentPlayerId);
    const move = direction === 'cw' ? 1 : -1;
    let steps = 1;
    if (skip) steps = 2;

    idx = (idx + move * steps) % players.length;
    if (idx < 0) idx += players.length;

    const nextPlayer = players[idx];
    set({ currentPlayerId: nextPlayer.id });

    // --- Stacking / Auto-Hit Logic ---
    if (stackAccumulation > 0) {
      // Check if next player has a valid counter
      const topCard = discardPile[discardPile.length - 1]; // Actually recent played card

      const hasCounter = nextPlayer.hand!.some(card => {
        if (gameMode === 'no-mercy') {
          const getPower = (c: ICard) => {
            if (c.type === 'draw2') return 2;
            if (c.type === 'draw4') return 4;
            if (c.type === 'draw6') return 6;
            if (c.type === 'draw10') return 10;
            return 0;
          };
          return getPower(card) >= ((topCard.type.startsWith('draw') ? getPower(topCard) : 0));
        } else {
          return card.type === 'draw2' || card.type === 'draw4' || card.type === 'draw6' || card.type === 'draw10';
        }
      });

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
          set({ stackAccumulation: 0 }); // Reset stack AFTER draw
          get().passTurn();
        }, 1000); // Delay for user to see whose turn it is
      }
    }
  },

  drawCard: (forcedCount?: number) => {
    const { deck, discardPile, players, currentPlayerId, stackAccumulation, gameMode } = get();
    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1) return;

    let newDeck = [...deck];
    let newDiscard = [...discardPile];

    if (newDeck.length === 0) {
      if (newDiscard.length <= 1) return;
      const top = newDiscard.pop()!;
      newDeck = shuffle(newDiscard);
      newDiscard = [top];
    }

    const drawAmount = forcedCount || (stackAccumulation > 0 ? stackAccumulation : 1);
    const drawnCards: ICard[] = [];
    for (let i = 0; i < drawAmount; i++) {
      if (newDeck.length === 0) break;
      drawnCards.push(newDeck.shift()!);
    }

    // Emit Event
    set({ lastEvent: { type: 'draw', playerId: currentPlayerId, count: drawAmount } });

    const player = players[playerIndex];
    const newHand = [...player.hand!, ...drawnCards];
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    // --- Mercy Rule Check ---
    if (gameMode === 'no-mercy' && newHand.length > 25) {
      if (player.id === 'user') {
        set({ winner: 'mercy_eliminated' });
        return;
      } else {
        newPlayers.splice(playerIndex, 1);
        set({ players: newPlayers, deck: newDeck, discardPile: newDiscard, stackAccumulation: 0 });
        const nextId = newPlayers[playerIndex % newPlayers.length].id;
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

    if (stackWasActive) {
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

    const result = getBestMove(player.hand!, topCard, stackAccumulation, gameMode, activeColor);

    if (result) {
      get().doPlayCardInternal(result.card, playerIndex, result.chosenColor as CardColor);
    } else {
      get().drawCard();

      if (gameMode !== 'no-mercy') {
        const freshState = get();
        const freshPlayer = freshState.players[playerIndex];
        const newCard = freshPlayer.hand![freshPlayer.hand!.length - 1];
        const retry = getBestMove([newCard], topCard, stackAccumulation, gameMode, activeColor);
        if (retry) {
          get().doPlayCardInternal(retry.card, playerIndex, retry.chosenColor as CardColor);
        } else {
          get().passTurn();
        }
      }
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
