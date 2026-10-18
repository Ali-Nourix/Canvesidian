# Automated build and GitHub Release

`.github/workflows/release.yml` runs on pushes to `main` and can also be started from Actions → Build and publish plugin → Run workflow on the default branch. It does not publish pull requests or non-default branches. If the default branch is renamed, update `on.push.branches` too.

1. Update `manifest.json` → `version` (for example `0.6.6`). This is the only source of the release version. Keep package versions aligned for clarity, but they do not determine the tag.
2. Push the plugin changes and workflow to `main`.
3. The action installs dependencies, typechecks, runs unit tests, builds `main.js`, installs Chromium and runs browser regression tests. Failure prevents tagging and publication.
4. After successful checks, the publish job creates an annotated tag at the tested commit, opens a draft release, uploads every asset, then publishes the release.

The tag is exactly `manifest.version` (for example `0.6.6`, **not** `v0.6.6`) for Obsidian release-asset compatibility. Prerelease versions such as `0.6.6-beta.1` become GitHub prereleases. Build metadata (`+...`) is not accepted.

## Release assets

- `main.js`, `manifest.json`, `styles.css`: separate files for plugin installation/update tooling.
- `Canvsidian-<version>.zip`: only those three files in the folder specified by `manifest.id` (`canvesidian`). No user data or dependencies.
- `SHA256SUMS.txt`: checksums of the four files above.
- GitHub also supplies the standard source archives for the tagged commit.

A published version is never overwritten or retagged. Pushes without a version bump run checks but skip publication when the release already exists. A failed draft/upload can be retried on its original commit; an existing tag pointing elsewhere fails with a message to bump the manifest version. Serialized release runs avoid tag races.

## Permissions and setup

The build job has read-only repository access. Only the publish job requests `contents: write`, using the repository's built-in `GITHUB_TOKEN`; no PAT secret is needed. Repository/organization policies must permit this token to create tags and releases. Rulesets protecting version tags may require maintainer approval or a separately approved publishing setup; the workflow does not bypass them.

After adding the workflow, a first successful push to `main` publishes the current manifest version if that release does not already exist. Publication is not confirmed until the GitHub Actions run actually succeeds. Tests use a mocked Obsidian API, not the running Obsidian application.

## Browser grip timeout / mixed source versions

`qa/advanced-test.mjs` now measures the dedicated right action gutter after a CodeMirror layout pass and uses a visibility condition rather than an 80 ms sleep. It still uses real pointer movement and asserts the rendered grip position. A failed advanced test records a screenshot and geometry/error JSON; both CI workflows upload browser diagnostics on failure. No test is disabled or marked continue-on-error.

Install the complete matching source tree, not only the workflow or a single test from a newer release. In particular, the old 0.5 advanced test hovers RTL glyphs and expects the old left grip and toolbar labels; the 0.6.5 source uses a dedicated right gutter and contextual action menus. Mixing these versions breaks UI tests. GitHub Actions builds the repository's source, not an installer ZIP attached elsewhere. After applying fixes, push a new commit: re-running the old failed run still tests the old commit.
