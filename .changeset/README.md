# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

To release a new version:

1. Run `pnpm changeset` and follow the prompts to describe your change.
2. Commit the generated changeset file with your PR.
3. When merged to `main`, the GitHub Action opens a **Version Packages** PR that bumps versions and updates changelogs.
4. Merge that PR — the Action publishes to npm automatically.
