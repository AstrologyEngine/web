# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `AstrologyEngine/web-issues`.
Use the `gh` CLI for all operations.

Run every `gh` command outside the sandbox, including read-only queries,
using `sandbox_permissions: "require_escalated"`.

## Conventions

- Create: `gh issue --repo AstrologyEngine/web-issues create --title "..." --body-file <file>`
- Read: `gh issue --repo AstrologyEngine/web-issues view <number> --comments`
- List: `gh issue --repo AstrologyEngine/web-issues list --state open --json number,title,body,labels,comments`
  with appropriate label and state filters.
- Comment: `gh issue --repo AstrologyEngine/web-issues comment <number> --body-file <file>`
- Apply labels: `gh issue --repo AstrologyEngine/web-issues edit <number> --add-label "..."`
- Remove labels: `gh issue --repo AstrologyEngine/web-issues edit <number> --remove-label "..."`
- Close: `gh issue --repo AstrologyEngine/web-issues close <number> --comment "..."`

Use a temporary file for multiline bodies. Always pass `--repo AstrologyEngine/web-issues` for issue operations; the code
worktree points to `AstrologyEngine/web`, which only hosts code and pull requests.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Pull requests live in `AstrologyEngine/web`; issues live in the private tracker.
Use explicit repository names and full URLs when linking across repositories.
Old issue URLs redirect to their transferred issues; issue numbers changed during
the migration. For new references, use the current private tracker URL.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, holding Notes,
  Decisions-so-far, and Fog.
- Child ticket: link to the map using GitHub sub-issues. If unavailable,
  use a task list in the map and `Part of #<map>` in the child.
  Label children `wayfinder:<type>`: research, prototype, grilling, or task.
- Blocking: use native GitHub issue dependencies. Add a dependency with
  `gh api --method POST repos/AstrologyEngine/web-issues/issues/<child>/dependencies/blocked_by
  -F issue_id=<blocker-db-id>`.
  Obtain the numeric database ID from
  `gh api repos/AstrologyEngine/web-issues/issues/<blocker> --jq .id`.
  If dependencies are unavailable, use a `Blocked by: #<number>` line.
- Frontier: choose the first open child in map order that has no open
  blockers and no assignee. Native open blocker counts are reported in
  `issue_dependencies_summary.blocked_by`.
- Claim: `gh issue --repo AstrologyEngine/web-issues edit <number> --add-assignee @me`.
- Resolve: comment with the result, close the child, then append a
  concise result and link to the map's Decisions-so-far.
