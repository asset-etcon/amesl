import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { commentPageWindow, type PostCommentPage } from "@/lib/comments";
import { CommentForm } from "@/components/public/comment-form";

interface Props {
  postId: string;
  page: PostCommentPage;
  nameMax: number;
  bodyMax: number;
  /**
   * Page number goes in the query string as `cpage` rather than `page`, so it
   * cannot collide with the `/products` pagination this pattern was copied from.
   * The article itself is read by path, so there is nothing else to preserve.
   */
  hrefFor: (page: number) => string;
}

/**
 * The comment thread at the foot of a news article.
 *
 * Rendered only when the post has `allow_comments` set, so a closed article has
 * no heading, no form and no empty state at all.
 */
export function CommentSection({ postId, page, nameMax, bodyMax, hrefFor }: Props) {
  const { comments, total, page: current, pageCount } = page;

  return (
    <section className="cm-section" aria-labelledby="cm-heading">
      <div className="cm-head">
        <p className="eyebrow">
          <span />
          Discussion
        </p>
        <h2 id="cm-heading">
          {total === 1 ? "1 comment" : `${total} comments`}
        </h2>
        <p className="cm-note">
          Comments are published immediately and are not affiliated with or endorsed by Asset Matrix Energy. Please do not
          include personal or confidential information.
        </p>
      </div>

      {comments.length === 0 ? (
        <p className="cm-empty">No comments yet. Be the first to add one below.</p>
      ) : (
        <ol className="cm-list">
          {comments.map((comment) => (
            <li key={comment.id} className="cm-item">
              <div className="cm-meta">
                <span className="cm-author">{comment.author_name}</span>
                <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
              </div>
              {/* Plain text, never HTML: this is the whole reason comments are not
                  rendered through dangerouslySetInnerHTML. */}
              <p className="cm-body">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}

      {pageCount > 1 && (
        <nav className="pagination" aria-label="Comment pages">
          {commentPageWindow(current, pageCount).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="page-gap">…</span>
            ) : (
              <Link
                key={n}
                href={hrefFor(n)}
                aria-current={n === current ? "page" : undefined}
                className={cn("page-link", n === current && "is-active")}
                scroll={false}
              >
                {n}
              </Link>
            ),
          )}
        </nav>
      )}

      <div className="cm-compose">
        <h3>{total === 0 ? "Leave a comment" : "Join the discussion"}</h3>
        <CommentForm postId={postId} nameMax={nameMax} bodyMax={bodyMax} />
      </div>
    </section>
  );
}
