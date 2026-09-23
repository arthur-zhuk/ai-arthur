// Package Next's pre-rendered homepage for an owner-only design preview.
// The standard `build`/`start` scripts retain the existing server-side AI route.
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "out");
const html = await readFile(
  resolve(root, ".next/server/app/index.html"),
  "utf8",
);
if (!html.includes("Arthur") || !html.includes("<html")) {
  throw new Error(
    "Build the homepage successfully before packaging the preview.",
  );
}
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "_next"), { recursive: true });
await cp(resolve(root, "public"), output, { recursive: true });
await cp(resolve(root, ".next/static"), resolve(output, "_next/static"), {
  recursive: true,
});
await cp(
  resolve(root, ".next/server/app/index.html"),
  resolve(output, "index.html"),
);
await cp(
  resolve(root, ".next/server/app/_not-found.html"),
  resolve(output, "404.html"),
);
await cp(
  resolve(root, ".next/server/app/icon.svg.body"),
  resolve(output, "icon.svg"),
);
await cp(resolve(root, ".next/server/app/icon.body"), resolve(output, "icon"));
console.log(
  "Packaged the static design preview. AI chat remains available in the full Next.js app when configured.",
);
