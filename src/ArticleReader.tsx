import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Moon, Sun, Type } from "lucide-react";
import { MarkdownContent } from "./lib/MarkdownContent";
import { articleOutline, readingProgress } from "./lib/reader";
import type { ReadingTheme } from "./lib/reader";
const ReaderContent = memo(MarkdownContent);

export function ArticleReader({ content, articleId, theme, onThemeChange }: { content: string; articleId: string; theme: ReadingTheme; onThemeChange: (theme: ReadingTheme) => void }) {
  const sections = useMemo(() => articleOutline(content), [content]);
  const [largeText, setLargeText] = useState(false);
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const lastSavedAt = useRef(0);
  const resumePositionRef = useRef<number | null>(null);
  const positionKey = `astrobit:reading-position:${articleId}`;
  function updateResumePosition(position: number | null) {
    resumePositionRef.current = position;
    setResumePosition(position);
  }
  useEffect(() => {
    try {
      // oxlint-disable-next-line react/set-state-in-effect -- Restore a reader preference after hydration.
      setLargeText(localStorage.getItem("astrobit:text-size") === "large");
    } catch { /* Reading works without browser storage. */ }
  }, []);
  useEffect(() => {
    try {
      const position = Number(localStorage.getItem(positionKey));
      if (!window.location.hash && Number.isFinite(position) && position >= 0.05 && position < 0.98) {
        // oxlint-disable-next-line react/set-state-in-effect -- Restore an optional reading position after hydration.
        updateResumePosition(position);
      }
    } catch { /* Reading continues normally without browser storage. */ }
  }, [positionKey]);
  useEffect(() => {
    let frame = 0;
    function currentPosition() {
      const bounds = body.current?.getBoundingClientRect();
      const navigationHeight = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect().height || 0;
      return bounds ? readingProgress(bounds.top, bounds.height, window.innerHeight - navigationHeight) : 0;
    }
    function savePosition() {
      if (!hasScrolled.current) return;
      const position = currentPosition();
      try {
        if (position < 0.05 || position >= 0.98) localStorage.removeItem(positionKey);
        else localStorage.setItem(positionKey, String(position));
      } catch { /* Reading position is optional. */ }
    }
    function measure() {
      frame = 0;
      if (progress.current)
        progress.current.style.transform = `scaleX(${currentPosition()})`;
      if (hasScrolled.current && Date.now() - lastSavedAt.current >= 1200) {
        savePosition();
        lastSavedAt.current = Date.now();
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    function onScroll() {
      hasScrolled.current = true;
      if (resumePositionRef.current !== null) updateResumePosition(null);
      schedule();
    }
    const observer = new ResizeObserver(schedule);
    if (body.current) observer.observe(body.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pagehide", savePosition);
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
      savePosition();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pagehide", savePosition);
    };
  }, [sections, positionKey]);
  function focusSectionAt(scrollTop: number) {
    const headings = Array.from(body.current?.querySelectorAll<HTMLElement>("h2, h3, h4") || []);
    let target = headings[0];
    for (const heading of headings) {
      if (window.scrollY + heading.getBoundingClientRect().top <= scrollTop + 8) target = heading;
      else break;
    }
    target?.focus({ preventScroll: true });
  }
  function resumeReading() {
    if (resumePosition === null || !body.current) return;
    const bounds = body.current.getBoundingClientRect();
    const navigationHeight = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect().height || 0;
    const viewport = window.innerHeight - navigationHeight;
    const target = Math.max(0, window.scrollY + bounds.top + bounds.height * resumePosition - viewport);
    focusSectionAt(target);
    updateResumePosition(null);
    window.scrollTo({ top: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function startFromBeginning() {
    if (!body.current) return;
    try { localStorage.removeItem(positionKey); } catch { /* The reset still applies for this visit. */ }
    const target = Math.max(0, window.scrollY + body.current.getBoundingClientRect().top - 24);
    focusSectionAt(target);
    updateResumePosition(null);
    window.scrollTo({ top: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
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
        <div className="reader-choice-group" role="group" aria-label="Article text size">
          <button type="button" aria-pressed={!largeText} onClick={() => chooseTextSize(false)}>Standard</button>
          <button type="button" aria-pressed={largeText} onClick={() => chooseTextSize(true)}>Large</button>
        </div>
        <div className="reader-choice-group" role="group" aria-label="Reading theme">
          <button type="button" aria-pressed={theme === "light"} onClick={() => onThemeChange("light")}><Sun size={15} aria-hidden="true" /> Light</button>
          <button type="button" aria-pressed={theme === "dark"} onClick={() => onThemeChange("dark")}><Moon size={15} aria-hidden="true" /> Dark</button>
        </div>
      </div>
      {resumePosition !== null && (
        <section className="reading-resume" aria-label="Continue reading">
          <p>You left off about <strong>{Math.round(resumePosition * 100)}%</strong> through this article.</p>
          <div className="reading-resume-actions">
            <button className="button secondary" type="button" onClick={resumeReading}>Continue reading</button>
            <button className="text-link" type="button" onClick={startFromBeginning}>Start from the beginning</button>
          </div>
        </section>
      )}
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
