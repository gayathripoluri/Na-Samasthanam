// Reasons a member can give when reporting a comment. Urgent ones go to the top
// of the team's queue.
export const reportReasons = [
  { id: 'curse', label: 'Curse words or abusive language' },
  { id: 'mean', label: 'Mean or hurtful' },
  { id: 'harassment', label: 'Bullying or harassment' },
  { id: 'shaming', label: 'Judging, blaming or shaming' },
  { id: 'privacy', label: "Sharing someone's story or identity" },
  { id: 'unsafe', label: 'Threats or making me feel unsafe', urgent: true },
];
