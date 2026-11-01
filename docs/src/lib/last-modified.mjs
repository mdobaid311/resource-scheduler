// The last commit date of each docs file, for the sitemap's <lastmod> and each page's
// dateModified. Vercel and CI clone shallowly, which would date every older file to the
// clone's oldest commit, so a shallow clone is deepened first; if that fails there are
// no dates at all (none is better than a wrong one).
import { execFileSync } from "node:child_process";

// Paths are relative to the Astro project root, where the build runs. Not import.meta.url:
// inside the built page chunks that points into dist/.
const git = (...args) =>
  execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

function load() {
  const dates = new Map();
  try {
    if (git("rev-parse", "--is-shallow-repository") === "true") git("fetch", "--unshallow", "--quiet");
    if (git("rev-parse", "--is-shallow-repository") === "true") return dates;
    let date;
    // Newest commit first, so the first date seen for a file is its last change.
    for (const line of git("log", "--format=@%cI", "--name-only", "--relative", "--", "src").split("\n")) {
      if (line.startsWith("@")) date = line.slice(1);
      else if (line && !dates.has(line)) dates.set(line, date);
    }
  } catch {
    dates.clear();
  }
  return dates;
}

const dates = load();

/** ISO 8601 date of the last commit that changed `file` (relative to the project root), if known. */
export const lastModified = (file) => dates.get(file.replace(/\\/g, "/"));
