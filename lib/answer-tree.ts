import { createTree, node } from "@/lib/tree";
import { profileData } from "@/lib/profile-data";

export function buildTreeFromAnswer(prompt: string, answer: string) {
  const lines = answer.split("\n").map((line) => line.trim());
  const bullets = lines.filter((line) => line.startsWith("-"));
  const summary = lines.filter((line) => line && !line.startsWith("-")).join(" ");
  const normalized = prompt.toLowerCase();
  const wantsResume =
    normalized.includes("resume") || normalized.includes("cv");
  const wantsPersonal =
    normalized.includes("outside") ||
    normalized.includes("hobbies") ||
    normalized.includes("personal") ||
    normalized.includes("fun") ||
    normalized.includes("interests");

  const children = [node("Heading", { text: prompt, level: "h3" })];

  if (!wantsResume && !wantsPersonal) {
    children.push(
      node("Text", {
        content: summary || "Here is what I found from the resume.",
      }),
    );
  }

  if (bullets.length > 0 && !wantsResume && !wantsPersonal) {
    children.push(
      node(
        "List",
        {},
        bullets.map((item) =>
          node("ListItem", { content: item.replace(/^-\s*/, "") }),
        ),
      ),
    );
  }

  if (wantsResume) {
    children.push(
      node("Resume", {
        title: "Arthur Zhuk Resume",
        href: "/arthur-zhuk-resume.pdf",
      }),
    );
  }

  if (wantsPersonal) {
    children.push(
      node("InterestGrid", {
        title: "Outside of work",
        items: profileData.interests,
      }),
    );
  }

  return createTree(node("Card", { title: "Answer" }, children));
}
