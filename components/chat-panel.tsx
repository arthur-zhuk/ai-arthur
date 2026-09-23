"use client";

import { useMemo, useState, useCallback, useRef, useEffect, memo, Component, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { nestedToFlat } from "@json-render/core";
import { ArrowUp, ArrowUpRight, Music2, Pause, RotateCcw } from "lucide-react";
import { buildContactTree } from "@/lib/answer";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";
import { audioManager, type AudioState } from "@/lib/audio-manager";
import { profileData } from "@/lib/profile-data";

const quickPrompts = [
  {
    label: "Current work",
    detail: "Anduril and recent roles",
    prompt: "Tell me about your current work at Anduril and your most recent roles.",
  },
  {
    label: "Engineering depth",
    detail: "Backend, systems, and frontend",
    prompt: "What are your strongest backend, systems, and frontend skills?",
  },
  {
    label: "Career highlights",
    detail: "Impact across 10+ years",
    prompt: "Walk me through the biggest highlights and impact from your career.",
  },
  {
    label: "Beyond work",
    detail: "Interests, tools, and contact",
    prompt: "What should I know about you beyond work, including your interests and how to get in touch?",
  },
];

const followUpBank = {
  general: [
    "What industries have you worked in?",
    "What are your strongest frontend strengths?",
    "What are your strongest backend strengths?",
    "How can I get in contact with Arthur?",
  ],
  experience: [
    "What are you doing at Anduril?",
    "What was your impact at Travel Syndicate Technology?",
    "What kind of teams have you led?",
  ],
  skills: [
    "What is your preferred tech stack?",
    "What backend experience do you have?",
    "What databases are you proficient in?",
  ],
  contact: [
    "Where can I find your GitHub?",
    "Are you open to new opportunities?",
    "What is the best way to reach you?",
  ],
};

const MAX_QUESTIONS = 30;

class RenderErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("[Chat] Renderer error:", error.message, error); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <p className="jr-text jr-text-muted">Failed to render response</p>;
    return this.props.children;
  }
}

function getFollowUps(question: string) {
  const normalized = question.toLowerCase();
  if (
    normalized.includes("contact") ||
    normalized.includes("email") ||
    normalized.includes("get in touch") ||
    normalized.includes("reach you")
  ) {
    return followUpBank.contact;
  }
  if (
    normalized.includes("experience") ||
    normalized.includes("roles") ||
    normalized.includes("company")
  ) {
    return followUpBank.experience;
  }
  if (
    normalized.includes("stack") ||
    normalized.includes("skills") ||
    normalized.includes("tech")
  ) {
    return followUpBank.skills;
  }
  return followUpBank.general;
}

type MessageTextPart =
  | { type?: string; text?: string }
  | { type?: string; text?: { value?: string } };

type AssistantMessageLike = {
  id: string;
  role: string;
  content?: string | null;
  parts?: MessageTextPart[];
  annotations?: unknown[];
};

type FlatElementLike = {
  key?: string;
  type?: string;
  props?: Record<string, unknown>;
  children?: unknown[];
  parentKey?: string | null;
};

type FlatSpecLike = {
  root?: string;
  elements?: Record<string, FlatElementLike>;
};

function isFlatElementLike(value: unknown): value is FlatElementLike {
  return !!value && typeof value === "object" && typeof (value as FlatElementLike).type === "string";
}

function normalizeFlatSpec(input: FlatSpecLike) {
  if (!input || typeof input !== "object" || !input.elements || typeof input.elements !== "object") {
    return undefined;
  }

  const elements: Record<string, FlatElementLike> = {};
  let autoKeyCounter = 0;

  const ensureKey = (base: string) => {
    let key = base || `el-${autoKeyCounter++}`;
    while (elements[key]) {
      key = `${base || "el"}-${autoKeyCounter++}`;
    }
    return key;
  };

  const addElement = (key: string, raw: FlatElementLike, parentKey: string | null) => {
    const normalizedKey = ensureKey(key || raw.key || `el-${autoKeyCounter++}`);
    const childKeys: string[] = [];
    const rawChildren = Array.isArray(raw.children) ? raw.children : [];

    elements[normalizedKey] = {
      key: normalizedKey,
      type: raw.type,
      props: raw.props ?? {},
      children: childKeys,
      parentKey,
    };

    for (const child of rawChildren) {
      if (typeof child === "string") {
        childKeys.push(child);
        continue;
      }

      if (isFlatElementLike(child)) {
        const nestedKey = addElement(child.key ?? `el-${autoKeyCounter++}`, child, normalizedKey);
        childKeys.push(nestedKey);
      }
    }

    return normalizedKey;
  };

  for (const [key, raw] of Object.entries(input.elements)) {
    if (!isFlatElementLike(raw)) continue;
    if (elements[key]) continue;
    addElement(key, raw, raw.parentKey ?? null);
  }

  for (const [key, element] of Object.entries(elements)) {
    const childKeys = Array.isArray(element.children) ? element.children : [];
    for (const childKey of childKeys) {
      if (typeof childKey !== "string") continue;
      const child = elements[childKey];
      if (child && (child.parentKey == null || child.parentKey !== key)) {
        child.parentKey = key;
      }
    }
  }

  let root = typeof input.root === "string" ? input.root : "";

  if (!root || !elements[root]) {
    const missingRootChildren = root
      ? Object.entries(elements)
          .filter(([, element]) => element.parentKey === root)
          .map(([key]) => key)
      : [];

    if (missingRootChildren.length > 0) {
      const rootKey = ensureKey(root || "root");
      elements[rootKey] = {
        key: rootKey,
        type: "Card",
        props: { title: "Answer" },
        children: missingRootChildren,
        parentKey: null,
      };
      for (const childKey of missingRootChildren) {
        elements[childKey].parentKey = rootKey;
      }
      root = rootKey;
    } else {
      const candidateRoots = Object.entries(elements)
        .filter(([, element]) => !element.parentKey || !elements[element.parentKey])
        .map(([key]) => key);

      if (candidateRoots.length === 1) {
        root = candidateRoots[0];
      } else if (candidateRoots.length > 1) {
        const rootKey = ensureKey("root");
        elements[rootKey] = {
          key: rootKey,
          type: "Card",
          props: { title: "Answer" },
          children: candidateRoots,
          parentKey: null,
        };
        for (const childKey of candidateRoots) {
          elements[childKey].parentKey = rootKey;
        }
        root = rootKey;
      }
    }
  }

  if (!root || !elements[root]) {
    return undefined;
  }

  return { root, elements };
}

function parseTreeSpec(raw: string, shouldLog = false) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let jsonStr = trimmed;
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    jsonStr = codeBlock[1].trim();
  } else if (!trimmed.startsWith("{")) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") return undefined;

    if (
      typeof (parsed as any).root === "string" &&
      (parsed as any).elements &&
      typeof (parsed as any).elements === "object"
    ) {
      return normalizeFlatSpec(parsed as FlatSpecLike);
    }

    if (typeof (parsed as any).type === "string") {
      return nestedToFlat(parsed);
    }

    return undefined;
  } catch (error) {
    if (shouldLog) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[Chat] JSON parse failed:", message, "Preview:", jsonStr.slice(0, 200));
    }
    return undefined;
  }
}

function extractAssistantText(message: AssistantMessageLike) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }

  const partsText = (message.parts ?? [])
    .filter((part) => part?.type === "text")
    .map((part) => {
      if (typeof part.text === "string") return part.text;
      if (part.text && typeof part.text === "object" && typeof part.text.value === "string") {
        return part.text.value;
      }
      return "";
    })
    .filter(Boolean)
    .join("");

  return partsText;
}

function extractTreeFromMessage(message: AssistantMessageLike, shouldLog = false) {
  const annotationTree = (message.annotations ?? []).find((annotation) => {
    if (!annotation || typeof annotation !== "object") return false;
    const value = annotation as Record<string, unknown>;
    return (
      (typeof value.root === "string" && !!value.elements && typeof value.elements === "object") ||
      typeof value.type === "string"
    );
  });

  if (annotationTree) {
    if (
      typeof (annotationTree as any).root === "string" &&
      (annotationTree as any).elements &&
      typeof (annotationTree as any).elements === "object"
    ) {
      return annotationTree;
    }
    if (typeof (annotationTree as any).type === "string") {
      return nestedToFlat(annotationTree as Record<string, unknown>);
    }
  }

  return parseTreeSpec(extractAssistantText(message), shouldLog);
}

const ChatMessageItem = memo(({ message, index, tree, isLoading }: { message: any, index: number, tree?: any, isLoading?: boolean }) => {
  const isJsonLike = (s: string) => /^\s*({|```)/.test(s);
  const assistantText = message.role === "assistant"
    ? extractAssistantText(message as AssistantMessageLike)
    : "";
  const hasAssistantText = !!assistantText.trim();
  const hasUserText = typeof message.content === "string" && !!message.content.trim();
  
  return (
    <div
      className={`chat-message chat-message-${message.role}`}
      style={{
        animationDelay: `${index * 40}ms`,
      }}
    >
      {message.role === "user" ? (
        <div className="bubble bubble-user">
          {hasUserText ? message.content : ""}
        </div>
      ) : (
        <div className="bubble bubble-assistant">
          {"tree" in message && message.tree ? (
            <RenderErrorBoundary>
              <Renderer
                spec={message.tree}
                registry={componentRegistry}
              />
            </RenderErrorBoundary>
          ) : tree ? (
            <RenderErrorBoundary>
              <Renderer
                spec={tree}
                registry={componentRegistry}
              />
            </RenderErrorBoundary>
          ) : isLoading && (!hasAssistantText || isJsonLike(assistantText)) ? (
            <ThinkingSkeleton />
          ) : (
            <p className="jr-text jr-text-muted">
              {hasAssistantText && !isJsonLike(assistantText)
                ? assistantText
                : hasAssistantText
                  ? "Couldn't display response"
                  : "Thinking..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

function ThinkingSkeleton() {
  return (
    <div className="thinking-skeleton" aria-label="Arthur is composing a response">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function ChatPanel() {
  const [treeById, setTreeById] = useState<Record<string, any>>({});
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [input, setInput] = useState("");
  const chatThreadRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserQuestionRef = useRef("");

  const [audioState, setAudioState] = useState<AudioState>("paused");

  useEffect(() => {
    return audioManager.subscribe(setAudioState);
  }, []);

  const { messages, setMessages, append, isLoading, error } = useChat({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: (message) => {
      if (message.role !== "assistant") return;
      const tree = extractTreeFromMessage(message as AssistantMessageLike, true);
      if (!tree) return;
      setTreeById((prev) => ({ ...prev, [message.id]: tree }));
    },
    onError: (err) => console.error("[Chat] API error:", err),
  });

  useEffect(() => {
    if (error) console.error("[Chat] useChat error:", error.message, error);
  }, [error]);

  const lastMessage = messages[messages.length - 1];
  const isLocked = questionCount >= MAX_QUESTIONS;
  const remainingQuestions = Math.max(0, MAX_QUESTIONS - questionCount);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const thread = chatThreadRef.current;
    if (thread) {
      thread.scrollTo({
        top: thread.scrollHeight,
        behavior,
      });
      return;
    }
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const sendPrompt = useCallback(
    (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed) return;
      if (questionCount >= MAX_QUESTIONS) return;

      const nextCount = questionCount + 1;
      setQuestionCount(nextCount);
      lastUserQuestionRef.current = trimmed;
      setFollowUps([]);
      const userId = `user-${Date.now()}`;

      if (nextCount >= MAX_QUESTIONS) {
        const assistantId = `assistant-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: userId, role: "user", content: trimmed },
          { id: assistantId, role: "assistant", content: "Here is how to reach Arthur." },
        ]);
        setTreeById((prev) => ({
          ...prev,
          [assistantId]: buildContactTree() as any,
        }));
        requestAnimationFrame(() => scrollToBottom("smooth"));
        return;
      }

      append({ role: "user", content: trimmed, id: userId });
      requestAnimationFrame(() => scrollToBottom("smooth"));
    },
    [append, questionCount, scrollToBottom, setMessages],
  );

  const handleSend = useCallback(() => {
    sendPrompt(input);
    setInput("");
  }, [input, sendPrompt, setInput]);

  const handleResetChat = useCallback(() => {
    setMessages([]);
    setTreeById({});
    setFollowUps([]);
    setQuestionCount(0);
    setInput("");
    lastUserQuestionRef.current = "";
  }, [setMessages, setInput]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const promptButtons = useMemo(
    () =>
      quickPrompts.map((item, index) => (
        <button
          key={item.label}
          className="starter-prompt"
          type="button"
          disabled={isLoading}
          onClick={() => {
            sendPrompt(item.prompt);
            setInput("");
            if (window.matchMedia("(max-width: 768px)").matches) {
              requestAnimationFrame(() => scrollToBottom("smooth"));
            }
          }}
        >
          <span className="starter-index">{String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.75} />
        </button>
      )),
    [sendPrompt, setInput, isLoading, scrollToBottom],
  );

  const followUpButtons = useMemo(
    () =>
      followUps.map((prompt) => (
        <button
          key={prompt}
          className="chip"
          type="button"
          disabled={isLoading}
          onClick={() => {
            sendPrompt(prompt);
            setInput("");
            if (window.matchMedia("(max-width: 768px)").matches) {
              requestAnimationFrame(() => scrollToBottom("smooth"));
            }
          }}
        >
          {prompt}
        </button>
      )),
    [followUps, sendPrompt, setInput, isLoading, scrollToBottom],
  );

  useEffect(() => {
    setTreeById((prev) => {
      let next = prev;

      for (const message of messages) {
        if (message.role !== "assistant" || prev[message.id]) continue;
        const tree = extractTreeFromMessage(message as AssistantMessageLike, !isLoading);
        if (!tree) continue;
        if (next === prev) next = { ...prev };
        next[message.id] = tree;
      }

      return next;
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading && lastMessage?.role === 'assistant') {
       const question = lastUserQuestionRef.current;
       setFollowUps(getFollowUps(question).slice(0, 2));
       requestAnimationFrame(() => scrollToBottom("smooth"));
       window.setTimeout(() => scrollToBottom("smooth"), 80);
    }
  }, [isLoading, lastMessage, scrollToBottom]);

  useEffect(() => {
    if (isLoading) {
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (followUps.length > 0 || isLocked) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [followUps.length, isLocked, scrollToBottom]);

  return (
    <section className="chat-panel">
      <ChatBackground />
      <aside className="profile-panel" aria-label="About Arthur">
        <div className="profile-topline">
          <p className="eyebrow"><span className="presence-dot" /> Senior Software Engineer at Anduril</p>
          <button
            className="icon-button"
            type="button"
            onClick={() => audioManager.toggle()}
            aria-label={audioState === "playing" ? "Pause soundtrack" : "Play soundtrack"}
            title={audioState === "playing" ? "Pause Arthur of Silver Lake" : "Play Arthur of Silver Lake"}
          >
            {audioState === "playing" ? <Pause size={17} strokeWidth={1.75} /> : <Music2 size={17} strokeWidth={1.75} />}
          </button>
        </div>
        <div className="profile-intro">
          <p className="profile-greeting">Hi, I&apos;m</p>
          <h1>Arthur<span className="profile-last-name"> Zhuk<span className="profile-period">.</span></span></h1>
          <p className="profile-summary">
            I build software that holds up under real pressure, from backend systems
            and data to the details people use every day.
          </p>
        </div>
        <div className="profile-bottom">
          <p className="profile-experience"><strong>10+ years</strong> across defense technology, healthcare, enterprise software, and more.</p>
          <nav className="profile-links" aria-label="Arthur's links">
            <a href="/arthur-zhuk-resume.pdf" target="_blank" rel="noreferrer">Resume <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} /></a>
            <a href={`mailto:${profileData.contact.email}`}>Email <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} /></a>
            <a href={profileData.contact.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} /></a>
            <a href={profileData.contact.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} /></a>
          </nav>
          {audioState === "playing" ? <p className="audio-now-playing"><span className="audio-bars"><span className="bar" /><span className="bar" /><span className="bar" /></span> Arthur of Silver Lake</p> : null}
        </div>
      </aside>

      <div className="conversation-panel">
        <header className="conversation-header">
          <h2>Ask Arthur</h2>
          {messages.length > 0 ? (
            <button className="icon-button" type="button" onClick={handleResetChat} aria-label="Start a new conversation" title="Start over">
              <RotateCcw size={17} strokeWidth={1.75} />
            </button>
          ) : null}
        </header>
        <div className="chat-thread" ref={chatThreadRef}>
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <p>Where should we start?</p>
              <div className="starter-prompts">{promptButtons}</div>
            </div>
          ) : null}
          <JSONUIProvider registry={componentRegistry}>
            {messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                index={index}
                tree={treeById[message.id]}
                isLoading={isLoading}
              />
            ))}
            {isLoading && lastMessage?.role === "user" ? (
              <div className="chat-message chat-message-assistant">
                <div className="bubble bubble-assistant">
                  <ThinkingSkeleton />
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="chat-error" role="alert">
                <strong>Response failed</strong>
                <span>{error.message || "Try again in a moment."}</span>
              </div>
            ) : null}
            {followUps.length > 0 ? (
              <div className="followup-row followup-inline">
                <p className="followup-label">Try asking</p>
                <div className="chip-row">{followUpButtons}</div>
              </div>
            ) : null}
            {isLocked ? (
              <div className="followup-row followup-inline">
                <p className="followup-label">
                  You have reached the question limit. Please reach out directly.
                </p>
              </div>
            ) : null}
            <div ref={endRef} />
          </JSONUIProvider>
        </div>

        <footer className="chat-input">
          <label htmlFor="chat-question" className="sr-only">Ask Arthur a question</label>
          <textarea
            id="chat-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Arthur anything..."
            rows={1}
            disabled={isLoading || isLocked}
            aria-label="Ask a question about Arthur"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isLocked}
            aria-label="Send message"
          >
            <ArrowUp aria-hidden="true" size={18} strokeWidth={2} />
          </button>
          {remainingQuestions <= 5 ? <p className="chat-counter">{remainingQuestions} questions remaining</p> : null}
        </footer>
      </div>
    </section>
  );
}
