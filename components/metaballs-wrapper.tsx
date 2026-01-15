"use client";

import dynamic from "next/dynamic";

const MetaballsScene = dynamic(() => import("@/components/metaballs-scene"), {
  ssr: false,
  loading: () => <div className="metaballs-placeholder" />,
});

export default function MetaballsWrapper() {
  return <MetaballsScene />;
}
