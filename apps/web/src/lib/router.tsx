import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

export type AppLocation = {
  pathname: string;
  search: string;
};

export function getAppLocation(): AppLocation {
  return { pathname: window.location.pathname, search: window.location.search };
}

export function navigate(to: string, options?: { replace?: boolean; scroll?: boolean }): void {
  if (options?.replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (options?.scroll !== false) window.scrollTo({ top: 0, behavior: "instant" });
}

export function useAppLocation(): AppLocation {
  const [location, setLocation] = useState(getAppLocation);
  useEffect(() => {
    const onPopState = () => setLocation(getAppLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  return location;
}

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  navigationOptions?: { replace?: boolean; scroll?: boolean };
};

export function AppLink({ href, children, navigationOptions, onClick, ...props }: AppLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === "_blank"
    ) {
      return;
    }
    const target = new URL(href, window.location.origin);
    if (target.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(`${target.pathname}${target.search}${target.hash}`, navigationOptions);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
