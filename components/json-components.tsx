import type { ComponentRenderProps } from "@json-render/react";

export function Card({ element, children }: ComponentRenderProps) {
  const title = element.props.title as string | null | undefined;
  const subtitle = element.props.subtitle as string | null | undefined;

  return (
    <div className="jr-card">
      {title ? <h3 className="jr-card-title">{title}</h3> : null}
      {subtitle ? <p className="jr-card-subtitle">{subtitle}</p> : null}
      <div className="jr-card-body">{children}</div>
    </div>
  );
}

export function Heading({ element }: ComponentRenderProps) {
  const level = (element.props.level as string | null) ?? "h3";
  const text = element.props.text as string;
  const Tag = (["h2", "h3", "h4"].includes(level) ? level : "h3") as
    | "h2"
    | "h3"
    | "h4";

  return <Tag className="jr-heading">{text}</Tag>;
}

export function Text({ element }: ComponentRenderProps) {
  const variant = (element.props.variant as string | null) ?? "body";
  const content = element.props.content as string;

  const className = `jr-text${variant ? ` jr-text-${variant}` : ""}`;

  return <p className={className}>{content}</p>;
}

export function List({ children }: ComponentRenderProps) {
  return <ul className="jr-list">{children}</ul>;
}

export function ListItem({ element }: ComponentRenderProps) {
  const content = element.props.content as string;
  const meta = element.props.meta as string | null | undefined;
  const href = element.props.href as string | null | undefined;
  const label = href ? (
    <a className="jr-link-inline" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <span>{content}</span>
  );

  return (
    <li className="jr-list-item">
      {label}
      {meta ? <span className="jr-list-meta">{meta}</span> : null}
    </li>
  );
}

export function Link({ element }: ComponentRenderProps) {
  const label = element.props.label as string;
  const href = element.props.href as string;

  return (
    <a className="jr-link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export function TagRow({ children }: ComponentRenderProps) {
  return <div className="jr-tag-row">{children}</div>;
}

export function Tag({ element }: ComponentRenderProps) {
  return <span className="jr-tag">{element.props.text as string}</span>;
}

export function Divider({ element }: ComponentRenderProps) {
  const label = element.props.label as string | null | undefined;

  return (
    <div className="jr-divider">
      <span />
      {label ? <small>{label}</small> : null}
      <span />
    </div>
  );
}

export const componentRegistry = {
  Card,
  Heading,
  Text,
  List,
  ListItem,
  Link,
  TagRow,
  Tag,
  Divider,
};
