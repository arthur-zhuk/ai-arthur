"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MetaballsScene = dynamic(() => import("@/components/metaballs-scene"), {
  ssr: false,
  loading: () => <div className="metaballs-placeholder" />,
});

export default function MetaballsWrapper() {
  const [canRenderWebGL, setCanRenderWebGL] = useState(false);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    setCanRenderWebGL(!!context);
  }, []);

  if (!canRenderWebGL) {
    return <div className="metaballs-placeholder" />;
  }

  return <MetaballsScene />;
}
