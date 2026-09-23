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
import { ArrowUp, ArrowUpRight, Music2, Pause, RotateCcw, Square } from "lucide-react";
import ChatBackground from "@/components/chat-background";
import { componentRegistry } from "@/components/json-components";
import { audioManager, type AudioState } from "@/lib/audio-manager";
import {
  answerDataSchema,
  answerTree,
  getAnswer,
  getMessageText,
  MAX_INPUT_LENGTH,
  MAX_QUESTIONS,
  type ProfileMessage,
} from "@/lib/chat/schema";
import { profileData } from "@/lib/profile-data";

const transport = new DefaultChatTransport<ProfileMessage>({ api: "/api/generate" });
const dataPartSchemas = { answer: answerDataSchema };
const quickPrompts = [
  {
    label: "Current work",
    detail: "Anduril and recent roles",
    prompt: "Tell me about Arthur's current work at Anduril and his most recent roles.",
  },
  {
    label: "Engineering depth",
    detail: "Backend, systems, and frontend",
    prompt: "What are Arthur's strongest backend, systems, and frontend skills?",
  },
  {
    label: "Career highlights",
    detail: "Impact across 10+ years",
    prompt: "Walk me through the biggest highlights and impact from Arthur's career.",
  },
  {
    label: "Beyond work",
    detail: "Interests, tools, and contact",
    prompt: "What should I know about Arthur beyond work, including his interests and how to get in touch?",
  },
];

class RenderErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <p className="jr-text jr-text-muted">This answer could not be displayed.</p>;
    }
    return this.props.children;
  }
}

function ThinkingSkeleton() {
  return (
    <div className="thinking-skeleton" role="status" aria-label="Preparing an answer">
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
  const tree = useMemo(() => (data ? answerTree(data.answer) : undefined), [data]);

  if (message.role === "user") {
    return (
      <div className="chat-message chat-message-user">
        <div className="bubble bubble-user">{getMessageText(message)}</div>
      </div>
    );
  }

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
  const questionCount = messages.filter((message) => message.role === "user").length;
  const isLocked = questionCount >= MAX_QUESTIONS;
  const remaining = MAX_QUESTIONS - questionCount;
  const lastMessage = messages.at(-1);
  const lastAnswer = lastMessage?.role === "assistant" ? getAnswer(lastMessage) : undefined;
  const followUps = !busy && !error && lastAnswer?.complete
    ? lastAnswer.answer.followUps.slice(0, 2)
    : [];
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
    const thread = threadRef.current;
    if (!thread) return;
    if (messages.length === 0) {
      thread.scrollTo({ top: 0 });
      return;
    }
    if (!followScroll.current) return;
    const frame = requestAnimationFrame(() => {
      thread.scrollTo({ top: thread.scrollHeight, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, busy, error, followUps.length]);
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
      ) return;
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
            <button className="icon-button" type="button" onClick={() => void reset()} aria-label="Start a new conversation" title="Start over">
              <RotateCcw size={17} strokeWidth={1.75} />
            </button>
          ) : null}
        </header>
        <div
          className="chat-thread"
          ref={threadRef}
          onScroll={() => {
            const thread = threadRef.current;
            if (thread) {
              followScroll.current = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
            }
          }}
        >
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <p>Where should we start?</p>
              <div className="starter-prompts">
                {quickPrompts.map((item, index) => (
                  <button
                    key={item.label}
                    className="starter-prompt"
                    type="button"
                    disabled={busy || !enabled}
                    onClick={() => sendPrompt(item.prompt)}
                  >
                    <span className="starter-index">{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                    <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <JSONUIProvider registry={componentRegistry}>
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                streaming={busy && message.id === lastMessage?.id}
              />
            ))}
            {busy && lastMessage?.role !== "assistant" ? (
              <div className="chat-message chat-message-assistant">
                <div className="bubble bubble-assistant"><ThinkingSkeleton /></div>
              </div>
            ) : null}
            {error ? (
              <div className="chat-error" role="alert">
                <strong>The answer could not be completed.</strong>
                <span>{error.message}</span>
              </div>
            ) : null}
            {canRetry ? (
              <button className="chip chat-retry" type="button" disabled={!enabled} onClick={retry}>
                Retry response
              </button>
            ) : null}
            {followUps.length > 0 ? (
              <div className="followup-row followup-inline">
                <p className="followup-label">Try asking</p>
                <div className="chip-row">
                  {followUps.map((prompt) => (
                    <button className="chip" key={prompt} type="button" disabled={!enabled || isLocked} onClick={() => sendPrompt(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {isLocked && !busy ? (
              <div className="followup-row followup-inline">
                <p className="followup-label">You have reached the question limit. Please reach out directly.</p>
              </div>
            ) : null}
          </JSONUIProvider>
        </div>

        <form
          className="chat-input"
          onSubmit={(event) => {
            event.preventDefault();
            sendPrompt(input);
          }}
        >
          <label htmlFor="chat-question" className="sr-only">Ask Arthur a question</label>
          <textarea
            id="chat-question"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                sendPrompt(input);
              }
            }}
            placeholder={enabled ? "Ask Arthur anything..." : "Chat is unavailable in this preview"}
            rows={1}
            maxLength={MAX_INPUT_LENGTH}
            disabled={isLocked || !enabled}
          />
          {busy ? (
            <button type="button" onClick={() => void stop()} aria-label="Stop response" title="Stop response">
              <Square aria-hidden="true" size={15} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim() || isLocked || !enabled} aria-label="Send message" title="Send message">
              <ArrowUp aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          )}
          {remaining <= 5 ? <p className="chat-counter">{remaining} questions remaining</p> : null}
        </form>
      </div>
    </section>
  );
}
