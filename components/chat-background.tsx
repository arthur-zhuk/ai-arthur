"use client";

import { memo, Component, type ReactNode } from "react";
import MetaballsWrapper from "@/components/metaballs-wrapper";

class VisualizerErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.warn("[Visualizer] WebGL/Three.js failed:", error.message); }
  render() { return this.state.hasError ? null : this.props.children; }
}

function ChatBackground() {
  return (
    <div className="chat-bg" aria-hidden="true">
      <VisualizerErrorBoundary>
        <MetaballsWrapper />
      </VisualizerErrorBoundary>
      <div className="chat-bg-shade" />
    </div>
  );
}

export default memo(ChatBackground);
