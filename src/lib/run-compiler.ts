/**
 * Run Compiler v1
 *
 * Turns a vague human task into structured run boundaries:
 *   - explicit file path extraction (always beats heuristics)
 *   - task category classification
 *   - category-specific allowed scope, forbidden additions, stop rules, verification
 *
 * Used by auditTask() → generateContract() pipeline.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskCategory =
  | "ui"
  | "auth"
  | "billing"
  | "payment"
  | "webhook"
  | "database"
  | "env"
  | "api"
  | "middleware"
  | "docs"
  | "tests"
  | "package"
  | "cli"
  | "unknown";

export interface ExplicitPathResult {
  /** All file/directory paths explicitly referenced in the task text. */
  paths: string[];
  /**
   * True when the task uses "only edit/touch X" language.
   * The allowed scope should be EXACTLY those paths — no heuristic additions.
   */
  onlyMode: boolean;
  /**
   * True when the task uses "allowed scope must include X" language.
   * The explicit paths are additive to any heuristic scope.
   */
  mustIncludeMode: boolean;
  /** Explicit allowed-scope phrases when no file paths are present. */
  explicitAllowedScope: string[];
  /** Explicit forbidden-scope phrases from task text. */
  explicitForbiddenScope: string[];
  /** Path-like tokens extracted from forbidden phrases. */
  explicitForbiddenPaths: string[];
}

export interface CompilerResult {
  explicitPaths: string[];
  onlyMode: boolean;
  mustIncludeMode: boolean;
  explicitAllowedScope: string[];
  explicitForbiddenScope: string[];
  explicitForbiddenPaths: string[];
  taskCategory: TaskCategory;
}

// ── Explicit path extraction ──────────────────────────────────────────────────

/**
 * Regex that matches slash-separated paths starting with known directory names.
 * Handles:
 *   src/components/app/public-nav.tsx
 *   src/app/(marketing)/page.tsx
 *   cli/runtrim.ts
 *   .runtrim/contracts/latest.md
 *   .cursor/rules/runtrim.mdc
 *   supabase/functions/name/index.ts
 *   packages/runtrim/src/index.ts
 *
 * Path segment character class uses [^\s/,;:"'`!?] to avoid brittle escaping
 * while still matching filenames with hyphens, dots, parentheses, brackets.
 */
const SLASH_PATH_RE = /(?:^|[\s"'`,(])((src|cli|app|pages|packages|supabase|lib|utils|hooks|styles|config|scripts|tests?|spec|docs|public|api|dist|components|middleware|\.runtrim|\.cursor|\.github|\.vscode)(?:\/[^\s/,;:"'`!?]+)+\/?)/g;

/** Matches standalone well-known filenames that don't start with a directory. */
const KNOWN_FILE_RE = /\b(CLAUDE|AGENTS|RUNTRIM|README|CHANGELOG|CONTRIBUTING|LICENSE|CODEOWNERS)\.(?:md|txt|mdx|mdc)\b/g;

const LOCK_FILE_RE = /\b(package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig(?:\.\w+)?\.json)\b/g;

const ENV_FILE_RE = /(?:^|[\s"'`,(])(\.[.]?env(?:\.[a-zA-Z\d]+)?)\b/g;

/** Patterns indicating "only edit/touch X" — strict scope mode. */
const ONLY_EDIT_RE = /\bonly\s+(?:edit|touch|modify|change|update|fix)\b/i;

/** Patterns indicating "allowed scope must include X" — additive mode. */
const MUST_INCLUDE_RE = /\ballowed\s+scope\s+(?:must\s+)?include\b|\bmust\s+(?:include|contain)\b/i;
const CLI_SCOPE_RE =
  /\b(cli|command routing|runtrim command|run compiler|contract generation|scope inference|preview command|agent preview command|agent apply|adapters?|auto-guard|bridge helpers?|daemon|local server|localhost|\.runtrim(?:\s+artifacts?)?)\b/i;

const NEGATION_PREFIX_RE =
  /\b(do not|don't|dont|never|avoid|must not|should not|without changing|without touching|no changes to|keep .* untouched|leave .* untouched|keep .* unchanged)\b/i;

function hasNegationNear(text: string, index: number): boolean {
  const start = Math.max(0, index - 64);
  const window = text.slice(start, index + 8);
  return NEGATION_PREFIX_RE.test(window);
}

function hasPositiveKeywordMention(task: string, keyword: string): boolean {
  const lowerTask = task.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let idx = lowerTask.indexOf(lowerKeyword);
  while (idx !== -1) {
    if (!hasNegationNear(lowerTask, idx)) return true;
    idx = lowerTask.indexOf(lowerKeyword, idx + lowerKeyword.length);
  }
  return false;
}

function extractScopePhrase(task: string, re: RegExp): string | null {
  const m = task.match(re);
  if (!m) return null;
  const text = m[1]?.trim() ?? "";
  if (!text) return null;
  return text.replace(/[.]+$/, "").trim();
}

function extractPathsFromText(input: string): string[] {
  const found = new Set<string>();

  SLASH_PATH_RE.lastIndex = 0;
  for (const match of input.matchAll(SLASH_PATH_RE)) {
    const p = match[1].trim().replace(/[,;.!?]+$/, "");
    if (p.length > 2) found.add(p);
  }

  KNOWN_FILE_RE.lastIndex = 0;
  for (const m of input.matchAll(KNOWN_FILE_RE)) found.add(m[0]);

  LOCK_FILE_RE.lastIndex = 0;
  for (const m of input.matchAll(LOCK_FILE_RE)) found.add(m[1] ?? m[0]);

  ENV_FILE_RE.lastIndex = 0;
  for (const m of input.matchAll(ENV_FILE_RE)) found.add(m[1] ?? m[0]);

  return [...found].filter(Boolean);
}

function buildExplicitAllowedScope(task: string, explicitPaths: string[]): string[] {
  const out: string[] = [];
  if (explicitPaths.length > 0) return out;

  const hasExplicitAllowedPhrase =
    ONLY_EDIT_RE.test(task) ||
    MUST_INCLUDE_RE.test(task) ||
    /\b(allowed\s+files|scope|build\s+only|update\s+only)\b/i.test(task);

  if (hasExplicitAllowedPhrase) {
    const onlyPhrase = extractScopePhrase(task, /\bonly\s+(?:edit|touch|modify|change|update|fix)\s+([^\n.]+)/i);
    const includePhrase = extractScopePhrase(task, /\ballowed\s+scope\s+(?:must\s+)?include\s+([^\n.]+)/i);
    const allowedFilesPhrase = extractScopePhrase(task, /\ballowed\s+files\s+([^\n.]+)/i);
    const buildOnlyPhrase = extractScopePhrase(task, /\bbuild\s+only\s+([^\n.]+)/i);
    const updateOnlyPhrase = extractScopePhrase(task, /\bupdate\s+only\s+([^\n.]+)/i);
    const scopePhrase = extractScopePhrase(task, /\bscope\s+([^\n.]+)/i);
    const phrase = onlyPhrase ?? includePhrase ?? allowedFilesPhrase ?? buildOnlyPhrase ?? updateOnlyPhrase ?? scopePhrase ?? "";

    if (CLI_SCOPE_RE.test(task) || CLI_SCOPE_RE.test(phrase)) {
      out.push("CLI command routing files");
      out.push("CLI planning logic");
      out.push("Agent preview command logic");
      out.push("Agent apply command logic");
      out.push("RunTrim bridge/daemon helpers");
      if (/run compiler|contract generation|scope inference/i.test(task)) {
        out.push("Run compiler and contract generation helpers");
      }
      if (/learning|\.runtrim/i.test(task)) {
        out.push("Project learning readers and .runtrim preview artifact helpers");
      }
    } else if (phrase) {
      out.push(phrase);
    }
  }

  return [...new Set(out)];
}

function buildExplicitForbiddenScope(task: string): string[] {
  const out: string[] = [];

  const addBoundaryList = (raw: string | null | undefined): void => {
    if (!raw) return;
    const normalized = raw
      .replace(/\b(logic|internals?|behavior|files?|systems?)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const parts = normalized
      .split(/\s*(?:,|;|\band\b|\bor\b)\s*/i)
      .map((p) => p.trim().replace(/[.]+$/, ""))
      .filter(Boolean)
      .slice(0, 12);
    for (const p of parts) {
      if (p.length < 2) continue;
      out.push(`Do not touch ${p}`);
    }
  };

  const explicitPhrases = [
    /\bforbidden\s+scope\s+must\s+include\s+([^\n.]+)/i,
    /\bdo\s+not\s+touch\s+([^\n.]+)/i,
    /\bdo\s+not\s+edit\s+([^\n.]+)/i,
    /\bdo\s+not\s+change\s+([^\n.]+)/i,
    /\bmust\s+not\s+touch\s+([^\n.]+)/i,
    /\bshould\s+not\s+touch\s+([^\n.]+)/i,
    /\bwithout\s+changing\s+([^\n.]+)/i,
    /\bwithout\s+touching\s+([^\n.]+)/i,
    /\bno\s+changes\s+to\s+([^\n.]+)/i,
    /\bkeep\s+([^\n.]+?)\s+(?:untouched|unchanged)\b/i,
    /\bleave\s+([^\n.]+?)\s+untouched\b/i,
    /\bavoid\s+changing\s+([^\n.]+)/i,
    /\bexclude\s+([^\n.]+)/i,
    /\bforbidden\s+([^\n.]+)/i,
  ];

  for (const re of explicitPhrases) {
    addBoundaryList(extractScopePhrase(task, re));
  }

  return [...new Set(out)];
}

export function extractExplicitPaths(task: string): ExplicitPathResult {
  const allPaths = extractPathsFromText(task);

  const onlyMode = ONLY_EDIT_RE.test(task);
  const mustIncludeMode = MUST_INCLUDE_RE.test(task);
  const explicitForbiddenScope = buildExplicitForbiddenScope(task);
  const explicitForbiddenPaths = extractPathsFromText(explicitForbiddenScope.join(" "));

  // Remove paths that appear in explicit forbidden phrases (e.g. "Do not touch src/app")
  const forbiddenSet = new Set(explicitForbiddenPaths.map((p) => p.toLowerCase()));
  const paths = allPaths.filter((p) => !forbiddenSet.has(p.toLowerCase()));

  const explicitAllowedScope = buildExplicitAllowedScope(task, paths);

  return {
    paths: paths.filter(Boolean).filter((p) => p.length > 2),
    onlyMode,
    mustIncludeMode,
    explicitAllowedScope,
    explicitForbiddenScope,
    explicitForbiddenPaths,
  };
}

// ── Task category classification ─────────────────────────────────────────────

/**
 * Ordered from most-specific to least-specific.
 * First match wins so CLI/webhook/payment are checked before generic "ui".
 */
const CATEGORY_KEYWORDS: Array<[TaskCategory, string[]]> = [
  [
    "cli",
    [
      "runtrim go", "runtrim finish", "runtrim init", "runtrim check",
      "contract compiler", "run compiler", "bridge mode", "bridge protocol",
      "adapter", "auto-guard", "daemon", "cli command",
    ],
  ],
  [
    "webhook",
    [
      "webhook", "subscription.active", "subscription.trialing", "subscription.created",
      "subscription.expired", "subscription.cancelled", "payment.succeeded",
      "event handler", "signature verification", "svix", "webhook-signature",
      "webhook-id", "webhook-timestamp",
    ],
  ],
  [
    "payment",
    [
      "dodo", "dodopayments", "stripe", "checkout", "cart", "purchase", "pay for",
      "dodo payment", "checkout url", "payment link", "start trial", "trial checkout",
    ],
  ],
  [
    "billing",
    [
      "billing", "subscription plan", "plan upgrade", "invoice", "customer portal",
      "cancel subscription", "pro trial", "trial ends", "billing page",
    ],
  ],
  [
    "auth",
    [
      "auth", "login", "logout", "session", "magic link", "jwt", "auth callback",
      "sign in", "sign out", "oauth", "otp", "authentication", "supabase auth",
    ],
  ],
  [
    "database",
    [
      "database schema", "schema migration", "migration", "seed ", "prisma migrate",
      "drizzle", "alter table", " sql ", "rls policy", "row level security", "supabase sql",
    ],
  ],
  [
    "env",
    [".env", "env var", "environment variable", "secret", "api key", "api_key", "apikey"],
  ],
  [
    "middleware",
    [
      "middleware.ts", "middleware.js", "proxy.ts", "edge config", "edge function",
      "next middleware", "vercel middleware",
    ],
  ],
  [
    "api",
    [
      "api route", "route handler", "server action", "api endpoint", "rest api",
      "graphql resolver", "trpc", "route.ts", "route.js",
    ],
  ],
  [
    "tests",
    [
      "test ", " tests", "spec ", "jest", "vitest", "playwright", "cypress",
      "unit test", "integration test", "e2e test", ".test.", ".spec.",
    ],
  ],
  [
    "docs",
    [
      "readme", " docs ", "documentation", "changelog", "jsdoc", "comment in the code",
      "add comments", "update docs",
    ],
  ],
  [
    "package",
    [
      "package.json", "npm install", "yarn add", "pnpm add", "lockfile",
      "add dependency", "devdependency", "peer dependency",
    ],
  ],
  [
    "ui",
    [
      "component", "layout", " nav ", "navbar", "sidebar", "button", " card ", "modal",
      "hero", "section", "mobile", "responsive", "landing", "homepage", "pricing copy",
      "design", "tailwind", "css", "theme", "color", "font", "icon", "badge",
      "status badge", "public nav", "header", "footer", "banner", "toast",
    ],
  ],
];

export function classifyTaskCategory(task: string, explicitPaths: string[]): TaskCategory {
  const lower = task.toLowerCase();

  // Let explicit paths provide hints
  const pathHints = explicitPaths.join(" ").toLowerCase();

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    const combined = lower + " " + pathHints;
    if (keywords.some((kw) => hasPositiveKeywordMention(combined, kw))) {
      return category;
    }
  }
  return "unknown";
}

// ── Compiler entry point ──────────────────────────────────────────────────────

export function compileTask(task: string): CompilerResult {
  const { paths, onlyMode, mustIncludeMode, explicitAllowedScope, explicitForbiddenScope, explicitForbiddenPaths } = extractExplicitPaths(task);
  const taskCategory = classifyTaskCategory(task, paths);
  return { explicitPaths: paths, onlyMode, mustIncludeMode, explicitAllowedScope, explicitForbiddenScope, explicitForbiddenPaths, taskCategory };
}

// ── Category-specific scope, stop rules, verification ────────────────────────

export interface CategoryScope {
  allowedHints: string[];
  forbiddenAdditions: string[];
  stopRules: string[];
  verificationSteps: string[];
}

export function buildCategoryScope(
  category: TaskCategory,
  hasSrc: boolean,
  hasApp: boolean,
  hasPages: boolean,
): CategoryScope {
  switch (category) {
    case "ui":
      return {
        allowedHints: [
          hasSrc && hasApp ? "src/app/ - App Router pages and layouts" : hasApp ? "app/" : hasPages ? "pages/" : "pages or app directory",
          hasSrc ? "src/components/ - UI components" : "components/",
        ].filter(Boolean),
        forbiddenAdditions: [
          "Do not touch auth internals, session logic, or JWT handling",
          "Do not touch billing, subscription, or payment logic",
          "Do not touch database schema or migrations",
          "Do not touch .env files or secrets",
        ],
        stopRules: [
          "Stop if the task requires auth, billing, or database changes",
          "Stop if more than 5 component files need editing",
        ],
        verificationSteps: [
          "npm run build",
          "Check mobile layout at target breakpoint",
          "Check no horizontal overflow introduced",
          "Check the affected route renders correctly",
        ],
      };

    case "cli":
      return {
        allowedHints: [
          "cli/ - CLI source files",
          hasSrc ? "src/lib/ - shared library utilities (read-only unless task-specific)" : "",
        ].filter(Boolean),
        forbiddenAdditions: [
          "Do not touch src/app/ dashboard or billing UI",
          "Do not touch auth internals",
          "Do not touch database schema or migrations",
          "Do not touch .env files",
        ],
        stopRules: [
          "Stop if existing runtrim go / runtrim finish behavior would break",
          "Stop if the contract file format would change incompatibly",
          "Stop if new npm dependencies are required without approval",
        ],
        verificationSteps: [
          "npm run build",
          "Run the relevant CLI command locally",
          "Inspect the generated contract output",
          "Confirm runtrim go and runtrim finish still work correctly",
        ],
      };

    case "webhook":
      return {
        allowedHints: [
          "Webhook route handler only",
          hasSrc ? "src/app/api/webhooks/ or the specific webhook route file" : "api/webhooks/",
        ],
        forbiddenAdditions: [
          "Do not touch billing UI or checkout pages",
          "Do not touch auth internals",
          "Do not touch database schema or migrations",
          "Do not touch .env files or webhook secrets",
        ],
        stopRules: [
          "Stop if the event payload shape is unknown or undocumented",
          "Stop if signature verification logic must be weakened or removed",
          "Stop if billing UI or checkout pages need changes",
          "Stop if database schema changes are required",
        ],
        verificationSteps: [
          "npm run build",
          "Replay or send a test webhook event from Dodo/Stripe dashboard",
          "Check Vercel function logs for the webhook route",
          "Check Supabase row updated correctly",
          "Confirm invalid signature is still rejected (HTTP 401)",
        ],
      };

    case "payment":
    case "billing":
      return {
        allowedHints: [
          "Billing-specific route, page, or helper file only",
          "Mention the specific file path in your task for tighter scope",
        ],
        forbiddenAdditions: [
          "Do not touch auth internals or session logic",
          "Do not touch database schema or migrations",
          "Do not touch webhook signature verification",
          "Do not touch .env files or payment secrets",
        ],
        stopRules: [
          "Stop if webhook signature verification must change",
          "Stop if database schema changes are required",
          "Stop if auth or session logic must change",
          "Stop if Dodo/Stripe payload shape is unclear",
        ],
        verificationSteps: [
          "npm run build",
          "Test the checkout or portal flow end-to-end",
          "Check Vercel function logs",
          "Check Supabase profile row updated correctly",
          "Check Dodo webhook logs if the webhook is involved",
        ],
      };

    case "auth":
      return {
        allowedHints: [
          "Auth-specific page or route only",
          "Mention the specific auth file in your task for tighter scope",
        ],
        forbiddenAdditions: [
          "Do not touch billing, subscription, or payment logic",
          "Do not touch database schema or migrations",
          "Do not touch .env files or JWT secrets",
        ],
        stopRules: [
          "Stop if billing or subscription state must change",
          "Stop if middleware or session behavior is unclear",
          "Stop if any JWT secret or session key must change",
        ],
        verificationSteps: [
          "npm run build",
          "Test the sign-in and callback flow",
          "Verify existing sessions are not invalidated",
          "Check middleware still protects required routes",
        ],
      };

    case "database":
      return {
        allowedHints: [
          "Migration or SQL file only if explicitly requested",
          "supabase/ directory if relevant",
        ],
        forbiddenAdditions: [
          "Do not run destructive migrations without explicit approval",
          "Do not touch auth or billing logic",
          "Do not touch .env files",
        ],
        stopRules: [
          "Stop before any destructive migration (DROP, DELETE, ALTER with data loss)",
          "Stop if RLS policy impact is unknown or unverified",
          "Stop if dependent application code needs changes without full scope",
        ],
        verificationSteps: [
          "Review migration SQL in a separate read-only pass first",
          "Test migration on a staging or preview database",
          "Verify RLS policies still apply correctly",
          "Confirm no data loss in affected rows",
        ],
      };

    case "api":
      return {
        allowedHints: [
          hasSrc ? "src/app/api/ - API route handlers only" : "app/api/ or pages/api/",
          hasSrc ? "src/lib/ - relevant shared helpers only" : "lib/",
        ],
        forbiddenAdditions: [
          "Do not touch auth internals or middleware",
          "Do not touch billing or subscription logic unless task-specific",
          "Do not touch database schema or migrations",
          "Do not touch .env files",
        ],
        stopRules: [
          "Stop if the API change breaks existing client consumers",
          "Stop if auth or session behavior must change",
          "Stop if database schema changes are required",
        ],
        verificationSteps: [
          "npm run build",
          "Test the API endpoint with the expected request shape",
          "Check error responses are correct",
          "Check no regression in adjacent routes",
        ],
      };

    default:
      return {
        allowedHints: [],
        forbiddenAdditions: [],
        stopRules: [],
        verificationSteps: ["npm run build"],
      };
  }
}
