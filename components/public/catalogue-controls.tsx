"use client";

import { useRef } from "react";
import Link from "next/link";

export interface ControlOption {
  value: string;
  label: string;
}

interface Props {
  brands: ControlOption[];
  categories: ControlOption[];
  current: { q: string; brand: string; category: string; sort: string };
  hasFilters: boolean;
  searchPlaceholder?: string;
}

export function CatalogueControls({ brands, categories, current, hasFilters, searchPlaceholder = "Search products…" }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form ref={formRef} method="get" action="/products" className="cat-controls">
      <div className="cat-search">
        <input type="search" name="q" placeholder={searchPlaceholder} defaultValue={current.q} aria-label="Search products" autoComplete="off" />
        <button type="submit">Search</button>
      </div>
      <div className="cat-select-row">
        <select name="brand" defaultValue={current.brand} onChange={submit} aria-label="Filter by brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select name="category" defaultValue={current.category} onChange={submit} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select name="sort" defaultValue={current.sort} onChange={submit} aria-label="Sort products">
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
        {hasFilters && (
          <Link href={current.sort ? `/products?sort=${current.sort}` : "/products"} className="cat-clear">
            Clear filters ×
          </Link>
        )}
      </div>
    </form>
  );
}