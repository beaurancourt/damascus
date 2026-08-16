#!/usr/bin/env bash
# PreToolUse(Edit|Write): refuse to hand-edit generated files.
#
# package-lock.json picks up incidental churn from any npm invocation and has
# been committed by accident before; dist/ is build output. Both should only
# change through their generator, so block the edit and say why - exit code 2
# sends this message back to Claude.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

case "$file" in
	*/package-lock.json)
		echo 'package-lock.json is generated. Change package.json and run npm install instead.' >&2
		exit 2
		;;
	*/dist/*)
		echo 'dist/ is build output. Edit the source under src/ and rebuild instead.' >&2
		exit 2
		;;
esac
exit 0
