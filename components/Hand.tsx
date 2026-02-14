import React from 'react';
import { ICard } from '../types';
import Card from './Card';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { clsx } from 'clsx';
import { useGameStore } from '../store/gameStore';
import { canPlayCard } from '../utils/rules';

interface HandProps {
  cards: ICard[];
  onPlayCard: (cardId: string) => void;
  isCurrentTurn: boolean;
  cardSize?: 'sm' | 'md';
  isMobileLayout?: boolean;
  lowEffects?: boolean;
}

type MobileCardLayout = {
  card: ICard;
  x: number;
  y: number;
  zIndex: number;
};

const MOBILE_ROW_GAP = 44;
const MOBILE_LIFT = 24;
const MOBILE_CARD_SCALE = 1.02;

const Hand: React.FC<HandProps> = ({
  cards,
  onPlayCard,
  isCurrentTurn,
  cardSize = 'md',
  isMobileLayout = false,
  lowEffects = false,
}) => {
  const [hoveredCardId, setHoveredCardId] = React.useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(320);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const disableFancyMotion = isMobileLayout || lowEffects;

  const discardPile = useGameStore(state => state.discardPile);
  const stackAccumulation = useGameStore(state => state.stackAccumulation);
  const gameMode = useGameStore(state => state.gameMode);
  const activeColor = useGameStore(state => state.activeColor);

  const topCard = discardPile[discardPile.length - 1];

  React.useEffect(() => {
    if (!isMobileLayout || !containerRef.current) return;

    const node = containerRef.current;
    const update = () => setContainerWidth(node.clientWidth || 320);
    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(node);

    return () => observer.disconnect();
  }, [isMobileLayout]);

  React.useEffect(() => {
    setSelectedCardId(null);
  }, [cards, isCurrentTurn]);

  const getCardStyle = (index: number, total: number) => {
    if (total === 1 || disableFancyMotion) return { rotate: 0, y: 0 };

    const maxRotation = cardSize === 'sm' ? 46 : 60;
    const angleStep = Math.min(maxRotation / (total - 1), cardSize === 'sm' ? 8 : 10);

    const startAngle = -((total - 1) * angleStep) / 2;
    const rotate = startAngle + index * angleStep;

    const absDistance = Math.abs(index - (total - 1) / 2);
    const y = Math.pow(absDistance, 2) * (cardSize === 'sm' ? 1.2 : 2);

    return { rotate, y };
  };

  const playableCardIds = React.useMemo(() => {
    if (!isCurrentTurn || !topCard) return new Set<string>();

    const playableIds = cards
      .filter(card => canPlayCard(card, {
        topCard,
        activeColor,
        stackAccumulation,
        mode: gameMode,
      }))
      .map(card => card.id);

    return new Set(playableIds);
  }, [cards, isCurrentTurn, topCard, activeColor, stackAccumulation, gameMode]);

  const isPlayable = React.useCallback((card: ICard) => playableCardIds.has(card.id), [playableCardIds]);

  const mobileLayout = React.useMemo<MobileCardLayout[]>(() => {
    if (!isMobileLayout) return [];

    const cardWidth = cardSize === 'md' ? 124 : 84;
    const targetStep = Math.floor(cardWidth * 0.34);
    const minStep = 12;
    const width = Math.max(220, containerWidth);

    const fitInOneRow = Math.max(1, Math.floor((width - cardWidth) / targetStep) + 1);
    const useTwoRows = cards.length > fitInOneRow;

    const splitIndex = useTwoRows ? Math.ceil(cards.length / 2) : cards.length;
    const rows: ICard[][] = [cards.slice(0, splitIndex), cards.slice(splitIndex)];

    const positioned: MobileCardLayout[] = [];

    rows.forEach((rowCards, rowIdx) => {
      if (rowCards.length === 0) return;

      const count = rowCards.length;
      const step = count <= 1 ? 0 : Math.max(minStep, Math.min(targetStep, (width - cardWidth) / (count - 1)));
      const rowWidth = cardWidth + step * Math.max(0, count - 1);
      const startX = Math.max(0, (width - rowWidth) / 2);
      const rowY = rowIdx * MOBILE_ROW_GAP;

      rowCards.forEach((card, idx) => {
        positioned.push({
          card,
          x: startX + idx * step,
          y: rowY,
          zIndex: rowIdx * 100 + idx,
        });
      });
    });

    return positioned;
  }, [cards, cardSize, containerWidth, isMobileLayout]);

  const handleCardClick = React.useCallback((cardId: string, playable: boolean) => {
    if (!isCurrentTurn || !playable) return;

    if (isMobileLayout) {
      // First tap selects card. Tapping a different playable card switches selection.
      if (selectedCardId === cardId) {
        setSelectedCardId(null);
        onPlayCard(cardId);
      } else {
        setSelectedCardId(cardId);
      }
      return;
    }

    onPlayCard(cardId);
  }, [isCurrentTurn, isMobileLayout, onPlayCard, selectedCardId]);

  if (isMobileLayout) {
    return (
      <div ref={containerRef} className="relative w-full h-[204px] overflow-visible">
        {mobileLayout.map(({ card, x, y, zIndex }) => {
          const playable = isPlayable(card);
          const isSelected = selectedCardId === card.id;
          const translateY = y - (isSelected ? MOBILE_LIFT : 0);

          return (
            <div
              key={card.id}
              className="absolute origin-bottom will-change-transform transition-transform duration-150 ease-out"
              style={{
                transform: `translate3d(${x}px, ${translateY}px, 0) scale(${MOBILE_CARD_SCALE})`,
                zIndex,
              }}
              onClick={() => handleCardClick(card.id, playable)}
            >
              <Card
                card={card}
                isPlayable={playable}
                size={cardSize}
                lowEffects
                className={clsx(
                  isCurrentTurn && playable && 'cursor-pointer brightness-110 saturate-125 ring-2 ring-emerald-300/70 shadow-[0_0_16px_rgba(52,211,153,0.38)]',
                  isCurrentTurn && !playable && 'cursor-not-allowed brightness-[0.55] saturate-75 grayscale-[0.45] opacity-85',
                  !isCurrentTurn && 'brightness-75 grayscale-[0.3] opacity-85',
                  isSelected && 'ring-2 ring-yellow-300/80 shadow-[0_10px_20px_rgba(0,0,0,0.45)]'
                )}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const cardNodes = cards.map((card, index) => {
    const { rotate, y } = getCardStyle(index, cards.length);
    const isHovered = hoveredCardId === card.id;
    const playable = isPlayable(card);

    return (
      <motion.div
        layout={!disableFancyMotion}
        key={card.id}
        onMouseEnter={() => !disableFancyMotion && setHoveredCardId(card.id)}
        onMouseLeave={() => !disableFancyMotion && setHoveredCardId(null)}
        initial={{ opacity: 0, y: disableFancyMotion ? 12 : 100, rotate: 0 }}
        animate={{
          opacity: 1,
          y: playable ? y - (disableFancyMotion ? 8 : cardSize === 'sm' ? 18 : 30) : y,
          rotate,
          x: 0,
          filter: isCurrentTurn
            ? playable
              ? 'brightness(1.12) saturate(1.15)'
              : 'brightness(0.42) saturate(0.78) grayscale(0.45)'
            : 'brightness(0.74) grayscale(0.3)',
          zIndex: isHovered ? 100 : index,
          transition: disableFancyMotion
            ? { duration: 0.14 }
            : { type: 'spring', stiffness: 300, damping: 25 },
        }}
        exit={{
          opacity: 0,
          y: disableFancyMotion ? -10 : -100,
          scale: disableFancyMotion ? 0.95 : 0.5,
          transition: { duration: disableFancyMotion ? 0.12 : 0.2 },
        }}
        whileHover={
          !disableFancyMotion && playable
            ? {
                y: cardSize === 'sm' ? -36 : -60,
                scale: cardSize === 'sm' ? 1.08 : 1.15,
                rotate: 0,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        className={clsx(
          'relative first:ml-0 origin-bottom',
          disableFancyMotion ? 'transition-transform duration-150' : 'transition-all duration-200',
          cardSize === 'sm' ? '-ml-6' : '-ml-8',
          isCurrentTurn && playable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-80'
        )}
        onClick={() => isCurrentTurn && playable && onPlayCard(card.id)}
      >
        <Card
          card={card}
          isPlayable={playable}
          size={cardSize}
          lowEffects={disableFancyMotion}
          className={clsx(
            isCurrentTurn && playable && 'brightness-110 saturate-125 ring-2 ring-emerald-300/70 shadow-[0_0_22px_rgba(52,211,153,0.35)]',
            isCurrentTurn && !playable && 'brightness-[0.55] saturate-75 grayscale-[0.45]',
            !isCurrentTurn && 'brightness-75 grayscale-[0.3]'
          )}
        />
      </motion.div>
    );
  });

  return (
    <div
      className={clsx(
        'relative w-full flex justify-center items-end perspective-[1000px]',
        cardSize === 'sm' ? 'h-[140px]' : 'h-[180px]'
      )}
    >
      {disableFancyMotion ? (
        <AnimatePresence>{cardNodes}</AnimatePresence>
      ) : (
        <LayoutGroup>
          <AnimatePresence>{cardNodes}</AnimatePresence>
        </LayoutGroup>
      )}
    </div>
  );
};

export default React.memo(Hand);
