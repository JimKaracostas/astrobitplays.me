import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Search,
  Bookmark,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Share2,
  Check,
  Star,
  House,
  Newspaper,
  BookOpen,
  UserRound,
  Trash2,
} from "lucide-react";
import { database, supabase, trackView } from "./lib/supabase";
import {
  categories,
  formatDate,
  readingTime,
  wasUpdated,
} from "./lib/content";
import type { Category, Post, SiteSettings } from "./lib/content";
import { defaultSettings, normalizeSettings } from "./lib/content";
import { articlePath, categoryPath, parseRoute } from "./lib/routes";
import { HomePage, ReviewVerdict } from "./Publication";
import { applyMetadata, articleUrl, pageMetadata } from "./lib/seo";
import { discoverStories } from "./lib/discovery";
import type { StorySort } from "./lib/discovery";
import type { ReadingTheme } from "./lib/reader";
import { CoverImage } from "./CoverImage";
import { VideoEmbed } from "./VideoEmbed";
import { CoverImagesContext } from "./lib/cover-images";
import type { CoverManifest } from "./lib/cover-images";
import { deviceBookmarksKey, readDeviceBookmarks, persistDeviceBookmarks, toggleBookmark, deviceImportIds } from "./lib/reading-list";
const LazyStudio = lazy(() =>
  import("./Studio").then((module) => ({ default: module.Studio })),
);
const noSavedArticles: string[] = [];
function cachedSearchRpcUnavailable() {
  try {
    return Number(window.sessionStorage.getItem("astrobit:search-rpc-unavailable")) > Date.now();
  } catch {
    return false;
  }
}
const LazyArticleReader = lazy(() =>
  import("./ArticleReader").then((module) => ({
    default: module.ArticleReader,
  })),
);
function ArticleReader({ content, articleId, theme, onThemeChange }: { content: string; articleId: string; theme: ReadingTheme; onThemeChange: (theme: ReadingTheme) => void }) {
  return (
    <Suspense fallback={<p role="status">Loading article text…</p>}>
      <LazyArticleReader content={content} articleId={articleId} theme={theme} onThemeChange={onThemeChange} />
    </Suspense>
  );
}
function Studio({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<p role="status">Loading dashboard…</p>}>
      <LazyStudio userId={userId} />
    </Suspense>
  );
}

export function StarRating({
  score,
  max = 10,
  size = 15,
}: {
  score: number;
  max?: number;
  size?: number;
}) {
  const rounded = Math.round(score);
  return (
    <div className="star-rating" aria-label={`${score} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rounded;
        return (
          <Star
            key={i}
            size={size}
            className={filled ? "star-filled" : "star-empty"}
            fill={filled ? "#f59e0b" : "none"}
            color={filled ? "#f59e0b" : "#94a3b8"}
            strokeWidth={1.75}
          />
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title">{children}</h2>;
}
function PostCard({ post, onRemove, removing }: { post: Post; onRemove?: () => void; removing?: boolean }) {
  return (
    <article className="post-card">
      <a href={articlePath(post)}>
        <CoverImage source={post.cover_url} sizes="(max-width: 680px) calc(100vw - 36px), (max-width: 1000px) 45vw, 400px" />
        <div className="post-meta">
          {post.category} <span>{formatDate(post.published_at)}</span>
        </div>
        <h3>{post.title}</h3>
      </a>
      <p>{post.excerpt}</p>
      {post.category === "Reviews" && post.score !== null && (
        <div className="card-score-row">
          <StarRating score={post.score} size={13} />
          <span className="score">
            {post.score}
            <small> / 10</small>
          </span>
        </div>
      )}
      {onRemove && <button className="reading-list-remove text-link" type="button" disabled={removing} onClick={onRemove}>
        <Trash2 size={15} aria-hidden="true" /> Remove from saved<span className="sr-only">: {post.title}</span>
      </button>}
    </article>
  );
}

export function App({
  initialPosts,
  initialSettings,
  initialImages = {},
  location: initialLocation,
}: {
  initialPosts?: Post[];
  initialSettings?: SiteSettings;
  initialImages?: CoverManifest;
  location?: string;
} = {}) {
  const [{ params, isSearch, unknownPath, section, query, page, slug }] =
    useState(() => parseRoute(initialLocation || window.location.href));
  const [settings, setSettings] = useState<SiteSettings>(
    initialSettings || defaultSettings,
  );
  const [user, setUser] = useState<User | null>(null);
  const [roleOwner, setOwner] = useState(false),
    [authReady, setAuthReady] = useState(false),
    [roleUserId, setRoleUserId] = useState<string | null>(null);
  const owner = !!user && roleUserId === user.id && roleOwner;
  const roleReady = !user || roleUserId === user.id;
  const [posts, setPosts] = useState<Post[]>(initialPosts || []),
    [storedSaved, setSaved] = useState<string[]>([]);
  const [deviceSaved, setDeviceSaved] = useState<string[]>([]);
  const saved = user ? (roleUserId === user.id ? storedSaved : noSavedArticles) : deviceSaved;
  const [bookmarkNotice, setBookmarkNotice] = useState<{ message: string; undoId?: string } | null>(null);
  const [bookmarksFailed, setBookmarksFailed] = useState(false);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [accountRefresh, setAccountRefresh] = useState(0);
  const bookmarkBusy = useRef(false);
  const deviceWritesAvailable = useRef(true);
  const currentActor = useRef<string | null>(null);
  const urlError =
    params.get("error_description") ||
    (typeof window !== "undefined" &&
    window.location.hash.includes("error_description")
      ? new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
          "error_description",
        )
      : null);
  const [loading, setLoading] = useState(!initialPosts),
    [error, setError] = useState(""),
    [accountError, setAccountError] = useState(urlError || "");
  const [signIn, setSignIn] = useState(page === "signin" || !!urlError),
    [menu, setMenu] = useState(false),
    [saving, setSaving] = useState(false),
    [limit, setLimit] = useState(12);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("light");
  const [listingCategory, setListingCategory] = useState<Category | "">(() => {
    const category = params.get("category") || "";
    return categories.includes(category as Category) ? category as Category : "";
  });
  const [listingSort, setListingSort] = useState<StorySort>(() => {
    const sort = params.get("sort");
    if (sort === "newest" || sort === "oldest") return sort;
    return query.trim() ? "relevance" : "newest";
  });
  const [searchRanked, setSearchRanked] = useState(false);
  const [reload, setReload] = useState(0);
  function retryContent() {
    setError("");
    setLoading(true);
    setReload((current) => current + 1);
  }
  const [mobileSearch, setMobileSearch] = useState(isSearch);
  const [mobileAccount, setMobileAccount] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchRpcUnavailable = useRef(cachedSearchRpcUnavailable());
  const navToggle = useRef<HTMLButtonElement>(null);
  const mobileSearchToggle = useRef<HTMLButtonElement>(null);
  const mobileAccountToggle = useRef<HTMLButtonElement>(null);
  const accountLinks = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select, [role='textbox']") ||
          target.closest("[role='dialog']"))
      ) return;
      event.preventDefault();
      if (window.matchMedia("(max-width: 680px)").matches) {
        setMobileSearch(true);
        setMobileAccount(false);
      }
      requestAnimationFrame(() => {
        searchInput.current?.focus();
        searchInput.current?.select();
      });
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  useEffect(() => {
    try {
      const preference = localStorage.getItem("astrobit:reading-theme");
      if (preference === "dark" || preference === "light") {
        // oxlint-disable-next-line react/set-state-in-effect -- Restore a reader preference after hydration.
        setReadingTheme(preference);
      }
    } catch { /* Reading remains available without browser storage. */ }
  }, []);
  function chooseReadingTheme(theme: ReadingTheme) {
    setReadingTheme(theme);
    try { localStorage.setItem("astrobit:reading-theme", theme); }
    catch { /* The preference still applies for this visit. */ }
  }
  useEffect(() => {
    if (!mobileAccount) return;
    const frame = requestAnimationFrame(() =>
      accountLinks.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [mobileAccount, authReady, owner]);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Read device bookmarks after hydration.
    setDeviceSaved(readDeviceBookmarks());
    function synchronize(event: StorageEvent) {
      if (event.key === deviceBookmarksKey || event.key === null) setDeviceSaved(readDeviceBookmarks());
    }
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (active) {
          currentActor.current = data.session?.user.id || null;
          setUser(data.session?.user || null);
          setAuthReady(true);
          if (authError)
            setAccountError(
              "Your session could not be restored. Please sign in again.",
            );
        }
      })
      .catch(() => {
        if (active) {
          setAuthReady(true);
          setAccountError("Sign-in is temporarily unavailable.");
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        const nextUser = session?.user || null;
        if (currentActor.current !== (nextUser?.id || null)) setBookmarkNotice(null);
        currentActor.current = nextUser?.id || null;
        setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));
        setAuthReady(true);
        if (session) setSignIn(false);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    database()
      .from("site_settings")
      .select("featured_limit,section_order")
      .single()
      .then(({ data }) => {
        if (active && data) setSettings(normalizeSettings(data));
      });
    return () => {
      active = false;
    };
  }, []);
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    if (!userId) return;
    Promise.all([
      supabase.rpc("is_owner"),
      supabase.from("bookmarks").select("post_id").eq("user_id", userId),
    ])
      .then(([role, bookmarks]) => {
        if (!active) return;
        setOwner(role.data === true);
        setRoleUserId(userId);
        setSaved(
          bookmarks.error
            ? []
            : (bookmarks.data || []).map((item) => item.post_id),
        );
        setBookmarksFailed(!!bookmarks.error);
        if (role.error || bookmarks.error)
          setAccountError(
            "Your account is signed in, but account features are not ready yet.",
          );
      })
      .catch(() => {
        if (active) {
          setOwner(false);
          setSaved([]);
          setRoleUserId(userId);
          setBookmarksFailed(true);
          setAccountError("Account features are temporarily unavailable.");
        }
      }).finally(() => { if (active) setBookmarksLoading(false); });
    return () => {
      active = false;
    };
  }, [userId, accountRefresh]);
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    async function loadFeed() {
      if (query.trim() && !searchRpcUnavailable.current) {
        try {
          const searchResults: Post[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error: searchError } = await database().rpc("search_posts", {
              search_text: query,
              search_category: section || null,
              result_offset: offset,
              result_limit: 1000,
            }).abortSignal(controller.signal);
            if (searchError) throw searchError;
            const page = (data || []).map((item: Partial<Post>) => ({ ...item, body: "" }) as Post);
            searchResults.push(...page);
            if (page.length < 1000) break;
          }
          if (active) setSearchRanked(true);
          return searchResults;
        } catch (searchError) {
          // Projects that have not applied the search migration keep the compatible client search.
          if (typeof searchError === "object" && searchError && "code" in searchError && searchError.code === "PGRST202") {
            searchRpcUnavailable.current = true;
            try { window.sessionStorage.setItem("astrobit:search-rpc-unavailable", String(Date.now() + 10 * 60 * 1000)); }
            catch { /* Search still falls back when session storage is unavailable. */ }
          }
        }
      }
      if (active) setSearchRanked(false);
      const all: Post[] = [];
      for (let offset = 0; ; offset += 1000) {
        const fields = query
          ? "*"
          : "id,title,slug,excerpt,category,status,cover_url,youtube_url,score,featured,pinned,feature_order,review_details,created_at,updated_at,published_at";
        const { data, error: loadError } = await database()
          .from("posts")
          .select(fields)
          .eq("status", "published")
          .in("category", [...categories])
          .lte("published_at", new Date().toISOString())
          .order("published_at", { ascending: false })
          .order("id")
          .range(offset, offset + 999)
          .abortSignal(controller.signal);
        if (!active) return [];
        if (loadError) throw loadError;
        all.push(
          ...(data as unknown as Post[]).map((item) => ({
            ...item,
            body: item.body || "",
          })),
        );
        if (data.length < 1000) break;
      }
      return all;
    }
    async function loadPosts() {
      const [all, articleResult] = await Promise.all([
        loadFeed(),
        slug && !query ? database()
          .from("posts")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .in("category", [...categories])
          .lte("published_at", new Date().toISOString())
          .abortSignal(controller.signal)
          .maybeSingle() : Promise.resolve(null),
      ]);
      if (!active) return;
      if (articleResult) {
        const { data: article, error: articleError } = articleResult;
        if (articleError) throw articleError;
        const index = all.findIndex((item) => item.slug === slug);
        if (article && index >= 0) all[index] = article as Post;
        else if (article) all.push(article as Post);
        else if (index >= 0) all.splice(index, 1);
      }
      if (active) {
        setPosts(all);
        setLoading(false);
      }
    }
    loadPosts().catch(() => {
      if (active) {
        setError("Articles couldn’t be loaded. Please try again later.");
        setLoading(false);
      }
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug, query, section, reload]);
  const post = posts.find((item) => item.slug === slug);
  useEffect(() => {
    applyMetadata(
      pageMetadata({
        post,
        section,
        page,
        query,
        isSearch,
        slug,
        loading,
        error: !!error,
        unknownPath,
      }),
    );
  }, [post, section, page, query, isSearch, slug, loading, error, unknownPath]);
  useEffect(() => {
    if (post && authReady && roleReady) void trackView(post.id);
    if (
      post &&
      window.location.pathname + window.location.search !== articlePath(post)
    )
      window.history.replaceState(
        null,
        "",
        articlePath(post) + window.location.hash,
      );
  }, [post, authReady, roleReady]);
  async function bookmark(postId: string) {
    if (!authReady || !roleReady || bookmarkBusy.current) return;
    const title = posts.find((item) => item.id === postId)?.title || "Article";
    if (!user) {
      const current = deviceWritesAvailable.current ? readDeviceBookmarks(deviceSaved) : deviceSaved;
      const removing = current.includes(postId);
      if (!removing && current.length >= 1000) {
        setAccountError("Your device reading list is full. Remove a saved article before adding another.");
        return;
      }
      const next = toggleBookmark(current, postId);
      const persisted = persistDeviceBookmarks(next);
      deviceWritesAvailable.current = persisted;
      setDeviceSaved(next);
      setAccountError("");
      setBookmarkNotice({ message: removing ? `“${title}” removed from saved articles.` : persisted ? `“${title}” saved on this device.` : `“${title}” saved for this visit. Your browser prevented device storage.`, undoId: removing ? postId : undefined });
      return;
    }
    const actingUser = user.id;
    bookmarkBusy.current = true;
    setSaving(true);
    setAccountError("");
    try {
      const existing = saved.includes(postId);
      const { error: saveError } = existing
        ? await database()
            .from("bookmarks")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id)
        : await database()
            .from("bookmarks")
            .upsert({ post_id: postId, user_id: user.id }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
      if (saveError) throw saveError;
      if (currentActor.current !== actingUser) return;
      setSaved((current) =>
        existing ? current.filter((id) => id !== postId) : [...current, postId],
      );
      setBookmarkNotice({ message: existing ? `“${title}” removed from saved articles.` : `“${title}” saved to your account.`, undoId: existing ? postId : undefined });
    } catch {
      if (currentActor.current === actingUser) setAccountError("Couldn’t update your saved articles. Please try again.");
    } finally {
      bookmarkBusy.current = false;
      setSaving(false);
    }
  }
  const importIds = useMemo(() => deviceImportIds(deviceSaved, posts.map((item) => item.id)), [deviceSaved, posts]);
  async function importDeviceSaves() {
    if (!user || !roleReady || bookmarksFailed || bookmarkBusy.current || !importIds.length) return;
    const actingUser = user.id;
    const importing = [...importIds];
    bookmarkBusy.current = true;
    setSaving(true);
    setAccountError("");
    try {
      const { error: importError } = await database().from("bookmarks").upsert(
        importing.map((postId) => ({ user_id: actingUser, post_id: postId })),
        { onConflict: "user_id,post_id", ignoreDuplicates: true },
      );
      if (importError) throw importError;
      if (currentActor.current !== actingUser) return;
      setSaved((current) => [...new Set([...current, ...importing])]);
      const imported = new Set(importing);
      const currentDeviceSaves = deviceWritesAvailable.current ? readDeviceBookmarks(deviceSaved) : deviceSaved;
      const remaining = currentDeviceSaves.filter((id) => !imported.has(id));
      const persisted = persistDeviceBookmarks(remaining);
      deviceWritesAvailable.current = persisted;
      setDeviceSaved(remaining);
      setBookmarkNotice({ message: `${importing.length} device ${importing.length === 1 ? "save added" : "saves added"} to your account.${persisted ? "" : " Your browser prevented updating the device list; those saves may appear again on your next visit."}` });
    } catch {
      if (currentActor.current === actingUser) setAccountError("Couldn’t add your device saves to this account. Your device list is still available; try again.");
    } finally {
      bookmarkBusy.current = false;
      setSaving(false);
    }
  }
  async function signOut() {
    const { error: logoutError } = await database().auth.signOut();
    if (logoutError) setAccountError("Couldn’t sign out. Please try again.");
    else {
      setOwner(false);
      setSaved([]);
      window.location.assign("/");
    }
  }
  async function shareArticle() {
    if (sharing) return;
    setSharing(true);
    try {
      const url = post ? articleUrl(post.slug, post.category) : window.location.href;
      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setAccountError(
        "The link couldn’t be copied. You can copy it from your browser’s address bar.",
      );
    } finally {
      setSharing(false);
    }
  }
  function updateListingUrl(category: Category | "", sort: StorySort) {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    const defaultSort: StorySort = query.trim() ? "relevance" : "newest";
    if (sort === defaultSort) url.searchParams.delete("sort");
    else url.searchParams.set("sort", sort);
    window.history.replaceState(window.history.state, "", url);
  }
  function changeListingCategory(category: Category | "") {
    setListingCategory(category);
    setLimit(12);
    updateListingUrl(category, listingSort);
  }
  function changeListingSort(sort: StorySort) {
    setListingSort(sort);
    setLimit(12);
    updateListingUrl(listingCategory, sort);
  }
  const filtered = useMemo(
    () => {
      if (!searchRanked) return discoverStories(posts, {
        query, category: (section as Category) || listingCategory,
        sort: listingSort, savedIds: page === "saved" ? saved : undefined,
      });
      const savedSet = page === "saved" ? new Set(saved) : null;
      const results = posts.filter((post) =>
        (!(section || listingCategory) || post.category === (section || listingCategory)) &&
        (!savedSet || savedSet.has(post.id))
      );
      if (listingSort !== "relevance") results.sort((a, b) => {
        const dates = (a.published_at || "").localeCompare(b.published_at || "");
        return (listingSort === "oldest" ? dates : -dates) || a.id.localeCompare(b.id);
      });
      return results;
    },
    [posts, query, section, listingCategory, listingSort, page, saved, searchRanked],
  );
  const listing = !!section || params.has("q") || page === "saved";
  return (
    <CoverImagesContext.Provider value={initialImages}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (menu) {
          event.preventDefault();
          setMenu(false);
          requestAnimationFrame(() => navToggle.current?.focus());
        } else if (mobileAccount) {
          event.preventDefault();
          setMobileAccount(false);
          requestAnimationFrame(() => mobileAccountToggle.current?.focus());
        } else if (mobileSearch) {
          event.preventDefault();
          setMobileSearch(false);
          requestAnimationFrame(() => mobileSearchToggle.current?.focus());
        }
      }}>
        <div className="header-inner">
          <a className="brand" href="/" aria-label="AstroBitPlays home">
            <img
              src="/icon-192.png"
              alt=""
              width={64}
              height={64}
              decoding="async"
            />
            <span>
              ASTROBIT<b>PLAYS</b>
            </span>
          </a>
          <button
            ref={navToggle}
            className="menu-button icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label="Main navigation"
          >
            {categories.map((category) => (
              <a
                key={category}
                href={categoryPath(category)}
                aria-current={section === category || post?.category === category ? "page" : undefined}
              >
                {category}
              </a>
            ))}
          </nav>
          <button ref={mobileSearchToggle} className="mobile-header-action icon-button" aria-label={mobileSearch ? 'Close search' : 'Open search'} aria-expanded={mobileSearch} aria-controls="site-search" onClick={() => {
            setMobileSearch(!mobileSearch); setMobileAccount(false);
            if (!mobileSearch) requestAnimationFrame(() => searchInput.current?.focus());
          }}>{mobileSearch ? <X size={21} /> : <Search size={21} />}</button>
          <button ref={mobileAccountToggle} className="mobile-header-action icon-button" aria-label={mobileAccount ? 'Close account menu' : 'Open account menu'} aria-expanded={mobileAccount} aria-controls="site-account" onClick={() => { setMobileAccount(!mobileAccount); setMobileSearch(false); }}>{mobileAccount ? <X size={21} /> : <UserRound size={21} />}</button>
          <form
            id="site-search"
            className={`search ${mobileSearch ? 'mobile-search-open' : ''}`}
            action="/"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get("q") || "",
              ).trim();
              window.location.assign(
                value ? `/?q=${encodeURIComponent(value)}` : "/",
              );
            }}
          >
            <button className="search-submit" type="submit" aria-label="Search">
              <Search size={18} aria-hidden="true" />
            </button>
            <input
              ref={searchInput}
              type="search"
              aria-label="Search articles"
              aria-keyshortcuts="/"
              title="Press / to focus search"
              name="q"
              placeholder="Search articles…"
              defaultValue={query}
            />
            <kbd className="search-shortcut" aria-hidden="true">/</kbd>
          </form>
          <div ref={accountLinks} id="site-account" className={`account-links ${mobileAccount ? 'mobile-account-open' : ''}`}>
            {!authReady ? (
              <span className="session-loading">Checking account…</span>
            ) : user ? (
              <>
                <a href="/?page=saved">Saved</a>
                {owner && <a href="/?page=studio">Dashboard</a>}
                <button
                  className="icon-button"
                  onClick={signOut}
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <><a href="/?page=saved">Saved</a><button className="text-button" onClick={() => setSignIn(true)}>
                Sign in
              </button></>
            )}
          </div>
        </div>
      </header>
      <main
        id="main"
        className={`site-main ${page === "studio" ? "studio-main" : ""} ${slug && readingTheme === "dark" ? "reader-night-mode" : ""}`}
      >
        {accountError && (
          <p className="notice error" role="alert">
            {accountError}
          </p>
        )}
        {bookmarkNotice && <div className="notice bookmark-notice" role="status">
          <p>{bookmarkNotice.message}</p>
          {bookmarkNotice.undoId && <button className="text-link" disabled={saving} onClick={() => {
            const id = bookmarkNotice.undoId!;
            setBookmarkNotice(null);
            void bookmark(id);
          }}>Undo</button>}
        </div>}
        {unknownPath ? (
          <div className="access-state">
            <h1>Page not found</h1>
            <p>This page doesn’t exist.</p>
            <a href="/">Back to the homepage</a>
          </div>
        ) : page === "studio" ? (
          !authReady || !roleReady ? (
            <p className="empty-text" role="status">
              Checking your account…
            </p>
          ) : !user ? (
            <div className="access-state">
              <h1>Sign in to continue</h1>
              <p>The dashboard is available to the site owner.</p>
              <button className="button" onClick={() => setSignIn(true)}>
                Sign in
              </button>
            </div>
          ) : owner ? (
            <Studio userId={user.id} />
          ) : (
            <div className="access-state">
              <h1>Owner access required</h1>
              <p>
                You’re signed in as {user.email}. Only the owner can open the
                dashboard.
              </p>
              <p className="account-id">Account ID: {user.id}</p>
              <a href="/">Back to articles</a>
            </div>
          )
        ) : slug ? (
          loading ? (
            <p role="status">Loading article…</p>
          ) : error ? (
            <div role="alert" className="notice error">
              <p>{error}</p>
              <button className="button secondary" onClick={retryContent}>Try again</button>
            </div>
          ) : post ? (
            <>
              <article className="article-page">
                <a className="back-link" href={categoryPath(post.category)}>
                  <ArrowLeft size={16} /> {post.category}
                </a>
                <h1 id="article-title" tabIndex={-1}>{post.title}</h1>
                <p className="article-deck">{post.excerpt}</p>
                <div className="article-byline">
                  <span>
                    By AstroBitPlays ·{" "}
                    <time dateTime={post.published_at || undefined}>
                      {formatDate(post.published_at)}
                    </time>{" "}
                    · {readingTime(post.body)}
                  </span>
                  {wasUpdated(post) && <span className="article-updated">Updated <time dateTime={post.content_updated_at || undefined}>{formatDate(post.content_updated_at || null)}</time></span>}
                  <div className="article-actions">
                    <button
                      className="save-button"
                      onClick={shareArticle}
                      disabled={sharing}
                      aria-label="Share article"
                    >
                      {copied ? <Check size={17} /> : <Share2 size={17} />}
                      {copied ? "Copied!" : "Share"}
                    </button>
                    <button
                      className="save-button"
                      onClick={() => bookmark(post.id)}
                      disabled={saving || !authReady || !roleReady || (!!user && bookmarksFailed)}
                      aria-pressed={saved.includes(post.id)}
                    >
                      <Bookmark
                        size={17}
                        fill={saved.includes(post.id) ? "currentColor" : "none"}
                      />
                      {saved.includes(post.id) ? "Saved" : "Save article"}
                    </button>
                  </div>
                </div>
                {post.category === "Reviews" && post.score !== null && (
                  <a
                    className="article-review-score"
                    href="#review-verdict"
                    aria-label={`Review score ${post.score} out of 10. Jump to the full verdict.`}
                  >
                    <span>Our score</span>
                    <strong>{post.score}<small>/10</small></strong>
                    <span>Jump to verdict ↓</span>
                  </a>
                )}
                {post.category === "Reviews" && (
                  <a className="review-scoring-link" href="/review-scoring/">
                    How review scores work
                  </a>
                )}
                <CoverImage source={post.cover_url} alt={post.title} priority sizes="(max-width: 680px) calc(100vw - 36px), (max-width: 1100px) calc(100vw - 64px), 1000px" />
                <ArticleReader content={post.body} articleId={post.id} theme={readingTheme} onThemeChange={chooseReadingTheme} />

                <VideoEmbed url={post.youtube_url} title={`${post.title} video`} />
                <ReviewVerdict post={post} />
                <p className="article-correction">
                  Found an error or missing context?{" "}
                  <a
                    href={`mailto:karacostas.jim@gmail.com?subject=${encodeURIComponent(`Correction: ${post.title}`)}&body=${encodeURIComponent(`Article: ${articleUrl(post.slug, post.category)}\n\nPlease describe the correction or missing context:`)}`}
                  >
                    Suggest a correction
                  </a>
                </p>
              </article>
              {posts.filter(
                (item) =>
                  item.id !== post.id && item.category === post.category,
              ).length > 0 && (
                <section className="more-stories">
                  <SectionTitle>More in {post.category}</SectionTitle>
                  <div className="post-grid">
                    {posts
                      .filter(
                        (item) =>
                          item.id !== post.id &&
                          item.category === post.category,
                      )
                      .slice(0, 3)
                      .map((item) => (
                        <PostCard key={item.id} post={item} />
                      ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="access-state">
              <h1>Article not found</h1>
              <p>This story may have been unpublished or moved.</p>
              <a href="/">Back to the homepage</a>
            </div>
          )
        ) : listing ? (
          <section>
            <div className="listing-heading">
              <h1>
                {page === "saved"
                  ? "Saved articles"
                  : params.has("q")
                    ? query
                      ? `Search: ${query}`
                      : "Search articles"
                    : section}
              </h1>
              <a href="/">All stories</a>
            </div>
            {page === "saved" && authReady && !user && <div className="reading-list-banner">
              <div><h2>Your reading list, on this device</h2><p>Save stories without an account. Sign in to keep a reading list across your devices.</p></div>
              <button className="button secondary" onClick={() => setSignIn(true)}>Sign in to sync</button>
            </div>}
            {page === "saved" && user && roleReady && !bookmarksFailed && importIds.length > 0 && <div className="reading-list-banner">
              <div><h2>Bring your device saves with you</h2><p>{importIds.length} {importIds.length === 1 ? "article is" : "articles are"} saved on this device. Add them to this account to read anywhere.</p></div>
              <button className="button secondary" disabled={saving} onClick={() => void importDeviceSaves()}>Add device saves to my account</button>
            </div>}
            {!loading && !error && (page !== "saved" || (authReady && roleReady && (!user || (!bookmarksLoading && !bookmarksFailed)))) && (
              <div className="discovery-toolbar">
                {!section && <div className="discovery-filters" role="group" aria-label="Filter articles by category">
                  {["", ...categories].map((category) => (
                    <button key={category} type="button" aria-pressed={listingCategory === category}
                      onClick={() => changeListingCategory(category as Category | "")}>
                      {category || "All articles"}
                    </button>
                  ))}
                </div>}
                <label className="discovery-sort"><span>Sort by</span>
                  <select value={listingSort} onChange={(event) => changeListingSort(event.target.value as StorySort)}>
                    {query.trim() && <option value="relevance">Best match</option>}
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>
                <p className="discovery-count" role="status">{filtered.length} {filtered.length === 1 ? "article" : "articles"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
              </div>
            )}
            {page === "saved" && (!authReady || !roleReady || (user && bookmarksLoading)) ? (
              <p role="status">Loading your saved articles…</p>
            ) : page === "saved" && user && bookmarksFailed ? (
              <div className="notice error" role="alert">
                <p>Your saved articles couldn’t be loaded.</p>
                <button className="button secondary" onClick={() => { setAccountError(""); setBookmarksLoading(true); setAccountRefresh((current) => current + 1); }}>Try again</button>
              </div>
            ) : loading ? (
              <p role="status">Loading articles…</p>
            ) : error ? (
              <div className="notice error" role="alert">
                <p>{error}</p>
                <button className="button secondary" onClick={retryContent}>Try again</button>
              </div>
            ) : filtered.length ? (
              <>
                <div className="post-grid">
                  {filtered.slice(0, limit).map((item) => (
                    <PostCard key={item.id} post={item} onRemove={page === "saved" ? () => void bookmark(item.id) : undefined} removing={saving} />
                  ))}
                </div>
                {filtered.length > limit && (
                  <button
                    className="button secondary load-more"
                    onClick={() => setLimit(limit + 12)}
                  >
                    Load more articles
                  </button>
                )}
              </>
            ) : (
              <div className="discovery-empty">
                <Search size={28} aria-hidden="true" />
                <h2>{query.trim() ? "No matching articles" : listingCategory ? `No ${listingCategory.toLowerCase()}${page === "saved" ? " in your reading list" : " here yet"}` : page === "saved" ? "Your reading list starts here" : "No articles here yet"}</h2>
                <p>{query.trim() ? "Try a game title, developer or a shorter search." : listingCategory ? "Clear the category filter to see all articles." : page === "saved" ? "Open a story and choose Save article to keep it for later." : "New stories will appear here as they’re published."}</p>
                {listingCategory && <button className="button secondary" onClick={() => changeListingCategory("")}>Clear category filter</button>}
                <a className="text-link" href="/">Explore top stories</a>
              </div>
            )}
          </section>
        ) : (
          <HomePage
            posts={posts}
            settings={settings}
            loading={loading}
            error={error}
            onRetry={retryContent}
          />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <a className="footer-brand" href="/">
            ASTROBIT<b>PLAYS</b>
          </a>
          <nav aria-label="Social and legal links">
            <a
              href="https://youtube.com/@astrobitplayss"
              target="_blank"
              rel="noreferrer"
            >
              YouTube
            </a>
            <a
              href="https://twitch.tv/astrobitplays"
              target="_blank"
              rel="noreferrer"
            >
              Twitch
            </a>
            <a
              href="https://x.com/astrobitplays"
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <a
              href="https://instagram.com/astrobitplays"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a
              href="https://tiktok.com/@astrobitplays"
              target="_blank"
              rel="noreferrer"
            >
              TikTok
            </a>
            <a href="/stories/">All stories</a>
            <a href="/feed.xml">RSS feed</a>
            <a href="/review-scoring/">Review scoring guide</a>
            <a href="/privacy/">Privacy Policy</a>
            <a href="/terms/">Terms of Service</a>
          </nav>
        </div>
      </footer>
      <nav className="mobile-tab-bar" aria-label="Quick navigation">
        <a href="/" aria-current={!section && !page && !slug && !isSearch && !unknownPath ? 'page' : undefined}><House size={21} /><span>Home</span></a>
        <a href="/news/" aria-current={section === 'News' || post?.category === 'News' ? 'page' : undefined}><Newspaper size={21} /><span>News</span></a>
        <a href="/reviews/" aria-current={section === 'Reviews' || post?.category === 'Reviews' ? 'page' : undefined}><BookOpen size={21} /><span>Reviews</span></a>
        <a href="/?page=saved" aria-current={page === 'saved' ? 'page' : undefined}><Bookmark size={21} /><span>Saved</span></a>
      </nav>
      {signIn && <SignIn onClose={() => setSignIn(false)} />}
    </CoverImagesContext.Provider>
  );
}
function SignIn({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const redirect = new URL(window.location.href);
  redirect.hash = "";
  redirect.searchParams.delete("error");
  redirect.searchParams.delete("error_description");
  redirect.searchParams.delete("code");
  if (redirect.searchParams.get("page") === "signin")
    redirect.searchParams.set("page", "saved");
  const [mode, setMode] = useState<"signin" | "signup">("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [useOtp, setUseOtp] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    const element = dialog.current;
    return () => {
      element?.close();
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (useOtp) {
        const { error: authError } = await database().auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: mode === "signup",
            emailRedirectTo: redirect.toString(),
          },
        });
        if (authError) throw authError;
        setMessage(
          "Check your inbox for a sign-in link. You can close this window.",
        );
      } else {
        if (mode === "signup") {
          const { data, error: authError } = await database().auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: redirect.toString() },
          });
          if (authError) throw authError;
          if (data.session) {
            onClose();
          } else {
            setMessage(
              "Check your email to confirm your account before signing in.",
            );
          }
        } else {
          const { error: authError } = await database().auth.signInWithPassword(
            { email: email.trim(), password },
          );
          if (authError) throw authError;
          onClose();
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please check your details.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await database().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect.toString() },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in couldn’t start. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <dialog
      className="auth-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="auth-title"
    >
      <button
        className="dialog-close icon-button"
        onClick={onClose}
        aria-label="Close sign in"
      >
        <X size={20} />
      </button>
      <h2 id="auth-title">
        {mode === "signup" ? "Create an account" : "Sign in"}
      </h2>
      <p>Save stories to read later.</p>
      <button
        className="button secondary google-signin"
        disabled={busy}
        onClick={googleSignIn}
      >
        Continue with Google
      </button>
      <p className="auth-divider">or use your email</p>
      <form onSubmit={submit}>
        <label>
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        {!useOtp && (
          <label>
            Password
            <input
              required
              type="password"
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? "Please wait…"
            : useOtp
              ? "Email me a link"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        className="text-link"
        style={{ fontSize: "13px", display: "block", margin: "4px 0 14px" }}
        onClick={() => {
          setUseOtp(!useOtp);
          setError("");
          setMessage("");
        }}
      >
        {useOtp
          ? "Sign in with password instead"
          : "Email me a magic link instead"}
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-link"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage("");
          setError("");
        }}
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already registered? Sign in"}
      </button>
    </dialog>
  );
}
export default App;
