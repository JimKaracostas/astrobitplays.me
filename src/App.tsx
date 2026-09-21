import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { Search, Bookmark, LogOut, ArrowLeft, Menu, X, Share2, Check, Star } from 'lucide-react'
import { MarkdownContent } from './lib/MarkdownContent'
import { database, supabase, trackView } from './lib/supabase'
import { categories, formatDate, placeholder, safeImage, youtubeId, readingTime } from './lib/content'
import type { Post } from './lib/content'
const LazyStudio = lazy(() => import('./Studio').then(module => ({ default: module.Studio })))
function Studio() { return <Suspense fallback={<p role="status">Loading dashboard…</p>}><LazyStudio /></Suspense> }

export function StarRating({ score, max = 10, size = 15 }: { score: number; max?: number; size?: number }) {
  const rounded = Math.round(score)
  return (
    <div className="star-rating" aria-label={`${score} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rounded
        return (
          <Star
            key={i}
            size={size}
            className={filled ? 'star-filled' : 'star-empty'}
            fill={filled ? '#f59e0b' : 'none'}
            color={filled ? '#f59e0b' : '#94a3b8'}
            strokeWidth={1.75}
          />
        )
      })}
    </div>
  )
}

function Cover({ post }: { post?: Post }) {
  return <img className="cover" src={post?.cover_url ? safeImage(post.cover_url) : placeholder} alt={post ? post.title : 'Blue stars and galaxy clouds'} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = placeholder }} />
}
function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="section-title">{children}</h2> }
function PostCard({ post }: { post: Post }) {
  return <article className="post-card">
    <a href={`/?article=${encodeURIComponent(post.slug)}`}><Cover post={post} /><div className="post-meta">{post.category} <span>{formatDate(post.published_at)}</span></div><h3>{post.title}</h3></a>
    <p>{post.excerpt}</p>
    {post.category === 'Reviews' && post.score !== null && (
      <div className="card-score-row">
        <StarRating score={post.score} size={13} />
        <span className="score">{post.score}<small> / 10</small></span>
      </div>
    )}
  </article>
}

export function App() {
  const params = new URLSearchParams(window.location.search)
  const section = params.get('section') || '', query = params.get('q') || '', page = params.get('page') || '', slug = params.get('article') || ''
  const [user, setUser] = useState<User | null>(null)
  const [owner, setOwner] = useState(false), [authReady, setAuthReady] = useState(!supabase), [roleReady, setRoleReady] = useState(false)
  const [posts, setPosts] = useState<Post[]>([]), [saved, setSaved] = useState<string[]>([])
  const urlError = params.get('error_description') || (typeof window !== 'undefined' && window.location.hash.includes('error_description') ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description') : null)
  const [loading, setLoading] = useState(!!supabase), [error, setError] = useState(''), [accountError, setAccountError] = useState(urlError || '')
  const [signIn, setSignIn] = useState(page === 'signin' || !!urlError), [menu, setMenu] = useState(false), [saving, setSaving] = useState(false), [limit, setLimit] = useState(12)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (active) { setUser(data.session?.user || null); setAuthReady(true); if (authError) setAccountError('Your session could not be restored. Please sign in again.') }
    }).catch(() => { if (active) { setAuthReady(true); setAccountError('Sign-in is temporarily unavailable.') } })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user || null); setAuthReady(true); if (session) setSignIn(false) }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    let active = true
    // Clear the previous account's permissions immediately when its session changes.
    // oxlint-disable-next-line react/set-state-in-effect
    setOwner(false); setSaved([]); setRoleReady(false)
    if (!user || !supabase) { setRoleReady(true); return }
    Promise.all([supabase.rpc('is_owner'), supabase.from('bookmarks').select('post_id').eq('user_id', user.id)]).then(([role, bookmarks]) => {
      if (!active) return
      setOwner(role.data === true); setRoleReady(true)
      if (!bookmarks.error) setSaved((bookmarks.data || []).map(item => item.post_id))
      if (role.error || bookmarks.error) setAccountError('Your account is signed in, but account features are not ready yet.')
    }).catch(() => { if (active) { setRoleReady(true); setAccountError('Account features are temporarily unavailable.') } })
    return () => { active = false }
  }, [user])
  useEffect(() => {
    let active = true
    if (!supabase) return
    async function loadPosts() {
      const all: Post[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data, error: loadError } = await database().from('posts').select('*').eq('status', 'published').lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).order('id').range(offset, offset + 999)
        if (!active) return
        if (loadError) throw loadError
        all.push(...(data as Post[]))
        if (data.length < 1000) break
      }
      if (active) { setPosts(all); setLoading(false) }
    }
    loadPosts().catch(() => { if (active) { setError('Articles couldn’t be loaded. Please try again later.'); setLoading(false) } })
    return () => { active = false }
  }, [])
  const post = posts.find(item => item.slug === slug)
  useEffect(() => {
    // Document metadata is an intentional external effect.
    // oxlint-disable-next-line react/immutability
    document.title = `${post?.title || (page === 'studio' ? 'Dashboard' : query ? `Search: ${query}` : section || 'Gaming news, reviews & guides')} | AstroBitPlays`
    if (post && authReady && roleReady) void trackView(post.id)
  }, [post, authReady, roleReady, section, query, page])
  async function bookmark(postId: string) {
    if (!user) { setSignIn(true); return }
    setSaving(true); setAccountError('')
    try {
      const existing = saved.includes(postId)
      const { error: saveError } = existing ? await database().from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id) : await database().from('bookmarks').insert({ post_id: postId, user_id: user.id })
      if (saveError) throw saveError
      setSaved(current => existing ? current.filter(id => id !== postId) : [...current, postId])
    } catch { setAccountError('Couldn’t update your saved articles. Please try again.') }
    finally { setSaving(false) }
  }
  async function signOut() {
    const { error: logoutError } = await database().auth.signOut()
    if (logoutError) setAccountError('Couldn’t sign out. Please try again.')
    else { setOwner(false); setSaved([]); window.location.assign('/') }
  }
  function shareArticle() {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const filtered = posts.filter(item => (!section || item.category === section) && (!query || `${item.title} ${item.excerpt} ${item.body}`.toLowerCase().includes(query.toLowerCase())) && (page !== 'saved' || saved.includes(item.id)))
  const lead = posts.find(item => item.featured) || posts[0]
  const listing = !!section || params.has('q') || page === 'saved'
  const news = posts.filter(item => item.category === 'News'), reviews = posts.filter(item => item.category === 'Reviews')
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="/" aria-label="AstroBitPlays home"><img src="/logo.png" alt="" /><span>ASTROBIT<b>PLAYS</b></span></a>
      <button className="menu-button icon-button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
      <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">{categories.map(category => <a key={category} href={`/?section=${category}`} aria-current={section === category ? 'page' : undefined}>{category}</a>)}</nav>
      <form className="search" action="/" role="search"><Search size={18} aria-hidden="true" /><input aria-label="Search articles" name="q" placeholder="Search articles…" defaultValue={query} /><button className="sr-only" type="submit">Search</button></form>
      <div className="account-links">{user ? <><a href="/?page=saved">Saved</a>{owner && <a href="/?page=studio">Dashboard</a>}<button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button></> : <button className="text-button" onClick={() => setSignIn(true)}>Sign in</button>}</div>
    </div></header>
    <main id="main" className={`site-main ${page === 'studio' ? 'studio-main' : ''}`}>
      {accountError && <p className="notice error" role="alert">{accountError}</p>}
      {page === 'studio' ? !authReady || !roleReady ? <p className="empty-text" role="status">Checking your account…</p> : !user ? <div className="access-state"><h1>Sign in to continue</h1><p>The dashboard is available to the site owner.</p><button className="button" onClick={() => setSignIn(true)}>Sign in</button></div> : owner ? <Studio /> : <div className="access-state"><h1>Owner access required</h1><p>You’re signed in as {user.email}. Only the owner can open the dashboard.</p><p className="account-id">Account ID: {user.id}</p><a href="/">Back to articles</a></div>
      : slug ? loading ? <p role="status">Loading article…</p> : error ? <p role="alert" className="notice error">{error}</p> : post ? <><article className="article-page">
        <a className="back-link" href={`/?section=${post.category}`}><ArrowLeft size={16} /> {post.category}</a><h1>{post.title}</h1><p className="article-deck">{post.excerpt}</p>
        <div className="article-byline"><span>By AstroBitPlays · {formatDate(post.published_at)} · {readingTime(post.body)}</span><div className="article-actions"><button className="save-button" onClick={shareArticle} aria-label="Share article">{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? 'Copied!' : 'Share'}</button><button className="save-button" onClick={() => bookmark(post.id)} disabled={saving} aria-pressed={saved.includes(post.id)}><Bookmark size={17} fill={saved.includes(post.id) ? 'currentColor' : 'none'} />{saved.includes(post.id) ? 'Saved' : 'Save article'}</button></div></div>
        <Cover post={post} /><div className="article-body"><MarkdownContent content={post.body} /></div>

        {youtubeId(post.youtube_url) && <iframe className="video" src={`https://www.youtube-nocookie.com/embed/${youtubeId(post.youtube_url)}`} title={`${post.title} video`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />}
        {post.category === 'Reviews' && post.score !== null && <div className="review-verdict"><div className="verdict-label"><strong>Our score</strong><StarRating score={post.score} size={18} /></div><span>{post.score}<small> / 10</small></span></div>}
      </article>{posts.filter(item => item.id !== post.id && item.category === post.category).length > 0 && <section className="more-stories"><SectionTitle>More in {post.category}</SectionTitle><div className="post-grid">{posts.filter(item => item.id !== post.id && item.category === post.category).slice(0, 3).map(item => <PostCard key={item.id} post={item} />)}</div></section>}</> : <div className="access-state"><h1>Article not found</h1><p>This story may have been unpublished or moved.</p><a href="/">Back to the homepage</a></div>
      : listing ? <section><div className="listing-heading"><h1>{page === 'saved' ? 'Saved articles' : params.has('q') ? query ? `Search: ${query}` : 'Search articles' : section}</h1><a href="/">All stories</a></div>
        {page === 'saved' && !user ? <div className="access-state"><p>Sign in to save stories and read them later.</p><button className="button" onClick={() => setSignIn(true)}>Sign in</button></div> : loading ? <p role="status">Loading articles…</p> : error ? <p className="notice error" role="alert">{error}</p> : filtered.length ? <><div className="post-grid">{filtered.slice(0, limit).map(item => <PostCard key={item.id} post={item} />)}</div>{filtered.length > limit && <button className="button secondary load-more" onClick={() => setLimit(limit + 12)}>Load more articles</button>}</> : <p className="empty-text">{query ? 'No articles match your search.' : page === 'saved' ? 'You haven’t saved any articles yet.' : `No ${section.toLowerCase() || 'articles'} published yet.`}</p>}</section>
      : <><div className="front-grid"><section className="lead-story">{loading ? <><Cover /><h1>Latest stories</h1><p className="empty-text" role="status">Loading articles…</p></> : lead ? <><a href={`/?article=${encodeURIComponent(lead.slug)}`}><Cover post={lead} /><div className="post-meta">{lead.category}</div><h1>{lead.title}</h1></a><p className="lead-deck">{lead.excerpt}</p><div className="byline">By AstroBitPlays · {formatDate(lead.published_at)}</div></> : <><Cover /><h1>{error ? 'Latest stories' : 'No stories published yet'}</h1><p className="lead-deck" role={error ? 'alert' : undefined}>{error || 'News, reviews and guides will appear here.'}</p>{error && <button className="text-link" onClick={() => window.location.reload()}>Try again</button>}</>}</section>
        <aside className="latest-news"><SectionTitle>Latest news</SectionTitle>{!loading && !error && news.length ? <div className="news-list">{news.slice(0, 5).map(item => <article key={item.id}><time>{formatDate(item.published_at)}</time><a href={`/?article=${encodeURIComponent(item.slug)}`}><h3>{item.title}</h3></a></article>)}<a className="text-link" href="/?section=News">All news</a></div> : <p className="empty-text">{loading ? 'Loading…' : error ? 'News is currently unavailable.' : 'No news published yet.'}</p>}</aside></div>
        <section className="reviews-section"><SectionTitle>Latest reviews</SectionTitle>{!loading && !error && reviews.length ? <div className="post-grid">{reviews.slice(0, 3).map(item => <PostCard key={item.id} post={item} />)}</div> : <p className="empty-text">{loading ? 'Loading…' : error ? 'Reviews are currently unavailable.' : 'No reviews published yet.'}</p>}</section>
        {posts.filter(item => item.id !== lead?.id && item.category !== 'Reviews').length > 0 && <section className="more-stories"><SectionTitle>More stories</SectionTitle><div className="post-grid">{posts.filter(item => item.id !== lead?.id && item.category !== 'Reviews').slice(0, 6).map(item => <PostCard key={item.id} post={item} />)}</div></section>}
      </>}
    </main>
    {signIn && <SignIn onClose={() => setSignIn(false)} />}
  </>
}
function SignIn({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [useOtp, setUseOtp] = useState(false)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal(); const element = dialog.current; return () => { element?.close() } }, [])
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      if (useOtp) {
        const { error: authError } = await database().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'signup', emailRedirectTo: `${window.location.origin}/?page=saved` } })
        if (authError) throw authError
        setMessage('Check your inbox for a sign-in link. You can close this window.')
      } else {
        if (mode === 'signup') {
          const { data, error: authError } = await database().auth.signUp({ email: email.trim(), password })
          if (authError) throw authError
          if (data.session) { onClose() } else { setMessage('Account created! You can now sign in.') }
        } else {
          const { error: authError } = await database().auth.signInWithPassword({ email: email.trim(), password })
          if (authError) throw authError
          onClose()
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Authentication failed. Please check your details.') }
    finally { setBusy(false) }
  }
  async function googleSignIn() {
    setBusy(true); setError('')
    try {
      const { error: authError } = await database().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/?page=saved` } })
      if (authError) throw authError
    } catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in couldn’t start. Please try again.'); setBusy(false) }
  }
  return <dialog className="auth-dialog" ref={dialog} onCancel={onClose} aria-labelledby="auth-title"><button className="dialog-close icon-button" onClick={onClose} aria-label="Close sign in"><X size={20} /></button><h2 id="auth-title">{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2><p>Save stories to read later.</p><button className="button secondary google-signin" disabled={busy} onClick={googleSignIn}>Continue with Google</button><p className="auth-divider">or use your email</p><form onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>{!useOtp && <label>Password<input required type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" /></label>}<button className="button" disabled={busy}>{busy ? 'Please wait…' : useOtp ? 'Email me a link' : mode === 'signup' ? 'Create account' : 'Sign in'}</button></form><button type="button" className="text-link" style={{ fontSize: '13px', display: 'block', margin: '4px 0 14px' }} onClick={() => { setUseOtp(!useOtp); setError(''); setMessage('') }}>{useOtp ? 'Sign in with password instead' : 'Email me a magic link instead'}</button>{message && <p className="notice" role="status">{message}</p>}{error && <p className="notice error" role="alert">{error}</p>}<button className="text-link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); setError('') }}>{mode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</button></dialog>
}
export default App

