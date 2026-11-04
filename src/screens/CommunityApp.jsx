import { useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import Helplines from '../components/Helplines.jsx';
import Modal from '../components/Modal.jsx';
import MyPosts from '../components/MyPosts.jsx';
import PostActions from '../components/PostActions.jsx';
import { CircleMark, UiIcon } from '../components/icons.jsx';
import { MAX_STRIKES, TEAM_NAME, needsSupportSignal, reasonTopics } from '../data/content.js';
import { usePersistentState } from '../hooks/usePersistentState.js';
import { findCurseWords, maskWord } from '../lib/moderation.js';
import ReportScreen from './ReportScreen.jsx';
import {
  initialCirclePosts,
  initialConversations,
  initialRequests,
  initialSupportPosts,
} from '../data/sampleData.js';

export default function CommunityApp({
  alias,
  deviceLockOn,
  reasons,
  savedAffirmations,
  isTeam,
  strikes,
  onBlockedComment,
  onSignOut,
}) {
  const [tab, setTab] = useState('circle');
  // Saved on the device so "My posts" survives a refresh. Sign out clears it.
  const [circlePosts, setCirclePosts] = usePersistentState('circlePosts', initialCirclePosts);
  const [supportPosts, setSupportPosts] = usePersistentState('supportPosts', initialSupportPosts);
  const [supported, setSupported] = useState(() => new Set());
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);
  const [flagQueue, setFlagQueue] = useState([]);
  const [requests, setRequests] = useState(initialRequests);
  const [conversations, setConversations] = useState(initialConversations);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareNeedsSupport, setShareNeedsSupport] = useState(false);
  const [supportAutoDetected, setSupportAutoDetected] = useState(false);
  const [supportChoiceMade, setSupportChoiceMade] = useState(false);
  const [replyPost, setReplyPost] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyAsTeam, setReplyAsTeam] = useState(true);
  const [replyBlocked, setReplyBlocked] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [suggestSupport, setSuggestSupport] = usePersistentState('suggestSupport', true);
  const [messagePrivacy, setMessagePrivacy] = usePersistentState(
    'messagePrivacy',
    'Circle members only',
  );
  const acceptingRequests = messagePrivacy !== 'No one';
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const forYouTopics = [...new Set(reasons.flatMap((reason) => reasonTopics[reason] || []))];
  const [feedFilter, setFeedFilter] = useState(forYouTopics.length ? 'for-you' : 'all');
  // Her own posts always show, whatever the filter.
  const liveCirclePosts = circlePosts.filter((post) => !post.archived);
  const visibleCirclePosts =
    feedFilter === 'for-you'
      ? liveCirclePosts.filter(
          (post) => post.author === alias || forYouTopics.includes(post.topic),
        )
      : liveCirclePosts;

  const myPosts = [
    ...circlePosts.map((post) => ({ ...post, feed: 'circle' })),
    ...supportPosts.map((post) => ({ ...post, feed: 'support' })),
  ]
    .filter((post) => post.author === alias)
    .sort((a, b) => b.id - a.id);

  // change = fields to merge into the post, or null to delete it.
  const changeMyPost = (post, change) => {
    const setPosts = post.feed === 'support' ? setSupportPosts : setCirclePosts;
    setPosts((items) =>
      change === null
        ? items.filter((item) => item.id !== post.id)
        : items.map((item) => (item.id === post.id ? { ...item, ...change } : item)),
    );
  };

  const toggleSupport = (id) => {
    setSupported((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetShare = () => {
    setShareText('');
    setShareNeedsSupport(false);
    setSupportAutoDetected(false);
    setSupportChoiceMade(false);
  };

  const updateShareText = (text) => {
    setShareText(text);
    // Only steer toward Needs Support until the author makes their own choice.
    if (suggestSupport && !supportChoiceMade && !shareNeedsSupport && needsSupportSignal(text)) {
      setShareNeedsSupport(true);
      setSupportAutoDetected(true);
    }
  };

  const flagPost = (post) => {
    setCirclePosts((items) =>
      items.map((item) => (item.id === post.id ? { ...item, flagged: true } : item)),
    );
    // Flags go privately to the team. The post is never reposted publicly.
    setFlagQueue((queue) => [{ ...post, flaggedAt: 'just now' }, ...queue]);
  };

  const resolveFlag = (id) => {
    setFlagQueue((queue) => queue.filter((item) => item.id !== id));
  };

  const publishPost = (event) => {
    event.preventDefault();
    const text = shareText.trim();
    if (!text) return;
    const post = {
      id: Date.now(),
      initial: alias.charAt(0).toUpperCase(),
      author: alias,
      time: 'Just now',
      topic: shareNeedsSupport ? '' : 'Healing',
      text,
      support: 0,
      responses: [],
    };
    if (shareNeedsSupport) {
      setSupportPosts((current) => [post, ...current]);
    } else {
      setCirclePosts((current) => [post, ...current]);
    }
    resetShare();
    setShareOpen(false);
    setTab(shareNeedsSupport ? 'support' : 'circle');
  };

  const publishReply = (event) => {
    event.preventDefault();
    if (!replyText.trim() || !replyPost) return;
    // Comments with curse words are never posted. Each blocked try is a strike;
    // the last one suspends the account (App swaps to the suspended screen).
    if (findCurseWords(replyText).length) {
      setReplyBlocked(true);
      onBlockedComment();
      return;
    }
    const { post, supportMode } = replyPost;
    const asTeam = isTeam && replyAsTeam;
    const response = {
      id: Date.now(),
      author: asTeam ? TEAM_NAME : alias,
      team: asTeam,
      text: replyText.trim(),
      time: 'Just now',
    };
    const update = (items) =>
      items.map((item) =>
        item.id === post.id
          ? { ...item, responses: [...(item.responses || []), response] }
          : item,
      );
    if (supportMode) setSupportPosts((items) => update(items));
    else setCirclePosts((items) => update(items));
    setReplyText('');
  };

  const decideRequest = (id, accepted) => {
    const request = requests.find((item) => item.id === id);
    setRequests((current) => current.filter((item) => item.id !== id));
    if (accepted && request) {
      setConversations((current) => [
        {
          id: request.id + 100,
          initial: request.initial,
          author: request.author,
          time: 'Just now',
          unread: true,
          messages: [{ id: 1, from: 'them', text: request.message, time: request.time }],
        },
        ...current,
      ]);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !activeConversation) return;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              time: 'Just now',
              messages: [
                ...conversation.messages,
                { id: Date.now(), from: 'you', text, time: 'Just now' },
              ],
            }
          : conversation,
      ),
    );
    setMessageText('');
  };

  const openConversation = (id) => {
    setActiveConversationId(id);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: false } : conversation,
      ),
    );
  };

  const tabTitles = {
    circle: 'The Circle',
    support: 'Needs Support',
    messages: 'Messages',
    me: 'Me',
  };

  const renderComment = (response, post) => (
    <div
      className={`post-reply${response.team ? ' post-reply--team' : ''}`}
      key={response.id}
    >
      <p>
        <strong>
          {response.author}
          {response.team && <em className="team-badge">Team</em>}
        </strong>
        <span>{response.time}</span>
      </p>
      <span>{response.text}</span>
      {/* Only the post's author can report comments on her post. */}
      {post.author === alias && !response.team && response.author !== alias && (
        <button
          aria-label={`Report ${response.author}'s comment`}
          className="report-button"
          onClick={() => {
            setReplyPost(null);
            setReportTarget({ comment: response, post });
          }}
          type="button"
        >
          <UiIcon name="mail" size={16} />
          Report by mail
        </button>
      )}
    </div>
  );

  const openComments = (post, supportMode) => {
    setReplyPost({ post, supportMode });
    setReplyBlocked(false);
  };

  // Feeds show the latest two comments; the thread shows them all.
  const INLINE_COMMENTS = 2;

  const renderPost = (post, supportMode = false) => {
    const isSupported = supported.has(`${supportMode ? 'support' : 'circle'}-${post.id}`);
    return (
      <article
        className={`community-post${supportMode ? ' community-post--support' : ''}`}
        key={post.id}
      >
        <div className="post-author-row">
          <Avatar initial={post.initial} />
          <div className="post-author">
            <p>{post.author}</p>
            <span>
              {post.time}
              {post.topic ? ` · ${post.topic}` : ''}
              {post.edited ? ' · edited' : ''}
            </span>
          </div>
          {supportMode && <span className="needs-support-badge">Needs support</span>}
        </div>
        <p className="post-copy">{post.text}</p>
        <PostActions
          onFlag={supportMode ? undefined : () => flagPost(post)}
          onReplies={() => openComments(post, supportMode)}
          onSupport={() => toggleSupport(`${supportMode ? 'support' : 'circle'}-${post.id}`)}
          post={post}
          supportMode={supportMode}
          supported={isSupported}
        />
        {post.responses?.length > 0 && (
          <div className="post-replies" aria-label="Comments">
            {post.responses.slice(-INLINE_COMMENTS).map((response) => renderComment(response, post))}
            {post.responses.length > INLINE_COMMENTS && (
              <button
                className="view-comments"
                onClick={() => openComments(post, supportMode)}
                type="button"
              >
                View all {post.responses.length} comments
              </button>
            )}
          </div>
        )}
        {supportMode && (
          <Helplines intro="If you're in crisis, these lines are free and open 24/7. Tap to call." />
        )}
      </article>
    );
  };

  if (reportTarget) {
    return (
      <ReportScreen
        comment={reportTarget.comment}
        onBack={() => setReportTarget(null)}
        post={reportTarget.post}
        reporter={alias}
      />
    );
  }

  const threadPost = replyPost
    ? (replyPost.supportMode ? supportPosts : circlePosts).find(
        (post) => post.id === replyPost.post.id,
      ) || replyPost.post
    : null;
  const threadComments = threadPost?.responses || [];

  const replyCurseWords = findCurseWords(replyText);
  const strikesLeft = MAX_STRIKES - strikes;

  return (
    <div className="community-app">
      <header className={`community-header community-header--${tab}`}>
        {activeConversation ? (
          <div className="conversation-header">
            <button
              aria-label="Back to messages"
              className="icon-button"
              onClick={() => setActiveConversationId(null)}
              type="button"
            >
              <UiIcon name="back" />
            </button>
            <Avatar initial={activeConversation.initial} />
            <div>
              <h1>{activeConversation.author}</h1>
              <p>Circle member</p>
            </div>
          </div>
        ) : (
          <>
            <div className="community-heading">
              <h1>{tabTitles[tab]}</h1>
              {tab === 'circle' && <p>Safe voices, honest words</p>}
              {tab === 'support' && <p>Respond with care. Lead with listening.</p>}
            </div>
            {tab === 'circle' && (
              <button
                className="share-button"
                onClick={() => setShareOpen(true)}
                type="button"
              >
                + Share
              </button>
            )}
          </>
        )}
      </header>

      <div className={`community-scroll community-scroll--${tab}`}>
        {activeConversation ? (
          <section className="conversation-view" aria-label={`Conversation with ${activeConversation.author}`}>
            {activeConversation.messages.map((message) => (
              <div
                className={`conversation-message conversation-message--${message.from}`}
                key={message.id}
              >
                <p>{message.text}</p>
                <span>{message.time}</span>
              </div>
            ))}
            <form className="message-compose" onSubmit={sendMessage}>
              <label className="visually-hidden" htmlFor="message-draft">
                Write a message
              </label>
              <input
                id="message-draft"
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Write a message..."
                value={messageText}
              />
              <button aria-label="Send message" disabled={!messageText.trim()} type="submit">
                <UiIcon name="send" />
              </button>
            </form>
          </section>
        ) : (
          <>
            {tab === 'circle' && (
              <section className="post-list" aria-label="Circle posts">
                {forYouTopics.length > 0 && (
                  <div className="feed-filter" role="group" aria-label="Filter posts">
                    {[
                      ['for-you', 'For you'],
                      ['all', 'All posts'],
                    ].map(([id, label]) => (
                      <button
                        aria-pressed={feedFilter === id}
                        className={`feed-filter__chip${feedFilter === id ? ' is-active' : ''}`}
                        key={id}
                        onClick={() => setFeedFilter(id)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                    {feedFilter === 'for-you' && (
                      <span className="feed-filter__topics">{forYouTopics.join(' · ')}</span>
                    )}
                  </div>
                )}
                {visibleCirclePosts.map((post) => renderPost(post))}
              </section>
            )}
            {tab === 'support' && (
              <section className="support-content" aria-label="Posts needing support">
                <section className={`guidelines${guidelinesOpen ? ' is-open' : ''}`}>
                  <button
                    aria-expanded={guidelinesOpen}
                    className="guidelines-heading"
                    onClick={() => setGuidelinesOpen((open) => !open)}
                    type="button"
                  >
                    <UiIcon name="shield" />
                    <span>Community care guidelines</span>
                    <UiIcon name="chevron" size={20} />
                  </button>
                  {guidelinesOpen && (
                    <ul>
                      <li>Lead with listening, not advice.</li>
                      <li>Validate before you suggest.</li>
                      <li>Never minimize. Never compare.</li>
                      <li>
                        If you think someone is in danger, use the flag. Only our
                        team sees it, and a real person will follow up privately.
                      </li>
                    </ul>
                  )}
                </section>
                {isTeam && (
                  <section className="flag-queue" aria-labelledby="flag-queue-title">
                    <h2 className="section-label" id="flag-queue-title">
                      Flagged for follow-up · team only
                    </h2>
                    {flagQueue.length ? (
                      flagQueue.map((item) => (
                        <article className="flag-card" key={item.id}>
                          <p className="flag-card__meta">
                            {item.author} · posted {item.time} · flagged {item.flaggedAt}
                          </p>
                          <p>{item.text}</p>
                          <button
                            className="request-accept"
                            onClick={() => resolveFlag(item.id)}
                            type="button"
                          >
                            Mark as followed up
                          </button>
                        </article>
                      ))
                    ) : (
                      <p className="empty-note">No flagged posts right now.</p>
                    )}
                  </section>
                )}
                <div className="post-list">
                  {supportPosts
                    .filter((post) => !post.archived)
                    .map((post) => renderPost(post, true))}
                </div>
              </section>
            )}
            {tab === 'messages' && (
              <section className="messages-content" aria-label="Messages">
                <h2 className="section-label">
                  Requests — {acceptingRequests ? requests.length : 'paused'}
                </h2>
                {!acceptingRequests && (
                  <p className="empty-note">
                    You&apos;ve turned off new message requests in Me. Your
                    conversations below stay open.
                  </p>
                )}
                {acceptingRequests && requests.length > 0 && (
                  <div className="request-list">
                    {requests.map((request) => (
                      <article className="request-card" key={request.id}>
                        <div className="request-info">
                          <Avatar initial={request.initial} />
                          <div className="request-copy">
                            <div className="request-topline">
                              <p>{request.author}</p>
                              <span>{request.time}</span>
                            </div>
                            <p>{request.preview}</p>
                          </div>
                        </div>
                        <div className="request-actions">
                          <button
                            className="request-accept"
                            onClick={() => decideRequest(request.id, true)}
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="request-decline"
                            onClick={() => decideRequest(request.id, false)}
                            type="button"
                          >
                            Decline
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <h2 className="section-label conversations-label">Conversations</h2>
                {conversations.length > 0 ? (
                  <div className="conversation-list">
                    {conversations.map((conversation) => (
                      <button
                        className="conversation-card"
                        key={conversation.id}
                        onClick={() => openConversation(conversation.id)}
                        type="button"
                      >
                        <span className="conversation-avatar">
                          <Avatar initial={conversation.initial} />
                          {conversation.unread && <i />}
                        </span>
                        <span className="conversation-copy">
                          <span className="conversation-topline">
                            <strong>{conversation.author}</strong>
                            <span>{conversation.time}</span>
                          </span>
                          <span className="conversation-preview">
                            {conversation.messages.at(-1)?.text}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">Accepted conversations will appear here.</p>
                )}
              </section>
            )}
            {tab === 'me' && (
              <section className="profile-content" aria-label="Your profile">
                <div className="profile-summary">
                  <div className="profile-mark">
                    <CircleMark lit={5} large />
                  </div>
                  <h2>{alias}</h2>
                  <p>Oath keeper · Yuva Rani</p>
                  <span className="standing-badge">
                    <UiIcon name="sparkle" size={16} />
                    Circle in good standing
                  </span>
                </div>
                <MyPosts
                  onArchive={(post, archived) => changeMyPost(post, { archived })}
                  onDelete={(post) => changeMyPost(post, null)}
                  onEdit={(post, text) => changeMyPost(post, { text, edited: true })}
                  posts={myPosts}
                />
                <h3 className="section-label profile-label">Saved affirmations</h3>
                <div className="saved-affirmations">
                  {savedAffirmations.length ? (
                    savedAffirmations.map((affirmation) => (
                      <blockquote key={affirmation}>{affirmation}</blockquote>
                    ))
                  ) : (
                    <p>Affirmations you heart during onboarding will live here.</p>
                  )}
                </div>
                <h3 className="section-label profile-label">Privacy &amp; messages</h3>
                <div className="settings-list">
                  <label className="setting-row">
                    <span>Who can message me</span>
                    <select
                      onChange={(event) => setMessagePrivacy(event.target.value)}
                      value={messagePrivacy}
                    >
                      <option>Circle members only</option>
                      <option>No one</option>
                    </select>
                  </label>
                  <label className="setting-row">
                    <span>
                      Suggest Needs Support
                      <small>When a post sounds heavy, offer to move it there</small>
                    </span>
                    <input
                      checked={suggestSupport}
                      onChange={(event) => setSuggestSupport(event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <div className="setting-row">
                    <span>
                      Fingerprint lock
                      <small>
                        {deviceLockOn
                          ? "Your phone's lock is needed to open the circle"
                          : 'Not set up on this device'}
                      </small>
                    </span>
                    <strong className={`lock-status${deviceLockOn ? ' is-on' : ''}`}>
                      {deviceLockOn ? 'On' : 'Off'}
                    </strong>
                  </div>
                  <label className="setting-row is-disabled">
                    <span>
                      Email notifications
                      <small>Coming soon</small>
                    </span>
                    <input checked={false} disabled type="checkbox" />
                  </label>
                </div>
                <p className="settings-note">
                  Tap Quick exit or press Escape twice to leave fast. On a shared
                  device, use a private browsing window so this site stays out of
                  your history.
                </p>
                <button className="sign-out-button" onClick={onSignOut} type="button">
                  Sign out
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {!activeConversation && (
        <nav className="community-nav" aria-label="Main navigation">
          {[
            ['circle', 'Circle'],
            ['support', 'Support'],
            ['messages', 'Messages'],
            ['me', 'Me'],
          ].map(([id, label]) => (
            <button
              aria-current={tab === id ? 'page' : undefined}
              className={`nav-tab${tab === id ? ' is-active' : ''}`}
              key={id}
              onClick={() => setTab(id)}
              type="button"
            >
              <UiIcon name={id} size={26} />
              <span>{label}</span>
              {id === 'messages' && acceptingRequests && requests.length > 0 && (
                <i className="nav-unread" aria-label={`${requests.length} message requests`} />
              )}
            </button>
          ))}
        </nav>
      )}

      {shareOpen && (
        <Modal className="share-modal" labelledBy="share-title" onClose={() => setShareOpen(false)}>
          <div className="modal-heading">
            <h2 id="share-title">
              {shareNeedsSupport ? 'Ask the circle for support' : 'Share with the circle'}
            </h2>
            <button
              aria-label="Close"
              className="icon-button"
              onClick={() => setShareOpen(false)}
              type="button"
            >
              <UiIcon name="close" />
            </button>
          </div>
          <form onSubmit={publishPost}>
            <label className="visually-hidden" htmlFor="share-draft">
              Write your post
            </label>
            <textarea
              autoFocus
              id="share-draft"
              onChange={(event) => updateShareText(event.target.value)}
              placeholder="What would you like to share?"
              rows={5}
              value={shareText}
            />
            {supportAutoDetected && shareNeedsSupport && (
              <p className="support-detected" role="status">
                It sounds like you&apos;re carrying something heavy. We&apos;ve
                moved this to Needs Support so the circle and our team can be
                with you. You can switch it back below.
              </p>
            )}
            {needsSupportSignal(shareText) && (
              <Helplines
                className="crisis-note--inline"
                intro="You don't have to wait for a reply. Someone can talk with you right now:"
              />
            )}
            <p>
              {shareNeedsSupport
                ? 'Your post will appear in Needs Support, where circle members and the Naa Samasthanam team can respond.'
                : 'Your identity stays private. Share only what feels safe.'}
            </p>
            <label className="support-request-toggle">
              <input
                checked={shareNeedsSupport}
                onChange={(event) => {
                  setShareNeedsSupport(event.target.checked);
                  setSupportChoiceMade(true);
                }}
                type="checkbox"
              />
              <span>
                <strong>I need support</strong>
                <small>Show this in the Needs Support section</small>
              </span>
            </label>
            <button className="primary-button" disabled={!shareText.trim()} type="submit">
              {shareNeedsSupport ? 'Share with Needs Support' : 'Share'}
            </button>
          </form>
        </Modal>
      )}

      {replyPost && (
        <Modal className="share-modal reply-modal" labelledBy="reply-title" onClose={() => setReplyPost(null)}>
          <div className="modal-heading">
            <h2 id="reply-title">
              Comments{threadComments.length ? ` · ${threadComments.length}` : ''}
            </h2>
            <button
              aria-label="Close"
              className="icon-button"
              onClick={() => setReplyPost(null)}
              type="button"
            >
              <UiIcon name="close" />
            </button>
          </div>
          <p className="reply-context">
            <strong>{threadPost.author}</strong> {threadPost.text}
          </p>
          <div className="comment-thread" aria-label="All comments">
            {threadComments.length ? (
              threadComments.map((response) => renderComment(response, threadPost))
            ) : (
              <p className="empty-note">No comments yet. Be the first to respond with care.</p>
            )}
          </div>
          <form onSubmit={publishReply}>
            <label className="reply-label" htmlFor="reply-draft">
              Respond with care
            </label>
            <textarea
              autoFocus
              id="reply-draft"
              aria-describedby="reply-moderation"
              onChange={(event) => {
                setReplyText(event.target.value);
                setReplyBlocked(false);
              }}
              placeholder="I hear you..."
              rows={3}
              value={replyText}
            />
            <div id="reply-moderation" role="status">
              {replyBlocked ? (
                <p className="moderation-note is-blocked">
                  <strong>Not posted.</strong> Curse words aren&apos;t allowed in this
                  circle. Remove {replyCurseWords.map(maskWord).join(', ')} and try
                  again.{' '}
                  {strikesLeft === 1
                    ? 'One more blocked comment and your account will be suspended.'
                    : `${strikesLeft} more blocked comments and your account will be suspended.`}
                </p>
              ) : (
                replyCurseWords.length > 0 && (
                  <p className="moderation-note">
                    {replyCurseWords.map(maskWord).join(', ')}{' '}
                    {replyCurseWords.length === 1 ? 'isn’t' : 'aren’t'} allowed here.
                    Comments with curse words won&apos;t be posted.
                  </p>
                )
              )}
            </div>
            {isTeam && (
              <label className="support-request-toggle team-reply-toggle">
                <input
                  checked={replyAsTeam}
                  onChange={(event) => setReplyAsTeam(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Reply as {TEAM_NAME}</strong>
                  <small>Shown with a Team badge so she knows it&apos;s us</small>
                </span>
              </label>
            )}
            <button className="primary-button" disabled={!replyText.trim()} type="submit">
              Send reply
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
