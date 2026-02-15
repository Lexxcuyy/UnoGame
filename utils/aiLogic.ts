import { CardColor, GameMode, ICard } from '../types';
import { getPlayableCards, PlayContext } from './rules';

export const getBestMove = (
    hand: ICard[],
    topCard: ICard,
    stackAccumulation: number,
    mode: GameMode,
    activeColor: CardColor
): { card: ICard; chosenColor?: CardColor } | null => {

    const ctx: PlayContext = { topCard, activeColor, stackAccumulation, mode };
    const playableCards = getPlayableCards(hand, ctx);

    if (playableCards.length === 0) return null;

    // 2. Prioritize Logic
    // No Mercy Aggression: Stack > Attack (+10/+6) > Skip > Reverse > High Number > Low Number > Wild

    const scoreCard = (c: ICard) => {
        let score = 0;
        if (c.type === 'x2') score += stackAccumulation > 0 ? 140 : -50;
        if (c.type === 'draw10') score += 100;
        if (c.type === 'draw6') score += 80;
        if (c.type === 'draw4') score += 60;
        if (c.type === 'draw2') score += 40;
        if (c.type === 'skipAll') score += 90;
        if (c.type === 'discardAll') score += 50;
        if (c.type === 'skip' || c.type === 'reverse') score += 20;
        if (c.type === 'number') score += c.value || 0;
        if (c.type === 'wild') score -= 10; // Save wilds for emergency? Or play? Score lower to prefer colored cards.

        return score;
    };

    // Sort by score descending
    playableCards.sort((a, b) => scoreCard(b) - scoreCard(a));

    const bestCard = playableCards[0];

    // 3. Choose Color if Wild
    // If we play a Black card (Wild, Draw4, Draw10), we MUST choose a color.
    let chosenColor: CardColor | undefined = undefined;
    if (bestCard.color === 'black') {
        // Pick color with most cards in hand
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(c => {
            if (['red', 'blue', 'green', 'yellow'].includes(c.color)) {
                counts[c.color as keyof typeof counts]++;
            }
        });
        // Find max
        chosenColor = Object.keys(counts).reduce((a, b) => counts[a as keyof typeof counts] > counts[b as keyof typeof counts] ? a : b) as CardColor;
    }

    return { card: bestCard, chosenColor };
};
