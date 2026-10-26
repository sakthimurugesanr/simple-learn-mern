export default function Loading() {
  return (
    <div className="shell animate-pulse py-12" aria-label="Loading" role="status">
      <div className="mb-8 h-12 w-1/2 bg-muted" />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] bg-muted" />
            <div className="mt-4 h-5 w-3/4 bg-muted" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
