#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env
import { parse } from "@std/flags";
import { fromFileUrl } from "@std/path";
import { ensure, is } from "@core/unknownutil";
import * as ogh from "./ogh.ts";

async function main(args: string[]): Promise<void> {
  const opts = parse(args, {
    boolean: [
      "json",
      "help",
    ],
    alias: {
      "help": ["h"],
    },
  });
  if (opts.help) {
    const resp = await fetch(new URL("./usage.txt", import.meta.url));
    const text = await resp.text();
    console.log(text);
    return;
  }

  const config = await ogh.getConfig();
  const command = ensure(opts._.at(0), is.String, {
    message: "<command> must be a string",
  });
  switch (command) {
    case "root": {
      const root = fromFileUrl(config.root);
      if (opts.json) {
        console.log(JSON.stringify(root));
      } else {
        console.log(root);
      }
      break;
    }
    case "list": {
      const repositories = await ogh.list(config);
      if (opts.json) {
        console.log(JSON.stringify(repositories));
      } else {
        console.log(repositories.join("\n"));
      }
      break;
    }
    case "clone": {
      const repository = ensure(opts._.at(1), is.String, {
        message: "[<owner>/]<repo> must be a string",
      });
      await ogh.clone(repository, config);
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
