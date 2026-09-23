"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { profileData } from "@/lib/profile-data";
import OrbitArt from "@/components/orbit-art";
const ChatPanel = dynamic(() => import("@/components/chat-panel"), {
  loading: () => <p className="chat-loading">Opening the conversation…</p>,
});

export default function PersonalPage({ chatReady }: { chatReady: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [chatOpened, setChatOpened] = useState(false);
  const [allRoles, setAllRoles] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const openChat = () => {
    setChatOpened(true);
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
  };
  const closeChat = () => {
    dialog.current?.close();
    document.body.style.overflow = "";
  };
  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );
  const toggleAudio = async () => {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else {
      try {
        await audio.current.play();
        setAudioError(false);
      } catch {
        setAudioError(true);
      }
    }
  };
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
          <a href="#about">Off the clock</a>
          <a href={`mailto:${profileData.contact.email}`}>
            Let’s talk <span>↗</span>
          </a>
        </nav>
        <button className="header-chat" onClick={openChat}>
          <span className="sparkle">✷</span> Ask AI Arthur <span>↗</span>
        </button>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-topline">
            <span className="overline">
              <i className="status-dot" /> ENGINEER. BUILDER. ALWAYS CURIOUS.
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
                I build software that makes complexity feel simple. From the
                interfaces people touch to the systems they depend on.
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
            </div>
            <OrbitArt />
          </div>
          <div className="hero-footer">
            <p>
              <span className="status-dot" /> Currently building at{" "}
              <strong>Anduril</strong>
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
            Explore my experience, how I build,
            <br />
            or what I’m into outside of work.
          </p>
          <button onClick={openChat}>
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
            <div>
              <span className="impact-number">3×</span>
              <p>Faster release cadence</p>
              <small>Travel Syndicate Technology</small>
            </div>
            <div>
              <span className="impact-number">
                55<span>%</span>
              </span>
              <p>Fewer slow queries</p>
              <small>Insight Rx · MongoDB modernization</small>
            </div>
            <div>
              <span className="impact-number">
                10k<span>+</span>
              </span>
              <p>Users of products I helped build</p>
              <small>Procore · Quality & Safety</small>
            </div>
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
          className="about-section section-wrap"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="about-copy">
            <span className="overline">02 / THE PERSON</span>
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
                <span>
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
              <audio
                ref={audio}
                src="/suno-song.mp3"
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            </div>
          </div>
          <div className="interest-board">
            <div className="interest-card riding">
              <span className="interest-number">01</span>
              <span className="road-mark" aria-hidden="true">
                ↗
              </span>
              <div>
                <h3>The long way home.</h3>
                <p>Road biking & getting outside</p>
              </div>
            </div>
            <div className="interest-card">
              <span className="interest-number">02</span>
              <span className="interest-icon" aria-hidden="true">
                ⌘
              </span>
              <div>
                <h3>One more experiment.</h3>
                <p>AI, blockchain & side projects</p>
              </div>
            </div>
            <div className="interest-card">
              <span className="interest-number">03</span>
              <span className="interest-icon" aria-hidden="true">
                ↔
              </span>
              <div>
                <h3>A competitive streak.</h3>
                <p>Hockey, basketball & gaming</p>
              </div>
            </div>
          </div>
        </section>
        <section className="contact-section section-wrap">
          <span className="overline">03 / WHAT’S NEXT?</span>
          <div className="contact-heading">
            <h2>
              Good things start
              <br />
              with <span>a conversation.</span>
            </h2>
            <a
              href={`mailto:${profileData.contact.email}`}
              className="contact-arrow"
              aria-label="Email Arthur"
            >
              ↗
            </a>
          </div>
          <a
            className="email-link"
            href={`mailto:${profileData.contact.email}`}
          >
            {profileData.contact.email}
          </a>
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
        onCancel={closeChat}
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
            AI chat is awaiting connection in this preview. You can explore
            Arthur’s profile below or{" "}
            <a href={`mailto:${profileData.contact.email}`}>
              get in touch directly
            </a>
            .
          </p>
        )}
        <div className="dialog-chat">
          {chatOpened && <ChatPanel enabled={chatReady} />}
        </div>
      </dialog>
    </div>
  );
}
