import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MarkdownContent } from "./lib/MarkdownContent";
import { ReviewVerdict } from "./Publication";
import {
  ArrowLeft,
  Plus,
  Eye,
  Pencil,
  Upload,
  ExternalLink,
  Star,
  Image as ImageIcon,
  Video,
  Share2,
} from "lucide-react";
import { database } from "./lib/supabase";
import {
  categories,
  formatDate,
  placeholder,
  publicationState,
  safeImage,
  slugify,
  validatePost,
  youtubeId,
} from "./lib/content";
import type { Post, PostInput } from "./lib/content";
import {
  backupKey,
  decodeBackup,
  insertText,
  markdownImage,
  postInput,
  localDateTime,
} from "./lib/editor";
import { articlePath } from "./lib/routes";
import {
  HomepageSettings,
  MediaLibrary,
  RevisionHistory,
} from "./EditorialTools";

function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (score: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value ?? 0;
  return (
    <div className="stars-row" role="group" aria-label="Review score out of 10">
      {Array.from({ length: 10 }, (_, i) => {
        const starVal = i + 1;
        const active = starVal <= Math.round(current);
        return (
          <button
            key={starVal}
            type="button"
            className="star-pick-btn"
            onMouseEnter={() => setHover(starVal)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(starVal)}
            title={`${starVal} / 10`}
            aria-label={`${starVal} out of 10`}
            aria-pressed={value === starVal}
          >
            <Star
              size={20}
              fill={active ? "#f59e0b" : "none"}
              color={active ? "#f59e0b" : "#94a3b8"}
              strokeWidth={1.75}
            />
          </button>
        );
      })}
    </div>
  );
}

type Stat = { post_id: string; total_views: number; recent_views: number };
function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "23505"
  )
    return "That article URL is already in use. Choose a different one.";
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "PGRST116"
  )
    return "This post changed in another tab. Download your draft, then close and reopen the post to load the latest version.";
  return error instanceof Error
    ? error.message
    : "The change could not be saved. Check your connection and owner access.";
}
export function Studio({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]),
    [stats, setStats] = useState<Stat[] | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const activeKey = `astrobit:${userId}:active-edit`;
  const [restoreId] = useState(() => {
    try {
      return (
        sessionStorage.getItem(activeKey) ||
        sessionStorage.getItem("astrobit_active_edit")
      );
    } catch {
      return null;
    }
  });
  const pendingRestore = useRef(restoreId);
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("updated");
  const [postsLoaded, setPostsLoaded] = useState(false);
  function setEditingTarget(target: Post | "new" | null) {
    setEditing(target);
    try {
      if (target)
        sessionStorage.setItem(activeKey, target === "new" ? "new" : target.id);
      else sessionStorage.removeItem(activeKey);
      sessionStorage.removeItem("astrobit_active_edit");
      sessionStorage.removeItem("astrobit_active_post");
    } catch {
      /* Editing still works when session storage is unavailable. */
    }
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      const all: Post[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error: loadError } = await database()
          .from("posts")
          .select("*")
          .order("updated_at", { ascending: false })
          .order("id")
          .range(offset, offset + 999);
        if (loadError) throw loadError;
        all.push(...(data as Post[]));
        if (data.length < 1000) break;
      }
      setPosts(all);
      setPostsLoaded(true);
      if (pendingRestore.current) {
        const id = pendingRestore.current;
        pendingRestore.current = null;
        setEditing(
          id === "new" ? "new" : all.find((post) => post.id === id) || null,
        );
      }
      const { data, error: statsError } = await database().rpc("post_stats");
      if (statsError) {
        setStats(null);
        setError("Posts loaded, but statistics are unavailable.");
      } else setStats(data as Stat[]);
    } catch {
      setError(
        "The dashboard couldn’t load. Check the database setup and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  // Load and synchronize the remote dashboard when it mounts.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize the remote dashboard on mount.
    void load();
  }, []);
  if (editing)
    return (
      <Editor
        key={typeof editing === "string" ? "new" : editing.id}
        userId={userId}
        post={editing === "new" ? undefined : editing}
        onClose={() => {
          setEditingTarget(null);
          void load();
        }}
        onSaved={(saved) => {
          setEditingTarget(null);
          setMessage(
            publicationState(saved) === "scheduled"
              ? `Post scheduled for ${new Date(saved.published_at!).toLocaleString()}.`
              : saved.status === "published"
                ? "Post published. Search and share pages will sync automatically."
                : "Draft saved. Only you can see it.",
          );
          void load();
        }}
      />
    );
  const visible = posts
    .filter(
      (post) =>
        (filter === "all" || publicationState(post) === filter) &&
        `${post.title} ${post.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "reads"
          ? Number(stats?.find((s) => s.post_id === b.id)?.total_views || 0) -
            Number(stats?.find((s) => s.post_id === a.id)?.total_views || 0)
          : b.updated_at.localeCompare(a.updated_at),
    );
  return (
    <section>
      <div className="studio-heading">
        <div>
          <p className="eyebrow">ASTROBITPLAYS</p>
          <h1>Dashboard</h1>
        </div>
        <button
          className="button"
          onClick={() => {
            setMessage("");
            setEditingTarget("new");
          }}
        >
          <Plus size={18} /> New post
        </button>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button className="text-link" onClick={load}>
            Retry
          </button>
        </p>
      )}
      <div className="stats-grid">
        <div>
          <span>Published posts</span>
          <strong>
            {loading || !postsLoaded
              ? "—"
              : posts.filter((p) => publicationState(p) === "published").length}
          </strong>
        </div>
        <div>
          <span>Drafts</span>
          <strong>
            {loading || !postsLoaded
              ? "—"
              : posts.filter((p) => p.status === "draft").length}
          </strong>
        </div>
        <div>
          <span>Article reads</span>
          <strong>
            {loading || !stats
              ? "—"
              : stats.reduce((sum, item) => sum + Number(item.total_views), 0)}
          </strong>
        </div>
        <div>
          <span>Reads · last 30 days</span>
          <strong>
            {loading || !stats
              ? "—"
              : stats.reduce((sum, item) => sum + Number(item.recent_views), 0)}
          </strong>
        </div>
      </div>
      <p className="stats-note">
        Reads count each browser session once per article per day. Your own
        reads are excluded. These counts are estimates, not unique people.
      </p>
      <div className="posts-toolbar">
        <h2>Your posts</h2>
        <div className="post-filters">
          <label>
            <span className="sr-only">Search your posts</span>
            <input
              type="search"
              placeholder="Search your posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Sort posts</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="updated">Recently updated</option>
              <option value="title">Title A–Z</option>
              <option value="reads">Most read</option>
            </select>
          </label>
          <label>
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All posts</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <p role="status">Loading posts…</p>
      ) : visible.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Reads</th>
                <th>Updated</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.category}</td>
                  <td>
                    <span className={`post-status ${publicationState(post)}`}>
                      {publicationState(post)}
                    </span>
                  </td>
                  <td>
                    {stats
                      ? Number(
                          stats.find((item) => item.post_id === post.id)
                            ?.total_views || 0,
                        )
                      : "—"}
                  </td>
                  <td>{formatDate(post.updated_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="text-link"
                        onClick={() => {
                          setMessage("");
                          setEditingTarget(post);
                        }}
                      >
                        <Pencil size={15} /> Edit
                        <span className="sr-only"> {post.title}</span>
                      </button>
                      {publicationState(post) === "published" && (
                        <a
                          className="text-link"
                          href={articlePath(post)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} /> View
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-empty">
          <h3>
            {search
              ? "No matching posts"
              : filter === "all"
                ? "Your first post starts here"
                : `No ${filter} posts`}
          </h3>
          <p>
            {search
              ? "Try another title or category."
              : filter === "all"
                ? "Write a story, save it as a draft, and publish when it’s ready."
                : "Posts with this status will appear here."}
          </p>
        </div>
      )}
      <HomepageSettings />
    </section>
  );
}
function Editor({
  userId,
  post,
  onClose,
  onSaved,
}: {
  userId: string;
  post?: Post;
  onClose: () => void;
  onSaved: (post: Post) => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [libraryTarget, setLibraryTarget] = useState<"cover" | "body" | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = backupKey(userId, post?.id);
  const [recovered] = useState(() => {
    try {
      const current = decodeBackup(sessionStorage.getItem(storageKey));
      if (current) return current;
      // Preserve drafts from the previous editor version.
      const legacy = sessionStorage.getItem(
        post ? `astrobit_draft_${post.id}` : "astrobit_draft_new",
      );
      if (!legacy) return null;
      return decodeBackup(
        JSON.stringify({
          version: 1,
          form: JSON.parse(legacy),
          baseUpdatedAt: post?.updated_at || null,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState<PostInput>(
    recovered?.form || postInput(post),
  );
  const baseUpdatedAt = recovered
    ? recovered.baseUpdatedAt
    : post?.updated_at || null;
  const [dirty, setDirty] = useState(!!recovered),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [inlineUploading, setInlineUploading] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState("");
  const [backupStatus, setBackupStatus] = useState(
    recovered
      ? "Recovered unsaved changes from this tab."
      : "No unsaved changes.",
  );
  useEffect(() => {
    if (!dirty) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          form,
          baseUpdatedAt,
          savedAt: new Date().toISOString(),
        }),
      );
      // This state reports the outcome of writing to browser storage.
      // oxlint-disable-next-line react/set-state-in-effect
      setBackupStatus(
        "Unsaved changes backed up in this tab. Save to sync them to your account.",
      );
    } catch {
      setBackupStatus(
        "Browser backup unavailable. Save your draft before leaving.",
      );
    }
  }, [form, dirty, storageKey, baseUpdatedAt]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!busy && !uploading && !inlineUploading && !preview)
          formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [busy, uploading, inlineUploading, preview]);
  function removeBackup() {
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(
        post ? `astrobit_draft_${post.id}` : "astrobit_draft_new",
      );
    } catch {
      /* A failed storage operation must not fail a database save. */
    }
  }
  function downloadDraft() {
    const url = URL.createObjectURL(
      new Blob([`# ${form.title}\n\n${form.excerpt}\n\n${form.body}`], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.slug || "draft"}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function change<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function uploadInlineImage(file: File | undefined) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image up to 5 MB.");
      return;
    }
    setInlineUploading(true);
    setError("");
    try {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `inline/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await database()
        .storage.from("covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const url = database().storage.from("covers").getPublicUrl(path)
        .data.publicUrl;
      insertFormat(
        markdownImage(file.name.replace(/\.[^/.]+$/, ""), url),
        "",
        "",
      );
    } catch {
      setError("Inline image couldn’t be uploaded. Check storage permissions.");
    } finally {
      setInlineUploading(false);
    }
  }
  function insertFormat(prefix: string, suffix = "", fallback = "text") {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    const next = insertText(el.value, start, end, prefix, suffix, fallback);
    change("body", next.text);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    }, 0);
  }
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (busy || uploading || inlineUploading) return;
    const payload = {
      ...form,
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      score: form.category === "Reviews" ? form.score : null,
      published_at:
        form.status === "published"
          ? form.published_at || new Date().toISOString()
          : null,
    };
    const issue = validatePost(payload);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      const result = post
        ? await database()
            .from("posts")
            .update(payload)
            .eq("id", post.id)
            .eq("updated_at", baseUpdatedAt!)
            .select("*")
            .single()
        : await database().from("posts").insert(payload).select("*").single();
      if (result.error) throw result.error;
      try {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem("astrobit_active_edit");
        sessionStorage.removeItem("astrobit_active_post");
      } catch {}
      removeBackup();
      setDirty(false);
      onSaved(result.data as Post);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image up to 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await database()
        .storage.from("covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      change(
        "cover_url",
        database().storage.from("covers").getPublicUrl(path).data.publicUrl,
      );
    } catch {
      setError(
        "The image couldn’t be uploaded. Check your connection and storage permissions.",
      );
    } finally {
      setUploading(false);
    }
  }
  function close() {
    if (!dirty || window.confirm("Discard unsaved changes?")) {
      try {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem("astrobit_active_edit");
        sessionStorage.removeItem("astrobit_active_post");
      } catch {}
      removeBackup();
      onClose();
    }
  }
  return (
    <section>
      <div className="editor-heading">
        <button
          className="back-link"
          onClick={close}
          disabled={busy || uploading || inlineUploading}
        >
          <ArrowLeft size={16} /> All posts
        </button>
        <button
          className="button secondary"
          disabled={busy || uploading || inlineUploading}
          onClick={() => setPreview(!preview)}
        >
          <Eye size={17} /> {preview ? "Back to editor" : "Preview"}
        </button>
      </div>
      <h1>{post ? "Edit post" : "New post"}</h1>
      <div className="draft-status">
        <p role="status">{backupStatus}</p>
        <button type="button" className="text-link" onClick={downloadDraft}>
          Download draft
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {libraryTarget && (
        <MediaLibrary
          onClose={() => setLibraryTarget(null)}
          onSelect={(url, name) => {
            if (libraryTarget === "cover") change("cover_url", url);
            else
              insertFormat(
                markdownImage(
                  name
                    .split("/")
                    .pop()!
                    .replace(/\.[^/.]+$/, ""),
                  url,
                ),
                "",
                "",
              );
            setLibraryTarget(null);
          }}
        />
      )}
      {preview ? (
        <div className="editor-preview">
          <p className="eyebrow">UNPUBLISHED PREVIEW</p>
          <h1>{form.title || "Untitled post"}</h1>
          <p className="article-deck">{form.excerpt}</p>
          <img
            className="cover"
            src={form.cover_url ? safeImage(form.cover_url) : placeholder}
            alt="Cover preview"
          />
          <div className="article-body">
            <MarkdownContent content={form.body} />
          </div>
          <ReviewVerdict post={form} />
          {youtubeId(form.youtube_url) && (
            <iframe
              className="video"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId(form.youtube_url)}`}
              title="Video preview"
              allowFullScreen
            />
          )}
        </div>
      ) : (
        <form ref={formRef} className="editor-form" onSubmit={save}>
          <fieldset disabled={busy} className="writing-area">
            <label>
              Title
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setDirty(true);
                  setForm((current) => ({
                    ...current,
                    title,
                    slug:
                      !post &&
                      (!current.slug || current.slug === slugify(current.title))
                        ? slugify(title)
                        : current.slug,
                  }));
                }}
              />
            </label>
            <label>
              Article URL
              <input
                required
                maxLength={200}
                value={form.slug}
                onChange={(e) => change("slug", e.target.value)}
              />
              <small>
                astrobitplays.me/{form.category.toLowerCase()}/
                {form.slug || "your-article-title"}/
              </small>
            </label>
            <label>
              Summary
              <textarea
                rows={3}
                maxLength={400}
                value={form.excerpt}
                onChange={(e) => change("excerpt", e.target.value)}
              />
            </label>
            <div className="article-field">
              <label htmlFor="article-body">Article</label>
              <div
                className="editor-toolbar"
                role="toolbar"
                aria-label="Markdown formatting"
              >
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("**", "**")}
                  title="Bold"
                >
                  <b>B</b>
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("*", "*")}
                  title="Italic"
                >
                  <i>I</i>
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("## ", "")}
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("### ", "")}
                  title="Heading 3"
                >
                  H3
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("> ", "")}
                  title="Quote"
                >
                  Quote
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("- ", "")}
                  title="Bullet list"
                >
                  List
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => insertFormat("[", "](https://)")}
                  title="Link"
                >
                  Link
                </button>
                <label
                  className="toolbar-btn upload-btn"
                  title="Upload and insert image inline"
                  style={{ cursor: "pointer" }}
                >
                  <ImageIcon size={14} />{" "}
                  {inlineUploading ? "Uploading…" : "Image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={inlineUploading || busy}
                    className="sr-only"
                    onChange={(e) => {
                      void uploadInlineImage(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => setLibraryTarget("body")}
                >
                  Library
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() =>
                    insertFormat("\n\n", "\n\n", "Paste a YouTube URL here")
                  }
                  title="Embed YouTube Video"
                >
                  <Video size={14} /> YouTube
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() =>
                    insertFormat("\n\n", "\n\n", "Paste an X post URL here")
                  }
                  title="Embed X / Tweet"
                >
                  <Share2 size={14} /> X / Tweet
                </button>
              </div>
              <textarea
                id="article-body"
                ref={bodyRef}
                className="body-editor"
                required
                maxLength={200000}
                value={form.body}
                onChange={(e) => change("body", e.target.value)}
              />
              <small>
                Markdown supported: ## headings, **bold**, *italic*, links and
                lists. Use Preview to check formatting.
              </small>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="publishing-options">
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  change("category", e.target.value as PostInput["category"])
                }
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={publicationState(form)}
                onChange={(e) => {
                  const status = e.target.value;
                  setDirty(true);
                  setForm((current) => ({
                    ...current,
                    status: status === "draft" ? "draft" : "published",
                    published_at:
                      status === "scheduled"
                        ? new Date(Date.now() + 3600000).toISOString()
                        : status === "draft"
                          ? null
                          : current.published_at &&
                              Date.parse(current.published_at) <= Date.now()
                            ? current.published_at
                            : null,
                  }));
                }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </label>
            {form.status === "published" && (
              <label>
                Publication time
                <input
                  type="datetime-local"
                  value={localDateTime(form.published_at)}
                  onChange={(e) =>
                    change(
                      "published_at",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
                <small>
                  Your device time zone:{" "}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}. Leave
                  blank to publish now.
                </small>
              </label>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => change("featured", e.target.checked)}
              />{" "}
              Feature on homepage
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!form.pinned}
                onChange={(e) => change("pinned", e.target.checked)}
              />{" "}
              Pin as an editor's pick
            </label>
            <label>
              Feature position
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                value={form.feature_order || 0}
                onChange={(e) =>
                  change("feature_order", Number(e.target.value))
                }
              />
              <small>
                Lower numbers appear first within pinned or featured stories.
              </small>
            </label>
            <div className="cover-options">
              <span className="field-label">Cover image</span>
              <img
                className="cover"
                src={form.cover_url ? safeImage(form.cover_url) : placeholder}
                alt="Cover preview"
              />
              <label className="upload-label">
                <Upload size={16} /> {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading || busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() => setLibraryTarget("cover")}
              >
                Choose from library
              </button>
              <small>JPG, PNG or WebP · up to 5 MB</small>
              <label>
                Or use an image URL
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.cover_url}
                  onChange={(e) => change("cover_url", e.target.value)}
                />
              </label>
              {form.cover_url && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => change("cover_url", "")}
                >
                  Use galaxy placeholder
                </button>
              )}
            </div>
            {form.category === "Reviews" && (
              <div className="score-picker-container">
                <label>
                  Review score:{" "}
                  <strong>
                    {form.score !== null ? `${form.score} / 10` : "Not set"}
                  </strong>
                  <StarPicker
                    value={form.score}
                    onChange={(s) => change("score", s)}
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.score ?? ""}
                    onChange={(e) =>
                      change(
                        "score",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder="e.g. 9.2"
                  />
                  <small>Click stars (1–10) or type an exact decimal.</small>
                </label>
              </div>
            )}

            {form.category === "Reviews" && (
              <div className="review-fields">
                <h2>Review details</h2>
                <label>
                  Game
                  <input
                    maxLength={150}
                    value={form.review_details?.game || ""}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        game: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Platforms
                  <input
                    placeholder="PC, PlayStation 5, Xbox Series X|S"
                    maxLength={250}
                    value={(form.review_details?.platforms || []).join(", ")}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        platforms: e.target.value
                          .split(",")
                          .map((value) => value.trimStart()),
                      })
                    }
                  />
                </label>
                <label>
                  Release date
                  <input
                    type="date"
                    value={form.review_details?.release_date || ""}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        release_date: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Developer
                  <input
                    maxLength={150}
                    value={form.review_details?.developer || ""}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        developer: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Verdict
                  <textarea
                    rows={4}
                    maxLength={1200}
                    value={form.review_details?.verdict || ""}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        verdict: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Pros · one per line
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={(form.review_details?.pros || []).join("\n")}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        pros: e.target.value.split("\n"),
                      })
                    }
                  />
                </label>
                <label>
                  Cons · one per line
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={(form.review_details?.cons || []).join("\n")}
                    onChange={(e) =>
                      change("review_details", {
                        ...form.review_details,
                        cons: e.target.value.split("\n"),
                      })
                    }
                  />
                </label>
              </div>
            )}
            <label>
              YouTube URL
              <input
                type="url"
                value={form.youtube_url}
                onChange={(e) => change("youtube_url", e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </label>
            <button
              className="button"
              disabled={busy || uploading || inlineUploading}
            >
              {busy
                ? "Saving…"
                : publicationState(form) === "scheduled"
                  ? "Schedule post"
                  : form.status === "published"
                    ? post?.status === "published"
                      ? "Save changes"
                      : "Publish post"
                    : post?.status === "published"
                      ? "Unpublish and save draft"
                      : "Save draft"}
            </button>
            <small>
              {publicationState(form) === "scheduled"
                ? "Readers can see it when the publication time arrives. Search pages sync on the next automatic build."
                : form.status === "published"
                  ? "Saving makes this post visible to everyone."
                  : "Only you can see drafts."}
            </small>
          </fieldset>
        </form>
      )}
      {post && !busy && !uploading && !inlineUploading && (
        <RevisionHistory
          post={post}
          onRestored={(restored) => {
            removeBackup();
            setDirty(false);
            onSaved(restored);
          }}
        />
      )}
    </section>
  );
}
