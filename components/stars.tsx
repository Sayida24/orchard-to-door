/** Read-only star rating, e.g. 4 of 5 filled. Screen readers hear "4 out of 5 stars". */
export function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(rating % 1 ? 1 : 0)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          aria-hidden="true"
          className={`${size} ${i <= rounded ? "text-amber-500" : "text-stone-300"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.59 0l-4.73 2.88a.56.56 0 0 1-.84-.61l1.29-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35Z" />
        </svg>
      ))}
    </span>
  );
}
