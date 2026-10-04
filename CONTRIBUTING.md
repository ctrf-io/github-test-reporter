# Contributing

First off, thank you for considering contributing to this project.

## Reporting Issues

Before submitting an issue, please check the issue tracker to ensure that the
issue hasn't already been reported. If you find your issue already reported, you
can subscribe to that issue to receive updates. If you have any additional
information to add, please comment on the issue. If the issue is unnasigned and
you'd like to contribute, assign the issue to yourself.

## How to Contribute

If you'd like to contribute, start by searching through the issues and pull
requests to see whether someone else has raised a similar idea or question.

If you don't see your idea listed, and you think it fits into the goals of this
project, do one of the following:

- If your contribution is minor, such as a typo fix, open a pull request.
- If your contribution is major, or you have not yet decided how to implement
  your idea, open an issue to discuss it. This allows other contributors to
  point out any potential flaws or to help you flesh out your idea.

```bash
git clone https://github.com/ctrf-io/github-test-reporter.git
cd github-test-reporter
npm install
# Add your changes
npm run all:action
```

The `all:action` script builds and tests the action and stores the built action
in the `dist` directory. GitHub Marketplace actions require build files to be
present in the repository.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Write some code
3. Make sure your code lints.
4. Issue that pull request!

### Commit Messages

Write meaningful commit messages that provide insight into the changes made.

## Finding Bugs

If you find a bug, please report it in the issue tracker with a detailed
description.

## Feature Requests

Feature requests are welcome. But take a moment to find out whether your idea
fits with the scope and aims of the project. Please provide as much detail and
context as possible.

## License

By contributing to this project, you agree that your contributions will be
licensed under MIT.

## Acknowledgments

Your contributions are sincerely appreciated. We want to make contributing to
this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

Thank you for your interest in contributing


## TypeScript toolchain

The `tsc` command uses native TypeScript 7.0.2 through the exact
`@typescript/native` npm alias. The `typescript` dependency aliases
`@typescript/typescript6@6.0.2` to retain the compiler API needed by build and
documentation tools; `tsc6` is available for compatibility checks. Keep these
aliases separate when updating dependencies. Both are development dependencies
and do not change the package’s production Node requirement.

See [Microsoft’s side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
