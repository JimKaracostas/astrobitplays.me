import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { youtubeId } from "./lib/content";

export function VideoEmbed({ url, title = "YouTube video" }: { url: string; title?: string }) {
  const id = youtubeId(url);
  return id ? <YouTubePlayer key={id} id={id} title={title} /> : null;
}

function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const description = useId();
  const player = useRef<HTMLIFrameElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (active ? player.current : playButton.current)?.focus({ preventScroll: true });
  }, [active]);
  function changePlayer(open: boolean) {
    moveFocus.current = true;
    setLoaded(false);
    setActive(open);
  }
  return (
    <figure className="video-embed">
      <div className="video-stage">
        {active ? <>
          {!loaded && <span className="video-loading" role="status">Loading YouTube player…</span>}
          <iframe ref={player} className="video" width={1280} height={720}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`}
            title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)} />
        </> : <button ref={playButton} className="video-play" type="button"
          aria-label={`Play ${title}`} aria-describedby={description} onClick={() => changePlayer(true)}>
          <span className="video-play-icon"><Play size={28} fill="currentColor" aria-hidden="true" /></span>
          <span className="video-title">{title}</span>
          <span className="video-play-label">Play video</span>
        </button>}
      </div>
      <figcaption className="video-caption">
        <span id={description}>{active ? "YouTube may collect data while this player is open." : "YouTube loads only when you press play."}</span>
        <span className="video-links">
          <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
            Watch on YouTube <ExternalLink size={14} aria-hidden="true" />
          </a>
          {active && <button type="button" onClick={() => changePlayer(false)}>
            <X size={15} aria-hidden="true" /> Close player
          </button>}
        </span>
      </figcaption>
    </figure>
  );
}
