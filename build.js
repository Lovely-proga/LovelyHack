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
  format: "iife",
  platform: "browser",
  loader: { ".css": "text" }
};

async function run(watch = false) {
  const user = await esbuild.context({
    ...common,
    banner: { js: meta },
    outfile: "dist/ballcrack.user.js",
    plugins: [logPlugin("user")]
  });

  if (watch) {
    await user.watch();
    log("initial (watch)");
  } else {
    await user.rebuild();
    await user.dispose();
  }
}

const watch = process.argv.includes("--watch");
run(watch);
