# Issue tracker

Issues live in GitHub Issues for `RamsesKools/opaprikkie-simulator`; use the `gh` CLI.

- Read: `gh issue view <n> --json number,title,body,labels,comments`.
- Create: `gh issue create --title "..." --body-file <file>`.
- Sub-issues: `gh api -X POST repos/RamsesKools/opaprikkie-simulator/issues/<parent>/sub_issues -F sub_issue_id=<child database id>`.
- Blockers: `gh api -X POST repos/RamsesKools/opaprikkie-simulator/issues/<n>/dependencies/blocked_by -F issue_id=<blocker database id>`.
  Get a database id with `gh api repos/RamsesKools/opaprikkie-simulator/issues/<n> --jq .id`.
- Claim: `gh issue edit <n> --add-assignee @me`.
- A PR closes its issue with `Closes #<n>`.

## Maps and plans

- The browser MVP planning map is issue #14, closed; its tickets are sub-issues labelled `wayfinder:<type>`.
  New work goes in standalone issues or a new map.
  `.plan/` is a read-only cache of the active map, refreshed with `uv run task wayfinder_pull`.
- Implementation parts were sub-issues of #30, one branch and PR each, with native blockers; #30 is closed.
- Implementation issues include an `## Expected proof` section saying what evidence the PR must show, such as commands and their output or screenshots.
  The PR shows it in its `## Proof` section.
