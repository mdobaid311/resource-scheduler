# Security policy

## Reporting a vulnerability

Please report security problems **privately**, not as a public issue: open the repository's **Security** tab and choose **Report a vulnerability** (GitHub private vulnerability reporting). Include what you found, how to reproduce it, and the version.

I aim to acknowledge a report within a week and to publish a fix and an advisory once it is released. This is a volunteer-run project, so those are goals, not guarantees.

## Supported versions

Fixes go into the latest release. Please update before reporting if you are on an older one.

## Scope

Resource Scheduler is a client-side React component. Reports about how it handles the data you pass in are in scope, for example event titles or descriptions rendered unsafely, or the published package containing something it should not. Problems in your own `render*` functions, or in the app that uses the component, are not.

Releases are published to npm from GitHub Actions with provenance, so you can verify a package was built from this repository.
