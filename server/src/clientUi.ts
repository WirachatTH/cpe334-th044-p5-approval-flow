import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import { ConfigError } from "./config.js";

// Serving the built UI from the API (F-05 contract v0.7, section 2.2). It is used only when CLIENT_DIST_DIR is set, so
// that one container can hold the whole application. It answers GET and HEAD outside /api and nothing else, and it is
// installed before the F-02 guards, so the UI is public and every /api route keeps its policy and its JSON errors.

const isApiPath = (requestPath: string): boolean => requestPath === "/api" || requestPath.startsWith("/api/");

export function serveClientUi(app: Express, directory: string): void {
  const root = path.resolve(directory);
  const indexFile = path.join(root, "index.html");
  // Refuse to start, instead of answering every page with an error later. The message names the variable, not its value.
  if (!existsSync(indexFile)) throw new ConfigError("config: CLIENT_DIST_DIR has no index.html");

  // `fallthrough` is the default: a path that names no file in the directory (or tries to leave it) goes on to the page.
  const files = express.static(root, { index: false, redirect: false });

  app.use((req, res, next) => (isApiPath(req.path) ? next() : files(req, res, next)));

  // Any other GET or HEAD outside /api is a page of the single-page app (a deep link), so it gets index.html.
  app.use((req, res, next) => {
    if (isApiPath(req.path) || (req.method !== "GET" && req.method !== "HEAD")) return next();
    res.set("Cache-Control", "no-cache");
    res.sendFile(indexFile, (error) => {
      if (error && !res.headersSent) next(error);
    });
  });
}
