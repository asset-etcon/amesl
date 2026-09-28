import Link from "next/link";

export interface LabelFacet {
  slug: string;
  name: string;
  total: number;
}

export interface LabelFilterProps {
  labels: LabelFacet[];
  activeSlug?: string;
  /** Preserved across every chip link so a filter change never drops the others. */
  hrefFor: (label: string) => string;
}

/**
 * Chip row of active labels for the catalogue grid. Counts come from the page,
 * which counts published products per label independently of the other active
 * filters, so a label does not appear to shrink as `q` or `brand` narrow things.
 */
export function LabelFilter({ labels, activeSlug, hrefFor }: LabelFilterProps) {
  if (labels.length === 0) return null;

  return (
    <nav className="label-filter" aria-label="Filter products by label">
      <Link
        href={hrefFor("")}
        className={`label-chip${activeSlug ? "" : " is-active"}`}
        aria-current={activeSlug ? undefined : "true"}
      >
        All labels
      </Link>
      {labels.map((label) => (
        <Link
          key={label.slug}
          href={hrefFor(label.slug)}
          className={`label-chip${activeSlug === label.slug ? " is-active" : ""}`}
          aria-current={activeSlug === label.slug ? "true" : undefined}
        >
          {label.name}
          <span className="label-chip-count">{label.total}</span>
        </Link>
      ))}
    </nav>
  );
}
