// Turns the tutorial pages (MDX) into plain markdown for dev.to, Hashnode or Medium.
//
//   npm run cross-post                      every tutorial -> docs/.cross-post/<slug>.md
//   npm run cross-post -- react-shift-planner   one tutorial
//   SITE_URL=https://example.com npm run cross-post   another docs origin
//
// What it changes: imports and the Starlight `Aside` / demo components are removed or
// rewritten, relative links become absolute, `title="file"` on a code fence becomes a bold
// file name above it, and a canonical footer is added. Set the canonical URL (printed at the
// end) in the editor of the site you post to. See MARKETING.md for the update checklist.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "src/content/docs/tutorials");
const OUT = join(root, ".cross-post");
const SITE = (process.env.SITE_URL ?? "https://resource-scheduler-docs.vercel.app").replace(/\/$/, "");

export function convert(mdx, canonical) {
  let s = mdx.replace(/\r\n/g, "\n");
  const frontmatter = s.match(/^---\n([\s\S]*?)\n---\n/);
  const title = frontmatter[1].match(/^title:\s*(.*)$/m)[1].trim();
  s = s.slice(frontmatter[0].length);
  s = s.replace(/^\s*(import .*\n)+/, ""); // only the MDX imports at the top, not code in fences
  s = s.replace(/<(\w+Demo) client:only="react" \/>/g, `*See it running live: [interactive demo](${canonical}).*`);
  s = s.replace(
    /<Aside type="\w+" title="([^"]*)">\n([\s\S]*?)\n<\/Aside>/g,
    (_, heading, body) => `> **${heading}.** ${body.split("\n").map((l) => l.trim()).join(" ").trim()}`
  );
  s = s.replace(/\]\((\/[^)\s]*)\)/g, (_, path) => `](${SITE}${path})`);
  s = s.replace(/^```(\w+) title="([^"]+)"$/gm, (_, lang, file) => `**\`${file}\`**\n\n\`\`\`${lang}`);
  s = s.replace(/^\n+/, "").trimEnd();
  const tour = `[![Watch the 40-second tour](${SITE}/launch-poster.png)](${SITE}/launch.mp4)\n\n`;
  return { title, body: `${tour}${s}\n\n---\n\n*Originally published at [${canonical}](${canonical}).*\n` };
}

const all = readdirSync(SRC).filter((f) => f.endsWith(".mdx")).map((f) => f.slice(0, -4));
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : all;
mkdirSync(OUT, { recursive: true });

for (const slug of slugs) {
  if (!all.includes(slug)) throw new Error(`No tutorial "${slug}". Choose from: ${all.join(", ")}`);
  const canonical = `${SITE}/tutorials/${slug}/`;
  const { title, body } = convert(readFileSync(join(SRC, `${slug}.mdx`), "utf8"), canonical);
  writeFileSync(join(OUT, `${slug}.md`), body);
  const leftovers = (body.match(/<Aside|client:only|astrojs/g) ?? []).length;
  console.log(`${slug}.md  "${title}"  canonical ${canonical}${leftovers ? `  WARNING: ${leftovers} MDX leftovers` : ""}`);
}
console.log(`Written to ${OUT}`);
