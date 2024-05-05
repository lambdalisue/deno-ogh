import {
  fromFileUrl,
  SEPARATOR,
  SEPARATOR_PATTERN,
  toFileUrl,
} from "@std/path";
import { ensure, is } from "@core/unknownutil";

const DEFAULT_ROOT = "~/ogh";

export interface Config {
  // Root directory for repositories
  root: URL;
}

const decoder = new TextDecoder();

/**
 * Clone a repository into the ogh root directory
 */
export async function clone(repository: string, config: Config) {
  const [owner, repo] = await parseRepository(repository);
  const directory = fromFileUrl(new URL(`${owner}/${repo}`, config.root));
  const args = ["repo", "clone", repository, directory, "--", "--progress"];
  const cmd = new Deno.Command("gh", {
    args,
    stdin: "null",
  });
  const proc = cmd.spawn();
  const { code } = await proc.output();
  if (code) {
    throw new Error(`Failed to execute 'gh ${args.join(" ")}'`);
  }
}

/**
 * List repositories in the ogh root directory
 */
export async function list(config: Config): Promise<string[]> {
  const repositories: string[] = [];
  for await (const o of Deno.readDir(config.root)) {
    if (!o.isDirectory) continue;
    for await (const r of Deno.readDir(new URL(o.name, config.root))) {
      if (!r.isDirectory) continue;
      repositories.push(
        fromFileUrl(new URL(`${o.name}/${r.name}`, config.root)),
      );
    }
  }
  return repositories;
}

/**
 * Get configuration from git config
 */
export async function getConfig(): Promise<Config> {
  let output: string;
  try {
    output = await execute("git", ["config", "--get", "ogh.root"]);
  } catch {
    output = DEFAULT_ROOT;
  }
  const root = toFileUrl(
    ensureTrailingSlash(expandHome(output.trim())),
  );
  return { root };
}

function expandHome(path: string): string {
  const home = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")!
    : Deno.env.get("HOME")!;
  const xs = path.split(SEPARATOR_PATTERN);
  if (xs.at(0) === "~") {
    return [home, ...xs.slice(1)].join(SEPARATOR);
  } else {
    return path;
  }
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith(SEPARATOR) ? path : `${path}${SEPARATOR}`;
}

async function parseRepository(
  repository: string,
): Promise<[owner: string, repo: string]> {
  const index = repository.indexOf("/");
  if (index === -1) {
    // Get current username
    const output = await execute("gh", ["api", "user"]);
    const json = ensure(JSON.parse(output), is.ObjectOf({ login: is.String }));
    return [json.login, repository];
  }
  return [repository.slice(0, index), repository.slice(index + 1)];
}

async function execute(
  command: string,
  args: string[],
): Promise<string> {
  const cmd = new Deno.Command(command, {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code) {
    const message = decoder.decode(stderr);
    throw new Error(
      `Failed to execute 'gh ${args.join(" ")}': ${message}`,
    );
  }
  return decoder.decode(stdout);
}
