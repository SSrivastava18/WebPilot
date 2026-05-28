// ======================================================
// agent/agentRunner.js
// Fully Dynamic GenAI Browser Agent
// LangChain + Groq + Playwright
// ======================================================

import dotenv from "dotenv";
dotenv.config();

import { chromium } from "playwright";
import { ChatGroq } from "@langchain/groq";
import {
  AgentExecutor,
  createToolCallingAgent,
} from "langchain/agents";

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ======================================================
// ENV CHECK
// ======================================================

console.log(
  "GROQ_API_KEY:",
  process.env.GROQ_API_KEY
    ? "Loaded ✅"
    : "Missing ❌"
);

// ======================================================
// BROWSER SETUP
// ======================================================

let browser = null;
let context = null;

const MAX_TABS = 5;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: ["--start-maximized"],
    });

    console.log("✅ Browser started");
  }

  return browser;
}

async function getContext() {
  const b = await getBrowser();

  if (!context) {
    context = await b.newContext({
      viewport: null,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    });
  }

  return context;
}

async function createNewTab() {
  const ctx = await getContext();

  const pages = ctx.pages();

  // prevent infinite tabs
  if (pages.length >= MAX_TABS) {
    try {
      await pages[0].close();
    } catch {}
  }

  const page = await ctx.newPage();

  page.on("pageerror", async () => {
    try {
      await page.close();
    } catch {}
  });

  return page;
}

// ======================================================
// TRUSTED SOURCES
// ======================================================

const TRUSTED_SOURCES = {
  restaurants: [
    "https://www.zomato.com",
    "https://www.swiggy.com",
    "https://www.tripadvisor.in",
    "https://www.eazydiner.com",
  ],

  shopping: [
    "https://www.flipkart.com",
    "https://www.amazon.in",
    "https://www.myntra.com",
    "https://www.ajio.com",
  ],

  hotels: [
    "https://www.booking.com",
    "https://www.goibibo.com",
    "https://www.makemytrip.com",
    "https://www.agoda.com",
  ],

  flights: [
    "https://www.skyscanner.co.in",
    "https://www.goibibo.com",
    "https://www.makemytrip.com",
    "https://www.cleartrip.com",
  ],
};

// ======================================================
// TASK TYPE DETECTION
// ======================================================

function detectTaskType(task) {
  const q = task.toLowerCase();

  if (
    q.includes("restaurant") ||
    q.includes("food") ||
    q.includes("cafe")
  ) {
    return "restaurants";
  }

  if (
    q.includes("iphone") ||
    q.includes("price") ||
    q.includes("compare") ||
    q.includes("crocs") ||
    q.includes("buy")
  ) {
    return "shopping";
  }

  if (
    q.includes("hotel") ||
    q.includes("stay")
  ) {
    return "hotels";
  }

  if (
    q.includes("flight")
  ) {
    return "flights";
  }

  return "shopping";
}

// ======================================================
// FAILED SITES MEMORY
// ======================================================

const failedSites = new Set();

// ======================================================
// SAFE OPEN
// ======================================================

async function safeOpen(url) {
  try {
    const page = await createNewTab();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const title = await page.title();

    if (
      title.toLowerCase().includes("captcha") ||
      title.toLowerCase().includes("access denied")
    ) {
      throw new Error("Blocked");
    }

    console.log("✅ Opened:", url);

    return {
      success: true,
      page,
    };
  } catch (err) {
    console.log("❌ Failed:", url);

    failedSites.add(url);

    return {
      success: false,
      error: err.message,
    };
  }
}

// ======================================================
// DYNAMIC SOURCE OPENING
// ======================================================

async function openBestSources(task) {
  const type = detectTaskType(task);

  const sources = TRUSTED_SOURCES[type];

  const openedPages = [];

  for (const site of sources.slice(0, 2)) {
    if (failedSites.has(site)) continue;

    console.log("🌍 Trying:", site);

    const result = await safeOpen(site);

    if (result.success) {
      openedPages.push({
        site,
        page: result.page,
      });
    }
  }

  return openedPages;
}

// ======================================================
// TOOL: OPEN URL
// ======================================================

const openUrlTool = new DynamicStructuredTool({
  name: "open_url",

  description:
    "Open a website URL in browser",

  schema: z.object({
    url: z.string(),
  }),

  func: async ({ url }) => {
    const result = await safeOpen(url);

    if (!result.success) {
      return `Failed: ${result.error}`;
    }

    return `Opened ${url}`;
  },
});

// ======================================================
// TOOL: EXTRACT PAGE TEXT
// ======================================================

const extractTool = new DynamicStructuredTool({
  name: "extract_page_text",

  description:
    "Extract visible text from current browser page",

  schema: z.object({
    selector: z.string().optional(),
  }),

  func: async ({ selector }) => {
    try {
      const ctx = await getContext();

      const pages = ctx.pages();

      if (!pages.length) {
        return "No open pages";
      }

      const page = pages[pages.length - 1];

      await page.waitForLoadState("domcontentloaded");

      let text = "";

      if (selector) {
        const el = await page.locator(selector);

        text = await el.innerText();
      } else {
        text = await page.evaluate(() => {
          return document.body.innerText;
        });
      }

      return text
        .replace(/\s+/g, " ")
        .slice(0, 3000);
    } catch (err) {
      return `Extract error: ${err.message}`;
    }
  },
});

// ======================================================
// TOOL: PAGE INFO
// ======================================================

const pageInfoTool = new DynamicStructuredTool({
  name: "get_page_info",

  description:
    "Get current page title and URL",

  schema: z.object({}),

  func: async () => {
    try {
      const ctx = await getContext();

      const pages = ctx.pages();

      if (!pages.length) {
        return "No pages";
      }

      const page = pages[pages.length - 1];

      return JSON.stringify({
        title: await page.title(),
        url: page.url(),
      });
    } catch (err) {
      return err.message;
    }
  },
});

// ======================================================
// TOOL: SCREENSHOT
// ======================================================

const screenshotTool = new DynamicStructuredTool({
  name: "take_screenshot",

  description:
    "Take screenshot of current page",

  schema: z.object({}),

  func: async () => {
    try {
      const ctx = await getContext();

      const pages = ctx.pages();

      if (!pages.length) {
        return "No pages";
      }

      const page = pages[pages.length - 1];

      const path = `screenshot_${Date.now()}.png`;

      await page.screenshot({
        path,
      });

      return `Saved ${path}`;
    } catch (err) {
      return err.message;
    }
  },
});

// ======================================================
// TOOLS
// ======================================================

const tools = [
  openUrlTool,
  extractTool,
  pageInfoTool,
  screenshotTool,
];

// ======================================================
// GROQ MODEL
// ======================================================

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,

  model: "llama-3.3-70b-versatile",

  temperature: 0.2,
});

// ======================================================
// PROMPT
// ======================================================

const prompt =
  ChatPromptTemplate.fromMessages([
    [
      "system",
      `
You are an advanced autonomous browser AI agent.

RULES:
- Think step-by-step
- Use tools intelligently
- Avoid loops
- If one website fails, use another
- Compare information from multiple websites
- Use trusted websites
- Extract useful information
- Summarize results clearly
`,
    ],

    ["human", "{input}"],

    new MessagesPlaceholder(
      "agent_scratchpad"
    ),
  ]);

// ======================================================
// MAIN AGENT
// ======================================================

export async function runAgent(task) {
  console.log(`
==============================
[AGENT TASK]: ${task}
==============================
`);

  // open best sites automatically
  await openBestSources(task);

  const agent =
    await createToolCallingAgent({
      llm,
      tools,
      prompt,
    });

  const executor = new AgentExecutor({
    agent,
    tools,

    verbose: true,

    maxIterations: 6,

    returnIntermediateSteps: true,
  });

  try {
    const result = await executor.invoke({
      input: task,
    });

    const steps =
      result.intermediateSteps?.map((s) => ({
        tool:
          s.action?.tool || "unknown",

        input:
          s.action?.toolInput || {},

        output:
          typeof s.observation ===
          "string"
            ? s.observation.slice(0, 500)
            : JSON.stringify(
                s.observation,
                null,
                2
              ),
      })) || [];

    return {
      summary:
        result.output ||
        "Task completed.",

      steps,

      result:
        steps.length > 0
          ? steps
              .map(
                (s, i) => `
STEP ${i + 1}

TOOL:
${s.tool}

INPUT:
${JSON.stringify(
  s.input,
  null,
  2
)}

OUTPUT:
${s.output}
`
              )
              .join(
                "\n-----------------------------\n"
              )
          : "No execution steps returned.",
    };
  } catch (err) {
    console.log("AGENT ERROR:", err);

    return {
      summary:
        "Agent failed while processing task.",

      steps: [],

      result: err.message,
    };
  }
}