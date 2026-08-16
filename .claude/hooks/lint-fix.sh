#!/usr/bin/env bash
# PostToolUse(Edit|Write): keep edited source lint-clean.
#
# This repo's stylistic rules are error-level and almost entirely autofixable
# (tabs, single quotes including JSX, semicolons, `[ 1, 2 ]` bracket spacing).
# Fixing at the point of edit beats discovering them later in `npm run check`.
# Never fails the edit: lint errors that aren't autofixable are left for the
# normal gate to report.
set -uo pipefail

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -n "$file" ] || exit 0

# Only source files eslint is configured for — src/**/*.{ts,tsx}.
case "$file" in
	*/src/*.ts|*/src/*.tsx) ;;
	*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
npx eslint --fix "$file" >/dev/null 2>&1 || true
exit 0
