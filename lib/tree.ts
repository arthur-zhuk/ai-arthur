import type { Spec } from "@json-render/core";

type Node = {
  type: string;
  props?: Record<string, unknown>;
  children?: Node[];
};

export function createTree(rootNode: Node): Spec {
  const elements: Record<string, any> = {};
  let counter = 0;

  const walk = (node: Node, parentKey: string | null): string => {
    const key = `${node.type.toLowerCase()}-${counter++}`;
    const childKeys = node.children?.map((child) => walk(child, key));

    elements[key] = {
      key,
      type: node.type,
      props: node.props ?? {},
      children: childKeys && childKeys.length > 0 ? childKeys : undefined,
      parentKey,
    };

    return key;
  };

  const root = walk(rootNode, null);

  return { root, elements };
}

export const node = (
  type: string,
  props?: Record<string, unknown>,
  children?: Node[],
): Node => ({
  type,
  props,
  children,
});
