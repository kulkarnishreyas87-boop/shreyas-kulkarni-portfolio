/**
 * Starting content for the six projects, written from each repo's README. The seed loads this into Neon once;
 * after that Neon is the source of truth and edits happen in /admin. Gemini drafts never overwrite it.
 */
export type TechCategory = "frontend" | "backend" | "database" | "ai" | "infra" | "integration" | "language" | "other";

export type SeedProject = {
  slug: string;
  repo_name: string;
  title: string;
  tagline: string;
  kind: string;
  problem: string;
  approach: string;
  role: string;
  next_steps: string;
  live_url: string | null;
  live_note?: string;
  featured?: boolean;
  sort_order: number;
  stack: string[];
  highlights: { kind: "feature" | "decision" | "metric"; text: string }[];
  media?: { kind: "screenshot" | "component_map"; url: string; alt: string }[];
};

const GH = "https://github.com/kulkarnishreyas87-boop";
export const repoUrl = (repo: string) => `${GH}/${repo}`;
const raw = (repo: string, branch: string, path: string) =>
  `https://raw.githubusercontent.com/kulkarnishreyas87-boop/${repo}/${branch}/${path}`;

export const seedProjects: SeedProject[] = [
  {
    slug: "aangan-phone-agent",
    repo_name: "aangan-agent",
    title: "Aangan Phone Agent",
    tagline: "A voice agent that answers an interior studio's calls, qualifies the lead and books the consultation.",
    kind: "Voice AI agent",
    problem:
      "Aangan Studio, an interior design studio in Pune, missed enquiries after hours, and designers spent time on calls that were never a fit. A third of calls came after 7pm.",
    approach:
      "Vaani carries the phone call and sends every caller turn to a Node server over a WebSocket. On each turn Gemini scores the founder's own five-point rubric, a rules check in code enforces the service area, lead time, scope and a strict no-price rule, and a second Gemini call writes the reply in the caller's language. When the call ends it is saved to Neon once, and an outbox drives the designer email (Resend), the HubSpot deal and, for qualified calls only, a Cal.com booking picked from what the caller said about their availability.",
    role: "Designed and built the whole system: call flow, decision rubric, rules layer, Neon schema and outbox, integrations, public landing page and live dashboard, and the Vercel deployment.",
    next_steps:
      "Link a real phone number, switch on the confirmation-call agent, and move to Vercel Pro so calls longer than five minutes are not cut off.",
    live_url: "https://aangan-agent-one.vercel.app",
    featured: true,
    sort_order: 1,
    stack: ["Node.js", "WebSockets", "Vaani", "Gemini", "Neon", "Postgres", "Resend", "HubSpot", "Cal.com", "Vercel", "GitHub Actions"],
    highlights: [
      { kind: "decision", text: "Gemini decides from the founder's rubric only; hard limits (service area, lead time, price questions) are enforced in code and can overrule it." },
      { kind: "feature", text: "A price filter checks every spoken reply, so the agent never quotes a figure." },
      { kind: "decision", text: "Neon is written first; email, HubSpot and Cal.com run from an outbox with retries, so a failed send never loses a lead." },
      { kind: "feature", text: "Booking reserves the row before calling Cal.com, so a retry can never double-book a designer." },
      { kind: "metric", text: "About 1.5 s reply time on plain question turns, measured at the server." },
    ],
    media: [
      { kind: "screenshot", url: "/screenshots/aangan-phone-agent.png", alt: "Aangan Studio landing page with a live call preview" },
      { kind: "component_map", url: raw("aangan-agent", "main", "docs/component-map.png"), alt: "Aangan phone agent components map" },
    ],
  },
  {
    slug: "pulse-ai",
    repo_name: "pulse-ai",
    title: "Pulse-AI",
    tagline: "A weekly AI/ML research brief, organised by domain, written and fact-checked by Gemini every Monday.",
    kind: "AI research pipeline",
    problem:
      "Keeping up with arXiv across several AI domains takes hours a week, and most papers are not worth reading. Generic summaries also invent claims the paper never made.",
    approach:
      "Every Monday Vercel Cron starts a job graph of about 115 small jobs: fetch arXiv by day with a three-day look-back, prefilter, score each paper with Gemini, write, verify against the abstract, synthesise per domain, compose within a word budget and email the brief through Resend. Each job makes at most one Gemini call and each cron step stays inside Vercel's five-minute limit. Failures degrade: a failed fetch marks the brief stale, a failed score falls back to the abstract.",
    role: "Built the pipeline, the job queue on Neon, the evaluation harness (golden set, recall and precision, adversarial live checks), the web app with search, archive and saved papers, and the email.",
    next_steps: "Add more domains and use reader saves as a signal for ranking.",
    live_url: "https://pulse-ai-brief.vercel.app",
    sort_order: 2,
    stack: ["Next.js", "TypeScript", "React", "Gemini", "Neon", "Postgres", "Vercel Cron", "Resend", "Zod"],
    highlights: [
      { kind: "decision", text: "No job makes more than one Gemini call, so a whole week (about 115 jobs) fits in Vercel's 5-minute functions." },
      { kind: "feature", text: "A verify step checks every summary against the paper, and an eval harness measures recall and precision on a labelled golden set." },
      { kind: "decision", text: "A three-day look-back means every paper appears exactly once, in the first brief after it went public." },
      { kind: "feature", text: "Search across the last 26 briefs and a save-for-later list, with no account and no AI call." },
    ],
    media: [
      { kind: "screenshot", url: "/screenshots/pulse-ai.png", alt: "This week's Pulse-AI brief" },
      { kind: "component_map", url: raw("pulse-ai", "main", "docs/components-map.png"), alt: "Pulse-AI components map" },
    ],
  },
  {
    slug: "kargo-hiring-dashboard",
    repo_name: "kargo-hiring-dashboard",
    title: "Kargo Hiring Dashboard",
    tagline: "A PM shortlist scored against the founder's own past hires, with interview briefs and emails drafted.",
    kind: "AI hiring tool",
    problem:
      "A founder had 50 PM and senior PM applications and wanted a shortlist that matched the pattern of the people he had actually hired, not just the job spec.",
    approach:
      "CVs (PDF and DOCX) are parsed and stored in Neon. Each candidate goes through four Gemini Flash calls: score every rubric criterion with cited evidence, a guardrail review that catches strong-pattern candidates buried by thin experience and high scores built on weak evidence, a ten-second interview brief, and email drafts written to sound like the founder. Scoring and finishing are separate API stages so no request hits a serverless time limit.",
    role: "Built the scoring pipeline and rubric prompts, the dashboard, Kanban pipeline board, candidate pages, CV upload with live progress, and email sending through Resend.",
    next_steps: "Calibrate the composite against interview outcomes once hires are made.",
    live_url: "https://kargo-hiring-two.vercel.app",
    sort_order: 3,
    stack: ["Next.js", "TypeScript", "React", "Tailwind CSS", "Gemini", "Neon", "Postgres", "Resend"],
    highlights: [
      { kind: "decision", text: "Scored against the founder's 8 past hires as a calibration set, not only the job description." },
      { kind: "feature", text: "A second Gemini pass flags high-potential candidates who would otherwise be auto-passed, and holds weak-evidence high scores for review." },
      { kind: "feature", text: "Kanban board with one-click Advance, Reject and Undo; each decision sends the matching email." },
      { kind: "metric", text: "58 CVs loaded: 8 past hires for calibration and 50 applicants." },
    ],
    media: [{ kind: "screenshot", url: "/screenshots/kargo-hiring-dashboard.png", alt: "Kargo hiring dashboard with tier distribution and decisions" }],
  },
  {
    slug: "skinstinct-draft-lab",
    repo_name: "Meera-LinkedIn-Post-Generator",
    title: "Skinstinct Draft Lab",
    tagline: "Turns a founder's raw Telegram notes into LinkedIn drafts in her voice, each with a real news angle.",
    kind: "AI writing assistant",
    problem:
      "A skincare founder wanted three LinkedIn posts a week without it eating her time, and full control over anything published under her name.",
    approach:
      "A Telegram bot collects her notes. Gemini triages each one (strict JSON, validated with Pydantic), researches one current news item with Google Search grounding, accepting a source only if it appears in the grounding metadata, and drafts the post with her voice guide as the system instruction. Code and model self-checks score every draft; strong drafts are auto-approved, weak ones redrafted once, and unverified facts are marked for her to fill in.",
    role: "Built the bot, the triage, research and drafting pipeline, the auto-review scoring, and the web dashboard (Draft Studio).",
    next_steps: "Learn from which approved drafts she actually posts.",
    live_url: "https://meera-linked-in-post-generator.vercel.app",
    sort_order: 4,
    stack: ["Python", "Telegram Bot API", "Gemini", "Google Search grounding", "SQLite", "Pydantic", "React"],
    highlights: [
      { kind: "decision", text: "Drafts only: there is no LinkedIn API anywhere, and a test fails if one is added." },
      { kind: "feature", text: "News sources are accepted only if they appear in Google's grounding metadata, so the model cannot invent one." },
      { kind: "feature", text: "Each draft gets a quality score from voice, self-check and note substance, with penalties for invented claims." },
    ],
  },
  {
    slug: "settle-the-trip",
    repo_name: "Trip_Planner_MRS",
    title: "Settle the Trip",
    tagline: "Helps a group of friends agree on one trip by keeping dealbreakers apart from preferences.",
    kind: "Group decision web app",
    problem: "Group trips stall because everyone's limits are mixed in with their wishes, and nobody can see which options actually work for all.",
    approach:
      "Each friend opens one shared link and rates candidate trips on swipeable photo cards or answers six quick questions. Dealbreakers (budget, dates, trip types, activities, nights) rule options out; preferences only change the order. A deterministic engine with no AI shows up to three options that pass everyone, with what each person gets and gives up, near misses and the exact rule blocking each excluded option. Gemini is optional and only turns free-text notes into draft entries the person must apply.",
    role: "Designed and built the app end to end: flows, decision engine, Supabase storage, WhatsApp nudges and the share card.",
    next_steps: "Let the group add their own candidate trips with real prices.",
    live_url: "https://settle-the-trip.vercel.app",
    sort_order: 5,
    stack: ["JavaScript", "HTML", "CSS", "Supabase", "Gemini", "Vercel"],
    highlights: [
      { kind: "decision", text: "The app never picks the trip: the order is not a ranking, and only the organizer records the group's decision." },
      { kind: "feature", text: "When fewer than two options pass, it shows near misses phrased as 'ask X if that limit is firm'." },
      { kind: "feature", text: "No accounts: personal and private edit links, with drafts kept on the device after every tap." },
    ],
    media: [{ kind: "screenshot", url: "/screenshots/settle-the-trip.png", alt: "Settle the Trip start page" }],
  },
  {
    slug: "match-night",
    repo_name: "FlixMatch",
    title: "Match Night",
    tagline: "Two people, one remote: both swipe a movie pool built from both their tastes until they match.",
    kind: "Realtime web app",
    problem: "Couples spend longer choosing what to watch than watching it.",
    approach:
      "Both partners set preferences on their own phones. Gemini turns the two profiles into a search brief, TMDB supplies a 30-title pool, and both swipe in real time over Supabase Realtime. A mutual like reveals the match with India streaming links from RapidAPI, cached forever to respect a free tier of about 120 calls a month. No match after two rounds gives a top-five shortlist to decide together.",
    role: "Built the app: pairing by anonymous device IDs, the swipe deck and match reveal, the Gemini brief and the caching layer.",
    next_steps: "Deploy it publicly and use past matches to improve the pool.",
    live_url: null,
    live_note: "Not deployed yet",
    sort_order: 6,
    stack: ["Next.js", "TypeScript", "React", "Tailwind CSS", "Framer Motion", "Supabase", "Gemini", "TMDB API", "RapidAPI"],
    highlights: [
      { kind: "feature", text: "Realtime swiping over Supabase; a mutual like reveals the match instantly on both phones." },
      { kind: "decision", text: "Streaming links are fetched only for the confirmed match and cached, keeping inside RapidAPI's free tier." },
      { kind: "feature", text: "No accounts: couples are recognised by pairing two anonymous device IDs." },
    ],
  },
];
