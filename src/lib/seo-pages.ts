import type { Metadata } from "next";

export const RUNTRIM_SITE_URL = "https://www.runtrim.com";
export const RUNTRIM_OG_IMAGE = "/opengraph-image";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoCommandBlock = {
  title: string;
  commands: string[];
};

export type SeoLandingPageData = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  subheadline: string;
  problem: string[];
  whyThisHappens: string[];
  manualWorkflow: string[];
  runtrimWorkflow: SeoCommandBlock[];
  privacyPoints: string[];
  faqs: SeoFaq[];
  relatedSlugs: string[];
  finalCtaTitle: string;
  finalCtaBody: string;
};

export const seoPages: Record<string, SeoLandingPageData> = {
  "claude-code-context-limit": {
    slug: "claude-code-context-limit",
    title: "Claude Code context limit? Continue without starting over.",
    description:
      "Hit a Claude Code context limit? Keep state, changed files, and next actions intact so you can continue the run without restarting.",
    h1: "Claude Code context limit? Continue the run without losing state.",
    eyebrow: "Claude Code workflow",
    subheadline:
      "When a run stops mid-task, the real cost is lost state. RunTrim keeps what changed, what is missing, and what to do next.",
    problem: [
      "Usage limits can stop an agent in the middle of implementation.",
      "Teams lose momentum when the next session has no verified state.",
      "Important context like changed paths, missing proof, and unresolved checks gets dropped."
    ],
    whyThisHappens: [
      "Most agent UIs optimize for conversation, not durable run state.",
      "Context windows are finite and session boundaries break continuity.",
      "Manual handoff notes are incomplete under time pressure."
    ],
    manualWorkflow: [
      "Scan terminal output and chat logs to reconstruct intent.",
      "Guess which files changed and what verification is still missing.",
      "Write a continuation prompt from memory and hope the next run stays scoped."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim continuation workflow",
        commands: [
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim continue --reason usage_limit",
          "runtrim memory"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account is required for the Free CLI.",
      "RunTrim tracks run metadata, generated RunTrim prompts, changed file paths, and local memory.",
      "Cloud sync and hosted dashboard are Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "Does RunTrim replace Claude Code?",
        answer: "No. RunTrim controls the run around Claude, Codex, Cursor, ChatGPT, and other coding agents."
      },
      {
        question: "Does RunTrim upload source code?",
        answer: "No. Free CLI runs locally and source code stays local in V1."
      },
      {
        question: "What is a continuation prompt?",
        answer: "A continuation prompt carries current run state into the next agent session, including status, missing proof, and next safe action."
      },
      {
        question: "What does RunTrim track?",
        answer: "Run status, generated prompts, changed file paths, protected systems, verification debt, and local memory."
      },
      {
        question: "Can I continue after a usage limit safely?",
        answer: "Yes. RunTrim generates a continuation prompt from local run state so follow-up sessions restart with clear scope."
      }
    ],
    relatedSlugs: [
      "ai-coding-continuation-prompts",
      "ai-coding-run-history",
      "ai-coding-agent-guardrails",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Install RunTrim",
    finalCtaBody: "Use local run memory and continuation prompts so context limits do not force a full restart."
  },
  "ai-coding-continuation-prompts": {
    slug: "ai-coding-continuation-prompts",
    title: "AI coding continuation prompts for Claude, Codex, Cursor and ChatGPT.",
    description:
      "Generate continuation prompts that carry task state, changed files, protected areas, and next action when an AI coding run stops.",
    h1: "Create continuation prompts when AI coding runs stop mid-task.",
    eyebrow: "Continuation prompts",
    subheadline:
      "Good continuation prompts preserve operational state. They do not ask the next session to rediscover it.",
    problem: [
      "Runs stop due to usage limits, context limits, or tool timeouts.",
      "Most handoff prompts miss crucial state and cause duplicate work.",
      "Follow-up sessions often re-open already solved subproblems."
    ],
    whyThisHappens: [
      "Engineers optimize for speed and skip structured handoff data.",
      "Agent outputs are long, and signal gets buried in narrative.",
      "There is no standard format for run continuation across tools."
    ],
    manualWorkflow: [
      "Manually summarize objective and partial progress.",
      "List changed files and unresolved checks from memory.",
      "Re-state sensitive areas and next action in a new prompt."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim continuation prompt flow",
        commands: [
          "runtrim check",
          "runtrim continue --reason usage_limit",
          "runtrim memory --prompt"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "Free CLI does not require an account.",
      "RunTrim stores metadata, generated prompts, changed file paths, and local memory for continuity.",
      "Cloud sync in Pro early access is metadata-only."
    ],
    faqs: [
      {
        question: "What should a continuation prompt include?",
        answer: "Task state, changed files, missing proof, protected areas, and one explicit next action."
      },
      {
        question: "Does RunTrim work with Codex, Cursor, and ChatGPT?",
        answer: "Yes. Copy mode works with any agent UI. Command mode can wrap configured local agent CLIs."
      },
      {
        question: "Does RunTrim upload source code?",
        answer: "No. Free CLI is local-first and source code stays local in V1."
      },
      {
        question: "Can continuation prompts reduce token waste?",
        answer: "Yes. They reduce repeated context reconstruction and keep the next run focused on remaining work."
      },
      {
        question: "What does runtrim memory --prompt do?",
        answer: "It outputs a prompt-ready summary from local run memory for the next session."
      }
    ],
    relatedSlugs: [
      "claude-code-context-limit",
      "ai-coding-run-history",
      "ai-coding-agent-guardrails",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Generate cleaner continuations",
    finalCtaBody: "Use RunTrim to carry state forward so the next run starts with facts, not guesses."
  },
  "ai-coding-run-history": {
    slug: "ai-coding-run-history",
    title: "AI coding run history for agent workflows.",
    description:
      "Keep AI coding run history across sessions with local memory for prompts, statuses, changed file paths, and follow-ups.",
    h1: "Keep run history across Claude, Codex, Cursor and ChatGPT.",
    eyebrow: "Run history",
    subheadline:
      "AI coding gets messy when every session starts from scratch. RunTrim keeps local run memory visible between sessions.",
    problem: [
      "Past decisions disappear after each session closes.",
      "Teams repeat failed approaches because prior outcomes are not searchable.",
      "Without run history, verification debt grows silently."
    ],
    whyThisHappens: [
      "Most AI coding workflows use ephemeral chat threads.",
      "Git history alone does not preserve run intent or missing proof state.",
      "Cross-tool work makes it hard to keep one timeline."
    ],
    manualWorkflow: [
      "Collect scattered notes from chat, terminal, and commits.",
      "Reconstruct what was attempted and what passed checks.",
      "Create a manual run summary before each follow-up session."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim run history flow",
        commands: [
          'runtrim go "your task"',
          "runtrim check",
          "runtrim memory",
          "runtrim report"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "Free CLI runs without account setup.",
      "RunTrim tracks statuses, generated prompts, changed file paths, protected systems, and local memory.",
      "Hosted dashboard and sync are Pro early access with metadata-only sync."
    ],
    faqs: [
      {
        question: "What is included in run history?",
        answer: "Task status, generated prompts, changed file paths, checks, verification debt, and follow-up actions."
      },
      {
        question: "Is run history local or cloud?",
        answer: "Free CLI history is local in V1. Cloud sync is optional Pro early access and metadata-only."
      },
      {
        question: "Can I use run history across different agent tools?",
        answer: "Yes. RunTrim works as a control layer around Claude, Codex, Cursor, ChatGPT, and other agent workflows."
      },
      {
        question: "Does this replace git history?",
        answer: "No. Git tracks code changes. RunTrim tracks run intent, checks, and continuation state around those changes."
      }
    ],
    relatedSlugs: [
      "ai-coding-continuation-prompts",
      "claude-code-context-limit",
      "ai-coding-agent-guardrails",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Keep run memory visible",
    finalCtaBody: "Capture run outcomes locally so follow-up sessions start from proven state."
  },
  "local-first-ai-coding-tool": {
    slug: "local-first-ai-coding-tool",
    title: "Local-first AI coding tool with no source code upload.",
    description:
      "RunTrim is a local-first AI coding control layer. Free CLI requires no account and keeps source code local in V1.",
    h1: "A local-first control layer for AI coding agents.",
    eyebrow: "Local-first AI coding",
    subheadline:
      "RunTrim works in your repo. Free CLI has no account requirement. Cloud sync is optional Pro early access and metadata-only.",
    problem: [
      "Developers need workflow support without uploading source code.",
      "Many tools combine local workflow with mandatory cloud accounts.",
      "Security reviews stall adoption when data boundaries are unclear."
    ],
    whyThisHappens: [
      "Cloud-first products often assume centralized storage by default.",
      "Policy-sensitive teams need explicit local-only operation.",
      "Developers want guardrails and memory without changing trust boundaries."
    ],
    manualWorkflow: [
      "Track scope and run outcomes in local notes.",
      "Manually preserve follow-up prompts and safety constraints.",
      "Rebuild context on every new session."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim local-first start",
        commands: [
          "npm install -g runtrim",
          "runtrim go \"your task\""
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for Free CLI.",
      "RunTrim tracks metadata, generated prompts, changed file paths, and local memory.",
      "Pro early access cloud sync is optional and metadata-only."
    ],
    faqs: [
      {
        question: "Does RunTrim upload source code?",
        answer: "No. In V1, source code stays local when using the Free CLI."
      },
      {
        question: "Do I need an account to use RunTrim?",
        answer: "No. The Free CLI works locally without an account."
      },
      {
        question: "What does cloud sync store?",
        answer: "Cloud sync stores run metadata, generated prompts, changed file paths, and project memory for approved Pro early access users."
      },
      {
        question: "Can I still use my preferred coding agent?",
        answer: "Yes. RunTrim is agent-agnostic and supports copy mode across major AI coding tools."
      }
    ],
    relatedSlugs: [
      "ai-coding-agent-guardrails",
      "ai-coding-run-history",
      "ai-coding-continuation-prompts",
      "claude-code-context-limit"
    ],
    finalCtaTitle: "Start local",
    finalCtaBody: "Install the Free CLI and run locally without source code upload in V1."
  },
  "ai-coding-agent-guardrails": {
    slug: "ai-coding-agent-guardrails",
    title: "AI coding agent guardrails for safer agent runs.",
    description:
      "Set guardrails before AI agents edit files. Scope tasks, protect sensitive systems, and verify changed paths after each run.",
    h1: "Keep AI coding agents scoped before they edit.",
    eyebrow: "Agent guardrails",
    subheadline:
      "Broad tasks can drift into auth, billing, env, database, middleware, and other sensitive areas. Guardrails reduce that risk.",
    problem: [
      "Unscoped tasks lead agents into files that were not part of the goal.",
      "Sensitive systems can be changed accidentally during unrelated work.",
      "Post-run review is hard without explicit pre-run boundaries."
    ],
    whyThisHappens: [
      "Agents optimize for completion and may expand scope unless constrained.",
      "Prompt intent is often broader than the real engineering objective.",
      "Teams rely on implicit rules that are not machine-readable."
    ],
    manualWorkflow: [
      "Write a long preface describing files to avoid.",
      "Review diffs manually and compare against intent.",
      "Block risky changes late in the cycle after tokens were already spent."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim guardrail workflow",
        commands: [
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks metadata, prompts it generates, changed file paths, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What are agent guardrails?",
        answer: "Guardrails define allowed scope, protected systems, and verification requirements before an agent starts editing."
      },
      {
        question: "Can guardrails prevent every risky change?",
        answer: "No tool can guarantee that. RunTrim reduces risk by making scope explicit and checking changed paths after the run."
      },
      {
        question: "Does RunTrim work with Claude, Codex, Cursor, and ChatGPT?",
        answer: "Yes. It works in copy mode with any UI and can wrap configured local CLIs in command mode."
      },
      {
        question: "What does RunTrim track during guarded runs?",
        answer: "Run status, generated prompts, changed file paths, protected systems, verification debt, and local memory."
      }
    ],
    relatedSlugs: [
      "local-first-ai-coding-tool",
      "ai-coding-run-history",
      "ai-coding-continuation-prompts",
      "claude-code-context-limit"
    ],
    finalCtaTitle: "Add guardrails before edits",
    finalCtaBody: "Define scope first, then verify changed paths before shipping agent-generated code."
  },
  "cursor-context-limit": {
    slug: "cursor-context-limit",
    title: "Cursor context limit? Continue without losing run state.",
    description:
      "Hit a Cursor context limit mid-task? Keep run state, changed files, and next actions intact so follow-up sessions pick up where the last one stopped.",
    h1: "Cursor context limit? Continue the run without restarting.",
    eyebrow: "Cursor workflow",
    subheadline:
      "Cursor AI hits context boundaries during long tasks. RunTrim keeps current state, missing proof, and the next safe action ready for the next session.",
    problem: [
      "Context limits stop Cursor mid-task, often during multi-file changes.",
      "The next session starts without any verified record of what changed.",
      "Teams spend time reconstructing intent from chat history and terminal output."
    ],
    whyThisHappens: [
      "Cursor optimizes for conversation flow, not durable run state.",
      "Context windows are finite and long tasks cross session boundaries.",
      "Manual notes written under time pressure miss critical verification state."
    ],
    manualWorkflow: [
      "Scan Cursor chat history to reconstruct what was completed.",
      "Manually identify changed files and unfinished steps.",
      "Write a new prompt from memory hoping the next session stays on track."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Cursor continuation workflow",
        commands: [
          "runtrim agent set cursor",
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim continue --reason usage_limit",
          "runtrim memory"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks run metadata, generated prompts, changed file paths, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "Does RunTrim work with Cursor?",
        answer: "Yes. Set copy mode with runtrim agent set cursor. RunTrim generates a scoped prompt to paste into Cursor and tracks the run locally."
      },
      {
        question: "Does RunTrim upload source code?",
        answer: "No. Free CLI runs locally and source code stays local in V1."
      },
      {
        question: "What is a continuation prompt?",
        answer: "A prompt that carries current run state into the next Cursor session, including what changed, what is missing, and the next safe action."
      },
      {
        question: "How is this different from Cursor's built-in memory?",
        answer: "Cursor handles conversation context. RunTrim handles run state: changed file paths, verification debt, protected systems, and continuation prompts."
      },
      {
        question: "Can RunTrim reduce token waste in Cursor?",
        answer: "Yes. Continuation prompts reduce repeated context reconstruction and keep follow-up sessions focused on remaining work."
      }
    ],
    relatedSlugs: [
      "claude-code-context-limit",
      "ai-coding-continuation-prompts",
      "cursor-agent-guardrails",
      "cursor-agent-run-history"
    ],
    finalCtaTitle: "Continue Cursor runs cleanly",
    finalCtaBody: "Install RunTrim to keep Cursor run state across context limits without restarting from scratch."
  },
  "cursor-agent-run-history": {
    slug: "cursor-agent-run-history",
    title: "Cursor agent run history for AI coding sessions.",
    description:
      "Keep run history across Cursor AI coding sessions with local memory for prompts, statuses, changed file paths, and follow-ups.",
    h1: "Keep run history across Cursor AI coding sessions.",
    eyebrow: "Cursor run history",
    subheadline:
      "Cursor sessions are ephemeral. RunTrim keeps local run memory visible so the next session starts from verified state, not guesswork.",
    problem: [
      "Cursor chat history disappears when the session closes.",
      "There is no searchable record of past decisions and partial changes.",
      "Follow-up sessions repeat failed approaches because prior outcomes are not visible."
    ],
    whyThisHappens: [
      "Cursor optimizes for in-session conversation, not persistent run state.",
      "Git history tracks code changes but not run intent or missing verification.",
      "Multi-session tasks produce scattered notes with no central timeline."
    ],
    manualWorkflow: [
      "Review Cursor chat logs and terminal output to reconstruct what happened.",
      "Note which files changed and which checks are still unresolved.",
      "Write a run summary from memory before each follow-up session."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Cursor run history flow",
        commands: [
          "runtrim agent set cursor",
          'runtrim go "your task"',
          "runtrim check",
          "runtrim memory",
          "runtrim report"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "Free CLI runs without account setup.",
      "RunTrim tracks statuses, generated prompts, changed file paths, and local memory.",
      "Hosted dashboard and sync are Pro early access with metadata-only sync."
    ],
    faqs: [
      {
        question: "What is included in Cursor run history?",
        answer: "Task status, generated prompts, changed file paths, checks, verification debt, and follow-up actions."
      },
      {
        question: "Is run history local or cloud?",
        answer: "Free CLI history is local in V1. Cloud sync is optional Pro early access and metadata-only."
      },
      {
        question: "Does this replace Cursor's chat history?",
        answer: "No. Cursor handles conversation. RunTrim tracks run state, outcomes, and continuation data outside the chat window."
      },
      {
        question: "Can I view run history across multiple Cursor sessions?",
        answer: "Yes. RunTrim keeps a local record of every captured run regardless of how many Cursor sessions were involved."
      }
    ],
    relatedSlugs: [
      "ai-coding-run-history",
      "cursor-context-limit",
      "cursor-agent-guardrails",
      "ai-coding-continuation-prompts"
    ],
    finalCtaTitle: "Keep Cursor run memory visible",
    finalCtaBody: "Capture Cursor run outcomes locally so follow-up sessions start from proven state."
  },
  "cursor-agent-guardrails": {
    slug: "cursor-agent-guardrails",
    title: "Cursor agent guardrails to keep AI runs scoped.",
    description:
      "Set guardrails before Cursor AI edits files. Define scope, protect sensitive systems, and verify changed paths after each run.",
    h1: "Keep Cursor AI runs scoped before they edit sensitive files.",
    eyebrow: "Cursor guardrails",
    subheadline:
      "Without explicit scope, Cursor can drift into auth, billing, env, database, and other areas outside the original task. Guardrails set the boundary before the run starts.",
    problem: [
      "Cursor tasks without explicit scope can drift into files outside the goal.",
      "Sensitive systems can be changed during unrelated Cursor work without warning.",
      "Post-run review is difficult without defined pre-run boundaries."
    ],
    whyThisHappens: [
      "Cursor optimizes for completion and may expand scope unless constrained.",
      "Natural language task descriptions are often broader than the real engineering objective.",
      "Teams rely on implicit rules that are not visible to the agent."
    ],
    manualWorkflow: [
      "Write a long system prompt describing files to avoid before each Cursor session.",
      "Review every changed file manually after the run.",
      "Block risky changes late in the cycle after tokens were already spent."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Cursor guardrail workflow",
        commands: [
          "runtrim agent set cursor",
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks metadata, generated prompts, changed file paths, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What are Cursor agent guardrails?",
        answer: "Scope boundaries, protected systems, and verification requirements set before Cursor starts editing, so drift is caught early rather than after the fact."
      },
      {
        question: "Can guardrails prevent every unsafe change in Cursor?",
        answer: "No tool can guarantee that. RunTrim makes scope explicit before the run and checks changed paths after, reducing risk at both points."
      },
      {
        question: "Does RunTrim interfere with Cursor directly?",
        answer: "No. In copy mode, RunTrim generates a scoped prompt to paste into Cursor. The agent runs as normal with tighter input constraints."
      },
      {
        question: "What systems does RunTrim protect by default?",
        answer: "Auth, billing, env, database, middleware, and other high-risk areas detected from your project config."
      }
    ],
    relatedSlugs: [
      "ai-coding-agent-guardrails",
      "cursor-context-limit",
      "cursor-agent-run-history",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Add guardrails to Cursor runs",
    finalCtaBody: "Define scope first, then verify changed paths before shipping Cursor-generated code."
  },
  "codex-cli-continuation": {
    slug: "codex-cli-continuation",
    title: "Codex CLI context limit? Continue without restarting.",
    description:
      "Hit a Codex CLI context limit or timeout? Keep run state, changed files, and next actions ready so the follow-up session picks up cleanly.",
    h1: "Continue after a Codex CLI context limit without losing run state.",
    eyebrow: "Codex CLI workflow",
    subheadline:
      "Codex CLI runs stop when context fills or tool timeouts occur. RunTrim keeps what changed and what to do next so continuations are structured, not guesswork.",
    problem: [
      "Codex CLI stops mid-task when context fills or timeouts occur.",
      "The next run starts without a verified record of what was completed.",
      "Duplicate work and repeated context reconstruction waste tokens."
    ],
    whyThisHappens: [
      "Codex CLI optimizes for task completion, not persistent run state.",
      "Long tasks cross context boundaries and session restarts drop continuity.",
      "Manual handoff notes miss verification state and protected area constraints."
    ],
    manualWorkflow: [
      "Scan Codex terminal output to identify what completed and what did not.",
      "Manually reconstruct changed files, failed checks, and next steps.",
      "Write a continuation prompt from memory and re-run Codex."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Codex CLI continuation workflow",
        commands: [
          "runtrim agent set codex",
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim continue --reason usage_limit",
          "runtrim memory"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks run metadata, generated prompts, changed file paths, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "Does RunTrim work with Codex CLI?",
        answer: "Yes. Use runtrim agent set codex to configure command mode. RunTrim can wrap Codex CLI runs or generate prompts for copy mode."
      },
      {
        question: "Does RunTrim upload source code?",
        answer: "No. Free CLI runs locally and source code stays local in V1."
      },
      {
        question: "Can RunTrim reduce Codex token waste?",
        answer: "Yes. Continuation prompts carry run state forward so the next Codex run skips repeated context reconstruction."
      },
      {
        question: "What does runtrim agent set codex do?",
        answer: "It configures RunTrim to use Codex CLI in command mode for wrapped runs. Copy mode is available without this setting."
      },
      {
        question: "How is RunTrim different from Codex CLI memory features?",
        answer: "RunTrim tracks run state outside the agent: changed file paths, verification debt, protected systems, and continuation data between sessions."
      }
    ],
    relatedSlugs: [
      "claude-code-context-limit",
      "ai-coding-continuation-prompts",
      "codex-cli-guardrails",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Continue Codex CLI runs cleanly",
    finalCtaBody: "Install RunTrim to carry Codex run state across context limits and tool timeouts."
  },
  "codex-cli-guardrails": {
    slug: "codex-cli-guardrails",
    title: "Codex CLI guardrails to keep AI runs scoped.",
    description:
      "Set guardrails before Codex CLI edits files. Scope tasks, protect sensitive systems, and verify changed paths after each run.",
    h1: "Keep Codex CLI runs scoped before they edit.",
    eyebrow: "Codex CLI guardrails",
    subheadline:
      "Codex CLI tasks without explicit scope can drift into auth, billing, env, and other sensitive areas. Guardrails define the boundary before the run starts.",
    problem: [
      "Unscoped Codex CLI tasks can touch files outside the intended goal.",
      "Sensitive systems can be modified during unrelated Codex runs without warning.",
      "Post-run review is harder without pre-defined scope boundaries."
    ],
    whyThisHappens: [
      "Codex optimizes for task completion and interprets broad prompts broadly.",
      "Natural language task descriptions do not encode explicit file boundaries.",
      "Teams rely on implicit rules that are not readable by the agent."
    ],
    manualWorkflow: [
      "Write a long preface describing files and systems to avoid before each Codex run.",
      "Review every changed file manually after the run.",
      "Re-run with a tighter prompt if drift is detected, paying the token cost twice."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Codex CLI guardrail workflow",
        commands: [
          "runtrim agent set codex",
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks metadata, generated prompts, changed file paths, and protected systems.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What are Codex CLI guardrails?",
        answer: "Scope rules, protected systems, and verification requirements set before Codex runs so drift is detected and checked rather than discovered in production."
      },
      {
        question: "Does RunTrim interfere with Codex CLI directly?",
        answer: "In command mode, RunTrim wraps Codex CLI runs. In copy mode, it generates a scoped prompt to paste. The agent runs normally with tighter input."
      },
      {
        question: "Can guardrails prevent every risky Codex change?",
        answer: "No tool can guarantee that. RunTrim reduces risk by making scope explicit before the run and checking changed paths after."
      },
      {
        question: "What does runtrim agent set codex do?",
        answer: "It configures RunTrim to use Codex CLI in command mode for wrapped runs."
      }
    ],
    relatedSlugs: [
      "ai-coding-agent-guardrails",
      "codex-cli-continuation",
      "ai-agent-scope-drift",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Add guardrails to Codex CLI runs",
    finalCtaBody: "Define scope before Codex starts editing and verify changed paths before shipping."
  },
  "claude-code-token-waste": {
    slug: "claude-code-token-waste",
    title: "Reduce Claude Code token waste with scoped runs.",
    description:
      "Stop paying twice for context Claude Code already built. RunTrim scopes tasks before they start and carries state forward so token spend goes on new work.",
    h1: "Reduce Claude Code token waste with scoped runs and local memory.",
    eyebrow: "Claude Code token savings",
    subheadline:
      "Token waste in Claude Code comes from unscoped tasks, repeated context reconstruction, and sessions that restart from scratch after a limit. RunTrim addresses all three.",
    problem: [
      "Unscoped tasks send Claude Code into unnecessary files and inflate context.",
      "Sessions after a context limit restart from zero, paying again for context already built.",
      "Without run memory, failed approaches get repeated and prompt quality degrades."
    ],
    whyThisHappens: [
      "Claude Code optimizes for task completion and may expand scope unless constrained.",
      "Context window limits break continuity and force full re-explanation each session.",
      "Without run memory, verification debt grows silently across sessions."
    ],
    manualWorkflow: [
      "Write a detailed preface to constrain Claude Code scope before each run.",
      "After a limit, manually reconstruct state and re-scope for the next session.",
      "Keep notes on what changed and what checks passed to avoid repetition."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim Claude Code scoped run workflow",
        commands: [
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim continue --reason usage_limit"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks run metadata, generated prompts, changed file paths, and local memory.",
      "Savings estimates are local approximations based on run metadata, not billing data."
    ],
    faqs: [
      {
        question: "How does RunTrim reduce token waste in Claude Code?",
        answer: "By scoping tasks before they start, monitoring changed paths during the run, and generating continuation prompts that skip repeated context reconstruction."
      },
      {
        question: "Does RunTrim access Claude Code billing data?",
        answer: "No. Savings estimates are local approximations based on run metadata and task complexity."
      },
      {
        question: "Does RunTrim upload source code to estimate savings?",
        answer: "No. All estimation is local and source code stays on your machine in V1."
      },
      {
        question: "What is a guarded run contract?",
        answer: "A scoped task description that defines the allowed file surface, protected systems, and verification requirements before Claude Code starts editing."
      },
      {
        question: "Can RunTrim prevent every case of scope drift?",
        answer: "No tool can guarantee that. RunTrim reduces risk by making scope explicit before the run and checking changed paths after."
      }
    ],
    relatedSlugs: [
      "claude-code-context-limit",
      "ai-coding-agent-guardrails",
      "ai-coding-token-waste",
      "ai-coding-continuation-prompts"
    ],
    finalCtaTitle: "Scope Claude Code runs before they waste tokens",
    finalCtaBody: "Define scope first. Carry state forward. Stop paying for context Claude Code already built."
  },
  "ai-agent-scope-drift": {
    slug: "ai-agent-scope-drift",
    title: "AI agent scope drift: causes, cost, and how to prevent it.",
    description:
      "AI coding agents drift into files outside the task goal. Learn why scope drift happens, what it costs, and how to prevent it before the run starts.",
    h1: "AI agent scope drift: what it is and how to prevent it.",
    eyebrow: "Agent scope drift",
    subheadline:
      "Scope drift happens when an AI coding agent edits files outside the intended task surface. It costs tokens, introduces risk, and makes post-run review harder.",
    problem: [
      "Agents optimize for completion and interpret broad prompts broadly.",
      "A task touching one component may pull in auth, routing, or database files.",
      "Scope drift is invisible until the diff review, after the tokens are already spent."
    ],
    whyThisHappens: [
      "Natural language task descriptions do not encode explicit file boundaries.",
      "Agents use context to infer scope and that inference is often wider than intended.",
      "Without machine-readable stop rules, agents follow the path of least resistance."
    ],
    manualWorkflow: [
      "Write a detailed preamble listing files and systems to avoid before each run.",
      "Review every changed file after the run and compare against original intent.",
      "Re-run with a tighter prompt if drift is detected, paying the token cost twice."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim scope drift prevention workflow",
        commands: [
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks metadata, generated prompts, changed file paths, and protected systems.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What is AI agent scope drift?",
        answer: "Scope drift is when an AI coding agent edits files or systems outside the intended task boundary, often because the prompt did not encode explicit limits."
      },
      {
        question: "Which agents are most prone to scope drift?",
        answer: "Any agent given a broad natural language task can drift. Claude Code, Cursor, Codex, and ChatGPT all interpret prompt scope similarly."
      },
      {
        question: "How does RunTrim prevent scope drift?",
        answer: "By defining allowed file surface, protected systems, and stop rules before the run starts, and checking changed paths against those rules after."
      },
      {
        question: "Does RunTrim block agent actions in real time?",
        answer: "No. RunTrim defines scope before the run and checks drift after. It does not intercept agent actions mid-run."
      },
      {
        question: "Is scope drift always expensive?",
        answer: "Not always, but it is unpredictable. Drift into auth or payment systems during an unrelated task carries real risk regardless of token cost."
      }
    ],
    relatedSlugs: [
      "ai-coding-agent-guardrails",
      "claude-code-token-waste",
      "cursor-agent-guardrails",
      "codex-cli-guardrails"
    ],
    finalCtaTitle: "Define scope before the run starts",
    finalCtaBody: "Set guardrails, monitor drift, and verify changed paths so scope stays where you intended it."
  },
  "ai-coding-token-waste": {
    slug: "ai-coding-token-waste",
    title: "Reduce AI coding token waste with scoped runs and run memory.",
    description:
      "AI coding token waste comes from repeated context, unscoped tasks, and sessions that restart from scratch. RunTrim scopes runs and carries state forward to reduce waste.",
    h1: "Reduce AI coding token waste with scoped tasks and local run memory.",
    eyebrow: "Token waste",
    subheadline:
      "Most AI coding token waste is not in the code. It is in repeated re-explanation, unscoped tasks that drag in unnecessary context, and sessions that restart after a limit.",
    problem: [
      "Sessions after a context limit restart with full re-explanation of already-established context.",
      "Unscoped tasks pull in files outside the goal and inflate context unnecessarily.",
      "Without run memory, the same failed approaches get tried again in the next session."
    ],
    whyThisHappens: [
      "AI coding tools have no persistent memory between sessions by default.",
      "Broad prompts give agents latitude to pull in broader context.",
      "Engineers optimize for speed and skip structured handoff, paying the cost in the next session."
    ],
    manualWorkflow: [
      "Write a new scoped prompt for each session, rebuilding context from scratch.",
      "Keep manual notes on what worked and what changed to avoid repetition.",
      "Accept token waste as a cost of using AI coding tools without a memory layer."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim token waste reduction workflow",
        commands: [
          'runtrim guard "your task"',
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim continue --reason usage_limit",
          "runtrim memory"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks metadata, generated prompts, changed file paths, and local memory.",
      "Savings estimates are local approximations based on run metadata, not billing data."
    ],
    faqs: [
      {
        question: "What causes AI coding token waste?",
        answer: "Repeated context reconstruction, unscoped tasks, post-limit restarts, and failed approaches being tried again without a run history."
      },
      {
        question: "Does RunTrim reduce token usage in real time?",
        answer: "No. RunTrim scopes tasks before the run starts and generates continuation prompts that reduce re-explanation in follow-up sessions."
      },
      {
        question: "How accurate are RunTrim savings estimates?",
        answer: "They are local approximations based on task complexity and run metadata. Treat them as directional, not billing data."
      },
      {
        question: "Does RunTrim work with all AI coding agents?",
        answer: "Yes. Copy mode works with any agent UI. Command mode wraps configured local CLIs like Claude Code and Codex."
      },
      {
        question: "Does RunTrim access API keys or billing accounts?",
        answer: "No. RunTrim runs locally and does not access agent APIs, billing data, or source code in V1."
      }
    ],
    relatedSlugs: [
      "claude-code-token-waste",
      "ai-coding-agent-guardrails",
      "ai-coding-run-history",
      "ai-agent-scope-drift"
    ],
    finalCtaTitle: "Stop paying for context you already built",
    finalCtaBody: "Scope tasks, carry state forward, and let the next session start from proven run memory."
  },
  "ai-coding-verification": {
    slug: "ai-coding-verification",
    title: "Verify AI coding agent output before it ships.",
    description:
      "Check what an AI coding agent actually changed, which files were touched, and whether the run stayed within scope before committing or shipping.",
    h1: "Verify what AI coding agents changed before shipping.",
    eyebrow: "Run verification",
    subheadline:
      "AI agents report completion without a structured verification step. RunTrim checks changed files, scope adherence, and missing proof after the run so risky output does not ship unreviewed.",
    problem: [
      "AI coding agents report completion but changed files are not always verified.",
      "Scope drift goes undetected until a diff review or a production incident.",
      "Verification debt accumulates silently across multiple sessions."
    ],
    whyThisHappens: [
      "Agent UIs surface conversation output, not a structured list of changed paths.",
      "Engineers move fast and skip manual diff review under time pressure.",
      "Without a defined verification step, completion is assumed rather than confirmed."
    ],
    manualWorkflow: [
      "Run git diff after each agent session and manually review every changed file.",
      "Compare changes against original task intent to identify scope violations.",
      "Document missing proof and unresolved checks before moving to the next task."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim verification workflow",
        commands: [
          'runtrim go "your task"',
          "runtrim watch",
          "runtrim check",
          "runtrim report"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim tracks changed file paths, run status, verification debt, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What does runtrim check do?",
        answer: "It evaluates the current run against the defined task, checks changed file paths against allowed scope, and surfaces verification debt and missing proof."
      },
      {
        question: "What is verification debt?",
        answer: "Verification debt is the accumulated set of checks and confirmations that were defined before the run but not yet confirmed as passing after it."
      },
      {
        question: "Does RunTrim run tests automatically?",
        answer: "No. RunTrim tracks which verifications were defined and which are still outstanding. Running the actual tests is the engineer's responsibility."
      },
      {
        question: "What does runtrim report produce?",
        answer: "A structured summary of the run including status, changed paths, risk indicators, verification debt, and recommended follow-up actions."
      },
      {
        question: "Does RunTrim read file contents?",
        answer: "RunTrim reads changed file paths and project config locally. It does not read file contents or upload source code in V1."
      }
    ],
    relatedSlugs: [
      "ai-coding-agent-guardrails",
      "ai-coding-run-history",
      "ai-agent-scope-drift",
      "claude-code-token-waste"
    ],
    finalCtaTitle: "Check what actually changed",
    finalCtaBody: "Run runtrim check after every agent session to surface scope violations and verification debt before they ship."
  },
  "ai-coding-prompt-reuse": {
    slug: "ai-coding-prompt-reuse",
    title: "Reuse AI coding prompts across sessions and agents.",
    description:
      "Save AI coding prompts that worked and reuse them verbatim or as a base for the next run. Stop rebuilding the same context from scratch every session.",
    h1: "Save and reuse AI coding prompts across sessions.",
    eyebrow: "Prompt reuse",
    subheadline:
      "Writing a good AI coding prompt takes time. RunTrim saves the prompts it generates so the next run starts from a verified base, not from memory.",
    problem: [
      "Good AI coding prompts are rebuilt from scratch every session.",
      "There is no searchable record of prompts that produced clean results.",
      "Prompt quality degrades over time because engineers write from memory under time pressure."
    ],
    whyThisHappens: [
      "AI coding tools store conversation history, not reusable prompt templates.",
      "There is no standard format for capturing a prompt alongside its run outcome.",
      "Engineers move to the next task without saving what worked."
    ],
    manualWorkflow: [
      "Copy successful prompts into a notes file or local doc.",
      "Manually adapt saved prompts for new tasks with similar scope.",
      "Lose context about why a prompt worked when notes age or are not maintained."
    ],
    runtrimWorkflow: [
      {
        title: "RunTrim prompt reuse workflow",
        commands: [
          'runtrim go "your task"',
          "runtrim memory",
          "runtrim memory --prompt"
        ]
      }
    ],
    privacyPoints: [
      "Source code stays local in V1.",
      "No account required for the Free CLI.",
      "RunTrim stores generated prompts, run statuses, changed file paths, and local memory.",
      "Cloud sync is Pro early access and metadata-only."
    ],
    faqs: [
      {
        question: "What does RunTrim save from each run?",
        answer: "The generated task contract, scope constraints, protected systems, and the outcome of the run it produced."
      },
      {
        question: "Can I reuse prompts across different agents?",
        answer: "Yes. Prompts generated by RunTrim are plain text and work in copy mode with any agent UI."
      },
      {
        question: "What does runtrim memory --prompt do?",
        answer: "It outputs a prompt-ready summary from local run memory including current state, missing proof, and next safe action."
      },
      {
        question: "Does RunTrim store manually written prompts?",
        answer: "RunTrim saves the prompts it generates from runtrim go and runtrim prepare. Prompts written and pasted directly into agents are not captured."
      },
      {
        question: "Is prompt history stored locally or in the cloud?",
        answer: "Prompt history is local in V1. Cloud sync is optional Pro early access and syncs metadata only."
      }
    ],
    relatedSlugs: [
      "ai-coding-continuation-prompts",
      "ai-coding-run-history",
      "ai-coding-token-waste",
      "local-first-ai-coding-tool"
    ],
    finalCtaTitle: "Save prompts that work",
    finalCtaBody: "Use RunTrim to capture and reuse the prompts that produced clean results."
  }
};

export function getSeoPage(slug: string): SeoLandingPageData {
  const page = seoPages[slug];
  if (!page) {
    throw new Error(`Unknown SEO page slug: ${slug}`);
  }
  return page;
}

export const seoKeywords: Record<string, string[]> = {
  "claude-code-context-limit": [
    "Claude Code context limit", "Claude Code usage limit", "continue Claude Code session",
    "Claude Code context window full", "Claude Code run state", "Claude Code continuation prompt",
    "Claude Code session restart", "AI coding context limit", "runtrim continue",
  ],
  "ai-coding-continuation-prompts": [
    "AI coding continuation prompt", "continue AI coding session", "AI agent handoff prompt",
    "AI run continuation", "continuation prompt Claude Code", "Cursor continuation prompt",
    "Codex continuation", "AI session handoff", "coding agent continuation",
  ],
  "ai-coding-run-history": [
    "AI coding run history", "AI agent run log", "AI coding session history",
    "Claude Code history", "Cursor run history", "AI coding memory", "agent run log",
    "AI coding audit trail",
  ],
  "local-first-ai-coding-tool": [
    "local first AI coding tool", "local AI coding", "AI coding no upload",
    "private AI coding tool", "offline AI coding", "no source code upload AI",
    "local AI developer tool", "AI coding privacy",
  ],
  "ai-coding-agent-guardrails": [
    "AI coding agent guardrails", "AI agent scope control", "AI coding safety",
    "protect files from AI agent", "agent scope boundaries", "AI run guardrails",
    "coding agent safety", "AI agent file protection",
  ],
  "cursor-context-limit": [
    "Cursor context limit", "Cursor AI context limit", "Cursor session restart",
    "continue Cursor session", "Cursor run state", "Cursor AI context window full",
    "Cursor continuation prompt", "Cursor memory between sessions",
  ],
  "cursor-agent-run-history": [
    "Cursor agent run history", "Cursor session history", "Cursor AI memory",
    "Cursor run log", "Cursor coding history", "Cursor AI session log",
  ],
  "cursor-agent-guardrails": [
    "Cursor agent guardrails", "Cursor AI scope control", "Cursor coding safety",
    "Cursor scope boundaries", "protect files from Cursor", "Cursor AI file protection",
  ],
  "codex-cli-continuation": [
    "Codex CLI context limit", "Codex CLI continuation", "continue Codex CLI session",
    "OpenAI Codex CLI context limit", "Codex run state", "Codex CLI timeout",
  ],
  "codex-cli-guardrails": [
    "Codex CLI guardrails", "Codex scope control", "Codex CLI safety",
    "OpenAI Codex guardrails", "Codex CLI file protection",
  ],
  "claude-code-token-waste": [
    "Claude Code token waste", "reduce Claude Code tokens", "Claude Code token savings",
    "Claude Code cost reduction", "Claude Code efficiency", "AI token optimization Claude",
    "Claude Code repeated context",
  ],
  "ai-agent-scope-drift": [
    "AI agent scope drift", "AI coding scope creep", "agent scope drift",
    "AI file drift", "AI agent file boundaries", "prevent AI scope drift",
    "AI agent unintended edits",
  ],
  "ai-coding-token-waste": [
    "AI coding token waste", "reduce AI coding tokens", "AI token savings",
    "AI coding cost reduction", "AI token optimization", "reduce LLM token usage",
    "AI coding repeated context",
  ],
  "ai-coding-verification": [
    "verify AI coding output", "AI coding verification", "check AI agent changes",
    "AI run verification", "verify agent output", "AI coding output review",
    "runtrim check",
  ],
  "ai-coding-prompt-reuse": [
    "reuse AI coding prompts", "AI prompt reuse", "save AI coding prompts",
    "AI prompt history", "AI coding prompt template", "reusable AI coding prompts",
    "runtrim memory",
  ],
};

export function buildSeoMetadata(page: SeoLandingPageData): Metadata {
  const absoluteUrl = `${RUNTRIM_SITE_URL}/${page.slug}`;
  const keywords = seoKeywords[page.slug];

  return {
    title: page.title,
    description: page.description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      type: "website",
      title: page.title,
      description: page.description,
      url: absoluteUrl,
      siteName: "RunTrim",
      images: [
        {
          url: RUNTRIM_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "RunTrim",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [RUNTRIM_OG_IMAGE],
    },
  };
}

export const seoPageSlugs = Object.keys(seoPages);



