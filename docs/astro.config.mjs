// @ts-check
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Set these for your deployment (Vercel: Project Settings > Environment Variables).
const site = process.env.SITE_URL ?? "https://resource-scheduler-docs.vercel.app";
const base = process.env.DOCS_BASE ?? "/";

// The live demos import the package source, so the docs always show what is on
// this branch. See src/styles/scheduler.css for the matching styles.
const schedulerSrc = fileURLToPath(
  new URL("../resource-scheduler/src/components/ResourceScheduler", import.meta.url)
);
// `resource-scheduler/headless`: the demo that builds its own UI imports it as @headless.
const headlessEntry = fileURLToPath(new URL("../resource-scheduler/src/headless.ts", import.meta.url));
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
      components: { 
        Footer: "./src/components/Footer.astro",
        Head: "./src/components/Head.astro"
      },
      customCss: ["./src/styles/scheduler.css", "./src/styles/custom.css"],
      head: [
        { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" } },
        { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" } },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
          },
        },
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
            { label: "Live demos", link: "/showcase/" },
          ],
        },
        // Twenty guides in one list is too many to scan, so they sit in five groups by task.
        {
          label: "Guides",
          items: [
            {
              label: "Basics",
              items: [
                { label: "Data model", slug: "guides/data-model" },
                { label: "Views and slots", slug: "guides/views-and-slots" },
                { label: "Creating events", slug: "guides/creating-events" },
                { label: "Drag and resize", slug: "guides/drag-and-resize" },
                { label: "Load data and control the view", slug: "guides/loading-and-control" },
              ],
            },
            {
              label: "Rules and availability",
              items: [
                { label: "Conflict control", slug: "guides/conflict-control" },
                { label: "Business hours and availability", slug: "guides/availability" },
                { label: "Recurring events", slug: "guides/recurring-events" },
                { label: "Utilization", slug: "guides/utilization" },
              ],
            },
            {
              label: "Display",
              items: [
                { label: "Resource groups", slug: "guides/resource-groups" },
                { label: "Theming", slug: "guides/theming" },
                { label: "Languages and clocks", slug: "guides/internationalization" },
                { label: "Time zones", slug: "guides/time-zones" },
                { label: "Keyboard and accessibility", slug: "guides/keyboard-and-accessibility" },
                { label: "Printing", slug: "guides/printing" },
              ],
            },
            {
              label: "Data and scale",
              items: [
                { label: "Export and import calendar files", slug: "guides/export" },
                { label: "Large data and performance", slug: "guides/performance" },
              ],
            },
            {
              label: "Advanced",
              items: [
                { label: "Replace parts", slug: "guides/components" },
                { label: "Build your own UI", slug: "guides/build-your-own-ui" },
                { label: "Next.js and SSR", slug: "guides/nextjs-and-ssr" },
              ],
            },
          ],
        },
        // Tutorials build an app step by step; recipes are the finished code to copy.
        {
          label: "Tutorials: step by step",
          items: [
            { label: "A plain resource timeline", slug: "tutorials/free-react-resource-timeline" },
            { label: "Room booking calendar", slug: "tutorials/react-room-booking-calendar" },
            { label: "Room booking with Next.js and Prisma", slug: "tutorials/react-room-booking-nextjs-prisma" },
            { label: "Shift planner", slug: "tutorials/react-shift-planner" },
            { label: "Clinic appointment board", slug: "tutorials/react-clinic-appointment-board" },
            { label: "Equipment rental calendar", slug: "tutorials/react-equipment-rental-calendar" },
          ],
        },
        {
          label: "Recipes: code to copy",
          items: [
            { label: "Room booking", slug: "recipes/room-booking" },
            { label: "Shift roster", slug: "recipes/shift-roster" },
            { label: "Equipment rental", slug: "recipes/equipment-rental" },
            { label: "Field service dispatch", slug: "recipes/field-service-dispatch" },
            { label: "Project allocation", slug: "recipes/project-allocation" },
          ],
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
            { label: "Headless API", slug: "reference/headless" },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@scheduler": schedulerSrc, "@headless": headlessEntry },
      // The package source has its own node_modules; make sure React is one copy.
      dedupe: ["react", "react-dom"],
    },
    server: { fs: { allow: [repoRoot] } },
  },
});
