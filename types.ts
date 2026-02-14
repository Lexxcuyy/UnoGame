export type GameMode = 'classic' | 'no-mercy';

export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'black' | 'purple'; // Purple for No Mercy special

export type CardType =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4'
  | 'draw4'
  | 'draw6' // No Mercy
  | 'draw10' // No Mercy
  | 'skipAll' // No Mercy
  | 'discardAll'; // No Mercy

export interface ICard {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // For number cards
  isWild?: boolean;
  playedBy?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  cardCount: number;
  isBot: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  hand?: ICard[];
}