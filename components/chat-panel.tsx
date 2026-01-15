"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { UITree } from "@json-render/core";
import type { Message } from "ai";
import { buildContactTree, buildIntroTree, buildSummaryTree } from "@/lib/answer";
import { buildTreeFromAnswer } from "@/lib/answer-tree";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";

const quickPrompts = [
  "What are your most recent roles?",
  "What tech stack do you focus on?",
  "How can I get in contact with Arthur?",
  "Show me your resume",
  "What do you do outside of work?",
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

const MAX_QUESTIONS = 10;

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


export default function ChatPanel() {
  const [treeById, setTreeById] = useState<Record<string, UITree>>({});
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserQuestionRef = useRef("");
  const introMessage = useMemo(
    () => ({ id: "intro", role: "assistant", tree: buildIntroTree() }),
    [],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("question-count");
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        setQuestionCount(parsed);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("question-count", String(questionCount));
  }, [questionCount]);

  const { messages, setMessages, input, setInput, append, isLoading } = useChat({
    api: "/api/generate",
    streamProtocol: "text",
    onFinish: (message) => {
      const question = lastUserQuestionRef.current;
      const tree = message.content.trim()
        ? buildTreeFromAnswer(question || "Answer", message.content)
        : buildSummaryTree();

      setTreeById((prev) => ({ ...prev, [message.id]: tree }));
      setFollowUps(getFollowUps(question));
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    },
  });

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
          {
            id: assistantId,
            role: "assistant",
            content: "Here is how to reach Arthur.",
          },
        ]);
        setTreeById((prev) => ({
          ...prev,
          [assistantId]: buildContactTree(),
        }));
        return;
      }

      append({ role: "user", content: trimmed, id: userId });
    },
    [append, questionCount],
  );

  const handleSend = useCallback(() => {
    sendPrompt(input);
    setInput("");
  }, [input, sendPrompt, setInput]);

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
            if (window.matchMedia("(max-width: 768px)").matches) {
              requestAnimationFrame(() => {
                endRef.current?.scrollIntoView({ behavior: "smooth" });
              });
            }
          }}
        >
          {prompt}
        </button>
      )),
    [sendPrompt, setInput],
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
            if (window.matchMedia("(max-width: 768px)").matches) {
              requestAnimationFrame(() => {
                endRef.current?.scrollIntoView({ behavior: "smooth" });
              });
            }
          }}
        >
          {prompt}
        </button>
      )),
    [followUps, sendPrompt, setInput],
  );

  const combinedMessages = useMemo<Array<Message | typeof introMessage>>(
    () => [introMessage, ...messages],
    [introMessage, messages],
  );
  const lastMessage = messages[messages.length - 1];
  const isLocked = questionCount >= MAX_QUESTIONS;

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
            {combinedMessages.map((message, index) => (
              <div
                key={message.id}
                className={`chat-message chat-message-${message.role}`}
                style={{
                  animationDelay: `${index * 40}ms`,
                }}
              >
                {message.role === "user" ? (
                  <div className="bubble bubble-user">
                    {(message as Message).content ?? ""}
                  </div>
                ) : (
                  <div className="bubble bubble-assistant">
                    {"tree" in message && message.tree ? (
                      <Renderer
                        tree={message.tree}
                        registry={componentRegistry}
                      />
                    ) : treeById[message.id] ? (
                      <Renderer
                        tree={treeById[message.id]}
                        registry={componentRegistry}
                      />
                    ) : (
                      <p className="jr-text jr-text-muted">
                        {(message as Message).content?.trim()
                          ? (message as Message).content
                          : "Thinking..."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && lastMessage?.role === "user" ? (
              <div className="chat-message chat-message-assistant">
                <div className="bubble bubble-assistant">
                  <p className="jr-text jr-text-muted">Thinking...</p>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </JSONUIProvider>
        </div>

        {followUps.length > 0 ? (
          <div className="followup-row">
            <p className="followup-label">Try asking</p>
            <div className="chip-row">{followUpButtons}</div>
          </div>
        ) : null}
        {isLocked ? (
          <div className="followup-row">
            <p className="followup-label">
              You have reached the question limit. Please reach out directly.
            </p>
          </div>
        ) : null}

        <footer className="chat-input">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about experience, skills, or projects..."
            rows={2}
            disabled={isLoading || isLocked}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isLocked}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </footer>
      </div>
    </section>
  );
}
