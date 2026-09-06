"use client";

import {
  Component,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { buildIntroTree } from "@/lib/answer";
import {
  answerDataSchema,
  answerText,
  answerTree,
  getAnswer,
  getMessageText,
  MAX_INPUT_LENGTH,
  MAX_QUESTIONS,
  type ProfileMessage,
} from "@/lib/chat/schema";
import { profileData } from "@/lib/profile-data";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";
import { audioManager, type AudioState } from "@/lib/audio-manager";

const transport = new DefaultChatTransport<ProfileMessage>({
  api: "/api/generate",
});
const dataPartSchemas = { answer: answerDataSchema };
const introTree = buildIntroTree();
const quickPrompts = [
  {
    label: "Current work",
    detail: "Anduril and recent roles",
    prompt:
      "Tell me about Arthur's current work at Anduril and his most recent roles.",
  },
  {
    label: "Engineering depth",
    detail: "Backend, systems, and frontend",
    prompt:
      "What are Arthur's strongest backend, systems, and frontend skills?",
  },
  {
    label: "Career highlights",
    detail: "Impact across 10+ years",
    prompt:
      "Walk me through the biggest highlights and impact from Arthur's career.",
  },
  {
    label: "Beyond work",
    detail: "Interests, tools, and contact",
    prompt:
      "What should I know about Arthur beyond work, including his interests and how to get in touch?",
  },
];
class RenderErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? (
      <p className="jr-text">
        This answer couldn’t be displayed. Please retry the response.
      </p>
    ) : (
      this.props.children
    );
  }
}
function ThinkingSkeleton() {
  return (
    <div
      className="thinking-skeleton"
      role="status"
      aria-label="Preparing an answer"
    >
      <span />
      <span />
      <span />
    </div>
  );
}
const ChatMessageItem = memo(function ChatMessageItem({
  message,
  streaming,
}: {
  message: ProfileMessage;
  streaming: boolean;
}) {
  const data = getAnswer(message);
  const tree = useMemo(
    () => (data ? answerTree(data.answer) : undefined),
    [data],
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  if (message.role === "user")
    return (
      <div className="chat-message chat-message-user">
        <div className="bubble bubble-user">{getMessageText(message)}</div>
      </div>
    );
  return (
    <div className="chat-message chat-message-assistant">
      <div className="bubble bubble-assistant">
        {tree ? (
          <RenderErrorBoundary>
            <Renderer spec={tree} registry={componentRegistry} />
          </RenderErrorBoundary>
        ) : streaming ? (
          <ThinkingSkeleton />
        ) : (
          <p className="jr-text jr-text-muted">No complete answer yet.</p>
        )}
        {data?.complete && !streaming ? (
          <button
            className="chat-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(answerText(data.answer));
                setCopyStatus("copied");
              } catch {
                setCopyStatus("failed");
              }
            }}
          >
            {copyStatus === "copied"
              ? "Copied"
              : copyStatus === "failed"
                ? "Copy unavailable — select text to copy"
                : "Copy answer"}
          </button>
        ) : data && !streaming ? (
          <p className="chat-partial">Partial answer · you can retry below.</p>
        ) : null}
      </div>
    </div>
  );
});

export default function ChatPanel({ enabled = true }: { enabled?: boolean }) {
  const [input, setInput] = useState("");
  const [audioState, setAudioState] = useState<AudioState>("paused");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followScroll = useRef(true);
  const inFlight = useRef(false);
  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    stop,
    clearError,
    status,
    error,
  } = useChat<ProfileMessage>({ transport, dataPartSchemas });
  const busy = status === "submitted" || status === "streaming";
  const questionCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  const isLocked = questionCount >= MAX_QUESTIONS;
  const remaining = MAX_QUESTIONS - questionCount;
  const lastMessage = messages.at(-1);
  const lastAnswer =
    lastMessage?.role === "assistant" ? getAnswer(lastMessage) : undefined;
  const followUps =
    !busy && !error && lastAnswer?.complete ? lastAnswer.answer.followUps : [];
  const canRetry =
    !busy &&
    messages.some((message) => message.role === "user") &&
    (Boolean(error) ||
      (lastMessage?.role === "assistant" && !lastAnswer?.complete) ||
      lastMessage?.role === "user");

  useEffect(() => audioManager.subscribe(setAudioState), []);
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input]);
  useEffect(() => {
    if (!busy) inFlight.current = false;
  }, [busy]);
  useEffect(() => {
    if (!followScroll.current) return;
    const frame = requestAnimationFrame(() => {
      const thread = threadRef.current;
      if (thread)
        thread.scrollTo({ top: thread.scrollHeight, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, busy, error]);
  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );

  const sendPrompt = useCallback(
    (text: string) => {
      const value = text.trim();
      if (
        !value ||
        value.length > MAX_INPUT_LENGTH ||
        !enabled ||
        busy ||
        isLocked ||
        inFlight.current
      )
        return;
      inFlight.current = true;
      followScroll.current = true;
      clearError();
      setInput("");
      void sendMessage({ text: value }).finally(() => {
        inFlight.current = false;
      });
    },
    [busy, clearError, enabled, isLocked, sendMessage],
  );
  const reset = async () => {
    await stop();
    clearError();
    setMessages([]);
    setInput("");
    inFlight.current = false;
    followScroll.current = true;
  };
  const retry = () => {
    if (busy || inFlight.current || !enabled) return;
    inFlight.current = true;
    followScroll.current = true;
    clearError();
    void regenerate().finally(() => {
      inFlight.current = false;
    });
  };

  return (
    <section className="chat-panel">
      <ChatBackground />
      <div className="chat-content">
        <div
          className="chat-thread"
          ref={threadRef}
          onScroll={() => {
            const thread = threadRef.current;
            if (thread)
              followScroll.current =
                thread.scrollHeight - thread.scrollTop - thread.clientHeight <
                120;
          }}
        >
          <header className="chat-header">
            <div className="chat-header-top">
              <div className="chat-header-text">
                <p className="eyebrow">
                  <span className="presence-dot" /> Arthur’s AI profile guide
                </p>
                <h2>Get to know Arthur.</h2>
                <p className="muted">
                  Explore his work, technical experience, and life beyond the
                  code. Answers are based on his published profile.
                </p>
              </div>
              <div className="chat-header-audio">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => audioManager.toggle()}
                  aria-label={
                    audioState === "playing"
                      ? "Pause soundtrack"
                      : "Play soundtrack"
                  }
                >
                  {audioState === "playing" ? "Ⅱ" : "♫"}
                </button>
                {messages.length > 0 && (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => void reset()}
                    aria-label="Start a new conversation"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            {messages.length === 0 && (
              <div className="starter-prompts">
                {quickPrompts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="starter-prompt"
                    disabled={busy || !enabled}
                    onClick={() => sendPrompt(item.prompt)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
          </header>
          <JSONUIProvider registry={componentRegistry}>
            {messages.length === 0 && (
              <div className="bubble bubble-assistant">
                <Renderer spec={introTree} registry={componentRegistry} />
              </div>
            )}
            <div aria-label="Conversation" aria-busy={busy}>
              {messages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  streaming={busy && message.id === lastMessage?.id}
                />
              ))}
            </div>
            {busy && lastMessage?.role !== "assistant" && (
              <div className="bubble bubble-assistant">
                <ThinkingSkeleton />
              </div>
            )}
            {error && (
              <div className="chat-error" role="alert">
                <strong>The answer couldn’t be completed.</strong>
                <span>{error.message}</span>
              </div>
            )}
            {canRetry && (
              <button
                className="chip chat-retry"
                disabled={!enabled}
                onClick={retry}
              >
                Retry response ↻
              </button>
            )}
            {followUps.length > 0 && (
              <div className="followup-row followup-inline">
                <p className="followup-label">Keep exploring</p>
                <div className="chip-row">
                  {followUps.map((prompt) => (
                    <button
                      className="chip"
                      key={prompt}
                      disabled={!enabled || isLocked}
                      onClick={() => sendPrompt(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isLocked && !busy && (
              <div className="chat-session-limit">
                <p>You’ve reached 30 questions in this conversation.</p>
                <button className="chip" onClick={() => void reset()}>
                  Start a new conversation
                </button>
                <a href={`mailto:${profileData.contact.email}`}>
                  Contact Arthur ↗
                </a>
              </div>
            )}
          </JSONUIProvider>
        </div>
        <form
          className="chat-input"
          onSubmit={(event) => {
            event.preventDefault();
            sendPrompt(input);
          }}
        >
          <div className="chat-input-meta">
            <p className="chat-hint">
              {busy ? "Composing an answer…" : "Ask about Arthur"}
            </p>
            {remaining <= 5 && (
              <p className="chat-counter">{remaining} questions remaining</p>
            )}
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                sendPrompt(input);
              }
            }}
            placeholder={
              enabled
                ? "Ask about Arthur…"
                : "AI chat is not connected in this preview"
            }
            rows={1}
            maxLength={MAX_INPUT_LENGTH}
            disabled={isLocked || !enabled}
            aria-label="Ask a question about Arthur"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => void stop()}
              aria-label="Stop response"
            >
              ■
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isLocked || !enabled}
              aria-label="Send message"
            >
              ↑
            </button>
          )}
        </form>
        <p className="chat-disclosure" role="status">
          {busy
            ? "Generating an AI answer. You can stop it at any time."
            : "AI-generated answers can make mistakes. Confirm important details with Arthur."}
        </p>
      </div>
    </section>
  );
}
