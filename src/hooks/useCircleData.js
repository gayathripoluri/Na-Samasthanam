import { useCallback, useEffect, useState } from 'react';
import { friendlyError, supabase } from '../lib/supabase.js';
import { timeAgo } from '../lib/timeAgo.js';

const REFRESH_EVERY = 15000;
const FEED_SIZE = 100;

const toComment = (row) => ({
  id: row.id,
  author: row.author_alias,
  team: row.as_team,
  text: row.body,
  time: timeAgo(row.created_at),
  createdAt: row.created_at,
});

const toPost = (row, flagged) => ({
  id: row.id,
  feed: row.feed,
  initial: row.author_alias.charAt(0).toUpperCase(),
  author: row.author_alias,
  time: timeAgo(row.created_at),
  createdAt: row.created_at,
  topic: row.topic,
  text: row.body,
  edited: row.edited,
  archived: row.archived,
  support: row.support_count,
  flagged: flagged.has(row.id),
  responses: row.comments
    .map(toComment)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
});

const toConversation = (row, userId) => {
  const mine = row.requester_id === userId;
  const other = mine ? row.recipient_alias : row.requester_alias;
  const readAt = mine ? row.requester_read_at : row.recipient_read_at;
  const messages = [...row.messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message) => ({
      id: message.id,
      from: message.sender_id === userId ? 'you' : 'them',
      text: message.body,
      time: timeAgo(message.created_at),
    }));
  return {
    id: row.id,
    initial: other.charAt(0).toUpperCase(),
    author: other,
    time: timeAgo(row.last_message_at),
    unread: row.last_message_at > readAt,
    status: row.status,
    incoming: !mine,
    messages,
  };
};

// Everything shared in the circle lives on the server and in memory only:
// nothing here is written to the device.
export function useCircleData(userId) {
  const [posts, setPosts] = useState([]);
  const [supported, setSupported] = useState(() => new Set());
  const [conversations, setConversations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [postRows, supportRows, flagRows, conversationRows] = await Promise.all([
      supabase
        .from('posts')
        .select('*, comments(*)')
        .order('created_at', { ascending: false })
        .limit(FEED_SIZE),
      supabase.from('supports').select('post_id').eq('user_id', userId),
      supabase.rpc('my_flags'),
      supabase
        .from('conversations')
        .select('*, messages(*)')
        .order('last_message_at', { ascending: false }),
    ]);
    const failed = [postRows, supportRows, flagRows, conversationRows].find((item) => item.error);
    if (failed) {
      setError(friendlyError(failed.error));
      return;
    }
    const flagged = new Set(flagRows.data);
    setPosts(postRows.data.map((row) => toPost(row, flagged)));
    setSupported(new Set(supportRows.data.map((row) => row.post_id)));
    setConversations(conversationRows.data.map((row) => toConversation(row, userId)));
    setLoaded(true);
    setError('');
  }, [userId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, REFRESH_EVERY);
    return () => clearInterval(timer);
  }, [refresh]);

  // Runs a change, then reloads. Resolves false so forms can keep her words.
  const perform = async (change) => {
    const { error: failure } = await change;
    if (failure) {
      setError(friendlyError(failure));
      return false;
    }
    setError('');
    await refresh();
    return true;
  };

  return {
    posts,
    supported,
    conversations,
    loaded,
    error,
    createPost: (fields) => perform(supabase.from('posts').insert(fields)),
    updatePost: (id, change) => perform(supabase.from('posts').update(change).eq('id', id)),
    deletePost: (id) => perform(supabase.from('posts').delete().eq('id', id)),
    addComment: (postId, body) => perform(supabase.from('comments').insert({ post_id: postId, body })),
    toggleSupport: (id) =>
      perform(
        supported.has(id)
          ? supabase.from('supports').delete().eq('post_id', id).eq('user_id', userId)
          : supabase.from('supports').insert({ post_id: id }),
      ),
    flagPost: (id) => perform(supabase.from('flags').insert({ post_id: id })),
    startConversation: (postId, message) =>
      perform(supabase.rpc('start_conversation', { p_post: postId, p_message: message })),
    respondToRequest: (id, accept) =>
      perform(supabase.rpc('respond_to_request', { p_conversation: id, p_accept: accept })),
    sendMessage: (id, body) =>
      perform(supabase.from('messages').insert({ conversation_id: id, body })),
    markRead: (id) => perform(supabase.rpc('mark_conversation_read', { p_conversation: id })),
  };
}
