import type { ProfileAnswer, ProfileMessage } from "../lib/chat/schema";
export const answer: ProfileAnswer = {
  title: "Backend depth at Insight Rx",
  summary:
    "Arthur upgraded MongoDB across four major versions at Insight Rx, reducing slow queries by 55%.",
  sections: [
    {
      heading: "What changed",
      body: "He also modernized the frontend and shipped enterprise workflows.",
      bullets: [
        "Replaced AngularJS with React.",
        "Reduced cycle time from 12 to 4 days.",
      ],
    },
  ],
  skills: ["MongoDB", "TypeScript"],
  interests: [],
  links: ["github"],
  showResume: false,
  followUps: [
    "What did he build at Procore?",
    "How does he approach reliability?",
  ],
};
export const user = (text: string, id = "user-1"): ProfileMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});
export const assistant: ProfileMessage = {
  id: "assistant-1",
  role: "assistant",
  parts: [
    { type: "data-answer", id: "answer", data: { complete: true, answer } },
  ],
};
