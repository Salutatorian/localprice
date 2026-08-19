export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "size-5"}
      fill="currentColor"
    >
      <path d="M12 1.4 14.7 9.3 22.6 12 14.7 14.7 12 22.6 9.3 14.7 1.4 12 9.3 9.3 12 1.4Z" />
    </svg>
  );
}
