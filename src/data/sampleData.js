// Placeholder community content until there is a backend.
import { TEAM_NAME } from './content.js';

export const initialCirclePosts = [
  {
    id: 1,
    initial: 'M',
    author: 'morning fog',
    time: '2h ago',
    topic: 'Healing',
    text: "I told my therapist today that I wasn't ready to forgive. She said that was brave. I've been sitting with that word ever since. Brave. I'd only ever called it stuck.",
    support: 34,
    replies: 11,
    responses: [
      {
        id: 1,
        author: 'harbour light',
        text: 'Brave is exactly the word. Sitting with it is part of the work.',
        time: '1h ago',
      },
    ],
  },
  {
    id: 2,
    initial: 'W',
    author: 'wildwood',
    time: '4h ago',
    topic: 'Relationships',
    text: "Three months out and I still check my phone compulsively expecting a message that's never coming. Does this stop? Or do you just get better at not checking?",
    support: 51,
    replies: 22,
    responses: [
      {
        id: 1,
        author: 'river ash',
        text: "It gets quieter. Not all at once — one day you just notice you didn't check.",
        time: '3h ago',
      },
    ],
  },
  {
    id: 3,
    initial: 'S',
    author: 'still water',
    time: '6h ago',
    topic: 'Rebuilding',
    text: 'I got a promotion today. First thing I wanted to do was call someone who would understand what it took to get here. Then I remembered I can be proud of myself, too.',
    support: 28,
    replies: 8,
    responses: [
      {
        id: 1,
        author: 'twilight fern',
        text: 'So proud of you! You earned every bit of this.',
        time: '5h ago',
      },
    ],
  },
  {
    id: 4,
    initial: 'P',
    author: 'paper boat',
    time: '9h ago',
    topic: 'Grief',
    text: "It's been a year since Amma passed. I made her rasam today and cried into it, and then I ate the whole bowl. I think that's what she would have wanted.",
    support: 46,
    replies: 14,
    responses: [
      {
        id: 1,
        author: 'still water',
        text: "Sending love to you and to Amma's rasam. Grief is just love with nowhere to go.",
        time: '8h ago',
      },
    ],
  },
];

export const initialSupportPosts = [
  {
    id: 1,
    initial: 'E',
    author: 'ember light',
    time: '1h ago',
    text: "I don't know how to get through today. I've been sitting in my car for an hour and I can't make myself go inside. Everything feels too heavy.",
    support: 63,
    replies: 2,
    responses: [
      {
        id: 1,
        author: TEAM_NAME,
        team: true,
        text: "We're here with you. You don't have to go inside yet — just breathe for a moment. Can you tell us if you're safe right now?",
        time: '45m ago',
      },
    ],
  },
  {
    id: 2,
    initial: 'L',
    author: 'low tide',
    time: '3h ago',
    text: "I haven't eaten today. I know that's a simple thing to fix but I just can't seem to care enough to do it.",
    support: 19,
    replies: 4,
    responses: [
      {
        id: 1,
        author: 'morning fog',
        text: "Could you eat something small, even a biscuit? You don't have to care to do it. We're here.",
        time: '2h ago',
      },
    ],
  },
];

export const initialRequests = [
  {
    id: 1,
    initial: 'T',
    author: 'twilight fern',
    time: '30m ago',
    preview: 'I read your post and it really resonated...',
    message: "I read your post and it really resonated. I'm going through something similar — would it be okay to talk?",
  },
  {
    id: 2,
    initial: 'H',
    author: 'harbour light',
    time: '2h ago',
    preview: "You're not alone in this. I've been there.",
    message: "You're not alone in this. I've been there. Message me whenever you want — no pressure to reply.",
  },
];

// The list preview is the last message in each thread.
export const initialConversations = [
  {
    id: 1,
    initial: 'M',
    author: 'morning fog',
    time: 'Just now',
    unread: true,
    messages: [
      { id: 1, from: 'you', text: 'Your post about the word "brave" stayed with me all day.', time: 'Today' },
      { id: 2, from: 'them', text: 'Thank you for saying that. I needed to hear it.', time: 'Just now' },
    ],
  },
  {
    id: 2,
    initial: 'S',
    author: 'still water',
    time: 'Yesterday',
    unread: false,
    messages: [
      { id: 1, from: 'them', text: 'How are you holding up today?', time: 'Yesterday' },
    ],
  },
  {
    id: 3,
    initial: 'R',
    author: 'river ash',
    time: '3 days ago',
    unread: false,
    messages: [
      { id: 1, from: 'you', text: 'I finally told my sister what happened.', time: '3 days ago' },
      { id: 2, from: 'them', text: "I'm proud of you. Really.", time: '3 days ago' },
    ],
  },
];

// Aliases already in use. With a backend this becomes a server-side check.
export const takenAliases = [
  ...initialCirclePosts,
  ...initialSupportPosts,
  ...initialRequests,
  ...initialConversations,
  ...[...initialCirclePosts, ...initialSupportPosts].flatMap((post) => post.responses || []),
].map((item) => item.author);
