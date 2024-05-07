import {
  basename,
  dirname,
  fromFileUrl,
  SEPARATOR,
  SEPARATOR_PATTERN,
  toFileUrl,
} from "@std/path";
import { exists, expandGlob } from "@std/fs";
import { ensure, is } from "@core/unknownutil";

const DEFAULT_ROOT = "~/ogh";

const decoder = new TextDecoder();

export class Ogh {
  readonly root: URL;

  constructor(root: URL) {
    this.root = root;
  }

  /**
   * Create a new Ogh instance from 'git config'
   */
  static async fromGitConfig(): Promise<Ogh> {
    const args = ["config", "--get", "ogh.root"];
    const cmd = new Deno.Command("git", {
      args,
      stdin: "null",
      stdout: "piped",
      stderr: "null",
    });
    const { success, stdout } = await cmd.output();
    if (!success) {
      return new Ogh(toFileUrl(ensureTrailingSlash(expandHome(DEFAULT_ROOT))));
    }
    return new Ogh(
      toFileUrl(ensureTrailingSlash(expandHome(decoder.decode(stdout).trim()))),
    );
  }

  /**
   * Clone a repository into the ogh root directory
   */
  async clone(repository: string, { update }: { update: boolean }) {
    const [owner, repo] = await parseRepository(repository);
    const directory = fromFileUrl(new URL(`${owner}/${repo}`, this.root));
    if (update && await exists(directory)) {
      const args = ["pull", "--ff-only"];
      const cmd = new Deno.Command("git", {
        args,
        cwd: directory,
        stdin: "null",
      });
      const proc = cmd.spawn();
      const { success } = await proc.output();
      if (!success) {
        throw new Error(`Failed to pull ${owner}/${repo} in ${directory}`);
      }
    } else {
      const args = ["repo", "clone", repository, directory];
      const cmd = new Deno.Command("gh", {
        args,
        stdin: "null",
      });
      const proc = cmd.spawn();
      const { success } = await proc.output();
      if (!success) {
        throw new Error(`Failed to clone ${owner}/${repo} into ${directory}`);
      }
    }
  }

  /**
   * Iterate repositories in the ogh root directory
   */
  async *iter(): AsyncGenerator<string> {
    for await (const entry of expandGlob(new URL("*/*/.git", this.root))) {
      const repo = basename(dirname(entry.path));
      const owner = basename(dirname(dirname(entry.path)));
      yield `${owner}/${repo}`;
    }
  }
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
    const args = ["api", "user"];
    const cmd = new Deno.Command("gh", {
      args,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stdout, stderr } = await cmd.output();
    if (!success) {
      const err = decoder.decode(stderr).trim();
      throw new Error(`Failed to get current authenticated user: ${err}`);
    }
    const output = decoder.decode(stdout).trim();
    const json = ensure(JSON.parse(output), is.ObjectOf({ login: is.String }));
    return [json.login, repository];
  }
  return [repository.slice(0, index), repository.slice(index + 1)];
}
