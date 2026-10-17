// Turning sources into passages, and questions into search terms. Kept free
// of the database so it can be tested on its own.

const CHUNK = 900;

// Words too common to say anything about what was asked.
const STOP = new Set(
  "the a an and or but if of to in on at for with from by is are was were be been am do does did can could will would should may might what which who whom whose when where why how this that these those it its i you he she we they me my your our their there here not no yes please tell know want about any some".split(
    " ",
  ),
);

// Splits text into passages of about CHUNK characters, breaking between
// paragraphs, then sentences, so each passage reads on its own.
export function chunkText(text: string): string[] {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const pieces = paragraphs.flatMap((p) =>
    p.length <= CHUNK ? [p] : (p.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) ?? [p]).map((s) => s.trim()),
  );
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    // A single sentence longer than a chunk is cut where it must be.
    for (let at = 0; at < piece.length; at += CHUNK) {
      const part = piece.slice(at, at + CHUNK);
      if (current && current.length + part.length + 1 > CHUNK) {
        chunks.push(current);
        current = "";
      }
      current = current ? `${current} ${part}` : part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// The readable text of an HTML page: no scripts, styles or navigation.
export function htmlToText(html: string): { title: string; text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const text = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)\s*>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n")
    .trim();
  return { title: decode(title), text };
}

const decode = (value: string) =>
  value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ");

// The words of a question as an OR query, so a passage matching any of the
// meaningful ones is found and the best-matching one ranks first.
export function searchTerms(question: string): string[] {
  const words = question
    .toLowerCase()
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 12);
}
