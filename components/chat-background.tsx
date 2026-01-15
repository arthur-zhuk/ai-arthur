"use client";

import { memo } from "react";
import MetaballsWrapper from "@/components/metaballs-wrapper";

function ChatBackground() {
  return (
    <div className="chat-bg" aria-hidden="true">
      <MetaballsWrapper />
      <div className="chat-bg-shade" />
    </div>
  );
}

export default memo(ChatBackground);
