#!/usr/bin/env bash
# Diff sdd-flow's vendored spec-template.md against upstream mattpocock-skills.
# Usage: ./update-refs.sh          show the diff (exit 1 if drifted)
#        ./update-refs.sh --apply  refresh the vendored copy
set -euo pipefail
cd "$(dirname "$0")"

AGENTS_SKILL=~/.agents/skills/to-spec/SKILL.md
AGENTS_LOCK=~/.agents/.skill-lock.json
PLUGIN=~/.claude/plugins/marketplaces/mattpocock
if [ -f "$AGENTS_SKILL" ]; then
  UP=$AGENTS_SKILL
  HASH=$(grep -A8 '"to-spec"' "$AGENTS_LOCK" | grep -m1 skillFolderHash | grep -oE '[0-9a-f]{7}' | head -1)
  VER="@${HASH:-unknown} (npx skills)"
elif [ -f "$PLUGIN/skills/engineering/to-spec/SKILL.md" ]; then
  UP=$PLUGIN/skills/engineering/to-spec/SKILL.md
  VER=$(grep -m1 '"version"' "$PLUGIN/.claude-plugin/plugin.json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
else
  echo "to-spec not found: install it with npx skills add mattpocock/skills -g -a opencode -s to-spec"; exit 2
fi

template() { awk '/<spec-template>/,/<\/spec-template>/' "$1"; }
NEW=$(mktemp); CUR=$(mktemp)
template "$UP" > "$NEW"
template spec-template.md > "$CUR"

if [ "${1:-}" = "--apply" ]; then
  { echo "<!-- vendored verbatim from mattpocock-skills $VER — skills/engineering/to-spec/SKILL.md"
    echo "     Do not hand-edit. Run ./update-refs.sh to diff against upstream, --apply to refresh."
    echo "     sdd-flow's local overrides live in SKILL.md 1.4, deliberately NOT applied here,"
    echo "     so the diff against upstream stays clean. -->"
    echo
    cat "$NEW"; } > spec-template.md
  rm "$NEW" "$CUR"; echo "refreshed from $VER"
elif diff -q "$CUR" "$NEW" >/dev/null; then
  rm "$NEW" "$CUR"; echo "up to date (upstream $VER)"
else
  diff -u "$CUR" "$NEW" || true; rm "$NEW" "$CUR"
  echo; echo "drifted from upstream $VER — review above, then ./update-refs.sh --apply"; exit 1
fi
