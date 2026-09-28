import { asc, eq, type SQL } from "drizzle-orm";
import { services } from "@/db/schema";

/**
 * The one definition of "a service is publicly visible".
 *
 * Every public read — the /services grid, a /services/<slug> page, the homepage
 * "Our expertise" band and the sitemap — MUST use this predicate. If any of them
 * re-derives the rule it can drift, and the usual failure is a deactivated
 * service staying reachable by direct URL.
 */
export function activeServiceWhere(): SQL {
  return eq(services.status, "active")!;
}

/** The JS mirror of `activeServiceWhere`, so the admin list never disagrees with the public site. */
export function isServiceVisible(service: { status: string }): boolean {
  return service.status === "active";
}

/**
 * Grid order, as chosen in the admin.
 *
 * `name` is a tiebreaker, not decoration: without it, two services sharing a
 * `display_order` can swap places between renders, which moves a URL's position
 * in the grid unpredictably.
 */
export const serviceOrder = [asc(services.display_order), asc(services.name)];
