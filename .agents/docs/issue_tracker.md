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

- The browser MVP planning map is issue #14, its tickets are sub-issues labelled `wayfinder:<type>`.
  `.plan/` is a read-only cache of it, refreshed with `uv run task wayfinder_pull`.
- Implementation parts are sub-issues of #30, one branch and PR each, with native blockers.
