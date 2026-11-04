import { useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import Helplines from '../components/Helplines.jsx';
import Modal from '../components/Modal.jsx';
import MyPosts from '../components/MyPosts.jsx';
import PostActions from '../components/PostActions.jsx';
import { CircleMark, UiIcon } from '../components/icons.jsx';
import { MAX_STRIKES, needsSupportSignal, reasonTopics } from '../data/content.js';
import { useCircleData } from '../hooks/useCircleData.js';
import { findCurseWords, maskWord } from '../lib/moderation.js';
import ReportScreen from './ReportScreen.jsx';

export default function CommunityApp({
  userId,
  alias,
  deviceLockOn,
  reasons,
  savedAffirmations,
  strikes,
  messagePrivacy,
  suggestSupport,
  onUpdateProfile,
  onBlockedComment,
  onSignOut,
}) {
  const circle = useCircleData(userId);
  const { posts, supported, conversations } = circle;
  const [tab, setTab] = useState('circle');
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareNeedsSupport, setShareNeedsSupport] = useState(false);
  const [supportAutoDetected, setSupportAutoDetected] = useState(false);
  const [supportChoiceMade, setSupportChoiceMade] = useState(false);
  const [replyPost, setReplyPost] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBlocked, setReplyBlocked] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messagePost, setMessagePost] = useState(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const acceptingRequests = messagePrivacy !== 'No one';
  const requests = conversations
    .filter((item) => item.incoming && item.status === 'pending')
    .map((item) => ({
      ...item,
      preview: item.messages[0]?.text ?? '',
    }));
  // A request that was declined simply disappears; she is never told.
  const openConversations = conversations.filter(
    (item) => item.status === 'accepted' || (item.status === 'pending' && !item.incoming),
  );
  const activeConversation = openConversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const circlePosts = posts.filter((post) => post.feed === 'circle');
  const supportPosts = posts.filter((post) => post.feed === 'support');

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

  const myPosts = posts.filter((post) => post.author === alias);

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

  const publishPost = async (event) => {
    event.preventDefault();
    const body = shareText.trim();
    if (!body) return;
    const toSupport = shareNeedsSupport;
    const published = await circle.createPost({
      feed: toSupport ? 'support' : 'circle',
      topic: toSupport ? '' : 'Healing',
      body,
    });
    if (!published) return;
    resetShare();
    setShareOpen(false);
    setTab(toSupport ? 'support' : 'circle');
  };

  const publishReply = async (event) => {
    event.preventDefault();
    if (!replyText.trim() || !replyPost) return;
    // Comments with curse words are never posted. Each blocked try is a strike;
    // the last one suspends the account (App swaps to the suspended screen).
    if (findCurseWords(replyText).length) {
      setReplyBlocked(true);
      onBlockedComment();
      return;
    }
    if (await circle.addComment(replyPost.post.id, replyText.trim())) setReplyText('');
  };

  const sendFirstMessage = async (event) => {
    event.preventDefault();
    const text = firstMessage.trim();
    if (!text || !messagePost) return;
    if (await circle.startConversation(messagePost.id, text)) {
      setFirstMessage('');
      setMessagePost(null);
      setTab('messages');
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !activeConversation) return;
    if (await circle.sendMessage(activeConversation.id, text)) setMessageText('');
  };

  const openConversation = (id) => {
    setActiveConversationId(id);
    circle.markRead(id);
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
          aria-label={`Report ${response.author}'s comment to the team`}
          className="report-button"
          onClick={() => {
            setReplyPost(null);
            setReportTarget({ comment: response, post });
          }}
          type="button"
        >
          <UiIcon name="flag" size={16} />
          Report to the team
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
    const isSupported = supported.has(post.id);
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
          onFlag={supportMode ? undefined : () => circle.flagPost(post.id)}
          onMessage={post.author === alias ? undefined : () => setMessagePost(post)}
          onReplies={() => openComments(post, supportMode)}
          onSupport={() => circle.toggleSupport(post.id)}
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
      />
    );
  }

  const threadPost = replyPost
    ? posts.find((post) => post.id === replyPost.post.id) || replyPost.post
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
        {circle.error && (
          <p className="circle-error" role="alert">
            {circle.error}
          </p>
        )}
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
            {activeConversation.status === 'pending' ? (
              <p className="empty-note">
                Your message is waiting for {activeConversation.author} to accept it.
              </p>
            ) : (
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
            )}
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
                {!circle.loaded && <p className="empty-note">Opening the circle…</p>}
                {circle.loaded && visibleCirclePosts.length === 0 && (
                  <p className="empty-note">
                    {feedFilter === 'for-you'
                      ? 'Nothing here yet. Try All posts, or share something.'
                      : 'No posts yet. You could be the first to share.'}
                  </p>
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
                            onClick={() => circle.respondToRequest(request.id, true)}
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="request-decline"
                            onClick={() => circle.respondToRequest(request.id, false)}
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
                {openConversations.length > 0 ? (
                  <div className="conversation-list">
                    {openConversations.map((conversation) => (
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
                  onArchive={(post, archived) => circle.updatePost(post.id, { archived })}
                  onDelete={(post) => circle.deletePost(post.id)}
                  onEdit={(post, text) => circle.updatePost(post.id, { body: text })}
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
                      onChange={(event) => onUpdateProfile({ message_privacy: event.target.value })}
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
                      onChange={(event) => onUpdateProfile({ suggest_support: event.target.checked })}
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
                {confirmingSignOut ? (
                  <div className="my-post__confirm" role="alert">
                    <p>
                      There&apos;s no email or password behind your alias, so signing
                      out means you can&apos;t come back as {alias}. Your posts stay in
                      the circle.
                    </p>
                    <div className="my-post__actions">
                      <button className="is-danger is-solid" onClick={onSignOut} type="button">
                        Yes, sign out
                      </button>
                      <button onClick={() => setConfirmingSignOut(false)} type="button">
                        Stay
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="sign-out-button"
                    onClick={() => setConfirmingSignOut(true)}
                    type="button"
                  >
                    Sign out
                  </button>
                )}
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
            {circle.error && (
              <p className="circle-error" role="alert">
                {circle.error}
              </p>
            )}
            <button className="primary-button" disabled={!shareText.trim()} type="submit">
              {shareNeedsSupport ? 'Share with Needs Support' : 'Share'}
            </button>
          </form>
        </Modal>
      )}

      {messagePost && (
        <Modal
          className="share-modal"
          labelledBy="message-title"
          onClose={() => setMessagePost(null)}
        >
          <div className="modal-heading">
            <h2 id="message-title">Message {messagePost.author}</h2>
            <button
              aria-label="Close"
              className="icon-button"
              onClick={() => setMessagePost(null)}
              type="button"
            >
              <UiIcon name="close" />
            </button>
          </div>
          <form onSubmit={sendFirstMessage}>
            <label className="visually-hidden" htmlFor="first-message">
              Your message
            </label>
            <textarea
              autoFocus
              id="first-message"
              onChange={(event) => setFirstMessage(event.target.value)}
              placeholder="Say why you're reaching out..."
              rows={4}
              value={firstMessage}
            />
            <p>She can accept or decline. If she declines, you won&apos;t be able to ask again.</p>
            {circle.error && (
              <p className="circle-error" role="alert">
                {circle.error}
              </p>
            )}
            <button className="primary-button" disabled={!firstMessage.trim()} type="submit">
              Send request
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
            <button className="primary-button" disabled={!replyText.trim()} type="submit">
              Send reply
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
