import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_CACHE_FILE = path.resolve(__dirname, ".bundle_cache");

// Detect browser based on platform
function getBrowserPath() {
  const platform = os.platform();
  
  if (platform === "win32") {
    // Windows - common Chrome paths
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    ];
    for (const p of possiblePaths) {
      if (existsSync(p)) return p;
    }
  } else if (platform === "darwin") {
    // macOS
    const macPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (existsSync(macPath)) return macPath;
  } else {
    // Linux
    const linuxPaths = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];
    for (const p of linuxPaths) {
      if (existsSync(p)) return p;
    }
  }
  
  // Return null - Remotion will download Chrome automatically
  return null;
}

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

  // Detect browser or let Remotion download Chrome
  const browserExePath = getBrowserPath();
  if (browserExePath) {
    console.error(`[Remotion] Using browser: ${browserExePath}`);
  } else {
    console.error("[Remotion] Browser not found - Remotion will download Chrome automatically");
  }

  const bundleLocation = await getBundleLocation();

  const compositionConfig = {
    serveUrl: bundleLocation,
    id: "ExplainerVideo",
    inputProps: data,
    chromiumOptions: { disableWebSecurity: true },
  };
  
  if (browserExePath) {
    compositionConfig.browserExecutable = browserExePath;
  }

  const composition = await selectComposition(compositionConfig);

  console.error(`[Remotion] Composition: ${composition.durationInFrames} frames @ ${composition.fps}fps (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`);

  let lastProgress = 0;
  
  const renderConfig = {
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: data,
    chromiumOptions: { disableWebSecurity: true, gl: "swangle" },
    concurrency: 2,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct >= lastProgress + 5) {
        console.error(`[Remotion] Progress: ${pct}%`);
        lastProgress = pct;
      }
    },
  };
  
  if (browserExePath) {
    renderConfig.browserExecutable = browserExePath;
  }
  
  await renderMedia(renderConfig);

  // Signal completion via stdout
  console.log(JSON.stringify({ success: true, output: outputPath }));
}

main().catch((err) => {
  console.error("[Remotion] Error:", err.message);
  console.log(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
