export type TaskStatus = "todo" | "in_progress" | "done" | "skipped";

export type PlanningTask = {
  id: string;
  dayNumber: number;
  weekNumber: number;
  title: string;
  description: string;
  platform: string;
  category: string;
  estimatedMinutes: number;
  status: TaskStatus;
  notes: string;
  resultUrl: string;
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

export type WeeklyReviewQuestion = {
  key: string;
  question: string;
};

const heavyDays = new Set([6, 13, 20, 27]);
const lightDays = new Set([7, 14, 21, 28]);

function weekFromDay(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function baseTasksForDay(day: number): Array<Omit<PlanningTask, "id" | "dayNumber" | "weekNumber" | "status" | "notes" | "resultUrl">> {
  const tasks: Array<Omit<PlanningTask, "id" | "dayNumber" | "weekNumber" | "status" | "notes" | "resultUrl">> = [
    {
      title: "X reply farming block",
      description: "Find developer pain posts and post targeted helpful replies.",
      platform: "X/Twitter",
      category: "community",
      estimatedMinutes: 45,
      sortOrder: 1,
    },
    {
      title: "Community engagement sweep",
      description: "Comment where relevant across Reddit, HN, Indie Hackers, and LinkedIn.",
      platform: "Reddit/HN/IH/LinkedIn",
      category: "community",
      estimatedMinutes: 40,
      sortOrder: 2,
    },
    {
      title: "Daily content creation + scheduling",
      description: "Create one short content piece and schedule distribution.",
      platform: "X/LinkedIn",
      category: "content",
      estimatedMinutes: 50,
      sortOrder: 3,
    },
    {
      title: "Outreach block",
      description: "Direct outreach to relevant developers and operators.",
      platform: "X/LinkedIn/Email",
      category: "outreach",
      estimatedMinutes: 35,
      sortOrder: 4,
    },
    {
      title: "Demo or asset improvement",
      description: "Improve product demo, screenshot pack, or visual proof asset.",
      platform: "Internal",
      category: "assets",
      estimatedMinutes: 30,
      sortOrder: 5,
    },
  ];

  if (heavyDays.has(day)) {
    tasks.push({
      title: "Heavy day batch",
      description: "Publish long-form content and batch Instagram content assets.",
      platform: "Blog/Instagram",
      category: "heavy_day",
      estimatedMinutes: 90,
      sortOrder: 6,
    });
  }

  if (lightDays.has(day)) {
    tasks.push({
      title: "Light day deep research",
      description: "Research new pain points, competitor messaging, and post hooks.",
      platform: "Research",
      category: "light_day",
      estimatedMinutes: 75,
      sortOrder: 6,
    });
  }

  if (day === 8) {
    tasks.push({
      title: "Show HN draft prep",
      description: "Draft Show HN post and capture feedback from internal review.",
      platform: "Hacker News",
      category: "milestone",
      estimatedMinutes: 60,
      sortOrder: 7,
    });
  }

  if (day === 12) {
    tasks.push({
      title: "Reddit launch thread prep",
      description: "Prepare subreddit-specific launch copy and moderation-safe variant.",
      platform: "Reddit",
      category: "milestone",
      estimatedMinutes: 55,
      sortOrder: 7,
    });
  }

  if (day === 18) {
    tasks.push({
      title: "Demo video cut",
      description: "Finalize short product demo clip for launch channels.",
      platform: "Video",
      category: "milestone",
      estimatedMinutes: 65,
      sortOrder: 7,
    });
  }

  if (day === 24) {
    tasks.push({
      title: "Product Hunt prep",
      description: "Prepare assets and launch copy for Product Hunt readiness.",
      platform: "Product Hunt",
      category: "milestone",
      estimatedMinutes: 70,
      sortOrder: 7,
    });
  }

  return tasks;
}

export function buildDefaultTasks(): PlanningTask[] {
  const tasks: PlanningTask[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const week = weekFromDay(day);
    const dayTasks = baseTasksForDay(day);
    for (const task of dayTasks) {
      tasks.push({
        id: `${day}-${task.sortOrder}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        dayNumber: day,
        weekNumber: week,
        title: task.title,
        description: task.description,
        platform: task.platform,
        category: task.category,
        estimatedMinutes: task.estimatedMinutes,
        status: "todo",
        notes: "",
        resultUrl: "",
        sortOrder: task.sortOrder,
      });
    }
  }
  return tasks;
}

export function buildDefaultMetrics(): PlanningMetric[] {
  return [
    { key: "cli_installs", label: "CLI installs", targetValue: 50, currentValue: 0 },
    { key: "feedback_pieces", label: "Real feedback pieces", targetValue: 15, currentValue: 0 },
    { key: "paying_users", label: "Paying users", targetValue: 1, currentValue: 0 },
    { key: "x_replies", label: "X replies from developers", targetValue: 60, currentValue: 0 },
    { key: "reddit_comments", label: "Reddit comments received", targetValue: 40, currentValue: 0 },
    { key: "linkedin_comments", label: "LinkedIn comments received", targetValue: 30, currentValue: 0 },
    { key: "ih_posts", label: "Indie Hackers posts with replies", targetValue: 1, currentValue: 0 },
    { key: "dms", label: "DMs from interested developers", targetValue: 20, currentValue: 0 },
    { key: "instagram_reach", label: "Instagram reach", targetValue: 2000, currentValue: 0 },
    { key: "hn_posted", label: "HN Show HN posted", targetBool: true, currentBool: false },
  ];
}

export function buildWeeklyQuestions(): WeeklyReviewQuestion[] {
  return [
    { key: "best_post", question: "Which post got the most replies this week?" },
    { key: "best_query", question: "Which X search query found the best complainers?" },
    { key: "surprising_feedback", question: "Did anyone say something surprising about the product?" },
    { key: "never_returned", question: "How many people tried it but never came back?" },
    { key: "one_improvement", question: "What is the one thing that would make next week better?" },
  ];
}
