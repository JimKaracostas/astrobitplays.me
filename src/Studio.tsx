import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Plus, Eye, Pencil, Upload, ExternalLink, Star } from 'lucide-react'
import { database } from './lib/supabase'
import { categories, formatDate, placeholder, safeImage, slugify, validatePost, youtubeId } from './lib/content'
import type { Post, PostInput } from './lib/content'

function StarPicker({ value, onChange }: { value: number | null; onChange: (score: number) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const current = hover ?? value ?? 0
  return (
    <div className="stars-row" role="radiogroup" aria-label="Review score out of 10">
      {Array.from({ length: 10 }, (_, i) => {
        const starVal = i + 1
        const active = starVal <= Math.round(current)
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
          >
            <Star
              size={20}
              fill={active ? '#f59e0b' : 'none'}
              color={active ? '#f59e0b' : '#94a3b8'}
              strokeWidth={1.75}
            />
          </button>
        )
      })}
    </div>
  )
}

type Stat = { post_id: string; total_views: number; recent_views: number }
const blank: PostInput = { title: '', slug: '', excerpt: '', body: '', category: 'News', status: 'draft', cover_url: '', youtube_url: '', score: null, featured: false, published_at: null }
function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === '23505') return 'That article URL is already in use. Choose a different one.'
  return error instanceof Error ? error.message : 'The change could not be saved. Check your connection and owner access.'
}
export function Studio() {
  const [posts, setPosts] = useState<Post[]>([]), [stats, setStats] = useState<Stat[] | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Post | 'new' | null>(null), [filter, setFilter] = useState('all')
  async function load() {
    setLoading(true); setError('')
    try {
      const all: Post[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data, error: loadError } = await database().from('posts').select('*').order('updated_at', { ascending: false }).order('id').range(offset, offset + 999)
        if (loadError) throw loadError
        all.push(...data as Post[])
        if (data.length < 1000) break
      }
      setPosts(all)
      const { data, error: statsError } = await database().rpc('post_stats')
      if (statsError) { setStats(null); setError('Posts loaded, but statistics are unavailable.') }
      else setStats(data as Stat[])
    } catch { setError('The dashboard couldn’t load. Check the database setup and try again.') }
    finally { setLoading(false) }
  }
  // Load and synchronize the remote dashboard when it mounts.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { void load() }, [])
  if (editing) return <Editor key={typeof editing === 'string' ? 'new' : editing.id} post={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage('Post saved.'); void load() }} />
  const visible = posts.filter(post => filter === 'all' || post.status === filter)
  return <section><div className="studio-heading"><div><p className="eyebrow">ASTROBITPLAYS</p><h1>Dashboard</h1></div><button className="button" onClick={() => { setMessage(''); setEditing('new') }}><Plus size={18} /> New post</button></div>
    {message && <p className="notice" role="status">{message}</p>}{error && <p className="notice error" role="alert">{error} <button className="text-link" onClick={load}>Retry</button></p>}
    <div className="stats-grid"><div><span>Published posts</span><strong>{loading ? '—' : posts.filter(p => p.status === 'published').length}</strong></div><div><span>Drafts</span><strong>{loading ? '—' : posts.filter(p => p.status === 'draft').length}</strong></div><div><span>Article reads</span><strong>{loading || !stats ? '—' : stats.reduce((sum, item) => sum + Number(item.total_views), 0)}</strong></div><div><span>Reads · last 30 days</span><strong>{loading || !stats ? '—' : stats.reduce((sum, item) => sum + Number(item.recent_views), 0)}</strong></div></div>
    <p className="stats-note">Reads count each browser session once per article per day. Your own reads are excluded. These counts are estimates, not unique people.</p>
    <div className="posts-toolbar"><h2>Your posts</h2><label>Show<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All posts</option><option value="draft">Drafts</option><option value="published">Published</option></select></label></div>
    {loading ? <p role="status">Loading posts…</p> : visible.length ? <div className="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Reads</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(post => <tr key={post.id}><td>{post.title}</td><td>{post.category}</td><td><span className={`post-status ${post.status}`}>{post.status}</span></td><td>{stats ? Number(stats.find(item => item.post_id === post.id)?.total_views || 0) : '—'}</td><td>{formatDate(post.updated_at)}</td><td><div className="table-actions"><button className="text-link" onClick={() => { setMessage(''); setEditing(post) }}><Pencil size={15} /> Edit<span className="sr-only"> {post.title}</span></button>{post.status === 'published' && <a className="text-link" href={`/?article=${encodeURIComponent(post.slug)}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View</a>}</div></td></tr>)}</tbody></table></div> : <div className="dashboard-empty"><h3>{filter === 'all' ? 'Your first post starts here' : `No ${filter} posts`}</h3><p>{filter === 'all' ? 'Write a story, save it as a draft, and publish when it’s ready.' : 'Posts with this status will appear here.'}</p></div>}
  </section>
}
function Editor({ post, onClose, onSaved }: { post?: Post; onClose: () => void; onSaved: () => void }) {
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState<PostInput>(post ? { title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body, category: post.category, status: post.status, cover_url: post.cover_url, youtube_url: post.youtube_url, score: post.score, featured: post.featured, published_at: post.published_at } : blank)
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [preview, setPreview] = useState(false), [error, setError] = useState('')
  function change<K extends keyof PostInput>(key: K, value: PostInput[K]) { setDirty(true); setForm(current => ({ ...current, [key]: value })) }
  function insertFormat(prefix: string, suffix = '') {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const selected = el.value.slice(start, end)
    const inserted = `${prefix}${selected || 'text'}${suffix}`
    const next = el.value.slice(0, start) + inserted + el.value.slice(end)
    change('body', next)
    setTimeout(() => {
      el.focus()
      const pos = start + prefix.length + (selected ? selected.length : 4)
      el.setSelectionRange(pos, pos)
    }, 0)
  }
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function save(event: FormEvent) {
    event.preventDefault(); setError('')
    const payload = { ...form, title: form.title.trim(), excerpt: form.excerpt.trim(), score: form.category === 'Reviews' ? form.score : null, published_at: form.status === 'published' ? form.published_at || new Date().toISOString() : null }
    const issue = validatePost(payload)
    if (issue) { setError(issue); return }
    setBusy(true)
    try {
      const result = post ? await database().from('posts').update(payload).eq('id', post.id).select('id').single() : await database().from('posts').insert(payload).select('id').single()
      if (result.error) throw result.error
      setDirty(false); onSaved()
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  async function upload(file: File | undefined) {
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP image up to 5 MB.'); return }
    setUploading(true)
    try {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await database().storage.from('covers').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      change('cover_url', database().storage.from('covers').getPublicUrl(path).data.publicUrl)
    } catch { setError('The image couldn’t be uploaded. Check your connection and storage permissions.') }
    finally { setUploading(false) }
  }
  function close() { if (!dirty || window.confirm('Discard unsaved changes?')) onClose() }
  return <section><div className="editor-heading"><button className="back-link" onClick={close}><ArrowLeft size={16} /> All posts</button><button className="button secondary" onClick={() => setPreview(!preview)}><Eye size={17} /> {preview ? 'Back to editor' : 'Preview'}</button></div><h1>{post ? 'Edit post' : 'New post'}</h1>
    {error && <p className="notice error" role="alert">{error}</p>}
    {preview ? <div className="editor-preview"><p className="eyebrow">UNPUBLISHED PREVIEW</p><h1>{form.title || 'Untitled post'}</h1><p className="article-deck">{form.excerpt}</p><img className="cover" src={form.cover_url ? safeImage(form.cover_url) : placeholder} alt="Cover preview" /><div className="article-body"><ReactMarkdown>{form.body}</ReactMarkdown></div>{youtubeId(form.youtube_url) && <iframe className="video" src={`https://www.youtube-nocookie.com/embed/${youtubeId(form.youtube_url)}`} title="Video preview" allowFullScreen />}</div>
    : <form className="editor-form" onSubmit={save}><div className="writing-area">
      <label>Title<input required maxLength={200} value={form.title} onChange={e => { const title = e.target.value; setDirty(true); setForm(current => ({ ...current, title, slug: !post && (!current.slug || current.slug === slugify(current.title)) ? slugify(title) : current.slug })) }} /></label>
      <label>Article URL<input required maxLength={200} value={form.slug} onChange={e => change('slug', e.target.value)} /><small>astrobitplays.me/?article={form.slug || 'your-article-title'}</small></label>
      <label>Summary<textarea rows={3} maxLength={400} value={form.excerpt} onChange={e => change('excerpt', e.target.value)} /></label>
      <label>Article
        <div className="editor-toolbar" role="toolbar" aria-label="Markdown formatting">
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('**', '**')} title="Bold"><b>B</b></button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('*', '*')} title="Italic"><i>I</i></button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('## ', '')} title="Heading 2">H2</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('### ', '')} title="Heading 3">H3</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('> ', '')} title="Quote">Quote</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('- ', '')} title="Bullet list">List</button>
          <button type="button" className="toolbar-btn" onClick={() => insertFormat('[', '](https://)')} title="Link">Link</button>
        </div>
        <textarea ref={bodyRef} className="body-editor" required maxLength={200000} value={form.body} onChange={e => change('body', e.target.value)} />
        <small>Markdown supported: ## headings, **bold**, *italic*, links and lists. Use Preview to check formatting.</small>
      </label>
    </div><aside className="publishing-options">
      <label>Category<select value={form.category} onChange={e => change('category', e.target.value as PostInput['category'])}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>

      <label>Status<select value={form.status} onChange={e => change('status', e.target.value as PostInput['status'])}><option value="draft">Draft</option><option value="published">Published</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={form.featured} onChange={e => change('featured', e.target.checked)} /> Feature on homepage</label>
      <div className="cover-options"><span className="field-label">Cover image</span><img className="cover" src={form.cover_url ? safeImage(form.cover_url) : placeholder} alt="Cover preview" /><label className="upload-label"><Upload size={16} /> {uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label><small>JPG, PNG or WebP · up to 5 MB</small><label>Or use an image URL<input type="url" placeholder="https://…" value={form.cover_url} onChange={e => change('cover_url', e.target.value)} /></label>{form.cover_url && <button type="button" className="text-link" onClick={() => change('cover_url', '')}>Use galaxy placeholder</button>}</div>
      {form.category === 'Reviews' && <div className="score-picker-container"><label>Review score: <strong>{form.score !== null ? `${form.score} / 10` : 'Not set'}</strong><StarPicker value={form.score} onChange={s => change('score', s)} /><input type="number" min="0" max="10" step="0.1" value={form.score ?? ''} onChange={e => change('score', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g. 9.2" /><small>Click stars (1–10) or type an exact decimal.</small></label></div>}
      <label>YouTube URL<input type="url" value={form.youtube_url} onChange={e => change('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=…" /></label>
      <button className="button" disabled={busy || uploading}>{busy ? 'Saving…' : form.status === 'published' ? post?.status === 'published' ? 'Save changes' : 'Publish post' : post?.status === 'published' ? 'Unpublish and save draft' : 'Save draft'}</button>
      <small>{form.status === 'published' ? 'Saving makes this post visible to everyone.' : 'Only you can see drafts.'}</small>
    </aside></form>}
  </section>
}
