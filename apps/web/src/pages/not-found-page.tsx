import { AppLink } from "../lib/router";

export function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="eyebrow">404</p>
      <h1>这条研究路径不存在</h1>
      <p>链接可能已经变化，但本地案例不会因此被删除。</p>
      <AppLink href="/" className="primary-action">返回工作台</AppLink>
    </div>
  );
}
