// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanningTask = {
  id: string;
  dayNumber: number;
  weekNumber: number;
  platform: string;
  title: string;
  instruction: string;
  done: boolean;
  notes: string;
  sortOrder: number;
};

export type PlanningMetric = {
  key: string;
  label: string;
  targetValue?: number;
  targetBool?: boolean;
  currentValue?: number;
  currentBool?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekOf(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

type Def = { platform: string; title: string; instruction: string; sortOrder: number };

// ─── Daily routine tasks (every single day, no exceptions) ───────────────────

function dailyBase(): Def[] {
  return [
    {
      platform: "X",
      sortOrder: 1,
      title: "Morning X reply farming (8:00–8:45am)",
      instruction:
        "Search these one by one on the Latest tab: 'Claude Code drifted' · 'Claude Code edited my' · 'Claude Code touched' · 'cursor agent broke' · 'AI coding .env' · 'AI agent wrong file' · 'AI coding finished but tests' · 'AI coding session reset' · 'Cursor touched my' · 'Claude Code context'. Reply to every relevant complaint with one human sentence + runtrim.com. Acknowledge their specific pain first. Never be generic. Target 500+ follower accounts first.",
    },
    {
      platform: "Reddit / HN / IH",
      sortOrder: 2,
      title: "Community check-in (8:45–9:15am)",
      instruction:
        "Reply to every new comment on your existing posts. Check r/ClaudeAI, r/cursor, r/ChatGPTCoding. On Indie Hackers, comment genuinely on 2–3 threads without promoting RunTrim. Every unanswered comment is a lost user.",
    },
    {
      platform: "X / LinkedIn",
      sortOrder: 4,
      title: "Outreach block (10:00–10:45am)",
      instruction:
        "Find 5 specific people who match your ICP: recently posted about Claude Code, Cursor pain, or AI agent frustration. Follow them. Comment genuinely on their content. DM only if you have something real to say — one specific question about their pain, no pitch.",
    },
    {
      platform: "ALL",
      sortOrder: 6,
      title: "Engagement check (3:00–3:30pm)",
      instruction:
        "Reply to every comment and mention received today within 2 hours of posting. The algorithm on X and LinkedIn rewards this heavily. Stay for 30 minutes after every post. Never let a comment sit unanswered.",
    },
    {
      platform: "ALL",
      sortOrder: 7,
      title: "Analytics & learning (3:30–4:00pm)",
      instruction:
        "Check which posts got the most replies, clicks, and engagement. Write one line in your notes: what worked today and why. This compounds into your best content over 30 days. Ignore impressions and likes — count replies and DMs only.",
    },
  ];
}

// ─── Day-specific content calendar (Section 7 of strategy doc) ───────────────

const CALENDAR: Record<number, Def[]> = {
  // WEEK 1 — Launch & Pain Posts
  1: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Founder story post",
      instruction:
        "Post the personal frustration story of why you built RunTrim. No pitch — just the pain of watching AI agents destroy your code. Link in first reply, NOT in the post body (X penalises external links in post body). Let replies come first.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "Problem post (LinkedIn)",
      instruction:
        '"AI coding agents are incredible but they drift." Tell the .env story. 200 words. First-person. No AI-sounding copy — write exactly like you talk. Drop runtrim.com in the first comment after posting, not in the post body.',
    },
    {
      platform: "Indie Hackers",
      sortOrder: 8,
      title: "Start lurking on IH",
      instruction:
        "Comment genuinely on 5 Indie Hackers threads. Zero RunTrim mentions. Just build presence as a thoughtful founder. You need reputation here before you can post.",
    },
  ],
  2: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Pain post",
      instruction:
        '"AI edited the wrong file again?" No product mention in the post body. Let replies come. Reply to every person who engages: one sentence acknowledging their specific pain + runtrim.com.',
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/ClaudeAI — monitor & reply",
      instruction:
        "Monitor and reply to every comment on your existing r/ClaudeAI post within 1 hour. Ask a follow-up question to every responder. Turn commenters into testers. Never let a thread go cold.",
    },
  ],
  3: [
    {
      platform: "Instagram",
      sortOrder: 3,
      title: "Before/after graphic",
      instruction:
        "Create and post a flat before/after graphic. Left side: without RunTrim — .env edited, 12 files touched, tests red. Right side: with RunTrim — scoped, verified, done. No text walls. Clean, dark design.",
    },
    {
      platform: "X",
      sortOrder: 5,
      title: "Reply farming deep dive (extra 30 min)",
      instruction:
        "Extra 30 minutes today on top of the morning block. Search all 10 queries again. Aim for 15+ total replies to complainers today. Quality over speed — each reply should feel like it was written specifically for them.",
    },
  ],
  4: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Trust post",
      instruction:
        '"Free CLI. No account. Source code stays local." That is it — the whole post. Address developer privacy concern directly. This is your single strongest trust signal. Developers are paranoid about tools that touch their code.',
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "ICP outreach",
      instruction:
        "Find 10 people on LinkedIn who posted about Claude Code or Cursor frustrations in the last 7 days. Comment genuinely on their posts — add something useful. Follow them. No pitch yet. Wait 48 hours before DM.",
    },
  ],
  5: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Pain list post (LinkedIn)",
      instruction:
        '"6 ways AI coding agents fail you silently." Repurpose the landing page failure modes into a list post. End with: built RunTrim to fix all 6. Link in first comment after posting. This is your highest-reach LinkedIn format.',
    },
    {
      platform: "Instagram",
      sortOrder: 5,
      title: "Story poll",
      instruction:
        '"Has an AI agent ever edited a file you didn\'t ask it to?" Post as an Instagram Story with a poll: Yes / Way too many times. Add runtrim.com link sticker. Engagement from polls drives Story reach.',
    },
  ],
  6: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Build in public — Day 6 update",
      instruction:
        '"Day 6. Here is what has happened so far." Raw and honest. Real install numbers, real feedback quotes, what people said. No spin. This format builds deeper trust than any marketing copy.',
    },
    {
      platform: "Indie Hackers",
      sortOrder: 5,
      title: "IH comment block (30 min)",
      instruction:
        "Spend 30 minutes on Indie Hackers. Comment on AI tools threads, developer workflow posts, indie hacker stories. Genuine engagement only — no RunTrim mentions. You need credibility here before Week 3 post.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 8,
      title: "Long-form content — Heavy day (11:30am–12:30pm)",
      instruction:
        "Write a 200–300 word LinkedIn post or full Indie Hackers update. No AI-sounding copy — write it exactly like you talk. These longer posts drive the deepest trust and highest LTV audience.",
    },
    {
      platform: "Instagram",
      sortOrder: 9,
      title: "Instagram batch — Heavy day (12:30–1:00pm)",
      instruction:
        "Create 2 Instagram assets: one Reel (repurpose screen recording) and one carousel or graphic. Schedule for 3–6pm posting window when developer Instagram traffic peaks.",
    },
  ],
  7: [
    {
      platform: "ALL",
      sortOrder: 3,
      title: "First demo video",
      instruction:
        "Screen record: runtrim go → scope locked → agent runs → .env blocked → finish check passes. Under 60 seconds. No voiceover — let the terminal speak. Post to: X (link in first reply, not body) · LinkedIn (native upload with story context) · Instagram (Reel with subtitles — 85% of video is watched without sound).",
    },
  ],

  // WEEK 2 — Social Proof & Conversations
  8: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Early user update",
      instruction:
        '"Launched RunTrim last week. Here is what the first people who tried it told us." Even 5 users is a story. Use specific quotes if you have them. Real words from real people beat any copy you write.',
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/cursor — new post",
      instruction:
        '"Built something that stops Cursor from touching files you never asked it to." Cursor-specific pain framing. Same product, different community angle. Short post, casual tone.',
    },
  ],
  9: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Comparison post (LinkedIn)",
      instruction:
        "Walk through a real scenario: without RunTrim vs with RunTrim. Specific files, specific outcome. No abstract claims. 250 words. 'It touched 12 files. I asked it to fix 1.' Concrete, believable, specific.",
    },
    {
      platform: "Instagram",
      sortOrder: 5,
      title: "Educational carousel",
      instruction:
        '"5 reasons your AI coding session fails silently." 5 slides with one problem each. Final slide: RunTrim fixes all 5. Repurpose this same content to LinkedIn as a PDF carousel same week.',
    },
  ],
  10: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Hot take post",
      instruction:
        '"AI agents need guardrails, not just better prompts." Opinionated. No product mention in the post. When it gets traction, pin a reply with runtrim.com. Opinion posts drive the highest reply counts on X.',
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/ChatGPTCoding — post",
      instruction:
        '"AI coding session reset again? Built a fix for this." Casual tone. Short post. Low-pressure framing works best in this community. Link to runtrim.com.',
    },
  ],
  11: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Trust deep dive (LinkedIn)",
      instruction:
        '"Why we built RunTrim as local-first and why source code never leaves your machine." Explain the actual design decision. Developers trust tools that explain themselves. This is your strongest trust-building post.',
    },
    {
      platform: "Indie Hackers",
      sortOrder: 5,
      title: "IH — first genuine thread",
      instruction:
        'Start a discussion: "How are you handling AI agent scope creep in your workflow?" No RunTrim mention. Build credibility as a thoughtful founder who understands the problem deeply.',
    },
  ],
  12: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Demo: forbidden files",
      instruction:
        "Screen record: agent tries to edit .env → RunTrim blocks it. Most visceral product moment you have. Under 45 seconds. Post to X (link in reply), LinkedIn, Instagram. This is the demo that converts.",
    },
    {
      platform: "Instagram",
      sortOrder: 5,
      title: "Reel: forbidden files",
      instruction:
        'Same forbidden files demo, Instagram version. Add subtitle: "Your agent was about to edit .env. RunTrim stopped it." Subtitles are mandatory — 85% of Instagram video is watched without sound.',
    },
  ],
  13: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Engagement post",
      instruction:
        '"What is the most frustrating thing your AI coding agent has ever done?" Reply to every single response individually. This is research AND marketing simultaneously. The answers will sharpen your messaging for Weeks 3–4.',
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "DM outreach (5 DMs)",
      instruction:
        "Send 5 DMs to people who engaged with your content this week. One specific question about their pain. No pitch in the first message. 'Hey, noticed you deal with [specific thing they posted]. How are you handling it?'",
    },
  ],
  14: [
    {
      platform: "ALL",
      sortOrder: 3,
      title: "Demo: session memory",
      instruction:
        "Show: session ends → next day → runtrim continues exactly where it stopped. The cold-start problem made visceral. Post everywhere. This is one of your strongest demos — every developer has felt this pain.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 8,
      title: "Long-form content — Heavy day",
      instruction:
        "Write a 200–300 word LinkedIn post or Indie Hackers update. No AI-sounding copy.",
    },
    {
      platform: "Instagram",
      sortOrder: 9,
      title: "Instagram batch — Heavy day",
      instruction:
        "Create 2 Instagram assets. Schedule for 3–6pm.",
    },
  ],

  // WEEK 3 — Positioning & Maximum Reach
  15: [
    {
      platform: "Hacker News",
      sortOrder: 3,
      title: "Show HN launch — THIS IS YOUR BIGGEST DAY",
      instruction:
        "Post Show HN at 8–10am ET (Tuesday or Wednesday only). Title: 'Show HN: RunTrim — scope and memory layer for AI coding agents (Claude, Cursor, Codex)'. Body: problem (2–3 sentences) · what RunTrim does · what makes it different (local-first, no account, source stays local) · honest stage (free CLI, early, want brutal feedback) · runtrim.com. Monitor ALL day. Reply to every single comment. Never be defensive — HN is critical by design, embrace it. Ask follow-up questions to keep the thread alive. Do not ask friends to upvote — HN detects this.",
    },
    {
      platform: "X",
      sortOrder: 5,
      title: "HN announcement (X)",
      instruction:
        '"Just posted RunTrim on Hacker News. Would love feedback from this community too." Link to the HN post directly — NOT to runtrim.com. This protects X reach and drives HN upvotes simultaneously.',
    },
  ],
  16: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Technical founders post (LinkedIn)",
      instruction:
        '"If you are shipping with AI agents daily, you need guardrails before your agent does." Aimed squarely at technical founders and CTOs. These are your Team plan buyers — they have budget and feel this pain.',
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/webdev — story post",
      instruction:
        'Share a real story with no pitch in the body. "Had an AI agent rewrite a migration nobody approved. Here is what happened." Build reputation first. Drop runtrim.com only in a comment if people ask.',
    },
  ],
  17: [
    {
      platform: "Instagram",
      sortOrder: 3,
      title: "Agent compatibility graphic",
      instruction:
        "Visual showing Claude, Cursor, Codex, ChatGPT logos + 'RunTrim works with all of them.' Clean, dark design. Reaches people who are loyal to a specific tool and hadn't considered RunTrim yet.",
    },
    {
      platform: "X",
      sortOrder: 5,
      title: "Thread: 6 failure modes",
      instruction:
        "One tweet per failure mode from your landing page. Thread of 7 tweets total. End with runtrim.com in the final tweet only. Threads drive significantly more reach than single tweets on X in 2026.",
    },
  ],
  18: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Founder story post (LinkedIn)",
      instruction:
        '"The run that broke everything." Vivid narrative of a real AI agent disaster. Personal, specific, emotional. "That is the day I started building RunTrim." 200–300 words. First-person stories outperform everything on LinkedIn.',
    },
    {
      platform: "Indie Hackers",
      sortOrder: 5,
      title: "RunTrim founder story (IH)",
      instruction:
        "Full founder post on Indie Hackers. Built with Claude, why it exists, what it does, where you are today. Link in post. Explicitly ask for feedback. IH readers who engage convert at a remarkably high rate.",
    },
    {
      platform: "Video",
      sortOrder: 8,
      title: "Demo video final cut — Heavy day",
      instruction:
        "Finalize a short product demo clip for upcoming launch channels. Show the full RunTrim flow clearly. This will be your most-shared asset. Polish it.",
    },
    {
      platform: "Instagram",
      sortOrder: 9,
      title: "Instagram batch — Heavy day",
      instruction:
        "Create 2 Instagram assets. Schedule for 3–6pm.",
    },
  ],
  19: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Week 3 honest update",
      instruction:
        '"3 weeks in. Here is the honest RunTrim update." Real numbers, real surprises, real failures, what you changed. Radical transparency wins here more than anywhere else. This is your most important weekly post.',
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/programming research (no posting today)",
      instruction:
        "Spend 45 minutes reading top posts on r/programming. Study what format and tone performs. Look at titles, opening lines, comment count. DO NOT post today — just research. Your Week 4 post here needs to be perfect.",
    },
  ],
  20: [
    {
      platform: "Instagram",
      sortOrder: 3,
      title: "Reel: full workflow",
      instruction:
        "Show the complete RunTrim flow in under 90 seconds. Task → scope → memory → agent runs → finish check → history. Add subtitles. This is your best demo yet — make it count.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "Carousel: before vs after (LinkedIn)",
      instruction:
        "PDF carousel showing exact workflow comparison. Without RunTrim left side, with RunTrim right side. 6 slides. Post as PDF upload (not image) for 3.2x more reach on LinkedIn.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 8,
      title: "Long-form content — Heavy day",
      instruction:
        "Write a 200–300 word LinkedIn post or Indie Hackers update. No AI-sounding copy.",
    },
    {
      platform: "Instagram",
      sortOrder: 9,
      title: "Instagram batch — Heavy day",
      instruction:
        "Create 2 Instagram assets. Schedule for 3–6pm.",
    },
  ],
  21: [
    {
      platform: "ALL",
      sortOrder: 3,
      title: "Demo: run history / audit trail",
      instruction:
        "Show the dashboard with run history — contract, diff, verdict, agent, model. The audit trail angle. Post everywhere. This speaks directly to team buyers and CTOs. Month 2 revenue path starts here.",
    },
  ],

  // WEEK 4 — Convert, Learn, Set Up Month 2
  22: [
    {
      platform: "X + LinkedIn",
      sortOrder: 3,
      title: "Month recap part 1",
      instruction:
        "Honest numbers on both platforms. Installs, feedback, what changed, what surprised you. Write this with real data. Post on X (condensed, 2–3 sentences) and LinkedIn (200–250 words). Radical transparency performs best here.",
    },
    {
      platform: "Reddit",
      sortOrder: 5,
      title: "r/programming post — carefully crafted",
      instruction:
        "Carefully crafted post based on Week 3 research. Story-first, no pitch in body. This subreddit can drive 47,000 visits with 2.1% conversion if it lands. Title everything. Opening sentence is everything. Drop runtrim.com only in comments.",
    },
  ],
  23: [
    {
      platform: "X",
      sortOrder: 3,
      title: "First user quote",
      instruction:
        "If anyone said something real in DMs or Reddit, ask permission and share it. Even 'this actually works' is social proof. Real words from real users beat any copy you write. Screenshot format performs best on X.",
    },
    {
      platform: "Indie Hackers",
      sortOrder: 5,
      title: "4-week numbers post (IH)",
      instruction:
        '"4 weeks in. Here is every number." Installs, feedback count, paying users, what converted them, what failed. IH readers love this format and it drives the highest LTV conversions of any platform.',
    },
  ],
  24: [
    {
      platform: "LinkedIn",
      sortOrder: 3,
      title: "Team angle post (LinkedIn)",
      instruction:
        '"When your whole team uses AI agents, one rogue run is everyone\'s problem." Start planting Team plan seeds. CTOs and VPs of Engineering feel this. This is your Month 2 revenue path.',
    },
    {
      platform: "Instagram",
      sortOrder: 5,
      title: "Educational Reel: finish checks",
      instruction:
        '"What finish checks actually do and why you need them." 30-second explainer. Most developers do not know this concept. Education builds trust. Add subtitles.',
    },
    {
      platform: "Product Hunt",
      sortOrder: 8,
      title: "Product Hunt prep — Heavy day",
      instruction:
        "Prepare all Product Hunt assets: tagline, description, first comment, screenshots, demo GIF. Identify a hunter. Collect contacts of users who will support the launch. Product Hunt launches Month 2.",
    },
  ],
  25: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Pain post: token burn",
      instruction:
        '"Running the same AI coding session five times because it keeps resetting context." The token waste angle. Strong pain for developers paying API bills. No product mention in post — drop runtrim.com in first reply.',
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "Outreach escalation (10 DMs)",
      instruction:
        "Send 10 personalised DMs today. Target people who engaged with your content, commented on your posts, or posted about AI agent frustrations this week. One specific question about their pain. No pitch first.",
    },
  ],
  26: [
    {
      platform: "ALL",
      sortOrder: 3,
      title: "Demo: team workflow",
      instruction:
        "Show: shared scope, shared memory, one agent run, run logged to history. The team use case visualised. Post everywhere. Speaks directly to the Month 2 revenue target — CTOs seeing this is a qualified lead.",
    },
    {
      platform: "LinkedIn",
      sortOrder: 8,
      title: "Long-form content — Heavy day",
      instruction:
        "Write a 200–300 word LinkedIn post or Indie Hackers update. No AI-sounding copy.",
    },
    {
      platform: "Instagram",
      sortOrder: 9,
      title: "Instagram batch — Heavy day",
      instruction:
        "Create 2 Instagram assets. Schedule for 3–6pm.",
    },
  ],
  27: [
    {
      platform: "X",
      sortOrder: 3,
      title: "Build in public: month end",
      instruction:
        '"30 days of RunTrim. The honest truth." Everything — every number, every lesson, every failure, every surprise. This is your most important post of the month. Radical transparency builds the deepest trust.',
    },
    {
      platform: "LinkedIn",
      sortOrder: 5,
      title: "Month reflection post (LinkedIn)",
      instruction:
        "Longer version of the X post. 300 words. What you learned about the problem, the product, and the customers. Invite DMs from founders in similar situations. This drives the highest quality inbound.",
    },
  ],
  28: [
    {
      platform: "Instagram",
      sortOrder: 3,
      title: "Month recap graphic",
      instruction:
        "Clean graphic showing your 30-day journey. Key milestones, installs, first paying user if you have one. Build-in-public visual story. Dark background, clean typography.",
    },
    {
      platform: "Indie Hackers",
      sortOrder: 5,
      title: "Lessons post (IH)",
      instruction:
        '"30 days marketing a developer tool. Here is everything I learned." Useful to other founders regardless of RunTrim. High engagement format on IH — this one compounds for weeks after posting.',
    },
  ],
  29: [
    {
      platform: "Reddit",
      sortOrder: 3,
      title: "r/ExperiencedDevs post",
      instruction:
        "Post about the audit trail and governance angle. Senior developers care about team safety and accountability. Different pain framing from your solo dev posts — focus on 'what happens when an agent breaks prod on your team's watch.'",
    },
    {
      platform: "X",
      sortOrder: 5,
      title: "Product Hunt tease",
      instruction:
        '"Something is coming next week for RunTrim." Build anticipation for Month 2 Product Hunt launch. Do not explain what. Just tease. Create curiosity.',
    },
  ],
  30: [
    {
      platform: "ALL",
      sortOrder: 3,
      title: "Product Hunt prep + final push",
      instruction:
        "Complete the Product Hunt listing. Finalize: tagline, description, first comment, all assets, hunter contact confirmed. Message every single user you have spoken to this month — ask them to support the launch day. Day 30 is the runway for Month 2. Do not skip this.",
    },
  ],
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildDefaultTasks(): PlanningTask[] {
  const tasks: PlanningTask[] = [];

  for (let day = 1; day <= 30; day++) {
    const week = weekOf(day);
    const all: Def[] = [...dailyBase(), ...(CALENDAR[day] ?? [])];
    all.sort((a, b) => a.sortOrder - b.sortOrder);

    for (const t of all) {
      tasks.push({
        id: `${day}-${t.sortOrder}-${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
        dayNumber: day,
        weekNumber: week,
        platform: t.platform,
        title: t.title,
        instruction: t.instruction,
        done: false,
        notes: "",
        sortOrder: t.sortOrder,
      });
    }
  }

  return tasks;
}

export function buildDefaultMetrics(): PlanningMetric[] {
  return [
    { key: "cli_installs",      label: "CLI installs",                     targetValue: 50,   currentValue: 0 },
    { key: "feedback_pieces",   label: "Real feedback pieces",             targetValue: 15,   currentValue: 0 },
    { key: "paying_users",      label: "Paying users",                     targetValue: 1,    currentValue: 0 },
    { key: "x_replies",         label: "X replies from developers",        targetValue: 60,   currentValue: 0 },
    { key: "reddit_comments",   label: "Reddit comments received",         targetValue: 40,   currentValue: 0 },
    { key: "linkedin_comments", label: "LinkedIn comments received",       targetValue: 30,   currentValue: 0 },
    { key: "ih_posts",          label: "IH posts with replies",            targetValue: 1,    currentValue: 0 },
    { key: "dms",               label: "DMs from interested developers",   targetValue: 20,   currentValue: 0 },
    { key: "instagram_reach",   label: "Instagram reach (total)",          targetValue: 2000, currentValue: 0 },
    { key: "hn_posted",         label: "HN Show HN posted",                targetBool: true,  currentBool: false },
  ];
}
