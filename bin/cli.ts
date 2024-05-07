#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env
import { parseArgs } from "@std/cli";
import { fromFileUrl } from "@std/path";
import { ensure, is } from "@core/unknownutil";
import { Ogh } from "../mod.ts";

async function commandHelp(filename: string): Promise<void> {
  const resp = await fetch(new URL(filename, import.meta.url));
  const text = await resp.text();
  console.log(text);
}

function commandRoot(
  ogh: Ogh,
  { json }: { json: boolean },
): void {
  const root = fromFileUrl(ogh.root);
  if (json) {
    console.log(JSON.stringify(root));
  } else {
    console.log(root);
  }
}

async function commandList(
  ogh: Ogh,
  { json, fullPath }: { json: boolean; fullPath: boolean },
): Promise<void> {
  const repositories: string[] = [];
  for await (const path of ogh.iter()) {
    repositories.push(fullPath ? fromFileUrl(new URL(path, ogh.root)) : path);
  }
  if (json) {
    console.log(JSON.stringify(repositories));
  } else {
    console.log(repositories.join("\n"));
  }
}

async function commandClone(
  ogh: Ogh,
  repository: string,
  { update }: { update: boolean },
): Promise<void> {
  await ogh.clone(repository, { update });
}

async function main(args: string[]): Promise<void> {
  const command = args.filter((v) => !v.startsWith("-")).at(0);
  if (!command) {
    commandHelp("../assets/ogh_usage.txt");
    return;
  }

  const ogh = await Ogh.fromGitConfig();
  switch (command) {
    case "root": {
      const { help, json } = parseArgs(args, {
        boolean: ["help", "json"],
        alias: {
          "help": ["h"],
        },
      });
      if (help) {
        commandHelp("../assets/ogh_root_usage.txt");
      } else {
        commandRoot(ogh, { json });
      }
      break;
    }
    case "list": {
      const { help, json, "full-path": fullPath } = parseArgs(args, {
        boolean: ["help", "json", "full-path"],
        alias: {
          "help": "h",
          "full-path": ["p"],
        },
      });
      if (help) {
        commandHelp("../assets/ogh_list_usage.txt");
      } else {
        commandList(ogh, { json, fullPath });
      }
      break;
    }
    case "clone": {
      const { help, update, _ } = parseArgs(args, {
        boolean: ["help", "update"],
        alias: {
          "help": ["h"],
          "update": ["u"],
        },
      });
      if (help) {
        commandHelp("../assets/ogh_clone_usage.txt");
      } else {
        const repository = ensure(_.at(1), is.String, {
          message: "The clone command requires `[<owner>/]<repo>`",
        });
        commandClone(ogh, repository, { update });
      }
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    Deno.exit(1);
  }
}
