"use client";

import { useMemo, useState, useCallback, useRef, useEffect, memo, Component, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { nestedToFlat } from "@json-render/core";
import type { Message } from "ai";
import { buildContactTree, buildIntroTree } from "@/lib/answer";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";
import { audioManager, type AudioState } from "@/lib/audio-manager";

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

const ChatMessageItem = memo(({ message, index, tree, isLoading }: { message: any, index: number, tree?: any, isLoading?: boolean }) => {
  const isJsonLike = (s: string) => /^\s*(\{|\`\`\`)/.test(s);
  const hasContent = !!(message.content?.trim());
  
  return (
    <div
      className={`chat-message chat-message-${message.role}`}
      style={{
        animationDelay: `${index * 40}ms`,
      }}
    >
      {message.role === "user" ? (
        <div className="bubble bubble-user">
          {message.content ?? ""}
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
          ) : (
            <p className="jr-text jr-text-muted">
              {hasContent && !isJsonLike(message.content)
                ? message.content
                : isLoading
                  ? "Thinking..."
                  : hasContent
                    ? "Couldn't display response"
                    : "Thinking..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

export default function ChatPanel() {
  const [treeById, setTreeById] = useState<Record<string, any>>({});
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastUserQuestionRef = useRef("");
  const introMessage = useMemo(
    () => ({ id: "intro", role: "assistant", content: "intro", tree: buildIntroTree() }),
    [],
  );

  const [audioState, setAudioState] = useState<AudioState>("paused");

  useEffect(() => {
    return audioManager.subscribe(setAudioState);
  }, []);

  useEffect(() => {
    let interacted = false;

    // Browsers block autoplay without user interaction.
    // We wait for the first click, touch, or keypress to start the audio.
    const handleInteraction = () => {
      if (interacted) return;
      interacted = true;
      
      // We don't call toggle here, just play, so it doesn't conflict with the Play button
      audioManager.play();
    };

    const events = ['click', 'keydown', 'pointerdown'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("question-count", String(questionCount));
  }, [questionCount]);

  const { messages, setMessages, input, setInput, append, isLoading, error } = useChat({
    api: "/api/generate",
    streamProtocol: "text",
    onError: (err) => console.error("[Chat] API error:", err),
  });

  useEffect(() => {
    if (error) console.error("[Chat] useChat error:", error.message, error);
  }, [error]);

  const combinedMessages = useMemo<Array<Message | typeof introMessage>>(
    () => [introMessage, ...messages],
    [introMessage, messages],
  );
  const lastMessage = messages[messages.length - 1];
  const isLocked = questionCount >= MAX_QUESTIONS;

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
        return;
      }

      append({ role: "user", content: trimmed, id: userId });
    },
    [append, questionCount, setMessages],
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

  const lastMessageContent = lastMessage?.role === 'assistant' ? lastMessage.content : '';
  
  useEffect(() => {
    if (lastMessage?.role !== 'assistant' || !lastMessageContent.trim()) return;
    const trimmed = lastMessageContent.trim();
    let jsonStr = trimmed;
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    else if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) return;
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') {
        if (!isLoading) console.warn("[Chat] Parsed JSON is not an object:", typeof parsed);
        return;
      }
      let spec: any;
      if (typeof parsed.root === 'string' && parsed.elements && typeof parsed.elements === 'object') {
        spec = parsed;
      } else if (parsed.type && typeof parsed.type === 'string') {
        spec = nestedToFlat(parsed);
      } else {
        if (!isLoading) console.warn("[Chat] Unknown spec format. Has root:", 'root' in parsed, "has type:", 'type' in parsed, "keys:", Object.keys(parsed).slice(0, 5));
        return;
      }
      setTreeById(prev => ({ ...prev, [lastMessage.id]: spec }));
    } catch (e) {
      if (!isLoading) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[Chat] JSON parse failed:", msg, "Content preview:", jsonStr.slice(0, 200));
      }
    }
  }, [lastMessageContent, lastMessage?.role, lastMessage?.id, isLoading]);

  useEffect(() => {
    if (!isLoading && lastMessage?.role === 'assistant') {
       const question = lastUserQuestionRef.current;
       setFollowUps(getFollowUps(question));
       endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading, lastMessage]);

  return (
    <section className="chat-panel">
      <ChatBackground />
      <div className="chat-content">
        <div className="chat-thread">
          <header className="chat-header">
            <div className="chat-header-top">
              <div className="chat-header-text">
                <p className="eyebrow">Ask Arthur</p>
                <h2>Arthur Zhuk</h2>
                <p className="muted">
                  Welcome to my profile. Ask anything about my experience, skills,
                  or the teams I've worked with.
                </p>
              </div>
              <div className="chat-header-audio">
                {audioState === "playing" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", animation: "fadeSlide 0.3s ease both" }}>
                    <div className="audio-bars">
                      <span className="bar"></span>
                      <span className="bar"></span>
                      <span className="bar"></span>
                    </div>
                    <span className="audio-title">
                      Arthur of Silver Lake
                    </span>
                  </div>
                ) : null}
                <button 
                  className="chip" 
                  onClick={() => audioManager.toggle()}
                  style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}
                >
                  {audioState === "playing" ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      <span>Play</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="chip-row">{promptButtons}</div>
          </header>

          <JSONUIProvider registry={componentRegistry}>
            {combinedMessages.map((message, index) => (
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
                  <p className="jr-text jr-text-muted">Thinking...</p>
                </div>
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
