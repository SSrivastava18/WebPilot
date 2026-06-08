import dotenv from "dotenv";
dotenv.config();

import { chromium, firefox, webkit } from "playwright";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { ChatGroq } from "@langchain/groq";

// ======================================================
// ENV CHECK
// ======================================================

console.log(
  "GROQ_API_KEY:",
  process.env.GROQ_API_KEY ? "Loaded ✅" : "Missing ❌"
);

// ======================================================
// BROWSER SETUP
// ======================================================

let browser = null;
let context = null;

const MAX_TABS = 6;

// ── Detect the user's actual default browser path ──────────────────────────

function getDefaultBrowserInfo() {
  const platform = process.platform; // "win32" | "darwin" | "linux"

  // ── Windows ──
  if (platform === "win32") {
    try {
      // Read the default browser ProgId from the registry
      const progId = execSync(
        `reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice" /v ProgId`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      ).match(/ProgId\s+REG_SZ\s+(\S+)/)?.[1] || "";

      const id = progId.toLowerCase();

      if (id.includes("chrome")) {
        const paths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: chromium, executablePath: exe, name: "Google Chrome" };
      }

      if (id.includes("firefox")) {
        const paths = [
          "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
          "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: firefox, executablePath: exe, name: "Firefox" };
      }

      if (id.includes("msedge") || id.includes("edge")) {
        const paths = [
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: chromium, executablePath: exe, name: "Microsoft Edge" };
      }

      if (id.includes("brave")) {
        const paths = [
          "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
          process.env.LOCALAPPDATA + "\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: chromium, executablePath: exe, name: "Brave" };
      }

      if (id.includes("opera")) {
        const paths = [
          process.env.LOCALAPPDATA + "\\Programs\\Opera\\opera.exe",
          process.env.LOCALAPPDATA + "\\Programs\\Opera GX\\opera.exe",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: chromium, executablePath: exe, name: "Opera" };
      }
    } catch {
      // Registry read failed — fall through to defaults
    }

    // Fallback: try Chrome then Edge
    const fallbacks = [
      { path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",        engine: chromium, name: "Google Chrome" },
      { path: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", engine: chromium, name: "Microsoft Edge" },
    ];
    for (const f of fallbacks) {
      if (existsSync(f.path)) return { engine: f.engine, executablePath: f.path, name: f.name };
    }
  }

  // ── macOS ──
  if (platform === "darwin") {
    try {
      const defaultApp = execSync(
        `defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null | grep -A1 "https" | grep "LSHandlerRoleAll" | head -1`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      ).trim();

      const bundles = {
        "com.google.chrome":           { engine: chromium, path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",   name: "Google Chrome" },
        "org.mozilla.firefox":         { engine: firefox,  path: "/Applications/Firefox.app/Contents/MacOS/firefox",               name: "Firefox" },
        "com.microsoft.edgemac":       { engine: chromium, path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", name: "Microsoft Edge" },
        "com.brave.browser":           { engine: chromium, path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",   name: "Brave" },
        "com.operasoftware.opera":     { engine: chromium, path: "/Applications/Opera.app/Contents/MacOS/Opera",                   name: "Opera" },
        "com.apple.safari":            { engine: webkit,   path: null,                                                             name: "Safari" },
      };

      for (const [bundle, info] of Object.entries(bundles)) {
        if (defaultApp.includes(bundle)) {
          if (info.path && existsSync(info.path)) {
            return { engine: info.engine, executablePath: info.path, name: info.name };
          }
          if (!info.path) {
            // Safari — use webkit engine (no executablePath needed)
            return { engine: webkit, executablePath: null, name: "Safari" };
          }
        }
      }
    } catch { }

    // macOS fallback: try Chrome then Safari
    const macFallbacks = [
      { path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", engine: chromium, name: "Google Chrome" },
      { path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", engine: chromium, name: "Brave" },
    ];
    for (const f of macFallbacks) {
      if (existsSync(f.path)) return { engine: f.engine, executablePath: f.path, name: f.name };
    }
    return { engine: webkit, executablePath: null, name: "Safari (system)" };
  }

  // ── Linux ──
  if (platform === "linux") {
    try {
      const defaultBrowser = execSync(
        `xdg-settings get default-web-browser 2>/dev/null || update-alternatives --query x-www-browser 2>/dev/null | grep "Value:" | head -1 | awk '{print $2}'`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      ).trim().toLowerCase();

      if (defaultBrowser.includes("chrome") || defaultBrowser.includes("chromium")) {
        const paths = [
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          "/snap/bin/chromium",
        ];
        const exe = paths.find(existsSync);
        if (exe) return { engine: chromium, executablePath: exe, name: "Chrome/Chromium" };
      }

      if (defaultBrowser.includes("firefox")) {
        const paths = ["/usr/bin/firefox", "/snap/bin/firefox"];
        const exe = paths.find(existsSync);
        if (exe) return { engine: firefox, executablePath: exe, name: "Firefox" };
      }
    } catch { }

    // Linux fallback
    const linuxFallbacks = [
      { path: "/usr/bin/google-chrome",    engine: chromium, name: "Chrome" },
      { path: "/usr/bin/chromium-browser", engine: chromium, name: "Chromium" },
      { path: "/usr/bin/firefox",          engine: firefox,  name: "Firefox" },
    ];
    for (const f of linuxFallbacks) {
      if (existsSync(f.path)) return { engine: f.engine, executablePath: f.path, name: f.name };
    }
  }

  // ── Universal last resort: Playwright's bundled Chromium ──
  console.warn("⚠️  Could not detect system browser — using bundled Chromium");
  return { engine: chromium, executablePath: null, name: "Bundled Chromium" };
}

async function getBrowser() {
  if (!browser) {
    const { engine, executablePath, name } = getDefaultBrowserInfo();
    console.log(`🌐 Launching: ${name}`);

    const launchOptions = {
      headless: false,
      args: engine === chromium
        ? ["--start-maximized", "--no-sandbox", "--disable-blink-features=AutomationControlled"]
        : [],
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await engine.launch(launchOptions);
    console.log(`✅ ${name} started`);
  }
  return browser;
}

async function getContext() {
  const b = await getBrowser();
  if (!context) {
    context = await b.newContext({
      viewport: null,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
  }
  return context;
}

async function createNewTab() {
  const ctx = await getContext();
  const pages = ctx.pages();
  if (pages.length >= MAX_TABS) {
    try { await pages[0].close(); } catch { }
  }
  const page = await ctx.newPage();
  page.on("pageerror", async () => {
    try { await page.close(); } catch { }
  });
  return page;
}

// ======================================================
// LLM SETUP
// ======================================================

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.2,
});

// ======================================================
// STEP 1 — LLM PLANS WHICH URLS TO OPEN
// ======================================================

async function planUrls(task) {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `
You are WebPilot's URL planner. Your only job is to decide which URLs to open in a browser to best answer the user's query.

TODAY'S DATE: ${today}

USER QUERY: "${task}"

RULES:
- Choose 3 to 4 URLs that will have the most relevant, high-quality content for this query
- Use the REAL websites that actual humans use for this kind of search
- Build SPECIFIC search URLs with the query terms already filled in — not just homepages
- Think broadly: for travel use TripAdvisor/tourism sites, for YouTube use youtube.com/search, for places use Google Maps or tourism boards, for news use news sites, for products use e-commerce sites, for learning use YouTube/Udemy/Coursera, etc.
- For YouTube queries, generate youtube.com/search?search_query=... URLs or specific channel URLs
- For "places to visit" queries, use TripAdvisor, tourism board sites, travel blogs, Google search
- For flights use Skyscanner/MakeMyTrip/Goibibo with city codes in the URL
- For hotels use Booking.com/MakeMyTrip/Agoda with location in the URL
- For shopping use Amazon/Flipkart with search terms in the URL
- For restaurants use Zomato/TripAdvisor with city in the URL
- NEVER return just a homepage — always include the search query in the URL
- URLs must be real, valid, and publicly accessible without login

Respond ONLY with a valid JSON array. No markdown, no explanation:
[
  { "name": "Site Name", "url": "https://full-url-with-search-terms" },
  { "name": "Site Name", "url": "https://full-url-with-search-terms" },
  { "name": "Site Name", "url": "https://full-url-with-search-terms" }
]
`;

  try {
    const res = await llm.invoke(prompt);
    const text = res.content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    // Validate structure
    if (!Array.isArray(parsed)) throw new Error("Not an array");
    const valid = parsed.filter(
      (item) => item && typeof item.name === "string" && typeof item.url === "string" && item.url.startsWith("http")
    );

    console.log("📋 Planned URLs:");
    valid.forEach((u) => console.log(`   ${u.name}: ${u.url}`));

    return valid;
  } catch (err) {
    console.warn("⚠️  URL planning failed, using Google fallback:", err.message);
    return [
      { name: "Google Search", url: `https://www.google.com/search?q=${encodeURIComponent(task)}` },
      { name: "DuckDuckGo",    url: `https://duckduckgo.com/?q=${encodeURIComponent(task)}` },
    ];
  }
}

// ======================================================
// FAILED SITES MEMORY
// ======================================================

const failedSites = new Set();

// ======================================================
// STEP 2 — OPEN EACH URL & SCRAPE CONTENT
// ======================================================

async function smartOpen(url, siteName) {
  try {
    const page = await createNewTab();

    // Human-like delay
    await page.waitForTimeout(Math.random() * 600 + 300);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    });

    // Let JS-rendered content settle
    await page.waitForTimeout(2200);

    const title = await page.title();
    const titleLow = title.toLowerCase();

    if (
      titleLow.includes("captcha") ||
      titleLow.includes("access denied") ||
      titleLow.includes("blocked") ||
      titleLow.includes("403")
    ) {
      throw new Error(`Blocked: ${title}`);
    }

    const content = await page.evaluate(() => {
      // Strip noise
      ["script", "style", "nav", "footer", "iframe", "noscript", "header", "aside", ".ad", ".cookie-banner"]
        .forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.remove()));

      // Try semantic content areas first
      const candidates = [
        "main", "article", '[role="main"]', "#main-content",
        ".results", ".search-results", ".listings", ".content-area",
        ".ytd-search", "#contents",           // YouTube
        ".entry-content", ".post-body",        // Blogs
        ".attraction-list", ".poi-list",       // TripAdvisor
        "#product-list", ".products-grid",     // Shopping
        ".content", "#content", ".container",
      ];

      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 150) {
          return el.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
        }
      }

      return document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
    });

    console.log(`✅ Scraped: ${siteName} — ${content.length} chars`);

    return { success: true, page, siteName, url, title, content };
  } catch (err) {
    console.log(`❌ Failed: ${siteName} — ${err.message}`);
    failedSites.add(url);
    return { success: false, siteName, url, error: err.message };
  }
}

async function openAllSources(plannedUrls) {
  const results = [];

  for (const { name, url } of plannedUrls) {
    // Skip if this domain was already confirmed blocked
    const base = new URL(url).origin;
    if (failedSites.has(url)) {
      console.log(`⏭️  Skipping known-failed: ${name}`);
      continue;
    }

    const result = await smartOpen(url, name);

    if (result.success) {
      results.push(result);
    } else {
      // Fallback: try base homepage if the specific search URL failed
      if (url !== base && !failedSites.has(base)) {
        console.log(`🔄 Retrying homepage: ${name}`);
        const fallback = await smartOpen(base, `${name} (homepage)`);
        if (fallback.success) results.push(fallback);
      }
    }
  }

  // Last resort: Google
  if (results.length === 0) {
    console.log("🆘 All sources failed — falling back to Google");
    const g = await smartOpen(
      `https://www.google.com/search?q=${encodeURIComponent(plannedUrls[0]?.url || "search")}`,
      "Google Search"
    );
    if (g.success) results.push(g);
  }

  return results;
}

// ======================================================
// STEP 3 — LLM SUMMARIZES SCRAPED CONTENT
// ======================================================

async function summarizeResults(task, scrapedResults) {
  let websiteData = "";
  for (const r of scrapedResults) {
    websiteData += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE: ${r.siteName}
URL: ${r.url}
TITLE: ${r.title}

CONTENT:
${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  const prompt = `
You are WebPilot, an intelligent browser research agent.

USER'S QUESTION: "${task}"

CONTENT SCRAPED FROM LIVE WEBSITES:
${websiteData}

YOUR JOB:
- Carefully read all the website content above
- Extract and organize only what's relevant to the user's question
- Compare and synthesize across sources where applicable
- Be specific: include names, ratings, prices, links, channel names, place names — whatever real data is visible
- If a source had no useful content, ignore it
- End with a "🏆 Best Pick" or "🏆 Top Recommendation" section

FORMAT:
1. One-line summary of what you found
2. Findings organized by source or by item (whichever is clearer)
3. 🏆 Best Pick / Top Recommendation

Be factual, specific, and useful. Do not make things up.
`;

  const response = await llm.invoke(prompt);
  return response.content;
}

// ======================================================
// MAIN AGENT — fully LLM-driven, zero hardcoding
// ======================================================

export async function runAgent(task) {
  console.log("\n══════════════════════════════");
  console.log("TASK:", task);
  console.log("══════════════════════════════\n");

  try {
    // Step 1: LLM decides which URLs to open
    console.log("🧠 Planning URLs...");
    const plannedUrls = await planUrls(task);

    // Step 2: Open every planned URL in the real browser
    console.log(`🌐 Opening ${plannedUrls.length} sources...`);
    const scrapedResults = await openAllSources(plannedUrls);

    if (scrapedResults.length === 0) {
      return {
        summary: "Could not access any sources. Please check your network or try rephrasing.",
        steps: [],
        result: "All browser attempts failed.",
      };
    }

    // Step 3: LLM reads the scraped content and writes a summary
    console.log("🤖 Analyzing results...");
    const summary = await summarizeResults(task, scrapedResults);

    const steps = scrapedResults.map((r) => ({
      site: r.siteName,
      url: r.url,
      title: r.title,
      status: "success",
    }));

    return { summary, steps, result: summary };

  } catch (err) {
    console.error("AGENT ERROR:", err);
    return {
      summary: "Agent encountered an error while processing your task.",
      steps: [],
      result: err?.message || String(err),
    };
  }
}

// ======================================================
// CLEANUP
// ======================================================

process.on("SIGINT", async () => {
  try {
    if (browser) await browser.close();
  } catch { }
  process.exit(0);
});