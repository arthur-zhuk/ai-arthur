"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bike, Cpu, Trophy } from "lucide-react";
import { profileData } from "@/lib/profile-data";
import {
  heroQuestions,
  howItWorks,
  interestCards,
  stack,
  type InterestCard,
} from "@/lib/site-content";
import { audioManager } from "@/lib/audio-manager";
import OrbitArt from "@/components/orbit-art";
import type { PendingPrompt } from "@/components/chat-panel";

const ChatPanel = dynamic(() => import("@/components/chat-panel"), {
  loading: () => <p className="chat-loading">Opening the conversation…</p>,
});

const interestIcons: Record<InterestCard["icon"], typeof Bike> = {
  bike: Bike,
  cpu: Cpu,
  trophy: Trophy,
};
const current = profileData.experience[0];
const { booking, email } = profileData.contact;

export default function PersonalPage({ chatReady }: { chatReady: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [chatOpened, setChatOpened] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [question, setQuestion] = useState("");
  const [allRoles, setAllRoles] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const openChat = (prompt?: string) => {
    setChatOpened(true);
    if (prompt) setPendingPrompt({ id: Date.now(), text: prompt });
    if (!dialog.current?.open) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    }
  };
  const closeChat = () => dialog.current?.close();
  const askFromHero = (event: FormEvent) => {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setQuestion("");
    openChat(value);
  };
  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );
  useEffect(
    () => audioManager.subscribe((state) => setPlaying(state === "playing")),
    [],
  );
  const toggleAudio = async () => setAudioError(!(await audioManager.toggle()));

  return (
    <div className="portfolio">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="Arthur Zhuk home">
          az<span>✷</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#work">Experience</a>
          <a href="#build">How this works</a>
          <a href="#about">Off the clock</a>
          <a href={booking ?? `mailto:${email}`}>
            {booking ? "Book a call" : "Let’s talk"} <span>↗</span>
          </a>
        </nav>
        <button className="header-chat" onClick={() => openChat()}>
          <span className="sparkle">✷</span> Ask AI Arthur <span>↗</span>
        </button>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-topline">
            <span className="overline">
              <i className="status-dot" /> {profileData.title.toUpperCase()} ·{" "}
              {current.company.toUpperCase()}
            </span>
            <span className="edition">PERSONAL SPACE / 2026</span>
          </div>
          <div className="hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title">
                Arthur
                <br />
                <span>
                  Zhuk<span className="name-period">.</span>
                </span>
              </h1>
              <p className="hero-statement">
                Complex systems.
                <br />
                <span>Human experiences.</span>
              </p>
              <p className="hero-description">
                I build software that holds up under real pressure. Lately
                that has meant upgrading MongoDB across four major versions,
                merging two frontends into one architecture, and taking a team
                from weekly releases to three a week.
              </p>
              <div className="hero-actions">
                <a className="primary-link" href="#work">
                  Explore my work <span>↓</span>
                </a>
                <a
                  className="text-link"
                  href="/arthur-zhuk-resume.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  View résumé ↗
                </a>
              </div>
              <form className="hero-ask" onSubmit={askFromHero}>
                <label className="sr-only" htmlFor="hero-question">
                  Ask AI Arthur a question
                </label>
                <span className="sparkle" aria-hidden="true">
                  ✷
                </span>
                <input
                  id="hero-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask AI Arthur anything…"
                  maxLength={500}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  aria-label="Ask"
                  disabled={!question.trim()}
                >
                  <ArrowUp aria-hidden="true" size={17} strokeWidth={2} />
                </button>
              </form>
              <div className="hero-suggestions" aria-label="Suggested questions">
                {heroQuestions.map((text) => (
                  <button key={text} type="button" onClick={() => openChat(text)}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <OrbitArt />
          </div>
          <div className="hero-footer">
            <p>
              <span className="status-dot" /> Currently building at{" "}
              <strong>{current.company}</strong>
            </p>
            <span>BACKEND DEPTH. FRONTEND INSTINCT.</span>
            <a href="#work" aria-label="Scroll to experience">
              SCROLL TO EXPLORE <span>↓</span>
            </a>
          </div>
        </section>
        <section className="conversation-strip" aria-label="Meet AI Arthur">
          <div className="conversation-symbol">✷</div>
          <div>
            <p>A résumé tells one part of the story.</p>
            <h2>Ask a better question.</h2>
          </div>
          <p className="conversation-description">
            Explore my experience and how I build, or
            <br />
            paste a job description and get an honest fit.
          </p>
          <button onClick={() => openChat()}>
            Meet AI Arthur <span>↗</span>
          </button>
        </section>
        <section
          className="work-section section-wrap"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="section-heading">
            <span className="overline">01 / THE WORK</span>
            <h2 id="work-title">
              Built for the
              <br />
              <span>real world.</span>
            </h2>
            <p>
              Over a decade across defense, healthcare, SaaS, and DeFi.
              Different domains. The same care for how things work.
            </p>
          </div>
          <div className="impact-grid">
            {profileData.impact.map((item) => (
              <div key={item.label}>
                <span className="impact-number">
                  {item.figure}
                  <span>{item.unit}</span>
                </span>
                <p>{item.label}</p>
                <small>{item.source}</small>
              </div>
            ))}
          </div>
          <div className="experience-title">
            <span className="overline">CASE STUDIES</span>
            <span>THE PROBLEM. THE WORK. THE RESULT.</span>
          </div>
          <div className="case-list">
            {profileData.caseStudies.map((study, index) => (
              <article key={study.id} className="case">
                <div className="case-intro">
                  <span className="role-index">0{index + 1}</span>
                  <span className="case-company">{study.company}</span>
                  <h3>{study.title}</h3>
                </div>
                <dl className="case-story">
                  <div>
                    <dt>The problem</dt>
                    <dd>{study.challenge}</dd>
                  </div>
                  <div>
                    <dt>What I did</dt>
                    <dd>{study.approach}</dd>
                  </div>
                </dl>
                <ul className="case-outcomes" aria-label="Results">
                  {study.outcomes.map((outcome) => (
                    <li key={outcome.label}>
                      <strong>{outcome.figure}</strong>
                      <span>{outcome.label}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="experience-title">
            <span className="overline">SELECTED EXPERIENCE</span>
            <span>2010 — PRESENT</span>
          </div>
          <div className="experience-list">
            {profileData.experience
              .slice(0, allRoles ? undefined : 3)
              .map((role, index) => (
                <details key={role.company} className="experience-row">
                  <summary>
                    <span className="role-index">0{index + 1}</span>
                    <div className="role-company">
                      {role.company}
                      {index === 0 && (
                        <span className="current-badge">CURRENT</span>
                      )}
                      <small>{role.title}</small>
                    </div>
                    <span className="role-dates">{role.dateRange}</span>
                    <span className="expand-symbol" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="role-details">
                    <p>{role.description}</p>
                    <ul>
                      {role.achievements.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                    <div className="skill-tags">
                      {role.skills.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
          </div>
          <button
            className="show-roles"
            onClick={() => setAllRoles(!allRoles)}
            aria-expanded={allRoles}
          >
            {allRoles ? "Show selected experience" : "Explore the full journey"}
            <span>{allRoles ? "−" : "+"}</span>
          </button>
        </section>
        <section
          className="build-section section-wrap"
          id="build"
          aria-labelledby="build-title"
        >
          <div className="section-heading">
            <span className="overline">02 / THE BUILD</span>
            <h2 id="build-title">
              This site is
              <br />
              <span>a project too.</span>
            </h2>
            <p>
              Ask AI Arthur something hard. Here is what keeps its answers
              honest.
            </p>
          </div>
          <ol className="build-grid">
            {howItWorks.map((item, index) => (
              <li key={item.title}>
                <span className="role-index">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
          <div className="stack-row">
            <ul aria-label="Technology used to build this site">
              {stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              href={profileData.contact.github}
              target="_blank"
              rel="noreferrer"
            >
              More on GitHub ↗
            </a>
          </div>
        </section>
        <section
          className="about-section section-wrap"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="about-copy">
            <span className="overline">03 / THE PERSON</span>
            <h2 id="about-title">
              There’s more
              <br />
              to the <span>story.</span>
            </h2>
            <p>
              Curiosity doesn’t switch off when the laptop closes. You’ll find
              me exploring on two wheels, on the ice, trying a new recipe, or
              building something just to see where it goes.
            </p>
            <div className="soundtrack">
              <button
                onClick={toggleAudio}
                aria-label={
                  playing
                    ? "Pause Arthur of Silver Lake"
                    : "Play Arthur of Silver Lake"
                }
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <div>
                <span role="status">
                  {audioError
                    ? "Playback unavailable. Try again."
                    : playing
                      ? "NOW PLAYING"
                      : "A LITTLE SOMETHING DIFFERENT"}
                </span>
                <p>
                  Arthur of Silver Lake <small>Original AI soundtrack</small>
                </p>
              </div>
              <div
                className={`sound-bars ${playing ? "is-playing" : ""}`}
                aria-hidden="true"
              >
                {[9, 22, 14, 30, 19, 26, 12, 23, 16].map((h, i) => (
                  <i
                    key={i}
                    style={{ height: h, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="interest-board">
            {interestCards.map((card) => {
              const Icon = interestIcons[card.icon];
              return (
                <div
                  key={card.id}
                  className={`interest-card ${card.id === "riding" ? "riding" : ""} ${card.image ? "has-photo" : ""}`}
                >
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="interest-photo"
                      src={card.image.src}
                      alt={card.image.alt}
                      loading="lazy"
                    />
                  ) : null}
                  <span className="interest-number">{card.number}</span>
                  <Icon
                    className="interest-icon"
                    aria-hidden="true"
                    strokeWidth={1.25}
                  />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.caption}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="contact-section section-wrap">
          <span className="overline">04 / WHAT’S NEXT?</span>
          <div className="contact-heading">
            <h2>
              Good things start
              <br />
              with <span>a conversation.</span>
            </h2>
            <a
              href={booking ?? `mailto:${email}`}
              className="contact-arrow"
              aria-label={booking ? "Book a call with Arthur" : "Email Arthur"}
            >
              ↗
            </a>
          </div>
          <div className="contact-links">
            <a className="email-link" href={`mailto:${email}`}>
              {email}
            </a>
            {booking ? (
              <a href={booking} target="_blank" rel="noreferrer">
                Book a call ↗
              </a>
            ) : null}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <a className="wordmark" href="#">
          az<span>✷</span>
        </a>
        <p>Built with intention. Always evolving.</p>
        <div>
          <a href={profileData.contact.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a
            href={profileData.contact.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
          <a href="/arthur-zhuk-resume.pdf" target="_blank" rel="noreferrer">
            Résumé ↗
          </a>
        </div>
        <span>© 2026 ARTHUR ZHUK</span>
      </footer>
      <dialog
        ref={dialog}
        className="chat-dialog"
        onClose={() => {
          document.body.style.overflow = "";
        }}
        onClick={(event) => {
          if (event.target === dialog.current) closeChat();
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-top">
          <span id="dialog-title">✷ &nbsp; MEET AI ARTHUR</span>
          <button onClick={closeChat} aria-label="Close conversation" autoFocus>
            Close ×
          </button>
        </div>
        {!chatReady && (
          <p className="chat-setup-note">
            AI chat is unavailable in this preview. You can explore Arthur’s
            profile on the page or{" "}
            <a href={`mailto:${email}`}>get in touch directly</a>.
          </p>
        )}
        <div className="dialog-chat">
          {chatOpened && (
            <ChatPanel enabled={chatReady} pendingPrompt={pendingPrompt} />
          )}
        </div>
      </dialog>
    </div>
  );
}
