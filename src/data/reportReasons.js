// Reasons a member can give when reporting a comment, each with the email
// the team receives. Placeholders in {braces} are filled in when she sends it:
//   {username}  alias of the person who wrote the comment
//   {comment}   the comment itself
//   {post}      the post it was left on
//   {reporter}  alias of the member reporting it
const signOff = `

The comment:
"{comment}"

It was left on this post:
"{post}"

Please review {username}'s account and suspend it if it breaks the circle's promise.

Reported by: {reporter}`;

export const reportReasons = [
  {
    id: 'curse',
    label: 'Curse words or abusive language',
    subject: 'Report: abusive language from {username}',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for using curse words or abusive language in a comment.${signOff}`,
  },
  {
    id: 'mean',
    label: 'Mean or hurtful',
    subject: 'Report: hurtful comment from {username}',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for a comment that was mean or hurtful. It didn't feel like the safe space we promised each other.${signOff}`,
  },
  {
    id: 'harassment',
    label: 'Bullying or harassment',
    subject: 'Report: harassment by {username}',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for bullying or harassing me or another member.${signOff}`,
  },
  {
    id: 'shaming',
    label: 'Judging, blaming or shaming',
    subject: 'Report: shaming comment from {username}',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for judging, blaming or shaming someone for what they shared.${signOff}`,
  },
  {
    id: 'privacy',
    label: "Sharing someone's story or identity",
    subject: 'Report: {username} shared private details',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for sharing someone's story, identity or words — breaking the circle's promise.${signOff}`,
  },
  {
    id: 'unsafe',
    label: 'Threats or making me feel unsafe',
    subject: 'URGENT report: {username} made me feel unsafe',
    body: `Hello Naa Samasthanam team,

I'm reporting {username} for a comment that threatened me or made me feel unsafe. Please look at this as soon as you can.${signOff}`,
  },
];

export const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (placeholder, key) => values[key] ?? placeholder);
