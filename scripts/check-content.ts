import { appendFile } from "node:fs/promises";
import { fetchPublication } from "./public-content";
import { siteUrl } from "../src/lib/seo";

const { hash } = await fetchPublication();
const response = await fetch(`${siteUrl}/content-version.json`, {
  cache: "no-store",
  signal: AbortSignal.timeout(30000),
});
let previous: string | undefined;
if (response.ok && response.headers.get("content-type")?.includes("json"))
  previous = (await response.json()).hash;
else if (response.status !== 404)
  throw new Error(`Cannot compare deployed content (${response.status})`);
const changed = previous !== hash;
console.log(
  changed
    ? "Published content changed; rebuilding."
    : "Published content is unchanged.",
);
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
