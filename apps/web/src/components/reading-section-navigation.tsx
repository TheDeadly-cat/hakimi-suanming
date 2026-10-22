import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "reading-natal", label: "主报告" },
  { id: "reading-life", label: "人生大运" },
  { id: "reading-yearly", label: "流年流月" },
  { id: "reading-feedback", label: "填写反馈" },
  { id: "reading-records", label: "已存解读" }
] as const;

export function revealReadingSection(id: string) {
  const target = document.getElementById(id);
  let ancestor = target?.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  return target;
}

export function ReadingSectionNavigation({ canGiveFeedback }: { canGiveFeedback: boolean }) {
  const [active, setActive] = useState<string>("reading-natal");
  useEffect(() => {
    const openHashTarget = () => {
      if (window.location.hash.startsWith("#reading-")) revealReadingSection(window.location.hash.slice(1));
    };
    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);
    return () => window.removeEventListener("hashchange", openHashTarget);
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      }
      const current = [...visible].sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
      if (current) setActive(current[0]);
    }, { rootMargin: "-100px 0px -55% 0px", threshold: 0 });
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [canGiveFeedback]);
  return <nav className="reading-section-navigation" aria-label="解读章节导航">
    {SECTIONS.filter((section) => canGiveFeedback || section.id !== "reading-feedback").map((section) =>
      <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined} onClick={() => { revealReadingSection(section.id); setActive(section.id); }}>{section.label}</a>)}
  </nav>;
}
