import { z } from "zod";
import type { UIMessage } from "ai";
import { profileData } from "../profile-data";
import { createTree, node } from "../tree";

export const MAX_QUESTIONS = 30;
export const MAX_INPUT_LENGTH = 4000;
export const profileLinks = {
  email: { label: "Email Arthur", href: `mailto:${profileData.contact.email}` },
  linkedin: { label: "LinkedIn", href: profileData.contact.linkedin },
  github: { label: "GitHub", href: profileData.contact.github },
  website: { label: "Personal website", href: profileData.contact.site },
  resume: { label: "Open résumé", href: "/arthur-zhuk-resume.pdf" },
} as const;
const linkSchema = z.enum(["email", "linkedin", "github", "website", "resume"]);
const sectionSchema = z.object({
  heading: z.string().max(160),
  body: z.string().max(2000),
  bullets: z.array(z.string().max(500)).max(6),
});
export const answerSchema = z.object({
  title: z.string().max(160),
  summary: z.string().max(2800),
  sections: z.array(sectionSchema).max(4),
  skills: z.array(z.string().max(80)).max(12),
  interests: z.array(z.string().max(160)).max(8),
  links: z.array(linkSchema).max(5),
  showResume: z.boolean(),
  followUps: z.array(z.string().max(160)).max(3),
});
export type ProfileAnswer = z.infer<typeof answerSchema>;
export const partialAnswerSchema = answerSchema.partial().extend({
  sections: z.array(sectionSchema.partial()).max(4).optional(),
});
export type PartialAnswer = z.infer<typeof partialAnswerSchema>;
export const answerDataSchema = z.discriminatedUnion("complete", [
  z.object({ complete: z.literal(false), answer: partialAnswerSchema }),
  z.object({ complete: z.literal(true), answer: answerSchema }),
]);
export type AnswerData = z.infer<typeof answerDataSchema>;
export type ProfileMessage = UIMessage<never, { answer: AnswerData }>;

export function getAnswer(message: ProfileMessage): AnswerData | undefined {
  const part = message.parts.find((part) => part.type === "data-answer");
  return part?.type === "data-answer" ? part.data : undefined;
}
export function getMessageText(message: ProfileMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n");
}
export function answerText(answer: PartialAnswer): string {
  return [
    answer.title,
    answer.summary,
    ...(answer.sections ?? []).flatMap((section) => [
      section.heading,
      section.body,
      ...(section.bullets ?? []),
    ]),
    ...(answer.skills ?? []),
    ...(answer.interests ?? []),
    ...(answer.links ?? []).map(
      (link) => `${profileLinks[link].label}: ${profileLinks[link].href}`,
    ),
    answer.showResume ? "Résumé: /arthur-zhuk-resume.pdf" : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
// Only app-owned components and destinations reach json-render. Model output is content, never an executable UI tree.
export function answerTree(answer: PartialAnswer) {
  const children: ReturnType<typeof node>[] = [];
  if (answer.summary) children.push(node("Text", { content: answer.summary }));
  for (const section of answer.sections ?? []) {
    if (section.heading)
      children.push(node("Heading", { text: section.heading, level: "h4" }));
    if (section.body) children.push(node("Text", { content: section.body }));
    if (section.bullets?.length)
      children.push(
        node(
          "List",
          {},
          section.bullets.map((content) => node("ListItem", { content })),
        ),
      );
  }
  if (answer.skills?.length)
    children.push(
      node(
        "TagRow",
        {},
        answer.skills.map((text) => node("Tag", { text })),
      ),
    );
  if (answer.interests?.length)
    children.push(
      node("InterestGrid", { title: "Beyond work", items: answer.interests }),
    );
  if (answer.links?.length)
    children.push(
      node(
        "List",
        {},
        [...new Set(answer.links)].map((link) =>
          node("ListItem", {
            content: profileLinks[link].label,
            href: profileLinks[link].href,
          }),
        ),
      ),
    );
  if (answer.showResume)
    children.push(
      node("Resume", {
        title: "Arthur Zhuk résumé",
        href: profileLinks.resume.href,
      }),
    );
  return createTree(node("Card", { title: answer.title }, children));
}
