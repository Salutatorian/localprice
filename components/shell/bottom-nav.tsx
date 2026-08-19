import Link from "next/link";

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const items = [
    { href: "/m/saipan", label: "Prices" },
    { href: "/m/saipan/search", label: "Search" },
    { href: "/scan", label: "Scan" },
    { href: signedIn ? "/saved" : "/login?next=/saved", label: "Baskets" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex h-14 items-center justify-center text-sm font-medium text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
