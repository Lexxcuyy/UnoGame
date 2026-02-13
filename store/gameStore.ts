import { create } from 'zustand';
import { ICard, Player, GameMode, CardColor, CardType } from '../types';
import { getBestMove } from '../utils/aiLogic';

// --- Constants & Types ---

interface GameState {
  deck: ICard[];
  discardPile: ICard[];
  players: Player[];
  currentPlayerId: string;
  direction: 'cw' | 'ccw';
  gameMode: GameMode;
  stackAccumulation: number; // For stacking draw cards
  winner: string | null;
  drawCount: number; // Track how many cards drawn in current turn (for optional draw rule)
  isSwapping: boolean;
  error: string | null;

  // Actions
  initializeGame: (mode: GameMode) => void;
  playCard: (cardId: string) => void;
  drawCard: () => void;
  passTurn: () => void;
  resetGame: () => void;
  aiPlay: () => void; // New AI Action
  swapHands: (targetPlayerId: string) => void;
  clearError: () => void;
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

  // Helper to add card
  const addCard = (color: CardColor, type: CardType, value?: number, count = 1) => {
    for (let i = 0; i < count; i++) {
      deck.push({ id: getId(), color, type, value });
    }
  };

  // Standard Colors
  COLORS.forEach(color => {
    // Number 0 (1 per color)
    addCard(color, 'number', 0, 1);
    // Numbers 1-9 (2 per color)
    for (let i = 1; i <= 9; i++) addCard(color, 'number', i, 2);
    // Action Cards (2 per color)
    addCard(color, 'skip', undefined, 2);
    addCard(color, 'reverse', undefined, 2);
    addCard(color, 'draw2', undefined, 2);
  });

  // Wild Cards
  addCard('black', 'wild', undefined, 4);
  addCard('black', 'draw4', undefined, 4);

  // No Mercy Extras
  if (mode === 'no-mercy') {
    COLORS.forEach(color => {
      // More Skips and Reverses
      addCard(color, 'skip', undefined, 2);
      addCard(color, 'reverse', undefined, 2);
      // No Mercy Specials
      addCard(color, 'draw2', undefined, 2); // More draw 2s
    });
    // Rough approximation of No Mercy deck distribution
    addCard('red', 'draw6', undefined, 2);
    addCard('blue', 'draw6', undefined, 2);
    addCard('green', 'draw6', undefined, 2);
    addCard('yellow', 'draw6', undefined, 2);

    addCard('black', 'draw10', undefined, 4); // Wild +10

    // Skip Everyone
    COLORS.forEach(color => addCard(color, 'skipAll', undefined, 1));

    // Discard All (Colored)
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
  isSwapping: false,
  error: null,

  initializeGame: (mode: GameMode) => {
    const deck = generateDeck(mode);
    const players: Player[] = [
      { id: 'user', name: 'You', avatar: 'https://picsum.photos/104/104', cardCount: 7, isBot: false, position: 'bottom', hand: [] },
      { id: 'bot1', name: 'Bot 1', avatar: 'https://picsum.photos/101/101', cardCount: 7, isBot: true, position: 'top', hand: [] },
      { id: 'bot2', name: 'Bot 2', avatar: 'https://picsum.photos/102/102', cardCount: 7, isBot: true, position: 'left', hand: [] },
      { id: 'bot3', name: 'Bot 3', avatar: 'https://picsum.photos/103/103', cardCount: 7, isBot: true, position: 'right', hand: [] },
    ];

    // Deal cards
    players.forEach(p => {
      p.hand = deck.splice(0, 7);
      p.cardCount = 7;
    });

    // Start discard pile
    const firstCard = deck.shift()!;

    set({
      deck,
      discardPile: [firstCard],
      players,
      currentPlayerId: 'user', // User starts for simplicity
      direction: 'cw',
      gameMode: mode,
      stackAccumulation: 0,
      winner: null,
      drawCount: 0,
      isSwapping: false,
      error: null
    });
  },

  clearError: () => set({ error: null }),

  playCard: (cardId: string) => {
    const { players, currentPlayerId, discardPile, direction, stackAccumulation, gameMode } = get();
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

    // Stacking Logic (No Mercy)
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
        const stackPower = getPower(topCard);

        // Equal or Higher Rule
        if (cardPower >= stackPower && cardPower > 0) {
          isValid = true;
          newStack += cardPower;
        }
      }
    } else {
      // Normal Play
      const colorMatch = card.color === topCard.color || card.color === 'black' || topCard.color === 'black' || card.color === 'purple';
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
      set({ error: "Invalid Move! Card too weak or doesn't match." });
      setTimeout(() => get().clearError(), 2000);
      return;
    }

    // --- Execute Play ---
    const newHand = [...player.hand!];
    newHand.splice(cardIndex, 1);

    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    const newDiscard = [...discardPile, card];

    // Check Win
    if (newHand.length === 0) {
      set({ winner: player.id });
      return;
    }

    // --- Special Actions ---
    let nextPlayerId = currentPlayerId;
    let newDirection = direction;

    if (card.type === 'reverse') {
      newDirection = direction === 'cw' ? 'ccw' : 'cw';
    }

    // 0/7 Rule Logic
    if (card.type === 'number' && card.value === 7) {
      set({ isSwapping: true, players: newPlayers, discardPile: newDiscard, stackAccumulation: newStack, drawCount: 0 });
      return;
    }
    if (card.type === 'number' && card.value === 0) {
      // Rotate Hands
      const hands = newPlayers.map(p => p.hand!);
      if (newDirection === 'cw') {
        const lastHand = hands.pop()!;
        hands.unshift(lastHand);
      } else {
        const firstHand = hands.shift()!;
        hands.push(firstHand);
      }
      newPlayers.forEach((p, i) => {
        p.hand = hands[i];
        p.cardCount = p.hand.length;
      });
    }

    // Discard All
    if (card.type === 'discardAll') {
      const colorToDiscard = card.color;
      const keptCards = newPlayers[playerIndex].hand!.filter(c => c.color !== colorToDiscard && c.type !== 'discardAll');
      newPlayers[playerIndex].hand = keptCards;
      newPlayers[playerIndex].cardCount = keptCards.length;
    }

    set({
      players: newPlayers,
      discardPile: newDiscard,
      direction: newDirection,
      stackAccumulation: newStack,
      drawCount: 0,
      error: null
    });

    const shouldSkip = card.type === 'skip' || card.type === 'skipAll' || (card.type === 'reverse' && players.length === 2);

    if (card.type === 'skipAll') {
      return; // Play again
    }

    const getNextPlayerIndex = (skip = false) => {
      let idx = playerIndex;
      const move = newDirection === 'cw' ? 1 : -1;
      let steps = 1;
      if (skip) steps = 2;

      idx = (idx + move * steps) % players.length;
      if (idx < 0) idx += players.length;
      return idx;
    };

    const nextIdx = getNextPlayerIndex(shouldSkip);
    set({ currentPlayerId: players[nextIdx].id });
  },

  drawCard: () => {
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

    const drawAmount = stackAccumulation > 0 ? stackAccumulation : 1;
    const drawnCards: ICard[] = [];
    for (let i = 0; i < drawAmount; i++) {
      if (newDeck.length === 0) break;
      drawnCards.push(newDeck.shift()!);
    }

    const player = players[playerIndex];
    const newHand = [...player.hand!, ...drawnCards];
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand, cardCount: newHand.length };

    // Mercy Rule
    if (gameMode === 'no-mercy' && newHand.length > 25) {
      console.log(`Player ${player.name} eliminated via Mercy Rule!`);
    }

    set({
      deck: newDeck,
      discardPile: newDiscard,
      players: newPlayers,
      stackAccumulation: 0,
    });

    if (stackAccumulation > 0) {
      get().passTurn();
      return;
    }

    // Check if drawn card[0] is playable.
    if (drawnCards.length === 1) {
      // logic for auto-play could go here
    }
  },

  passTurn: () => {
    const { players, currentPlayerId, direction } = get();
    const idx = players.findIndex(p => p.id === currentPlayerId);
    const move = direction === 'cw' ? 1 : -1;
    let nextIdx = (idx + move) % players.length;
    if (nextIdx < 0) nextIdx += players.length;
    set({ currentPlayerId: players[nextIdx].id });
  },

  resetGame: () => {
    set({
      deck: [],
      discardPile: [],
      players: [],
      winner: null,
      stackAccumulation: 0,
      isSwapping: false,
      error: null
    });
  },

  aiPlay: () => {
    const { players, currentPlayerId, discardPile, stackAccumulation, gameMode } = get();
    const playerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (playerIndex === -1 || !players[playerIndex].isBot) return;

    const player = players[playerIndex];
    const topCard = discardPile[discardPile.length - 1];

    const bestCard = getBestMove(player.hand!, topCard, stackAccumulation, gameMode);

    if (bestCard) {
      get().playCard(bestCard.id);
    } else {
      get().drawCard();
      // Try to play drawn card
      const freshState = get();
      const freshPlayer = freshState.players[playerIndex];
      const newCard = freshPlayer.hand![freshPlayer.hand!.length - 1];
      const retryMove = getBestMove([newCard], topCard, stackAccumulation, gameMode);
      if (retryMove) {
        get().playCard(retryMove.id);
      } else {
        get().passTurn();
      }
    }
  },

  swapHands: (targetPlayerId: string) => {
    const { players, currentPlayerId, direction } = get();
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

    // Finish turn logic
    const getNextPlayerIndex = (skip = false) => {
      let idx = currentPlayerIndex;
      const move = direction === 'cw' ? 1 : -1;
      let steps = 1;

      idx = (idx + move * steps) % players.length;
      if (idx < 0) idx += players.length;
      return idx;
    };

    const nextIdx = getNextPlayerIndex();
    set({
      players: newPlayers,
      isSwapping: false,
      currentPlayerId: players[nextIdx].id
    });
  }

}));
