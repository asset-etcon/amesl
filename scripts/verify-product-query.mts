/**
 * Pins the /products query-string rules in lib/product-catalogue.ts.
 *
 * This is a pure-function check with no database, but it lives in scripts/ next
 * to the other verify-*.mts runners because the repo has no unit test runner;
 * run it with `npx tsx scripts/verify-product-query.mts`.
 *
 * The regression it exists for: an earlier buildQuery treated a falsy value in
 * its `extra` overrides as "leave this key alone", so clearing a facet was
 * impossible. "All labels" regenerated the URL it was already on.
 */
import { buildCatalogueHref, DEFAULT_SORT, type CatalogueQuery } from "../lib/product-catalogue";

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

/** Reads a param out of an href, or "" when absent, so "absent" and "cleared" compare equal. */
const param = (href: string, key: string): string => new URL(href, "https://example.test").searchParams.get(key) ?? "";

const base: CatalogueQuery = { q: "", brand: "", label: "", sort: DEFAULT_SORT };

// 1. A bare catalogue is the bare path, with no stray "?" or empty params.
check("empty query yields the bare path", buildCatalogueHref(base) === "/products", buildCatalogueHref(base));

// 2. An explicit default sort is omitted, since /products already means it.
check(
  "default sort is omitted",
  !buildCatalogueHref({ ...base, sort: DEFAULT_SORT }).includes("sort"),
  buildCatalogueHref({ ...base, sort: DEFAULT_SORT }),
);
check("a non-default sort is kept", buildCatalogueHref({ ...base, sort: "name" }).includes("sort=name"));

// 3. Pagination inherits every other facet, because it only passes `page`.
const filtered: CatalogueQuery = { q: "analyser", brand: "doble", label: "thermography", sort: "name" };
const page2 = buildCatalogueHref(filtered, { page: "2" });
check("pagination preserves brand", param(page2, "brand") === "doble", page2);
check("pagination preserves label", param(page2, "label") === "thermography", page2);
check("pagination preserves search", param(page2, "q") === "analyser", page2);
check("pagination preserves sort", param(page2, "sort") === "name", page2);
check("pagination sets the page", param(page2, "page") === "2", page2);

// 4. THE REGRESSION. Clearing a facet must remove the key, not leave the seeded
//    value, and must not emit an empty "label=".
const allLabels = buildCatalogueHref(filtered, { label: "", page: "" });
check("clearing the label removes it", param(allLabels, "label") === "", allLabels);
check("clearing the label emits no empty label param", !allLabels.includes("label="), allLabels);
check("clearing the label keeps the brand", param(allLabels, "brand") === "doble", allLabels);
check("clearing the label keeps the search", param(allLabels, "q") === "analyser", allLabels);
check("clearing the label also drops the page", param(allLabels, "page") === "", allLabels);

// 5. Selecting a different label replaces the active one rather than adding to it.
const switched = buildCatalogueHref({ ...base, brand: "doble", label: "old-label" }, { label: "new-label", page: "" });
check("switching labels replaces the old one", param(switched, "label") === "new-label", switched);
check("switching labels keeps the brand", param(switched, "brand") === "doble", switched);
check("switching labels resets to page one", !switched.includes("page="), switched);

// 6. Selecting a label from an unlabelled view adds it and keeps the brand.
const firstLabel = buildCatalogueHref({ ...base, brand: "doble" }, { label: "thermography", page: "" });
check("first label selection is applied", param(firstLabel, "label") === "thermography", firstLabel);

// 7. Clearing the brand works the same way, so the two facets are symmetric.
const noBrand = buildCatalogueHref({ ...base, brand: "doble", label: "thermography" }, { brand: "" });
check("clearing the brand removes it", param(noBrand, "brand") === "", noBrand);
check("clearing the brand keeps the label", param(noBrand, "label") === "thermography", noBrand);

// 8. Clearing everything returns to the bare path, not "/products?q=&brand=".
check("clearing every facet yields the bare path", buildCatalogueHref(filtered, { q: "", brand: "", label: "", sort: "", page: "" }) === "/products");

// 9. Special characters survive a round trip rather than breaking the link.
const tricky = buildCatalogueHref(base, { q: "gear & bearing", label: "a b" });
check("ampersands and spaces are encoded", param(tricky, "q") === "gear & bearing", tricky);
check("encoded label round-trips", param(tricky, "label") === "a b", tricky);

console.log(failures === 0 ? "\nALL QUERY CHECKS PASSED" : `\n${failures} QUERY CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
