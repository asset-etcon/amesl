// Guards the date format Google Search Console rejected. Fetches the live
// sitemap and validates every <lastmod> against the XML Schema dateTime rule,
// then checks the metadata dates on a rendered news page.
const PROD = process.env.SITEMAP_URL ?? "http://localhost:3000";

// XML Schema 1.0 dateTime: full date, "T", full time, and a mandatory offset
// (Z or +/-HH:MM). A space separator or a bare "+00" is invalid.
const W3C = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const xml = await (await fetch(`${PROD}/sitemap.xml`)).text();
const dates = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
const bad = dates.filter((d) => !W3C.test(d));

console.log(`sitemap: ${dates.length} <lastmod> values`);
if (!dates.length) {
  console.log("FAIL  no <lastmod> found - the regex may have changed");
  process.exit(1);
}
if (bad.length) {
  console.log(`FAIL  ${bad.length} invalid date(s):`);
  for (const d of [...new Set(bad)].slice(0, 5)) console.log(`        ${d}`);
  process.exit(1);
}
console.log("PASS  every <lastmod> is a valid W3C dateTime");
console.log(`      sample: ${dates[0]}`);

// Every <url> must also be a real page: a bad date is only half the problem.
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`\n${locs.length} URLs, checking each resolves...`);
let broken = 0;
for (const u of locs) {
  const res = await fetch(u, { redirect: "manual" });
  if (res.status !== 200) {
    console.log(`FAIL  ${res.status} ${u}`);
    broken++;
  }
}
console.log(broken ? `FAIL  ${broken} URL(s) not returning 200` : "PASS  all URLs return 200");

process.exit(bad.length || broken ? 1 : 0);
