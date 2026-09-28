export interface SearchBarProps {
  q: string;
  brand?: string;
  label?: string;
  placeholder?: string;
}

export function CatalogueSearch({ q, brand, label, placeholder = "Search products…" }: SearchBarProps) {
  return (
    <form method="get" action="/products" className="cat-search-top">
      <div className="cat-search">
        <input type="search" name="q" placeholder={placeholder} defaultValue={q} aria-label="Search products" autoComplete="off" />
        <button type="submit">Search</button>
      </div>
      {brand && <input type="hidden" name="brand" value={brand} />}
      {/* Keeps a search inside the active label rather than dropping back to the whole catalogue. */}
      {label && <input type="hidden" name="label" value={label} />}
    </form>
  );
}