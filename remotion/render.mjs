import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_CACHE_FILE = path.resolve(__dirname, ".bundle_cache");

async function getBundleLocation() {
  // Check cache
  if (existsSync(BUNDLE_CACHE_FILE)) {
    const cached = readFileSync(BUNDLE_CACHE_FILE, "utf8").trim();
    if (existsSync(cached)) {
      console.error("[Remotion] Using cached bundle: " + cached);
      return cached;
    }
  }

  console.error("[Remotion] Bundling composition...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "src/index.jsx"),
    webpackOverride: (config) => config,
  });

  writeFileSync(BUNDLE_CACHE_FILE, bundleLocation);
  console.error("[Remotion] Bundle created: " + bundleLocation);
  return bundleLocation;
}

async function main() {
  const [dataPath, outputPath] = process.argv.slice(2);

  if (!dataPath || !outputPath) {
    console.error("Usage: node render.mjs <data.json> <output.mp4>");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  console.error(`[Remotion] Rendering ${data.slides?.length || 0} slides...`);

  // Ensure browser is available - use system chromium
  const browserExePath = "/usr/bin/chromium";

  const bundleLocation = await getBundleLocation();

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ExplainerVideo",
    inputProps: data,
    browserExecutable: browserExePath,
    chromiumOptions: { disableWebSecurity: true },
  });

  console.error(`[Remotion] Composition: ${composition.durationInFrames} frames @ ${composition.fps}fps (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);

  let lastProgress = 0;
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: data,
    chromiumOptions: { disableWebSecurity: true, gl: "swangle" },
    browserExecutable: browserExePath,
    concurrency: 2,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct >= lastProgress + 10) {
        console.error(`[Remotion] Progress: ${pct}%`);
        lastProgress = pct;
      }
    },
  });

  // Signal completion via stdout
  console.log(JSON.stringify({ success: true, output: outputPath }));
}

main().catch((err) => {
  console.error("[Remotion] Error:", err.message);
  console.log(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
