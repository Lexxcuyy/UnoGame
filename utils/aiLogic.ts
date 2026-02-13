import { ICard, GameMode } from '../types';

export const getBestMove = (
    hand: ICard[],
    topCard: ICard,
    stackAccumulation: number,
    mode: GameMode,
    activeColor: string // New param: The effective color of the top card
): { card: ICard; chosenColor?: string } | null => {

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
                const topPower = getPower(topCard);

                // No Mercy Stacking Rule: Power must be Equal or Higher
                // And obviously must be a draw card
                return cardPower >= topPower && cardPower > 0;
            }
            return false; // Classic: cannot stack usually
        }

        // Normal Play
        const currentColor = activeColor; // Use the active global color

        // Color Match
        // Wilds match anything.
        // 'black' cards match anything.
        // 'purple' cards (if any) match anything or specific? Let's assume matches for now.
        const colorMatch = card.color === currentColor || card.color === 'black' || currentColor === 'black';

        // Value/Type Match
        const valueMatch = (card.type === 'number' && card.value === topCard.value);
        const typeMatch = card.type === topCard.type;

        return colorMatch || valueMatch || typeMatch || card.type.startsWith('wild') || card.type === 'draw4' || card.type === 'draw10' || card.type === 'draw6' || card.type === 'skipAll' || card.type === 'discardAll';
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
        if (c.type === 'number') score += c.value || 0;
        if (c.type === 'wild') score -= 10; // Save wilds for emergency? Or play? Score lower to prefer colored cards.

        return score;
    };

    // Sort by score descending
    playableCards.sort((a, b) => scoreCard(b) - scoreCard(a));

    const bestCard = playableCards[0];

    // 3. Choose Color if Wild
    // If we play a Black card (Wild, Draw4, Draw10), we MUST choose a color.
    let chosenColor = undefined;
    if (bestCard.color === 'black' || bestCard.type === 'wild' || bestCard.type === 'wild4' || bestCard.type === 'draw4' || bestCard.type === 'draw10') {
        // Pick color with most cards in hand
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(c => {
            if (['red', 'blue', 'green', 'yellow'].includes(c.color)) {
                counts[c.color as keyof typeof counts]++;
            }
        });
        // Find max
        chosenColor = Object.keys(counts).reduce((a, b) => counts[a as keyof typeof counts] > counts[b as keyof typeof counts] ? a : b);
    }

    return { card: bestCard, chosenColor };
};
