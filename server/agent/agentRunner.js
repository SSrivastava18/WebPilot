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
// TASK PARSER — extract structured intent from prompt
// ======================================================

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
});

async function parseTaskIntent(task) {
  const parsePrompt = `
You are a task parser. Extract structured intent from the user query below.

Query: "${task}"

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "category": "flights|hotels|restaurants|shopping|general",
  "origin": "city or null",
  "destination": "city or null",
  "date": "date string or null",
  "budget": "budget string or null",
  "product": "product name or null",
  "location": "location or null",
  "extras": "any other key detail or null"
}
`;
  try {
    const res = await llm.invoke(parsePrompt);
    const text = res.content.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return { category: "general", origin: null, destination: null };
  }
}

// ======================================================
// TRUSTED SOURCES with URL BUILDERS
// ======================================================

const SOURCE_CONFIG = {
  flights: [
    {
      name: "Skyscanner",
      base: "https://www.skyscanner.co.in",
      buildUrl: (intent) => {
        if (intent.origin && intent.destination) {
          const orig = intent.origin.slice(0, 3).toUpperCase();
          const dest = intent.destination.slice(0, 3).toUpperCase();
          const date = intent.date
            ? intent.date.replace(/-/g, "")
            : getTomorrowDate();
          return `https://www.skyscanner.co.in/transport/flights/${orig}/${dest}/${date}/`;
        }
        return "https://www.skyscanner.co.in";
      },
    },
    {
      name: "MakeMyTrip",
      base: "https://www.makemytrip.com",
      buildUrl: (intent) => {
        if (intent.origin && intent.destination) {
          const orig = cityToCode(intent.origin);
          const dest = cityToCode(intent.destination);
          const date = intent.date || getTomorrowDateFormatted();
          return `https://www.makemytrip.com/flights/oneway-${orig}-to-${dest}/${date}`;
        }
        return "https://www.makemytrip.com/flights/";
      },
    },
    {
      name: "Goibibo",
      base: "https://www.goibibo.com",
      buildUrl: (intent) => {
        if (intent.origin && intent.destination) {
          const orig = cityToCode(intent.origin);
          const dest = cityToCode(intent.destination);
          const date = intent.date?.replace(/-/g, "") || getTomorrowDate();
          return `https://www.goibibo.com/flights/search/?source=${orig}&destination=${dest}&dateofdeparture=${date}&travellers=1&class=E&seatsavail=false`;
        }
        return "https://www.goibibo.com/flights/";
      },
    },
    {
      name: "Cleartrip",
      base: "https://www.cleartrip.com",
      buildUrl: (intent) => {
        if (intent.origin && intent.destination) {
          const orig = cityToCode(intent.origin);
          const dest = cityToCode(intent.destination);
          const date = intent.date || getTomorrowDateFormatted();
          return `https://www.cleartrip.com/flights/oneway?from=${orig}&to=${dest}&depart_date=${date}&adults=1&class=Economy`;
        }
        return "https://www.cleartrip.com/flights/";
      },
    },
  ],

  hotels: [
    {
      name: "Booking.com",
      base: "https://www.booking.com",
      buildUrl: (intent) => {
        const loc = intent.destination || intent.location || "";
        return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(loc)}&lang=en-gb`;
      },
    },
    {
      name: "MakeMyTrip Hotels",
      base: "https://www.makemytrip.com",
      buildUrl: (intent) => {
        const loc = intent.destination || intent.location || "";
        return `https://www.makemytrip.com/hotels/${encodeURIComponent(loc.toLowerCase())}-hotels/`;
      },
    },
    {
      name: "Goibibo Hotels",
      base: "https://www.goibibo.com",
      buildUrl: (intent) => {
        const loc = intent.destination || intent.location || "";
        return `https://www.goibibo.com/hotels/search/?city=${encodeURIComponent(loc)}`;
      },
    },
    {
      name: "Agoda",
      base: "https://www.agoda.com",
      buildUrl: (intent) => {
        const loc = intent.destination || intent.location || "";
        return `https://www.agoda.com/search?city=${encodeURIComponent(loc)}`;
      },
    },
  ],

  restaurants: [
    {
      name: "Zomato",
      base: "https://www.zomato.com",
      buildUrl: (intent) => {
        const loc = intent.location || intent.destination || "";
        const city = loc.toLowerCase().replace(/\s+/g, "-");
        return `https://www.zomato.com/${city}/restaurants`;
      },
    },
    {
      name: "Swiggy",
      base: "https://www.swiggy.com",
      buildUrl: () => "https://www.swiggy.com/restaurants",
    },
    {
      name: "TripAdvisor",
      base: "https://www.tripadvisor.in",
      buildUrl: (intent) => {
        const loc = intent.location || intent.destination || "";
        return `https://www.tripadvisor.in/Search?q=${encodeURIComponent(loc + " restaurants")}`;
      },
    },
  ],

  shopping: [
    {
      name: "Flipkart",
      base: "https://www.flipkart.com",
      buildUrl: (intent) => {
        const q = intent.product || intent.extras || "";
        return `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`;
      },
    },
    {
      name: "Amazon.in",
      base: "https://www.amazon.in",
      buildUrl: (intent) => {
        const q = intent.product || intent.extras || "";
        return `https://www.amazon.in/s?k=${encodeURIComponent(q)}`;
      },
    },
    {
      name: "Myntra",
      base: "https://www.myntra.com",
      buildUrl: (intent) => {
        const q = intent.product || intent.extras || "";
        return `https://www.myntra.com/${encodeURIComponent(q)}`;
      },
    },
    {
      name: "Ajio",
      base: "https://www.ajio.com",
      buildUrl: (intent) => {
        const q = intent.product || intent.extras || "";
        return `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`;
      },
    },
  ],

  general: [
    {
      name: "Google",
      base: "https://www.google.com",
      buildUrl: (intent, task) =>
        `https://www.google.com/search?q=${encodeURIComponent(task)}`,
    },
    {
      name: "DuckDuckGo",
      base: "https://duckduckgo.com",
      buildUrl: (intent, task) =>
        `https://duckduckgo.com/?q=${encodeURIComponent(task)}`,
    },
  ],
};

// ======================================================
// CITY → IATA CODE MAP
// ======================================================

const CITY_CODES = {
  mumbai: "BOM", delhi: "DEL", bangalore: "BLR", bengaluru: "BLR",
  goa: "GOI", chennai: "MAA", hyderabad: "HYD", kolkata: "CCU",
  pune: "PNQ", ahmedabad: "AMD", jaipur: "JAI", lucknow: "LKO",
  kochi: "COK", cochin: "COK", chandigarh: "IXC", srinagar: "SXR",
  amritsar: "ATQ", varanasi: "VNS", agra: "AGR", nagpur: "NAG",
  indore: "IDR", bhopal: "BHO", patna: "PAT", ranchi: "IXR",
  bhubaneswar: "BBI", guwahati: "GAU", leh: "IXL", shimla: "SLV",
  dehradun: "DED", coimbatore: "CJB", madurai: "IXM", trichy: "TRZ",
  vizag: "VTZ", visakhapatnam: "VTZ", mangalore: "IXE", calicut: "CCJ",
  kozhikode: "CCJ", raipur: "RPR", jammu: "IXJ", udaipur: "UDR",
  jodhpur: "JDH", aurangabad: "IXU", latur: "LTU", bagdogra: "IXB",
};

function cityToCode(city) {
  if (!city) return "DEL";
  const clean = city.toLowerCase().trim();
  return CITY_CODES[clean] || city.slice(0, 3).toUpperCase();
}

// ======================================================
// DATE HELPERS
// ======================================================

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function getTomorrowDateFormatted() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ======================================================
// FAILED SITES MEMORY
// ======================================================

const failedSites = new Set();

// ======================================================
// SMART OPEN WITH ANTI-BOT EVASION
// ======================================================

async function smartOpen(url, siteName) {
  try {
    const page = await createNewTab();

    // Random human-like delay
    await page.waitForTimeout(Math.random() * 800 + 400);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    });

    // Wait a bit more for JS to render
    await page.waitForTimeout(2000);

    const title = await page.title();
    const titleLow = title.toLowerCase();

    if (
      titleLow.includes("captcha") ||
      titleLow.includes("access denied") ||
      titleLow.includes("blocked") ||
      titleLow.includes("403")
    ) {
      throw new Error(`Blocked by ${siteName}: ${title}`);
    }

    // Extract meaningful content
    const content = await page.evaluate(() => {
      // Remove junk nodes
      const remove = ["script", "style", "nav", "footer", "iframe", "noscript", "header", "aside"];
      remove.forEach((tag) => {
        document.querySelectorAll(tag).forEach((el) => el.remove());
      });

      // Grab main content selectors first
      const selectors = [
        "main", "article", '[role="main"]',
        ".results", ".search-results", ".listing",
        ".flight-listing", ".hotel-list", ".product-list",
        ".content", "#content", ".container",
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 200) {
          return el.innerText.replace(/\s+/g, " ").slice(0, 3500);
        }
      }

      return document.body.innerText.replace(/\s+/g, " ").slice(0, 3500);
    });

    console.log(`✅ Scraped: ${siteName} (${content.length} chars)`);

    return {
      success: true,
      page,
      siteName,
      url,
      title,
      content,
    };
  } catch (err) {
    console.log(`❌ Failed: ${siteName} — ${err.message}`);
    failedSites.add(url);
    return {
      success: false,
      siteName,
      url,
      error: err.message,
    };
  }
}

// ======================================================
// OPEN SOURCES WITH FALLBACK
// ======================================================

async function openBestSources(task, intent) {
  const category = intent.category || "general";
  const sources = SOURCE_CONFIG[category] || SOURCE_CONFIG.general;

  const results = [];
  let opened = 0;
  const TARGET = 3; // Try to get at least 3 good sources

  for (const source of sources) {
    if (opened >= TARGET) break;

    const url = source.buildUrl(intent, task);

    if (failedSites.has(source.base)) {
      console.log(`⏭️  Skipping known-failed: ${source.name}`);
      continue;
    }

    console.log(`🌍 Opening: ${source.name} → ${url}`);
    const result = await smartOpen(url, source.name);

    if (result.success) {
      results.push(result);
      opened++;
    } else {
      // Immediate fallback: try the base homepage instead
      if (url !== source.base) {
        console.log(`🔄 Fallback to homepage: ${source.name}`);
        const fallback = await smartOpen(source.base, source.name + " (homepage)");
        if (fallback.success) {
          results.push(fallback);
          opened++;
        }
      }
    }
  }

  // If category sources all failed, fall back to Google
  if (results.length === 0) {
    console.log("🆘 All sources failed — falling back to Google search");
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(task)}`;
    const google = await smartOpen(googleUrl, "Google Search");
    if (google.success) results.push(google);
  }

  return results;
}

// ======================================================
// LLM SUMMARIZER
// ======================================================

async function summarizeResults(task, intent, scrapedResults) {
  const category = intent.category;

  let websiteData = "";
  for (const r of scrapedResults) {
    websiteData += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE: ${r.siteName}
URL: ${r.url}
TITLE: ${r.title}

CONTENT:
${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  const categoryInstructions = {
    flights: `
- List available flights with airline, departure/arrival times, and prices
- Compare prices across all sources
- Highlight the cheapest option clearly
- Mention layovers, duration, and class if visible
- Sort by price (cheapest first)
`,
    hotels: `
- List hotels with name, price per night, rating, and location
- Compare across sources
- Highlight best value options
- Mention amenities, breakfast, cancellation policy if visible
`,
    restaurants: `
- List top restaurants with name, cuisine, rating, and approximate cost
- Mention location and specialties
- Highlight must-visit picks
`,
    shopping: `
- List products with name, price, seller, rating, and delivery info
- Compare prices across all sources
- Highlight cheapest option and best-rated option
- Mention offers, discounts, and EMI options if visible
`,
    general: `
- Provide a concise, structured summary of findings
- Highlight the most relevant and actionable information
`,
  };

  const instructions = categoryInstructions[category] || categoryInstructions.general;

  const prompt = `
You are WebPilot, an intelligent browser research agent.

USER TASK: ${task}

EXTRACTED WEBSITE DATA:
${websiteData}

ANALYSIS INSTRUCTIONS:
${instructions}

FORMAT YOUR RESPONSE AS:
1. Start with a 1-sentence executive summary
2. Then provide structured findings per source
3. End with a "🏆 Best Option" recommendation

Be concise, data-focused, and actionable. If data is missing or unclear, say so honestly.
`;

  const response = await llm.invoke(prompt);
  return response.content;
}

// ======================================================
// MAIN AGENT
// ======================================================

export async function runAgent(task) {
  console.log("\n══════════════════════════════");
  console.log("TASK:", task);
  console.log("══════════════════════════════\n");

  try {
    // Step 1: Parse intent
    console.log("🧠 Parsing intent...");
    const intent = await parseTaskIntent(task);
    console.log("Intent:", JSON.stringify(intent));

    // Step 2: Open best sources with smart URLs
    console.log("🌐 Opening sources...");
    const scrapedResults = await openBestSources(task, intent);

    if (scrapedResults.length === 0) {
      return {
        summary: "No sources could be accessed. Please try again or check your network.",
        steps: [],
        result: "All browser attempts failed.",
        intent,
      };
    }

    // Step 3: Summarize with LLM
    console.log("🤖 Analyzing results...");
    const summary = await summarizeResults(task, intent, scrapedResults);

    // Step 4: Build response
    const steps = scrapedResults.map((r) => ({
      site: r.siteName,
      url: r.url,
      title: r.title,
      status: "success",
      chars: r.content?.length || 0,
    }));

    return {
      summary,
      steps,
      result: summary,
      intent,
      sourcesOpened: scrapedResults.length,
    };
  } catch (err) {
    console.error("AGENT ERROR:", err);
    return {
      summary: "Agent encountered an error while processing your task.",
      steps: [],
      result: err?.message || String(err),
      intent: {},
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