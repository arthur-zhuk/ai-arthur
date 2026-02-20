import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react";
import { z } from "zod";

export const profileCatalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string().nullable().optional(),
        subtitle: z.string().nullable().optional(),
      }),
      description: "Card container with optional title",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h2", "h3", "h4"]).nullable().optional(),
      }),
      description: "Section heading",
    },
    Text: {
      props: z.object({
        content: z.string(),
        variant: z.enum(["body", "muted", "caption"]).nullable().optional(),
      }),
      description: "Paragraph text",
    },
    List: {
      props: z.object({}),
      description: "List wrapper",
    },
    ListItem: {
      props: z.object({
        content: z.string(),
        meta: z.string().nullable().optional(),
        href: z.string().nullable().optional(),
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
        label: z.string().nullable().optional(),
      }),
      description: "Divider",
    },
    Resume: {
      props: z.object({
        title: z.string().nullable().optional(),
        href: z.string(),
      }),
      description: "Resume preview with download link",
    },
    InterestGrid: {
      props: z.object({
        title: z.string().nullable().optional(),
        items: z.array(z.string()),
      }),
      description: "Grid of personal interests",
    },
    Counter: {
      props: z.object({
        initialValue: z.number().optional(),
      }),
      description: "An interactive counter component",
    },
  },
  actions: {}
});

export const componentList = profileCatalog.componentNames as string[];
