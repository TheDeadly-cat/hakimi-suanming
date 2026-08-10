import { AppLink } from "../lib/router";

export function ComparisonModeNav({ active }: { active: "formal" | "pair" }) {
  return (
    <nav className="comparison-mode-nav" aria-label="对照研究模式">
      <AppLink href="/compare" aria-current={active === "formal" ? "page" : undefined} className={active === "formal" ? "is-active" : ""}>
        <span>多盘 / 多规则</span>
        <small>2—4 个正式 Revision</small>
      </AppLink>
      <AppLink href="/compare/pair" aria-current={active === "pair" ? "page" : undefined} className={active === "pair" ? "is-active" : ""}>
        <span>双案例结构研究</span>
        <small>两个不同 Case · 事实层</small>
      </AppLink>
    </nav>
  );
}
