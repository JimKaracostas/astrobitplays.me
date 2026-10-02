import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Type } from "lucide-react";
import { MarkdownContent } from "./lib/MarkdownContent";
import { articleOutline, readingProgress } from "./lib/reader";
const ReaderContent = memo(MarkdownContent);

export function ArticleReader({ content }: { content: string }) {
  const sections = useMemo(() => articleOutline(content), [content]);
  const [largeText, setLargeText] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      // oxlint-disable-next-line react/set-state-in-effect -- Restore a reader preference after hydration.
      setLargeText(localStorage.getItem("astrobit:text-size") === "large");
    } catch { /* Reading works without browser storage. */ }
  }, []);
  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const bounds = body.current?.getBoundingClientRect();
      const navigationHeight = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect().height || 0;
      if (bounds && progress.current)
        progress.current.style.transform = `scaleX(${readingProgress(bounds.top, bounds.height, window.innerHeight - navigationHeight)})`;
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    if (body.current) observer.observe(body.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    // Deep links must also work when the article module loads after navigation.
    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (sections.some((section) => section.id === id))
        document.getElementById(id)?.scrollIntoView();
    } catch { /* Ignore malformed fragments. */ }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);
  function chooseTextSize(large: boolean) {
    setLargeText(large);
    try { localStorage.setItem("astrobit:text-size", large ? "large" : "standard"); }
    catch { /* The preference still applies for this visit. */ }
  }
  return (
    <div className="article-reader">
      <div className="reading-progress" aria-hidden="true"><div ref={progress} /></div>
      <div className="reader-tools">
        <span><Type size={18} aria-hidden="true" /> Text size</span>
        <div role="group" aria-label="Article text size">
          <button type="button" aria-pressed={!largeText} onClick={() => chooseTextSize(false)}>Standard</button>
          <button type="button" aria-pressed={largeText} onClick={() => chooseTextSize(true)}>Large</button>
        </div>
      </div>
      {sections.length >= 2 && (
        <details className="article-outline" open>
          <summary>On this page <ChevronDown size={18} aria-hidden="true" /></summary>
          <nav aria-label="Article sections">
            <ol>
              {sections.map((section) => (
                <li key={section.id} className={section.depth === 3 ? "outline-subsection" : undefined}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      )}
      <div ref={body} className={`article-body ${largeText ? "article-text-large" : ""}`}>
        <ReaderContent content={content} />
      </div>
      <a className="back-to-top" href="#article-title"><ArrowUp size={16} aria-hidden="true" /> Back to top</a>
    </div>
  );
}
