"use client";

import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  startTransition,
} from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { UITree } from "@json-render/core";
import { buildIntroTree, buildSummaryTree } from "@/lib/answer";
import { buildTreeFromAnswer } from "@/lib/answer-tree";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";

const quickPrompts = [
  "What are your most recent roles?",
  "What tech stack do you focus on?",
  "How can I get in contact with Arthur?",
  "How do you use AI in your workflow?",
];

const followUpBank = {
  general: [
    "What industries have you worked in?",
    "What are your strongest frontend strengths?",
    "How can I get in contact with Arthur?",
  ],
  experience: [
    "What was your impact at Travel Syndicate Technology?",
    "What did you do at Insight Rx?",
    "What kind of teams have you led?",
  ],
  skills: [
    "What is your preferred tech stack?",
    "What backend experience do you have?",
    "Which tools do you use for testing?",
  ],
  contact: [
    "Where can I find your GitHub?",
    "Are you open to new opportunities?",
    "What is the best way to reach you?",
  ],
};

function getFollowUps(question: string) {
  const normalized = question.toLowerCase();
  if (normalized.includes("contact") || normalized.includes("email")) {
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

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text?: string;
  tree?: UITree;
};

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "intro", role: "assistant", tree: buildIntroTree() },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messageCounter = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const streamBufferRef = useRef("");
  const streamTimerRef = useRef<number | null>(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const sendPrompt = useCallback(async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setFollowUps([]);
    const userMessage: ChatMessage = {
      id: `user-${(messageCounter.current += 1)}`,
      role: "user",
      text: trimmed,
    };
    const assistantMessage: ChatMessage = {
      id: `assistant-${(messageCounter.current += 1)}`,
      role: "assistant",
      text: "Thinking...",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        const tree = data?.tree as UITree | undefined;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, text: undefined, tree: tree ?? buildSummaryTree() }
              : message,
          ),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
      streamBufferRef.current = "";

      streamTimerRef.current = window.setInterval(() => {
        if (!streamBufferRef.current) return;
        const buffered = streamBufferRef.current;
        startTransition(() => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, text: buffered }
                : message,
            ),
          );
        });
      }, 80);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        fullText += chunk;
        streamBufferRef.current = fullText;
      }

      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      const tree = fullText.trim()
        ? buildTreeFromAnswer(trimmed, fullText)
        : buildSummaryTree();

      startTransition(() => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, text: undefined, tree }
              : message,
          ),
        );
      });

      setFollowUps(getFollowUps(trimmed));
    } catch (error) {
      console.error("Chat error", error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                text: undefined,
                tree: buildSummaryTree(),
              }
            : message,
        ),
      );
    } finally {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    sendPrompt(input);
    setInput("");
  }, [input, sendPrompt]);

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
      quickPrompts.map((prompt) => (
        <button
          key={prompt}
          className="chip"
          type="button"
          onClick={() => {
            sendPrompt(prompt);
            setInput("");
          }}
        >
          {prompt}
        </button>
      )),
    [sendPrompt],
  );

  const followUpButtons = useMemo(
    () =>
      followUps.map((prompt) => (
        <button
          key={prompt}
          className="chip"
          type="button"
          onClick={() => {
            sendPrompt(prompt);
            setInput("");
          }}
        >
          {prompt}
        </button>
      )),
    [followUps, sendPrompt],
  );

  return (
    <section className="chat-panel">
      <ChatBackground />
      <div className="chat-content">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Ask Arthur</p>
            <h2>Arthur Zhuk</h2>
            <p className="muted">
              Welcome to my profile. Ask anything about my experience, skills,
              or the teams I've worked with.
            </p>
          </div>
          <div className="chip-row">{promptButtons}</div>
        </header>

        <div className="chat-thread">
          <JSONUIProvider registry={componentRegistry}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`chat-message chat-message-${message.role}`}
                style={{
                  animationDelay: `${index * 40}ms`,
                }}
              >
                {message.role === "user" ? (
                  <div className="bubble bubble-user">{message.text}</div>
                ) : (
                  <div className="bubble bubble-assistant">
                    {message.tree ? (
                      <Renderer
                        tree={message.tree}
                        registry={componentRegistry}
                      />
                    ) : (
                      <p className="jr-text jr-text-muted">{message.text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </JSONUIProvider>
        </div>

        {followUps.length > 0 ? (
          <div className="followup-row">
            <p className="followup-label">Try asking</p>
            <div className="chip-row">{followUpButtons}</div>
          </div>
        ) : null}

        <footer className="chat-input">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about experience, skills, or projects..."
            rows={2}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </footer>
      </div>
    </section>
  );
}
