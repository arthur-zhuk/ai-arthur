import { createCatalog } from "@json-render/core";
import { z } from "zod";

export const profileCatalog = createCatalog({
  name: "profile-chat",
  components: {
    Card: {
      props: z.object({
        title: z.string().nullable(),
        subtitle: z.string().nullable(),
      }),
      hasChildren: true,
      description: "Card container with optional title",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h2", "h3", "h4"]).nullable(),
      }),
      description: "Section heading",
    },
    Text: {
      props: z.object({
        content: z.string(),
        variant: z.enum(["body", "muted", "caption"]).nullable(),
      }),
      description: "Paragraph text",
    },
    List: {
      props: z.object({}),
      hasChildren: true,
      description: "List wrapper",
    },
    ListItem: {
      props: z.object({
        content: z.string(),
        meta: z.string().nullable(),
        href: z.string().nullable(),
      }),
      description: "List item",
    },
    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
      }),
      description: "Link",
    },
    TagRow: {
      props: z.object({}),
      hasChildren: true,
      description: "Row of tags",
    },
    Tag: {
      props: z.object({
        text: z.string(),
      }),
      description: "Tag",
    },
    Divider: {
      props: z.object({
        label: z.string().nullable(),
      }),
      description: "Divider",
    },
    Resume: {
      props: z.object({
        title: z.string().nullable(),
        href: z.string(),
      }),
      description: "Resume preview with download link",
    },
    InterestGrid: {
      props: z.object({
        title: z.string().nullable(),
        items: z.array(z.string()),
      }),
      description: "Grid of personal interests",
    },
  },
  validation: "strict",
});

export const componentList = profileCatalog.componentNames as string[];
