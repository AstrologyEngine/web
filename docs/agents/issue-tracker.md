# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `AstrologyEngine/web`.
Use the `gh` CLI for all operations.

Run every `gh` command outside the sandbox, including read-only queries,
using `sandbox_permissions: "require_escalated"`.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
  with appropriate label and state filters.
- Comment: `gh issue comment <number> --body-file <file>`
- Apply labels: `gh issue edit <number> --add-label "..."`
- Remove labels: `gh issue edit <number> --remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Use a temporary file for multiline bodies. Run inside the assigned
worktree so gh infers the repository, or pass `--repo AstrologyEngine/web`.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares one number space across issues and PRs. When the type is
unknown, resolve with `gh pr view <number>` and fall back to
`gh issue view <number>`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, holding Notes,
  Decisions-so-far, and Fog.
- Child ticket: link to the map using GitHub sub-issues. If unavailable,
  use a task list in the map and `Part of #<map>` in the child.
  Label children `wayfinder:<type>`: research, prototype, grilling, or task.
- Blocking: use native GitHub issue dependencies. Add a dependency with
  `gh api --method POST repos/AstrologyEngine/web/issues/<child>/dependencies/blocked_by
  -F issue_id=<blocker-db-id>`.
  Obtain the numeric database ID from
  `gh api repos/AstrologyEngine/web/issues/<blocker> --jq .id`.
  If dependencies are unavailable, use a `Blocked by: #<number>` line.
- Frontier: choose the first open child in map order that has no open
  blockers and no assignee. Native open blocker counts are reported in
  `issue_dependencies_summary.blocked_by`.
- Claim: `gh issue edit <number> --add-assignee @me`.
- Resolve: comment with the result, close the child, then append a
  concise result and link to the map's Decisions-so-far.
