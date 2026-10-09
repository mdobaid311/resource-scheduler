// @ts-check
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Set these for your deployment (Vercel: Project Settings > Environment Variables).
const site = process.env.SITE_URL ?? "https://resource-scheduler-demo.vercel.app";
const base = process.env.DOCS_BASE ?? "/";

// The live demos import the package source, so the docs always show what is on
// this branch. See src/styles/scheduler.css for the matching styles.
const schedulerSrc = fileURLToPath(
  new URL("../resource-scheduler/src/components/ResourceScheduler", import.meta.url)
);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  site,
  base,
  integrations: [
    react(),
    // Starlight adds its own sitemap unless one is listed. These pages are
    // tools (GIF, social card, benchmark), noindex and disallowed in robots.txt.
    sitemap({ filter: (page) => !/\/(hero|og|bench)\/?$/.test(page) }),
    starlight({
      title: "Resource Scheduler",
      description:
        "A free, MIT-licensed resource timeline for React: drag, resize, conflict rules, keyboard and screen reader support. Install from npm or copy the source with the shadcn CLI.",
      favicon: "/favicon.svg",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/mdobaid311/resource-scheduler",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/mdobaid311/resource-scheduler/edit/main/docs/",
      },
      customCss: ["./src/styles/scheduler.css", "./src/styles/custom.css"],
      head: [
        { tag: "meta", attrs: { name: "theme-color", content: "#2563eb" } },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: new URL("og.png", site + base.replace(/\/?$/, "/")).href,
          },
        },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: "Resource Scheduler",
            description:
              "Resource timeline component for React with drag and drop, resize, conflict rules and keyboard accessibility.",
            codeRepository: "https://github.com/mdobaid311/resource-scheduler",
            programmingLanguage: "TypeScript",
            license: "https://opensource.org/licenses/MIT",
          }),
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "start/introduction" },
            { label: "Installation", slug: "start/installation" },
            { label: "Quick start", slug: "start/quick-start" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Data model", slug: "guides/data-model" },
            { label: "Views and slots", slug: "guides/views-and-slots" },
            { label: "Load data and control the view", slug: "guides/loading-and-control" },
            { label: "Creating events", slug: "guides/creating-events" },
            { label: "Recurring events", slug: "guides/recurring-events" },
            { label: "Drag and resize", slug: "guides/drag-and-resize" },
            { label: "Conflict control", slug: "guides/conflict-control" },
            { label: "Business hours and availability", slug: "guides/availability" },
            { label: "Large data and performance", slug: "guides/performance" },
            { label: "Languages and clocks", slug: "guides/internationalization" },
            { label: "Keyboard and accessibility", slug: "guides/keyboard-and-accessibility" },
            { label: "Theming", slug: "guides/theming" },
            { label: "Next.js and SSR", slug: "guides/nextjs-and-ssr" },
          ],
        },
        {
          label: "Recipes",
          items: [{ label: "Room booking", slug: "recipes/room-booking" }],
        },
        {
          label: "Compare",
          items: [{ label: "Alternatives", slug: "compare/alternatives" }],
        },
        {
          label: "Reference",
          items: [
            { label: "Props", slug: "reference/props" },
            { label: "Types", slug: "reference/types" },
            { label: "Utilities and hooks", slug: "reference/utilities" },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@scheduler": schedulerSrc },
      // The package source has its own node_modules; make sure React is one copy.
      dedupe: ["react", "react-dom"],
    },
    server: { fs: { allow: [repoRoot] } },
  },
});
