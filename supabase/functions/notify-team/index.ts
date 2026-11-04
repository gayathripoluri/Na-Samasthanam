// Emails the team when a flag arrives, so nobody has to watch the queue.
// Called by a Supabase database webhook on INSERT into public.flags.
// TEAM_ALERT_EMAIL is a server secret, so the address never reaches the app.
// The email never contains the post: it goes to an inbox, so it only says
// that someone is waiting and links to the console.

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { record } = await request.json();
  const labels = {
    member: 'A flagged post',
    needs_support: 'A Needs Support post',
    comment_report: 'A comment report',
    appeal: 'A suspension appeal',
  };
  const source = labels[record?.source] ?? 'Something';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('ALERT_FROM'),
      to: Deno.env.get('TEAM_ALERT_EMAIL').split(','),
      subject: `${record?.urgent ? 'URGENT: ' : ''}Someone is waiting for follow-up`,
      text: `${source} needs follow-up.\n\nOpen the queue: ${Deno.env.get('SITE_URL')}/#team`,
    }),
  });

  if (!response.ok) {
    console.error('Alert email failed', response.status);
    return new Response('Alert failed', { status: 502 });
  }
  return new Response('Sent');
});
