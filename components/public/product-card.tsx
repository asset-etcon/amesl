import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";

export interface CardProduct {
  name: string;
  slug: string;
  brandSlug: string;
  brandName: string;
  categoryName: string | null;
  shortDescription: string;
  imageUrl: string | null;
}

export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link className="product-card" href={`/products/${product.brandSlug}/${product.slug}`}>
      <div className="product-card-image">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 760px) 100vw, 33vw" unoptimized />
        ) : (
          <span className="product-card-placeholder">{product.brandName.slice(0, 1) || "A"}</span>
        )}
      </div>
      <div className="product-card-body">
        <p className="product-card-brand">{product.brandName}</p>
        <h3 className="product-card-name">{product.name}</h3>
        {product.shortDescription && <p className="product-card-desc">{product.shortDescription}</p>}
        <div className="product-card-meta">
          {product.categoryName && <span className="product-card-chip">{product.categoryName}</span>}
          <span className="product-card-arrow"><ArrowUpRight size={15} /></span>
        </div>
      </div>
    </Link>
  );
}