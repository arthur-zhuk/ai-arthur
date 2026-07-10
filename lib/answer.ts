// import type { UITree } from "@json-render/core";
import { createTree, node } from "@/lib/tree";
import { profileData } from "@/lib/profile-data";
import type { Spec } from "@json-render/core";

export function buildIntroTree(): Spec {
  return createTree(
    node("Card", {}, [
      node("Text", {
        content:
          "Hey, I'm Arthur. I have spent more than a decade building software across defense technology, healthcare, enterprise products, DeFi, and accessibility.",
      }),
      node("Text", {
        content:
          "I am currently at Anduril. This is a conversational version of my background, so ask about the work, the technical details, or what I am like outside of it.",
        variant: "muted",
      }),
    ]),
  );
}

export function buildAnswerTree(question: string): Spec {
  const normalized = question.toLowerCase();

  if (matches(normalized, ["experience", "role", "company", "work", "career"])) {
    return buildExperienceTree();
  }

  if (matches(normalized, ["education", "school", "college", "study"])) {
    return buildEducationTree();
  }

  if (matches(normalized, ["contact", "email", "linkedin", "github"])) {
    return buildContactTree();
  }

  if (matches(normalized, ["ai", "assistant", "workflow", "tools"])) {
    return buildAiToolsTree();
  }

  if (matches(normalized, ["skills", "stack", "tech"])) {
    return buildSkillsTree();
  }

  if (matches(normalized, ["about", "bio", "background", "who"])) {
    return buildAboutTree();
  }

  return buildSummaryTree();
}

function matches(input: string, keywords: string[]): boolean {
  return keywords.some((keyword) => input.includes(keyword));
}

export function buildSummaryTree(): Spec {
  return createTree(
    node("Card", { title: "Quick summary", subtitle: profileData.title }, [
      node("Text", { content: profileData.tagline }),
      node("Text", {
        content: profileData.about[0],
      }),
      node("Divider", { label: "Highlights" }),
      node(
        "List",
        {},
        profileData.highlights.map((item) =>
          node("ListItem", { content: item }),
        ),
      ),
    ]),
  );
}

function buildAboutTree(): Spec {
  return createTree(
    node("Card", { title: "About Arthur" }, [
      ...profileData.about.map((paragraph) =>
        node("Text", { content: paragraph }),
      ),
    ]),
  );
}

function buildExperienceTree(): Spec {
  const experienceNodes = profileData.experience.flatMap((role, index) => {
    const blocks = [
      node("Heading", { text: `${role.title} - ${role.company}`, level: "h3" }),
      node("Text", {
        content: `${role.dateRange} | ${role.location}`,
        variant: "caption",
      }),
      node("Text", { content: role.description }),
      node(
        "List",
        {},
        role.achievements.map((achievement) =>
          node("ListItem", { content: achievement }),
        ),
      ),
      node(
        "TagRow",
        {},
        role.skills.map((skill) => node("Tag", { text: skill })),
      ),
    ];

    if (index < profileData.experience.length - 1) {
      blocks.push(node("Divider", { label: "" }));
    }

    return blocks;
  });

  return createTree(
    node("Card", { title: "Experience" }, experienceNodes),
  );
}

function buildSkillsTree(): Spec {
  return createTree(
    node("Card", { title: "Skills and focus" }, [
      node(
        "TagRow",
        {},
        profileData.skills.map((skill) => node("Tag", { text: skill })),
      ),
      node("Divider", { label: "Current focus" }),
      node(
        "List",
        {},
        profileData.highlights.map((item) =>
          node("ListItem", { content: item }),
        ),
      ),
    ]),
  );
}

function buildEducationTree(): Spec {
  return createTree(
    node("Card", { title: "Education" }, [
      ...profileData.education.flatMap((entry, index) => {
        const parts = [
          node("Heading", { text: entry.school, level: "h3" }),
          node("Text", {
            content: entry.location || "Remote",
            variant: "caption",
          }),
          node("Text", { content: entry.focus }),
          node("Text", { content: entry.dateRange, variant: "muted" }),
        ];

        if (index < profileData.education.length - 1) {
          parts.push(node("Divider", { label: "" }));
        }

        return parts;
      }),
    ]),
  );
}

function buildContactTree(): Spec {
  return createTree(
    node("Card", { title: "Contact" }, [
      node(
        "List",
        {},
        [
          node("ListItem", {
            content: profileData.contact.email,
            meta: "Email",
            href: `mailto:${profileData.contact.email}`,
          }),
          node("ListItem", {
            content: "LinkedIn",
            meta: profileData.contact.linkedin,
            href: profileData.contact.linkedin,
          }),
          node("ListItem", {
            content: "GitHub",
            meta: profileData.contact.github,
            href: profileData.contact.github,
          }),
          node("ListItem", {
            content: "Website",
            meta: profileData.contact.site,
            href: profileData.contact.site,
          }),
        ],
      ),
    ]),
  );
}

export { buildContactTree };

export function buildBeyondWorkTree(): Spec {
  return createTree(
    node("Card", { title: "Beyond work" }, [
      node("Text", {
        content:
          "Outside of engineering, Arthur likes active, competitive, and creative pursuits, with plenty of room for good food and time outdoors.",
      }),
      node("InterestGrid", {
        title: "What keeps me busy",
        items: profileData.interests,
      }),
      node("Divider", { label: "Get in touch" }),
      node(
        "List",
        {},
        [
          node("ListItem", {
            content: profileData.contact.email,
            meta: "Email",
            href: `mailto:${profileData.contact.email}`,
          }),
          node("ListItem", {
            content: "LinkedIn",
            meta: profileData.contact.linkedin,
            href: profileData.contact.linkedin,
          }),
          node("ListItem", {
            content: "GitHub",
            meta: profileData.contact.github,
            href: profileData.contact.github,
          }),
        ],
      ),
    ]),
  );
}

function buildAiToolsTree(): Spec {
  return createTree(
    node("Card", { title: "AI-assisted workflow" }, [
      node("Text", {
        content:
          "Arthur leverages AI tools daily to prototype features, refactor code, and improve test coverage.",
      }),
      node(
        "TagRow",
        {},
        profileData.aiTools.map((tool) => node("Tag", { text: tool })),
      ),
    ]),
  );
}
