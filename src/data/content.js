export const promises = [
  'I will not use anything shared here against another woman.',
  "I will not share another woman's story, identity, or words outside this circle.",
  "I will not judge what I don't understand.",
  "I will speak to every woman here as I'd want to be spoken to on my hardest day.",
  'I understand that breaking this promise means I lose my place in this circle.',
];

export const reasons = [
  'Healing from a relationship',
  'Grief or loss',
  'Rebuilding confidence',
  'Recovering from abuse or trauma',
  'Feeling less alone',
  'Just here to listen and support others',
  "Something I'm not ready to name yet",
];

// Phrases that suggest someone is struggling right now. When a post matches,
// the share form switches to Needs Support (the author can still switch back).
export const distressPatterns = [
  /\b(can'?t|cannot) (cope|go on|do this|breathe|take (it|this))\b/,
  /\b(want|wanted|wanting) to (die|disappear|give up|end it)\b/,
  /\b(kill|hurt|harm)(ing)? myself\b/,
  /\bself[- ]harm\b/,
  /\bsuicid/,
  /\bno (reason|point) (to|in) (live|living|go on|going on)\b/,
  /\b(hopeless|worthless|unsafe|panic attack)\b/,
  /\b(he|she|they) (hit|hits|hurt|hurts|threatened|threatens) me\b/,
  /\b(scared|afraid) (for my life|to go home)\b/,
  /\bi need (help|support|someone)\b/,
  /\b(so|completely|totally) alone\b/,
  /\bhaven'?t eaten\b/,
  /\btoo heavy\b/,
];

export const needsSupportSignal = (text) => {
  const normalized = text.toLowerCase().replace(/[’‘]/g, "'");
  return distressPatterns.some((pattern) => pattern.test(normalized));
};

export const TEAM_NAME = 'Naa Samasthanam team';

// Somewhere unremarkable to land if someone needs to leave in a hurry.
export const QUICK_EXIT_URL = 'https://www.google.com/search?q=weather+today';

// India, free and 24/7.
export const helplines = [
  { name: 'Tele-MANAS', detail: 'Mental health support', number: '14416' },
  { name: 'Women Helpline', detail: 'Violence or harassment', number: '181' },
  { name: 'Emergency', detail: 'Police, ambulance', number: '112' },
];

// Which post topics speak to each onboarding reason. Reasons without topics
// (listening, not ready to say) don't narrow the feed.
export const reasonTopics = {
  'Healing from a relationship': ['Relationships', 'Healing'],
  'Grief or loss': ['Grief'],
  'Rebuilding confidence': ['Rebuilding'],
  'Recovering from abuse or trauma': ['Healing'],
};

// Blocked comment attempts allowed before an account is suspended.
export const MAX_STRIKES = 3;
