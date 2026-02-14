import { CardColor, GameMode, ICard } from '../types';

export interface PlayContext {
  topCard: ICard;
  activeColor: CardColor;
  stackAccumulation: number;
  mode: GameMode;
}

export const getDrawPower = (card: ICard): number => {
  if (card.type === 'draw2') return 2;
  if (card.type === 'draw4') return 4;
  if (card.type === 'draw6') return 6;
  if (card.type === 'draw10') return 10;
  return 0;
};

export const canStackCard = (card: ICard, topCard: ICard, mode: GameMode): boolean => {
  const cardPower = getDrawPower(card);
  const topPower = getDrawPower(topCard);
  const isMultiplier = card.type === 'x2';
  const topIsMultiplier = topCard.type === 'x2';

  // No Mercy special: when stack is active, x2 can chain with draw cards.
  if (mode === 'no-mercy' && (isMultiplier || topIsMultiplier)) {
    return isMultiplier || cardPower > 0;
  }

  if (cardPower === 0 || topPower === 0) return false;

  if (mode === 'no-mercy') {
    return cardPower >= topPower;
  }

  // Classic: all draw cards can stack on draw cards.
  return true;
};

export const canPlayCard = (card: ICard, ctx: PlayContext): boolean => {
  const { topCard, activeColor, stackAccumulation, mode } = ctx;

  if (stackAccumulation > 0) {
    return canStackCard(card, topCard, mode);
  }

  // x2 is stack-only and cannot start a non-stack play.
  if (card.type === 'x2') return false;

  const colorMatch = card.color === activeColor;
  const isWild = card.color === 'black';
  const valueMatch = card.type === 'number' && topCard.type === 'number' && card.value === topCard.value;
  // Number cards should only match by color or exact number value.
  const typeMatch = card.type !== 'number' && card.type === topCard.type;

  return colorMatch || isWild || valueMatch || typeMatch;
};

export const getPlayableCards = (hand: ICard[], ctx: PlayContext): ICard[] => {
  return hand.filter(card => canPlayCard(card, ctx));
};
