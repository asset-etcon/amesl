import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface WallBrand {
  slug: string;
  name: string;
  logo_url: string;
}

export function BrandWall({ brands, activeSlug }: { brands: WallBrand[]; activeSlug?: string }) {
  if (brands.length === 0) return null;

  return (
    <section className="brand-wall">
      <div className="brand-wall-head">
        <p className="eyebrow">Product catalogue</p>
        <h1>Browse products by brand</h1>
      </div>
      <div className="brand-wall-grid">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/products?brand=${encodeURIComponent(b.slug)}`}
            title={b.name}
            aria-label={`View ${b.name} products`}
            className={cn("brand-wall-logo", activeSlug === b.slug && "is-active")}
          >
            {b.logo_url ? (
              <Image src={b.logo_url} alt={b.name} fill sizes="(max-width: 640px) 50vw, 220px" unoptimized />
            ) : (
              <span className="brand-wall-fallback">{b.name.slice(0, 1) || "B"}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}