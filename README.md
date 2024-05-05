# 🪨 ogh

[![jsr](https://img.shields.io/jsr/v/%40lambdalisue/ogh?logo=javascript&logoColor=white)](https://jsr.io/@lambdalisue/ogh)
[![Test](https://github.com/lambdalisue/ogh/workflows/Test/badge.svg)](https://github.com/lambdalisue/ogh/actions?query=workflow%3ATest)

Organize GitHub repositories. Similar to [`ghq`] but use [`gh`] command
internally and options are limited.

[`ghq`]: https://github.com/x-motemen/ghq
[`gh`]: https://github.com/cli/cli

## Usage

```console
$ ogh root
#=> Print the root directory of the ogh root

$ ogh list
#=> Print the list of the repositories in the ogh root

$ ogh clone dotfiles
#=> Clone the "dotfiles" repository of the authenticated user into the ogh root

$ ogh clone denoland/deno_std
#=> Clone the "denoland/deno_std" repository into the ogh root
```

## Install

Use `deno install` command to install the command.

```console
$ deno install --allow-net --allow-run --allow-read --allow-env -f -g jsr:@lambdalisue/ogh
```

Then use it as `ogh` like

```console
$ ogh --help
```

## License

The code follows MIT license written in [LICENSE](./LICENSE). Contributors need
to agree that any modifications sent in this repository follow the license.
