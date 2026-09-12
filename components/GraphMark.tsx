export function GraphMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 9 24 8M9 10l6 13M23 10l-7 13" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7" cy="8" r="4" fill="currentColor" />
      <circle cx="25" cy="7" r="3" fill="currentColor" />
      <circle cx="16" cy="25" r="4" fill="currentColor" />
    </svg>
  );
}
