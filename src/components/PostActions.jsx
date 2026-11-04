import { UiIcon } from './icons.jsx';

export default function PostActions({ post, supported, onSupport, onReplies, onFlag, onMessage, supportMode = false }) {
  return (
    <div className="post-actions">
      <button
        aria-pressed={supported}
        className={`post-action${supported ? ' is-supported' : ''}`}
        onClick={onSupport}
        type="button"
      >
        <UiIcon name="support" size={21} />
        <span>{post.support} {supportMode ? 'here for you' : 'support'}</span>
      </button>
      <button
        aria-label={`Comments (${post.responses?.length || 0})`}
        className="post-action"
        onClick={onReplies}
        type="button"
      >
        <UiIcon name="reply" size={20} />
        <span>
          {post.responses?.length || 0} {supportMode ? 'replies' : ''}
        </span>
      </button>
      {onMessage && (
        <button className="post-action" onClick={onMessage} type="button">
          <UiIcon name="messages" size={20} />
          <span>Message</span>
        </button>
      )}
      {onFlag && (
        <button
          className={`post-action post-action--flag${post.flagged ? ' is-flagged' : ''}`}
          disabled={post.flagged}
          onClick={onFlag}
          type="button"
        >
          <UiIcon name="flag" size={19} />
          <span>{post.flagged ? 'Flagged privately' : 'Flag for support'}</span>
        </button>
      )}
    </div>
  );
}
