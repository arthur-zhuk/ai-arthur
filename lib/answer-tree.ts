import { createTree, node } from "@/lib/tree";

export function buildTreeFromAnswer(prompt: string, answer: string) {
  const lines = answer.split("\n").map((line) => line.trim());
  const bullets = lines.filter((line) => line.startsWith("-"));
  const summary = lines.filter((line) => line && !line.startsWith("-")).join(" ");

  const children = [
    node("Heading", { text: prompt, level: "h3" }),
    node("Text", { content: summary || "Here is what I found from the resume." }),
  ];

  if (bullets.length > 0) {
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

  return createTree(node("Card", { title: "Answer" }, children));
}
