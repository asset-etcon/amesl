import sanitizeHtml from "sanitize-html";

/**
 * Server-side HTML allowlist for rich text authored in the admin.
 *
 * TipTap constrains what the editor UI can produce, but the editor runs in the
 * browser and the HTML it emits is untrusted input by the time it reaches a
 * server action. Anything rendered with `dangerouslySetInnerHTML` must be
 * sanitised here first, otherwise a compromised or careless editor account
 * becomes stored XSS on every public page that includes the content.
 *
 * The policy is an allowlist: only the tags and attributes below survive, and
 * everything else, including all event handlers, script, style, iframe and
 * javascript: URLs, is stripped.
 */

/** Tags TipTap's StarterKit + Table + Link extensions can legitimately emit. */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "mark",
  "small",
  "sub",
  "sup",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
  "span",
  "div",
  // TipTap table extensions
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    // colspan and rowspan carry table shape; style is filtered by allowedStyles.
    td: ["colspan", "rowspan", "style", "align"],
    th: ["colspan", "rowspan", "style", "align", "scope"],
    p: ["style"],
    h1: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    h5: ["style"],
    h6: ["style"],
    span: ["style"],
    div: ["style"],
    ul: ["style"],
    ol: ["style"],
    li: ["style"],
    code: ["style"],
    pre: ["style"],
    blockquote: ["style"],
  },
  /**
   * Only these URL schemes survive. This is what stops a javascript: href and
   * data: payloads from reaching the rendered page.
   */
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { a: ["http", "https", "mailto", "tel"] },
  // Never emit a bare href, drop the attribute entirely instead.
  allowProtocolRelative: false,
  /**
   * style is allowed above because TipTap emits it for text alignment, but a
   * raw style attribute is a second injection surface, via url() beacons and
   * layout breakage. Keep only the declarative properties the editor can set.
   */
  allowedStyles: {
    "*": {
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-weight": [/^bold$|^normal$|^[1-9]00$/],
      "font-style": [/^italic$|^normal$/],
      "text-decoration": [/^underline$|^line-through$|^none$/],
    },
  },
  allowedClasses: {},
  disallowedTagsMode: "discard",
};

/** Strips every tag but keeps the text. Used for plain-text fields. */
export function sanitizeToText(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitises rich text for storage. Always call this in a server action before
 * writing to the database. Never trust the client to have produced safe HTML.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeHtml(input, SANITIZE_OPTIONS);
}

/** Strips markup for use in a title, meta description or JSON-LD string. */
export function sanitizePlainText(input: string | null | undefined, maxLength = 300): string {
  return sanitizeToText(input).slice(0, maxLength);
}

/**
 * U+2028 and U+2029 are legal inside JSON strings but terminate a line under
 * JavaScript parsing, so they are escaped alongside the angle brackets. They are
 * referenced by code point rather than written literally, because a literal
 * would itself split this source file across lines.
 */
const LINE_SEPARATOR = 0x2028;
const PARAGRAPH_SEPARATOR = 0x2029;

const JSON_LD_ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/</g, "\\u003c"],
  [/>/g, "\\u003e"],
  [/&/g, "\\u0026"],
  [new RegExp(String.fromCharCode(LINE_SEPARATOR), "g"), "\\u2028"],
  [new RegExp(String.fromCharCode(PARAGRAPH_SEPARATOR), "g"), "\\u2029"],
];

/**
 * Serialises a value for embedding inside an inline JSON-LD script element.
 * `JSON.stringify` alone is not sufficient: a string containing a closing
 * script tag terminates the element early and everything after it is parsed as
 * markup, which is a stored XSS vector for any field an editor can type into.
 */
export function jsonLdScript(data: unknown): string {
  let out = JSON.stringify(data);
  for (const [pattern, replacement] of JSON_LD_ESCAPES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
