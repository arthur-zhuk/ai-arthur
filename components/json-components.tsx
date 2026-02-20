"use client";

import { defineRegistry, type ComponentRenderProps } from "@json-render/react";
import { profileCatalog } from "@/lib/catalog";
import { useState } from "react";

function Card({ props, children }: any) {
  const title = props.title as string | undefined | null;
  const subtitle = props.subtitle as string | undefined | null;

  return (
    <div className="jr-card">
      {title ? <h3 className="jr-card-title">{title}</h3> : null}
      {subtitle ? <p className="jr-card-subtitle">{subtitle}</p> : null}
      <div className="jr-card-body">{children}</div>
    </div>
  );
}

function Heading({ props }: any) {
  const level = (props.level as string | undefined | null) ?? "h3";
  const text = props.text as string;
  const Tag = (["h2", "h3", "h4"].includes(level) ? level : "h3") as
    | "h2"
    | "h3"
    | "h4";

  return <Tag className="jr-heading">{text}</Tag>;
}

function Text({ props }: any) {
  const variant = (props.variant as string | undefined | null) ?? "body";
  const content = props.content as string;

  const className = `jr-text${variant ? ` jr-text-${variant}` : ""}`;

  return <p className={className}>{content}</p>;
}

function List({ children }: any) {
  return <ul className="jr-list">{children}</ul>;
}

function ListItem({ props }: any) {
  const content = props.content as string;
  const meta = props.meta as string | undefined | null;
  const href = props.href as string | undefined | null;
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

function Link({ props }: any) {
  const label = props.label as string;
  const href = props.href as string;

  return (
    <a className="jr-link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function TagRow({ children }: any) {
  return <div className="jr-tag-row">{children}</div>;
}

function Tag({ props }: any) {
  return <span className="jr-tag">{props.text as string}</span>;
}

function Divider({ props }: any) {
  const label = props.label as string | undefined | null;

  return (
    <div className="jr-divider">
      <span />
      {label ? <small>{label}</small> : null}
      <span />
    </div>
  );
}

function Resume({ props }: any) {
  const title = props.title as string | undefined | null;
  const href = props.href as string;

  return (
    <div className="jr-resume">
      <div className="jr-resume-header">
        <div>
          <p className="jr-resume-label">Resume</p>
          <h4 className="jr-resume-title">{title ?? "Arthur Zhuk Resume"}</h4>
        </div>
        <a className="jr-resume-link" href={href} target="_blank" rel="noreferrer">
          Open PDF
        </a>
      </div>
      <iframe
        className="jr-resume-frame"
        src={href}
        title={title ?? "Arthur Zhuk Resume"}
        loading="lazy"
      />
    </div>
  );
}

function InterestGrid({ props }: any) {
  const title = props.title as string | undefined | null;
  const items = props.items as string[];

  return (
    <div className="jr-interest-grid">
      <div className="jr-interest-header">
        <p className="jr-interest-label">Beyond the code</p>
        <h4 className="jr-interest-title">
          {title ?? "Outside of work"}
        </h4>
      </div>
      <div className="jr-interest-cards">
        {items.map((item) => (
          <div key={item} className="jr-interest-card">
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Counter({ props }: any) {
  const initialValue = (props.initialValue as number) ?? 0;
  const [count, setCount] = useState(initialValue);

  return (
    <div className="jr-counter" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <button 
        onClick={() => setCount(c => c - 1)}
        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
      >-</button>
      <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 'bold' }}>{count}</span>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
      >+</button>
    </div>
  );
}

export const { registry: componentRegistry } = defineRegistry(profileCatalog, {
  components: {
    Card: Card as any,
    Heading: Heading as any,
    Text: Text as any,
    List: List as any,
    ListItem: ListItem as any,
    Link: Link as any,
    TagRow: TagRow as any,
    Tag: Tag as any,
    Divider: Divider as any,
    Resume: Resume as any,
    InterestGrid: InterestGrid as any,
    Counter: Counter as any,
  },
  actions: {}
});
