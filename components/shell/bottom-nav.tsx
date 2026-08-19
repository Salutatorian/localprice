"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { Home, Search, ScanLine, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { navIndex } from "@/lib/nav-motion";

const BLOB_INSET = 6;

function tabOffset(list: HTMLElement, tab: HTMLElement) {
  const parent = list.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  return {
    x: box.left - parent.left + BLOB_INSET,
    y: box.top - parent.top + BLOB_INSET,
    w: box.width - BLOB_INSET * 2,
    h: box.height - BLOB_INSET * 2,
  };
}

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const primed = useRef(false);
  const items = [
    { href: "/m/saipan", label: "Prices", icon: Home, match: (path: string) => path.startsWith("/m/") && !path.includes("/search") && !path.includes("/baskets") },
    { href: "/m/saipan/search", label: "Search", icon: Search, match: (path: string) => path.includes("/search") },
    { href: "/scan", label: "Scan", icon: ScanLine, match: (path: string) => path.startsWith("/scan") || path.startsWith("/receipts") },
    {
      href: signedIn ? "/saved" : "/login?next=/saved",
      label: "Baskets",
      icon: ShoppingBasket,
      match: (path: string) => path.startsWith("/saved") || path.includes("/baskets"),
    },
  ];
  const active = Math.max(0, navIndex(pathname));
  const hasActive = navIndex(pathname) >= 0;

  useLayoutEffect(() => {
    const list = listRef.current;
    const lead = leadRef.current;
    const trail = trailRef.current;
    if (!list || !lead || !trail) {
      return;
    }
    const target = list.querySelectorAll("a")[active];
    if (!target || !hasActive) {
      lead.style.opacity = "0";
      trail.style.opacity = "0";
      return;
    }
    const { x, y, w, h } = tabOffset(list, target);
    const move = `translate(${x}px, ${y}px)`;
    lead.style.width = `${w}px`;
    lead.style.height = `${h}px`;
    trail.style.width = `${w}px`;
    trail.style.height = `${h}px`;
    lead.style.opacity = "1";
    trail.style.opacity = "1";

    if (!primed.current) {
      lead.style.transition = "none";
      trail.style.transition = "none";
      lead.style.transform = move;
      trail.style.transform = move;
      void lead.offsetWidth;
      lead.style.transition = "";
      trail.style.transition = "";
      primed.current = true;
      return;
    }

    lead.style.transform = move;
    trail.style.transform = move;
  }, [active, hasActive, pathname]);

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <filter id="tab-goo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <ul
        ref={listRef}
        className="pointer-events-auto relative isolate flex h-16 items-center gap-1 overflow-hidden rounded-full bg-paper px-2 text-paper-foreground shadow-[0_18px_40px_-18px_oklch(0_0_0_/_0.55)]"
      >
        <span className="tab-goo pointer-events-none absolute inset-0">
          <span ref={trailRef} className="tab-blob tab-blob-trail" />
          <span ref={leadRef} className="tab-blob tab-blob-lead" />
        </span>
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative z-10">
              <Link
                href={item.href}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full transition-colors duration-300",
                  isActive ? "text-foreground" : "text-paper-foreground/70 hover:text-paper-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
