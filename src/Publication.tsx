import { ArrowRight } from "lucide-react";
import { categoryPath, articlePath } from "./lib/routes";
import {
  defaultSettings,
  normalizeReview,
  featuredStories,
  formatDate,
  placeholder,
  safeImage,
} from "./lib/content";
import type { Post, SiteSettings } from "./lib/content";

export function StoryCover({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  return (
    <img
      className="cover"
      src={post.cover_url ? safeImage(post.cover_url) : placeholder}
      width={1600}
      height={900}
      alt=""
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") !== placeholder)
          event.currentTarget.src = placeholder;
      }}
    />
  );
}
export function StoryCard({
  post,
  compact = false,
}: {
  post: Post;
  compact?: boolean;
}) {
  return (
    <article className={`story-card ${compact ? "story-card-compact" : ""}`}>
      <a href={articlePath(post)} className="story-image" aria-label={post.title}>
        <StoryCover post={post} />
        {post.category === "Reviews" && post.score !== null && (
          <span className="score-label">
            {post.score}
            <small>/10</small>
          </span>
        )}
      </a>
      <div>
        <div className="story-kicker">
          <a href={categoryPath(post.category)}>{post.category}</a>
          <time dateTime={post.published_at || undefined}>
            {formatDate(post.published_at)}
          </time>
        </div>
        <h3>
          <a href={articlePath(post)}>{post.title}</a>
        </h3>
        {!compact && post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </article>
  );
}
export function HomePage({
  posts,
  settings = defaultSettings,
  loading,
  error,
}: {
  posts: Post[];
  settings?: SiteSettings;
  loading: boolean;
  error: string;
}) {
  const featured = featuredStories(posts, settings.featured_limit);
  return (
    <>
      <div className="edition-heading">
        <div>
          <p className="eyebrow">ASTROBITPLAYS</p>
          <h1>Gaming. In focus.</h1>
        </div>
        <p>Gaming news and reviews.</p>
      </div>
      <section className="featured-section" aria-labelledby="featured-heading">
        <div className="editorial-section-heading">
          <h2 id="featured-heading">Top stories</h2>
          <a href="/stories/">
            All stories <ArrowRight size={16} />
          </a>
        </div>
        {loading ? (
          <div className="front-loading" role="status">
            Loading the latest stories…
          </div>
        ) : error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : !featured.length ? (
          <div className="publication-empty">
            <img className="cover" src={placeholder} alt="Blue galaxy" />
            <h2>No stories published yet</h2>
            <p>Published stories will appear here.</p>
          </div>
        ) : (
          <div className={`featured-grid featured-count-${featured.length}`}>
            {featured.map((post, index) => (
              <article key={post.id} className="feature-story">
                <a className="feature-image" href={articlePath(post)} aria-label={post.title}>
                  <StoryCover post={post} priority={index < 2} />
                </a>
                <div className="feature-copy">
                  <div className="story-kicker">
                    <a href={categoryPath(post.category)}>{post.category}</a>
                    {post.pinned && (
                      <span className="editor-pick">Editor's pick</span>
                    )}
                  </div>
                  <h2>
                    <a href={articlePath(post)}>{post.title}</a>
                  </h2>
                  {(index === 0 || featured.length === 2) && (
                    <p>{post.excerpt}</p>
                  )}
                  <div className="story-byline">
                    By AstroBitPlays <span>·</span>{" "}
                    <time dateTime={post.published_at || undefined}>
                      {formatDate(post.published_at)}
                    </time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {!loading && !error && (
        <div className="edition-sections">
          {settings.section_order.map((category) => {
            const articles = posts
              .filter((post) => post.category === category)
              .slice(0, 6);
            if (!articles.length) return null;
            return (
              <section key={category} className="edition-section">
                <div className="editorial-section-heading">
                  <h2>
                    {category === "News"
                      ? "Latest news"
                      : category === "Reviews"
                        ? "Latest reviews"
                        : category}
                  </h2>
                  <a href={categoryPath(category)}>
                    All {category.toLowerCase()} <ArrowRight size={16} />
                  </a>
                </div>
                <div className="editorial-story-grid">
                  {articles.map((post) => (
                    <StoryCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export function ReviewVerdict({ post }: { post: Pick<Post, 'category' | 'score' | 'review_details'> }) {
  if (post.category !== "Reviews") return null;
  const details = normalizeReview(post.review_details);
  const pros = Array.isArray(details.pros)
    ? details.pros.filter((item) => typeof item === "string" && item.trim())
    : [];
  const cons = Array.isArray(details.cons)
    ? details.cons.filter((item) => typeof item === "string" && item.trim())
    : [];
  const platforms = Array.isArray(details.platforms)
    ? details.platforms.filter((item) => typeof item === "string").join(", ")
    : "";
  return (
    <section className="verdict-panel" aria-label="Review verdict">
      <div className="verdict-heading">
        <div>
          <p className="eyebrow">THE VERDICT</p>
          <h2>{details.game || "Our verdict"}</h2>
        </div>
        {post.score !== null && (
          <strong className="verdict-score">
            {post.score}
            <small>/10</small>
          </strong>
        )}
      </div>
      {details.verdict && <p className="verdict-summary">{details.verdict}</p>}
      {(platforms || details.developer || details.release_date) && (
        <dl className="game-facts">
          {platforms && (
            <div>
              <dt>Platforms</dt>
              <dd>{platforms}</dd>
            </div>
          )}
          {details.developer && (
            <div>
              <dt>Developer</dt>
              <dd>{details.developer}</dd>
            </div>
          )}
          {details.release_date && (
            <div>
              <dt>Release date</dt>
              <dd>{details.release_date}</dd>
            </div>
          )}
        </dl>
      )}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="verdict-lists">
          {pros.length > 0 && (
            <div>
              <h3>What works</h3>
              <ul>
                {pros.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <h3>What doesn't</h3>
              <ul>
                {cons.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
