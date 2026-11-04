// Affirmations shown during onboarding, chosen from the reasons she picked on
// "What brings you to this circle?". Keys must match `reasons` in content.js.

// For everyone, and to fill the deck when her reasons have few of their own.
export const generalAffirmations = [
  'Being here is an act of courage.',
  'My pain is real, even if others couldn’t see it.',
  'I am not too much. I am exactly enough.',
  'I deserve softness, especially from myself.',
  'I don’t need to feel ready to move forward.',
  'Healing isn’t linear, and neither am I.',
  'My voice matters, even when it shakes.',
  'I am braver than the fear trying to stop me.',
  'I am worthy of love I don’t have to earn.',
  'I get to decide what healing looks like for me.',
];

export const affirmationsByReason = {
  'Healing from a relationship': [
    'I can miss someone and still know I deserve better.',
    'Letting go is not losing. It is choosing myself.',
    'I am worthy of love I don’t have to earn.',
    'The love I gave says something beautiful about me.',
    'I am learning to be my own home.',
  ],
  'Grief or loss': [
    'My grief is love with nowhere to go, and that is okay.',
    'There is no right way, and no deadline, to grieve.',
    'I can carry them with me and still keep living.',
    'Some days will be heavy. I don’t have to fix them.',
    'Laughing again is not forgetting.',
  ],
  'Rebuilding confidence': [
    'I am allowed to take up space.',
    'Small steps still move me forward.',
    'I trust myself a little more every day.',
    'My worth isn’t measured by anyone’s approval.',
    'I have survived every hard day so far.',
  ],
  'Recovering from abuse or trauma': [
    'What happened to me was not my fault.',
    'I am safe in this moment.',
    'My body and my boundaries belong to me.',
    'I am not what was done to me.',
    'I believe myself, even when others didn’t.',
  ],
  'Feeling less alone': [
    'I am not the only one who feels this way.',
    'I belong here, exactly as I am.',
    'Reaching out is a strength, not a burden.',
    'Someone in this circle understands me.',
    'Even on quiet days, I am held.',
  ],
  'Just here to listen and support others': [
    'Listening is one of the kindest things I can give.',
    'I don’t need the perfect words to help.',
    'Caring for others includes caring for myself.',
    'My presence alone can make someone feel less alone.',
  ],
  "Something I'm not ready to name yet": [
    'I don’t have to name it to deserve support.',
    'I can share as much, or as little, as I want.',
    'My story is mine to tell, in my own time.',
    'It is okay to not have the words yet.',
  ],
};

const DECK_SIZE = 5;

// Takes her reasons' affirmations in turn (so two reasons both show up early),
// then tops up with general ones. No reasons picked → the general set.
export function buildAffirmationDeck(selectedReasons) {
  const lists = selectedReasons.map((reason) => affirmationsByReason[reason] || []);
  const deck = [];
  for (let round = 0; deck.length < DECK_SIZE && lists.some((list) => list[round]); round++) {
    for (const list of lists) {
      if (list[round] && !deck.includes(list[round]) && deck.length < DECK_SIZE) deck.push(list[round]);
    }
  }
  for (const line of generalAffirmations) {
    if (deck.length >= DECK_SIZE) break;
    if (!deck.includes(line)) deck.push(line);
  }
  return deck;
}
