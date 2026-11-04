import { useState } from 'react';

const feedLabel = { circle: 'The Circle', support: 'Needs Support' };

function MyPost({ post, onEdit, onArchive, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const draftId = `edit-${post.feed}-${post.id}`;

  const save = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onEdit(draft.trim());
    setEditing(false);
  };

  return (
    <article className={`my-post${post.archived ? ' is-archived' : ''}`}>
      <p className="my-post__meta">
        {feedLabel[post.feed]} · {post.time}
        {post.edited ? ' · edited' : ''}
        {post.archived ? ' · archived' : ''}
      </p>

      {editing ? (
        <form className="my-post__edit" onSubmit={save}>
          <label className="visually-hidden" htmlFor={draftId}>
            Edit your post
          </label>
          <textarea
            autoFocus
            id={draftId}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            value={draft}
          />
          <div className="my-post__actions">
            <button className="is-primary" disabled={!draft.trim()} type="submit">
              Save
            </button>
            <button
              onClick={() => {
                setDraft(post.text);
                setEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="my-post__text">{post.text}</p>
      )}

      {!editing && !confirmingDelete && (
        <div className="my-post__actions">
          <button onClick={() => setEditing(true)} type="button">
            Edit
          </button>
          <button onClick={() => onArchive(!post.archived)} type="button">
            {post.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button className="is-danger" onClick={() => setConfirmingDelete(true)} type="button">
            Delete
          </button>
        </div>
      )}

      {confirmingDelete && (
        <div className="my-post__confirm" role="alert">
          <p>Delete this post for good? Its replies go with it.</p>
          <div className="my-post__actions">
            <button className="is-danger is-solid" onClick={onDelete} type="button">
              Yes, delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} type="button">
              Keep it
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// The member's own posts from both feeds, with edit, archive and delete.
// Archived posts are hidden from everyone else but stay here.
export default function MyPosts({ posts, onEdit, onArchive, onDelete }) {
  const active = posts.filter((post) => !post.archived);
  const archived = posts.filter((post) => post.archived);
  const renderPost = (post) => (
    <MyPost
      key={`${post.feed}-${post.id}`}
      onArchive={(value) => onArchive(post, value)}
      onDelete={() => onDelete(post)}
      onEdit={(text) => onEdit(post, text)}
      post={post}
    />
  );

  return (
    <section className="my-posts" aria-labelledby="my-posts-title">
      <h3 className="section-label profile-label" id="my-posts-title">
        My posts — {active.length}
      </h3>
      {active.length ? (
        active.map(renderPost)
      ) : (
        <p className="empty-note">Posts you share will show up here.</p>
      )}
      {archived.length > 0 && (
        <>
          <h4 className="my-posts__archived-label">
            Archived — only you can see these
          </h4>
          {archived.map(renderPost)}
        </>
      )}
    </section>
  );
}
