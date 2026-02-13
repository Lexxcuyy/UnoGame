import { ICard, GameMode } from '../types';

export const getBestMove = (
    hand: ICard[],
    topCard: ICard,
    stackAccumulation: number,
    mode: GameMode,
    colorOverride?: string // In case top card is wild
): ICard | null => {

    // 1. Filter playable cards
    const playableCards = hand.filter(card => {
        if (stackAccumulation > 0) {
            // Must play equal or higher draw card
            if (mode === 'no-mercy') {
                const getPower = (c: ICard) => {
                    if (c.type === 'draw2') return 2;
                    if (c.type === 'draw4') return 4;
                    if (c.type === 'draw6') return 6;
                    if (c.type === 'draw10') return 10;
                    return 0;
                };
                const cardPower = getPower(card);
                const stackPower = getPower(topCard);
                // Strictly speaking, we just need to stack. Rules say "Equal or Higher".
                // But if stackAccumulation is active, it means topCard IS a draw card.
                // We simplify: if card is draw and power >= stackPower (if stackPower known, usually we just assume current draw req needs to be met)
                // Actually, we just check if it's a valid stack move.
                // For simplicity: Any draw card >= topCard (if topCard is draw)
                return cardPower >= getPower(topCard) && cardPower > 0;
            }
            return false; // Classic: cannot stack
        }

        // Normal Play
        const currentColor = colorOverride || topCard.color;
        const colorMatch = card.color === currentColor || card.color === 'black' || currentColor === 'black' || card.color === 'purple';
        const valueMatch = (card.type === 'number' && card.value === topCard.value);
        const typeMatch = card.type === topCard.type;

        return colorMatch || valueMatch || typeMatch || card.type.startsWith('wild') || card.type === 'draw4' || card.type === 'draw10';
    });

    if (playableCards.length === 0) return null;

    // 2. Prioritize Logic
    // No Mercy Aggression: Stack > Attack (+10/+6) > Skip > Reverse > High Number > Low Number > Wild

    const scoreCard = (c: ICard) => {
        let score = 0;
        if (c.type === 'draw10') score += 100;
        if (c.type === 'draw6') score += 80;
        if (c.type === 'draw4') score += 60;
        if (c.type === 'draw2') score += 40;
        if (c.type === 'skipAll') score += 90;
        if (c.type === 'discardAll') score += 50;
        if (c.type === 'skip' || c.type === 'reverse') score += 20;
        if (c.type === 'wild') score += 10; // Save wilds? Or play? Bots usually play wilds early to change color
        if (c.type === 'number') score += c.value || 0;

        return score;
    };

    // Sort by score descending
    playableCards.sort((a, b) => scoreCard(b) - scoreCard(a));

    return playableCards[0];
};
