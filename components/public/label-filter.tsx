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
 * scoped to the active brand, so a brand page never offers a label it has no
 * products for. The search term is not part of that scope: a chip row that
 * reshuffles while you type is worse than a chip that lands on the empty state,
 * which names the label and offers the way back.
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
