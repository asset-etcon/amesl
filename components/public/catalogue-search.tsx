export interface SearchBarProps {
  q: string;
  brand?: string;
  placeholder?: string;
}

export function CatalogueSearch({ q, brand, placeholder = "Search products…" }: SearchBarProps) {
  return (
    <form method="get" action="/products" className="cat-search-top">
      <div className="cat-search">
        <input type="search" name="q" placeholder={placeholder} defaultValue={q} aria-label="Search products" autoComplete="off" />
        <button type="submit">Search</button>
      </div>
      {brand && <input type="hidden" name="brand" value={brand} />}
    </form>
  );
}