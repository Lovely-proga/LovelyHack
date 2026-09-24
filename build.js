import esbuild from "esbuild";
import fs from "fs";

const meta = `// ==UserScript==
// @name         Ballcrack
// @namespace    *://miniblox.io/*
// @version      1.0.0
// @author       Wang
// @description  We do a little thugging
// @match        *://miniblox.io/*
// @grant        none
// ==/UserScript==
`;

function log(label) {
  console.log(`[esbuild] ${label} built @ ${new Date().toLocaleTimeString()}`);
}

function logPlugin(label) {
  return {
    name: `log-${label}`,
    setup(build) {
      build.onEnd(result => {
        if (!result.errors.length) {
          log(label);
        }
      });
    }
  };
}

const common = {
  entryPoints: ["src/index.js"],
  bundle: true,
  minify: true,
  loader: { ".css": "text" }
};

async function buildBookmarklet() {
  const result = await esbuild.build({
    ...common,
    format: "iife",
    platform: "browser",
    write: false
  });

  const code = result.outputFiles[0].text;
  const wrapped =
    "javascript:" +
    encodeURIComponent(`(()=>{${code}})()`);

  fs.writeFileSync("dist/bookmarklet.txt", wrapped);
  log("bookmarklet");
}

async function run(watch = false) {
  const normal = await esbuild.context({
    ...common,
    outfile: "dist/ballcrack.js",
    plugins: [logPlugin("normal")]
  });

  const user = await esbuild.context({
    ...common,
    format: "iife",
    platform: "browser",
    banner: { js: meta },
    outfile: "dist/ballcrack.user.js",
    plugins: [logPlugin("user")]
  });

  if (watch) {
    await normal.watch();
    await user.watch();
    await buildBookmarklet();
    log("initial (watch)");
  } else {
    await normal.rebuild();
    await user.rebuild();
    await buildBookmarklet();
    await normal.dispose();
    await user.dispose();
  }
}

const watch = process.argv.includes("--watch");
run(watch);