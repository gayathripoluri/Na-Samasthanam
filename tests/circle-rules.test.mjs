// Tries to break the database privacy rules as real signed-in clients.
// Needs local Supabase: `npx supabase start`, then `npm run test:rules`.
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { before, test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

const status = JSON.parse(
  execSync('npx --yes supabase@latest status -o json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(),
);
const url = status.API_URL;
const anonKey = status.ANON_KEY;
const client = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(url, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const tag = () => randomUUID().slice(0, 6);
const member = async (prefix) => {
  const db = client();
  const { data, error } = await db.auth.signInAnonymously();
  assert.ifError(error);
  const alias = `${prefix}_${tag()}1`;
  const claimed = await db.rpc('claim_alias', { p_alias: alias, p_reasons: ['Grief or loss'] });
  assert.ifError(claimed.error);
  return { db, id: data.user.id, alias };
};
const post = async (who, fields) => {
  const { data, error } = await who.db.from('posts').insert(fields).select().single();
  assert.ifError(error);
  return data;
};

let ana, bea, cara, team;

before(async () => {
  [ana, bea, cara] = await Promise.all([member('ana'), member('bea'), member('cara')]);
  const email = `team-${tag()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  await admin.from('team_members').insert({ user_id: created.data.user.id }).throwOnError();
  const db = client();
  assert.ifError((await db.auth.signInWithPassword({ email, password })).error);
  team = { db, id: created.data.user.id };
});

test('signed-out visitors can read nothing', async () => {
  const stranger = client();
  for (const table of ['posts', 'comments', 'profiles', 'flags', 'conversations', 'messages']) {
    const { data, error } = await stranger.from(table).select('*');
    assert.ok(error || data.length === 0, `${table} readable while signed out`);
  }
});

test('a signed-in user with no alias can read nothing', async () => {
  const lurker = client();
  await lurker.auth.signInAnonymously();
  await post(ana, { body: 'hello circle' });
  const { data } = await lurker.from('posts').select('*');
  assert.equal(data.length, 0);
  assert.ok((await lurker.from('posts').insert({ body: 'x' })).error);
});

test('profiles are private to their owner', async () => {
  const { data } = await bea.db.from('profiles').select('*');
  assert.deepEqual(data.map((row) => row.id), [bea.id]);
});

test('aliases are unique, ignoring case, and reserved names are refused', async () => {
  const other = client();
  await other.auth.signInAnonymously();
  const taken = await other.rpc('claim_alias', { p_alias: ana.alias.toUpperCase() });
  assert.match(taken.error.message, /alias_taken/);
  const reserved = await other.rpc('claim_alias', { p_alias: 'NAA_SAMASTHANAM' });
  assert.match(reserved.error.message, /alias_reserved/);
  const badFormat = await other.rpc('claim_alias', { p_alias: 'has space_1' });
  assert.match(badFormat.error.message, /alias_invalid/);
});

test('a post cannot be published under someone else', async () => {
  const forged = await bea.db.from('posts').insert({ body: 'x', author_alias: ana.alias }).select();
  assert.ok(forged.error);
  const fine = await post(bea, { body: 'mine' });
  assert.equal(fine.author_id, bea.id);
  assert.equal(fine.author_alias, bea.alias);
});

test('members cannot edit, archive or delete another post, or fake support counts', async () => {
  const mine = await post(ana, { body: 'original' });
  await bea.db.from('posts').update({ body: 'hacked', archived: true }).eq('id', mine.id);
  await bea.db.from('posts').delete().eq('id', mine.id);
  const { data } = await admin.from('posts').select('*').eq('id', mine.id).single();
  assert.equal(data.body, 'original');
  assert.equal(data.archived, false);
  assert.ok((await ana.db.from('posts').update({ support_count: 999 }).eq('id', mine.id)).error);
});

test('editing marks a post edited; archived posts vanish for others', async () => {
  const mine = await post(ana, { body: 'draft' });
  await ana.db.from('posts').update({ body: 'better' }).eq('id', mine.id).throwOnError();
  await ana.db.from('posts').update({ archived: true }).eq('id', mine.id).throwOnError();
  const hers = await ana.db.from('posts').select('edited').eq('id', mine.id).single();
  assert.equal(hers.data.edited, true);
  assert.equal((await bea.db.from('posts').select('id').eq('id', mine.id)).data.length, 0);
  assert.ok((await bea.db.from('comments').insert({ post_id: mine.id, body: 'hi' })).error);
  assert.ok((await bea.db.from('flags').insert({ post_id: mine.id })).error);
  assert.ok((await bea.db.rpc('start_conversation', { p_post: mine.id, p_message: 'hi' })).error);
});

test('support counts follow real supports and one person counts once', async () => {
  const mine = await post(ana, { body: 'support me' });
  await bea.db.from('supports').insert({ post_id: mine.id }).throwOnError();
  assert.ok((await bea.db.from('supports').insert({ post_id: mine.id })).error);
  const count = async () =>
    (await admin.from('posts').select('support_count').eq('id', mine.id).single()).data.support_count;
  assert.equal(await count(), 1);
  await bea.db.from('supports').delete().eq('post_id', mine.id).throwOnError();
  assert.equal(await count(), 0);
});

test('only the team can comment as the team', async () => {
  const mine = await post(ana, { body: 'hard day' });
  assert.ok((await bea.db.from('comments').insert({ post_id: mine.id, body: 'x', as_team: true })).error);
  const forged = await bea.db
    .from('comments')
    .insert({ post_id: mine.id, body: 'x', author_alias: 'Naa Samasthanam team' });
  assert.ok(forged.error);
  const real = await team.db
    .from('comments')
    .insert({ post_id: mine.id, body: 'we are here', as_team: true })
    .select()
    .single();
  assert.ifError(real.error);
  assert.equal(real.data.author_alias, 'Naa Samasthanam team');
});

test('a member flag reaches the team and stays hidden from every member', async () => {
  const hers = await post(ana, { body: 'please look at this' });
  await bea.db.from('flags').insert({ post_id: hers.id }).throwOnError();
  assert.equal((await bea.db.from('flags').select('*')).data.length, 0);
  assert.equal((await ana.db.from('flags').select('*')).data.length, 0);
  assert.equal((await cara.db.from('flags').select('*')).data.length, 0);
  assert.deepEqual((await bea.db.rpc('my_flags')).data, [hers.id]);
  assert.deepEqual((await cara.db.rpc('my_flags')).data, []);
  const queue = (await team.db.from('flags').select('*').eq('post_id', hers.id)).data;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].post_text, 'please look at this');
  assert.equal(queue[0].source, 'member');
});

test('a flag cannot be forged, and members cannot close one', async () => {
  const hers = await post(ana, { body: 'forge target' });
  const forged = await bea.db.from('flags').insert({
    post_id: hers.id, post_text: 'fake', post_author: 'fake', source: 'needs_support', reporter_id: cara.id,
  });
  assert.ok(forged.error);
  await bea.db.from('flags').insert({ post_id: hers.id }).throwOnError();
  await bea.db.from('flags').update({ status: 'followed_up' }).eq('post_id', hers.id);
  const { data } = await admin.from('flags').select('status').eq('post_id', hers.id).single();
  assert.equal(data.status, 'open');
});

test('Needs Support posts enter the team queue with nobody flagging them', async () => {
  const hers = await post(ana, { body: 'I cannot cope', feed: 'support' });
  const queue = (await team.db.from('flags').select('*').eq('post_id', hers.id)).data;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].source, 'needs_support');
  assert.equal(queue[0].status, 'open');
});

test('a flag survives post deletion, and its copy is erased once followed up', async () => {
  const hers = await post(ana, { body: 'something heavy', feed: 'support' });
  const flag = (await team.db.from('flags').select('id').eq('post_id', hers.id).single()).data;
  await ana.db.from('posts').delete().eq('id', hers.id).throwOnError();
  const open = (await team.db.from('flags').select('*').eq('id', flag.id).single()).data;
  assert.equal(open.post_text, 'something heavy');
  assert.equal(open.post_id, null);
  await team.db.from('flags').update({ status: 'followed_up' }).eq('id', flag.id).throwOnError();
  const closed = (await team.db.from('flags').select('*').eq('id', flag.id).single()).data;
  assert.equal(closed.post_text, '');
  assert.equal(closed.followed_up_by, team.id);
  assert.ok(closed.followed_up_at);
});

test('messages stay between the two members, and the team cannot read them', async () => {
  const hers = await post(ana, { body: 'open to talk' });
  const started = await bea.db.rpc('start_conversation', { p_post: hers.id, p_message: 'private words' });
  assert.ifError(started.error);
  const id = started.data;
  assert.equal((await ana.db.from('messages').select('*').eq('conversation_id', id)).data.length, 1);
  for (const outsider of [cara, team]) {
    assert.equal((await outsider.db.from('messages').select('*').eq('conversation_id', id)).data.length, 0);
    assert.equal((await outsider.db.from('conversations').select('*').eq('id', id)).data.length, 0);
  }
  assert.ok((await cara.db.from('messages').insert({ conversation_id: id, body: 'x' })).error);
  await cara.db.rpc('respond_to_request', { p_conversation: id, p_accept: true });
  const state = (await admin.from('conversations').select('status').eq('id', id).single()).data;
  assert.equal(state.status, 'pending');
});

test('no messages before acceptance, and only the recipient can accept', async () => {
  const hers = await post(cara, { body: 'hi' });
  const id = (await bea.db.rpc('start_conversation', { p_post: hers.id, p_message: 'hello' })).data;
  assert.ok((await bea.db.from('messages').insert({ conversation_id: id, body: 'again' })).error);
  await bea.db.rpc('respond_to_request', { p_conversation: id, p_accept: true });
  assert.equal((await cara.db.from('conversations').select('status').eq('id', id).single()).data.status, 'pending');
  await cara.db.rpc('respond_to_request', { p_conversation: id, p_accept: true }).throwOnError();
  await bea.db.from('messages').insert({ conversation_id: id, body: 'thank you' }).throwOnError();
  const forged = await bea.db.from('messages').insert({ conversation_id: id, body: 'x', sender_id: cara.id });
  assert.ok(forged.error);
});

test('a declined member cannot ask again; "No one" blocks new requests', async () => {
  const [dee, eve] = await Promise.all([member('dee'), member('eve')]);
  const hers = await post(dee, { body: 'quiet' });
  const id = (await eve.db.rpc('start_conversation', { p_post: hers.id, p_message: 'hi' })).data;
  await dee.db.rpc('respond_to_request', { p_conversation: id, p_accept: false }).throwOnError();
  const again = await eve.db.rpc('start_conversation', { p_post: hers.id, p_message: 'please' });
  assert.match(again.error.message, /already_requested/);
  await dee.db.from('profiles').update({ message_privacy: 'No one' }).eq('id', dee.id).throwOnError();
  const blocked = await bea.db.rpc('start_conversation', { p_post: hers.id, p_message: 'hi' });
  assert.match(blocked.error.message, /not_accepting/);
});

test('strikes and suspension cannot be changed from the browser', async () => {
  const fay = await member('fay');
  assert.ok((await fay.db.from('profiles').update({ strikes: 0 }).eq('id', fay.id)).error);
  assert.ok((await fay.db.from('profiles').update({ suspended_at: null }).eq('id', fay.id)).error);
  assert.ok((await fay.db.from('profiles').update({ alias: 'other_name1' }).eq('id', fay.id)).error);
});

test('three strikes suspend on the server and stop posting, commenting and messaging', async () => {
  const gia = await member('gia');
  const hers = await post(ana, { body: 'still here' });
  await gia.db.rpc('record_strike').throwOnError();
  assert.equal((await gia.db.rpc('record_strike')).data.suspended_at, null);
  assert.ok((await gia.db.rpc('record_strike')).data.suspended_at);
  assert.ok((await gia.db.from('posts').insert({ body: 'x' })).error);
  assert.ok((await gia.db.from('comments').insert({ post_id: hers.id, body: 'x' })).error);
  assert.ok((await gia.db.rpc('start_conversation', { p_post: hers.id, p_message: 'x' })).error);
});

test('only admins reach the portal data, and it holds no private details', async () => {
  const email = `admin-${tag()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  await admin.from('team_members').insert({ user_id: created.data.user.id, role: 'admin' }).throwOnError();
  const boss = client();
  await boss.auth.signInWithPassword({ email, password });
  assert.equal((await boss.rpc('my_team_role')).data, 'admin');
  assert.equal((await team.db.rpc('my_team_role')).data, 'team');
  assert.equal((await bea.db.rpc('my_team_role')).data, null);

  for (const outsider of [bea, team]) {
    assert.ok((await outsider.db.rpc('admin_overview')).error);
    assert.deepEqual((await outsider.db.rpc('admin_members')).data, []);
    const blocked = await outsider.db.rpc('admin_set_suspended', { p_member: ana.id, p_suspended: true });
    assert.ok(blocked.error);
  }
  assert.ok((await client().rpc('admin_overview')).error);
  assert.equal((await admin.from('profiles').select('suspended_at').eq('id', ana.id).single()).data.suspended_at, null);

  const overview = (await boss.rpc('admin_overview')).data;
  assert.ok(overview.members >= 3);
  const rows = (await boss.rpc('admin_members')).data;
  assert.ok(rows.some((row) => row.member_alias === ana.alias));
  assert.ok(!('reasons' in rows[0]) && !('saved_affirmations' in rows[0]));
  assert.ok(!JSON.stringify(rows).includes('Grief or loss'));

  const hia = await member('hia');
  await hia.db.rpc('record_strike').throwOnError();
  await boss.rpc('admin_set_suspended', { p_member: hia.id, p_suspended: true }).throwOnError();
  assert.ok((await hia.db.from('posts').insert({ body: 'x' })).error);
  await boss.rpc('admin_set_suspended', { p_member: hia.id, p_suspended: false }).throwOnError();
  const lifted = (await hia.db.from('profiles').select('*').eq('id', hia.id).single()).data;
  assert.equal(lifted.suspended_at, null);
  assert.equal(lifted.strikes, 0);
  assert.ifError((await hia.db.from('posts').insert({ body: 'back again' })).error);
});

test('the team can remove a post', async () => {
  const hers = await post(ana, { body: 'remove me' });
  await team.db.from('posts').delete().eq('id', hers.id).throwOnError();
  assert.equal((await admin.from('posts').select('id').eq('id', hers.id)).data.length, 0);
});

test('only the post author can report a comment, and only the team sees it', async () => {
  const hers = await post(ana, { body: 'report target' });
  const said = (await bea.db.from('comments').insert({ post_id: hers.id, body: 'unkind words' }).select().single()).data;
  const mine = (await ana.db.from('comments').insert({ post_id: hers.id, body: 'my reply' }).select().single()).data;
  const ours = (await team.db.from('comments').insert({ post_id: hers.id, body: 'team', as_team: true }).select().single()).data;
  const report = (who, id) => who.db.rpc('report_comment', { p_comment: id, p_reason: 'Mean or hurtful', p_urgent: true });

  assert.ok((await report(cara, said.id)).error, 'outsider');
  assert.ok((await report(bea, said.id)).error, 'the commenter herself');
  assert.ok((await report(ana, mine.id)).error, 'her own comment');
  assert.ok((await report(ana, ours.id)).error, 'a team comment');
  assert.ok((await ana.db.from('flags').insert({ post_id: hers.id, reason: 'x', urgent: true })).error);

  await report(ana, said.id).throwOnError();
  assert.match((await report(ana, said.id)).error.message, /already_reported/);
  assert.equal((await bea.db.from('flags').select('*')).data.length, 0);
  assert.equal((await ana.db.from('flags').select('*')).data.length, 0);
  assert.ok(!(await ana.db.rpc('my_flags')).data.includes(hers.id));

  const queue = (await team.db.from('flags').select('*').eq('comment_id', said.id)).data;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].reported_comment, 'unkind words');
  assert.equal(queue[0].reported_author, bea.alias);
  assert.equal(queue[0].urgent, true);
});

test('a member can report two comments on one post and still flag it', async () => {
  const hers = await post(ana, { body: 'two comments' });
  const first = (await cara.db.from('comments').insert({ post_id: hers.id, body: 'one' }).select().single()).data;
  const second = (await cara.db.from('comments').insert({ post_id: hers.id, body: 'two' }).select().single()).data;
  for (const id of [first.id, second.id]) {
    await ana.db.rpc('report_comment', { p_comment: id, p_reason: 'Mean or hurtful', p_urgent: false }).throwOnError();
  }
  await ana.db.from('flags').insert({ post_id: hers.id }).throwOnError();
  assert.ok((await ana.db.rpc('my_flags')).data.includes(hers.id));
});

test('only suspended members can appeal, once at a time, and only the team reads it', async () => {
  assert.ok((await bea.db.rpc('submit_appeal', { p_message: 'not suspended' })).error);
  const ivy = await member('ivy');
  for (let i = 0; i < 3; i++) await ivy.db.rpc('record_strike').throwOnError();
  assert.ok((await ivy.db.rpc('submit_appeal', { p_message: '   ' })).error);
  await ivy.db.rpc('submit_appeal', { p_message: 'It was a quote' }).throwOnError();
  assert.match((await ivy.db.rpc('submit_appeal', { p_message: 'again' })).error.message, /already_appealed/);
  assert.equal((await ivy.db.from('flags').select('*')).data.length, 0);
  assert.equal((await bea.db.from('flags').select('*')).data.length, 0);
  const queue = (await team.db.from('flags').select('*').eq('reporter_id', ivy.id)).data;
  assert.equal(queue[0].post_text, 'It was a quote');
  assert.equal(queue[0].source, 'appeal');
  await team.db.from('flags').update({ status: 'followed_up' }).eq('id', queue[0].id).throwOnError();
  assert.equal((await team.db.from('flags').select('post_text').eq('id', queue[0].id).single()).data.post_text, '');
});

test('nobody can make themselves team', async () => {
  assert.ok((await bea.db.from('team_members').insert({ user_id: bea.id })).error);
  assert.equal((await bea.db.rpc('is_team')).data, false);
  assert.equal((await team.db.rpc('is_team')).data, true);
});
