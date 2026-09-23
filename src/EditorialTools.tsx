import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { database } from "./lib/supabase";
import { categories, defaultSettings, normalizeSettings } from "./lib/content";
import type { Post, SiteSettings } from "./lib/content";

export function MediaLibrary({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (url: string, name: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    async function load() {
      const found: { name: string; url: string }[] = [];
      const folders = [""];
      for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
        const prefix = folders[folderIndex];
        for (let offset = 0; ; offset += 100) {
          const { data, error: listError } = await database()
            .storage.from("covers")
            .list(prefix, {
              limit: 100,
              offset,
              sortBy: { column: "name", order: "asc" },
            });
          if (listError) throw listError;
          for (const file of data) {
            const path = prefix ? `${prefix}/${file.name}` : file.name;
            if (!file.id) folders.push(path);
            else if (/\.(png|jpe?g|webp)$/i.test(file.name))
              found.push({
                name: path,
                url: database().storage.from("covers").getPublicUrl(path).data
                  .publicUrl,
              });
          }
          if (data.length < 100) break;
        }
      }
      if (active) setItems(found);
    }
    load()
      .catch(() => {
        if (active)
          setError(
            "Media could not load. Check your connection and the editorial migration.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const visible = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="media-dialog"
      onCancel={onClose}
      aria-labelledby="media-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR UPLOADS</p>
          <h2 id="media-title">Media library</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close media library"
        >
          <X />
        </button>
      </div>
      <label className="media-search">
        Find an image
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search filenames…"
        />
      </label>
      {loading ? (
        <p role="status">Loading images…</p>
      ) : error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : !visible.length ? (
        <p>
          {items.length
            ? "No images match your search."
            : "No images uploaded yet. Upload a cover or inline image in the editor."}
        </p>
      ) : (
        <div className="media-grid">
          {visible.map((item) => (
            <button
              type="button"
              key={item.url}
              onClick={() => onSelect(item.url, item.name)}
            >
              <img src={item.url} alt="" loading="lazy" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </dialog>
  );
}

export function RevisionHistory({
  post,
  onRestored,
}: {
  post: Post;
  onRestored: (post: Post) => void;
}) {
  const [items, setItems] = useState<
    { id: string; saved_at: string; snapshot: Post }[] | null
  >(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
    const { data, error: loadError } = await database().rpc("post_revisions", {
      article_id: post.id,
    });
    if (loadError)
      setError(
        "Revision history is unavailable. Check the editorial migration.",
      );
    else setItems(data || []);
    } catch { setError("Revision history could not load. Check your connection."); }
    finally { setBusy(false); }
  }
  async function restore(id: string) {
    if (
      !window.confirm(
        "Restore this version as a private draft? Any current published version will be unpublished. Unsaved editor changes will be replaced.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const { data, error: restoreError } = await database().rpc(
        "restore_revision",
        { revision_id: id, expected_updated_at: post.updated_at },
      );
      if (restoreError) {
        setError(
          restoreError.code === "40001"
            ? "The article changed. Close and reopen it before restoring."
            : "The revision could not be restored. Check your connection.",
        );
        return;
      }
      onRestored(data as Post);
    } catch {
      setError("The revision could not be restored. Check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="revision-panel">
      <h2>Revision history</h2>
      <p>
        Saved versions are kept automatically. Restore creates a private draft
        so you can review it before publishing.
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={load}
      >
        {busy
          ? "Please wait…"
          : items
            ? "Refresh versions"
            : "Load saved versions"}
      </button>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {items && (
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.snapshot.title}</strong>
                <span>
                  {new Date(item.saved_at).toLocaleString()} ·{" "}
                  {item.snapshot.status}
                </span>
              </div>
              <button
                type="button"
                className="text-link"
                disabled={busy}
                onClick={() => restore(item.id)}
              >
                Restore as draft
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function HomepageSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    database()
      .from("site_settings")
      .select("featured_limit,section_order")
      .single()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError)
          setError("Homepage controls need the editorial database migration.");
        else {
          setSettings(normalizeSettings(data));
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  function move(index: number, direction: number) {
    const order = [...settings.section_order];
    [order[index], order[index + direction]] = [
      order[index + direction],
      order[index],
    ];
    setSettings({ ...settings, section_order: order });
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: saveError } = await database()
        .from("site_settings")
        .update(settings)
        .eq("singleton", true)
        .select("singleton")
        .single();
      if (saveError || !data) throw saveError;
      setMessage(
        "Homepage updated. The published HTML will sync automatically.",
      );
    } catch {
      setError("Homepage settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="homepage-settings">
      <h2>Homepage</h2>
      <p>
        Pin stories in the editor to place them first. Featured stories follow,
        then the latest articles. Lower position numbers appear first within
        each group.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <fieldset disabled={!loaded || busy}>
        <label>
          Number of top stories
          <select
            value={settings.featured_limit}
            onChange={(event) =>
              setSettings({
                ...settings,
                featured_limit: Number(event.target.value),
              })
            }
          >
            {[2, 3, 4, 5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <h3>Section order</h3>
        <ol className="section-order">
          {settings.section_order.map((category, index) => (
            <li key={category}>
              <span>{category}</span>
              <div>
                <button
                  type="button"
                  aria-label={`Move ${category} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${category} down`}
                  disabled={index === settings.section_order.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  type="button"
                  className="text-link"
                  disabled={settings.section_order.length === 1}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      section_order: settings.section_order.filter(
                        (item) => item !== category,
                      ),
                    })
                  }
                >
                  Hide
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden-sections">
          {categories
            .filter((category) => !settings.section_order.includes(category))
            .map((category) => (
              <button
                type="button"
                className="text-link"
                key={category}
                onClick={() =>
                  setSettings({
                    ...settings,
                    section_order: [...settings.section_order, category],
                  })
                }
              >
                Show {category}
              </button>
            ))}
        </div>
        <button type="button" className="button" onClick={save}>
          {busy ? "Saving…" : "Save homepage"}
        </button>
      </fieldset>
    </section>
  );
}
