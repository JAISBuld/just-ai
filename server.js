import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import MarkdownIt from "markdown-it";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      background: #f6f8fa;
      color: #1f2328;
    }
    main {
      max-width: 780px;
      margin: 2.5rem auto;
      padding: 2.5rem;
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(27, 31, 36, 0.08);
    }
    h1 { border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    hr { border: none; border-top: 1px solid #d0d7de; margin: 2rem 0; }
    a { color: #0969da; }
    code { background: rgba(175,184,193,.2); padding: .2em .4em; border-radius: 6px; }
    footer { max-width: 780px; margin: 1rem auto; color: #656d76; font-size: .85rem; text-align: center; }
  </style>
</head>
<body>
  <main>${body}</main>
  <footer>Served by the JAISBuild Info preview server</footer>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Only the README is served by default; any other path maps to a repo-local .md file.
    const rel = url.pathname === "/" ? "README.md" : url.pathname.replace(/^\/+/, "");
    const safeRel = normalize(rel);
    if (safeRel.startsWith("..") || !safeRel.toLowerCase().endsWith(".md")) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(page("Not found", "<h1>404</h1><p>Only markdown files are served.</p>"));
      return;
    }

    const source = await readFile(join(ROOT, safeRel), "utf8");
    const rendered = md.render(source);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page(safeRel, rendered));
  } catch (err) {
    if (err && err.code === "ENOENT") {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(page("Not found", "<h1>404</h1><p>File not found.</p>"));
      return;
    }
    res.writeHead(500, { "content-type": "text/html" });
    res.end(page("Error", "<h1>500</h1><p>Internal server error.</p>"));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`README preview server listening on http://${HOST}:${PORT}`);
});
