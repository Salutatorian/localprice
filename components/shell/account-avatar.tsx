"use client";

import { useState } from "react";
import Link from "next/link";

export function AccountAvatar({
  href,
  src,
  name,
}: {
  href: string;
  src: string | null;
  name: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <Link
      href={href}
      aria-label="Account"
      className="inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-white/12 ring-1 ring-white/15"
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-sm font-medium">
          {initial}
        </span>
      )}
    </Link>
  );
}
