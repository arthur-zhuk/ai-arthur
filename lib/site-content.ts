// Presentation copy for the homepage. Facts about Arthur's career live in profile-data.ts.

export const heroQuestions = [
  "What is Arthur building?",
  "How deep is his backend?",
  "His biggest performance win?",
];

/** Each item restates something the code in this repository actually does. */
export const howItWorks = [
  {
    title: "One source of truth",
    body: "This page, the AI's answers, and the résumé links all read from a single profile file, so they cannot drift apart.",
  },
  {
    title: "Structured answers, not free text",
    body: "Every reply is generated against a strict schema, validated as it streams, and drawn by components I control. A malformed answer never reaches the screen.",
  },
  {
    title: "It cannot invent a link",
    body: "The model chooses from an allowlist (email, LinkedIn, GitHub, résumé). The app supplies the URL, never the model.",
  },
  {
    title: "Honest about the gaps",
    body: "It answers only from the profile, labels inference, and says when something is not there. Paste a job description and it reports where Arthur does not fit, too.",
  },
  {
    title: "Guarded and private",
    body: "Input, request size, output, and time are capped, and visitors are rate-limited per minute, per day, and site-wide, using a hashed ID. Conversations are not stored; they live in your tab.",
  },
  {
    title: "Tested without a model",
    body: "Streaming, cancellation, retry, and error paths run in offline tests against a mock model, plus a Playwright pass over the real interface.",
  },
];
export const stack = [
  "Next.js",
  "React 19",
  "TypeScript",
  "AI SDK",
  "OpenAI Responses API",
  "Zod",
  "json-render",
  "Three.js",
];

export type InterestCard = {
  id: string;
  number: string;
  title: string;
  caption: string;
  icon: "bike" | "cpu" | "trophy";
  /** Drop a photo into /public/interests and set this to show it behind the card. */
  image?: { src: string; alt: string };
};
export const interestCards: InterestCard[] = [
  {
    id: "riding",
    number: "01",
    title: "The long way home.",
    caption: "Road biking & getting outside",
    icon: "bike",
  },
  {
    id: "experiments",
    number: "02",
    title: "One more experiment.",
    caption: "AI, blockchain & side projects",
    icon: "cpu",
  },
  {
    id: "competition",
    number: "03",
    title: "A competitive streak.",
    caption: "Hockey, basketball & gaming",
    icon: "trophy",
  },
];
