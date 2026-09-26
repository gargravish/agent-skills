#!/usr/bin/env bash
# Install the skills in this repo for one or more coding agents.
#
#   ./install.sh                      # all agents, global skills, symlink mode
#   ./install.sh --agents claude,codex
#   ./install.sh --copy               # copy instead of symlink
#   ./install.sh --only mobile-app-builder,mobile-app-release
#   ./install.sh --project ~/code/my-app      # into one project instead of your user dirs
#   ./install.sh --force              # replace existing entries (old ones are backed up)
#   ./install.sh --dry-run
#
# Symlink mode (default) keeps the skills linked to this clone, so `git pull`
# updates every agent at once.
# Every agent below reads the same Agent Skills layout: <dir>/<name>/SKILL.md.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS="claude,codex,agents,gemini,antigravity"
MODE="link"; ONLY=""; PROJECT=""; FORCE=0; DRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agents) AGENTS="$2"; shift 2 ;;
    --copy) MODE="copy"; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --project) PROJECT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

# Where each agent looks for skills: user-level, then project-level (relative).
user_dir() {
  case "$1" in
    claude)      echo "$HOME/.claude/skills" ;;
    codex)       echo "${CODEX_HOME:-$HOME/.codex}/skills" ;;
    agents)      echo "$HOME/.agents/skills" ;;          # shared Agent Skills dir (npx skills, Cursor, others)
    gemini)      echo "$HOME/.gemini/skills" ;;          # Gemini CLI
    antigravity) echo "$HOME/.gemini/antigravity/skills" ;;
    *) echo "unknown agent: $1" >&2; exit 1 ;;
  esac
}
project_dir() {
  case "$1" in
    claude) echo ".claude/skills" ;;
    codex|agents|antigravity) echo ".agents/skills" ;;
    gemini) echo ".gemini/skills" ;;
  esac
}

SRC="$REPO/skills"
[[ -d "$SRC" ]] || { echo "no such skill set: $SRC" >&2; exit 1; }

want() { [[ -z "$ONLY" ]] || [[ ",$ONLY," == *",$1,"* ]]; }
run() { if [[ $DRY -eq 1 ]]; then echo "  [dry] $*"; else "$@"; fi; }

stamp="$(date +%Y%m%d-%H%M%S)"
installed=0; skipped=0; seen_dirs=""
IFS=',' read -ra AGENT_LIST <<< "$AGENTS"
for agent in "${AGENT_LIST[@]}"; do
  if [[ -n "$PROJECT" ]]; then dest="$PROJECT/$(project_dir "$agent")"; else dest="$(user_dir "$agent")"; fi
  # codex/agents/antigravity share .agents/skills at project level — install once.
  [[ " $seen_dirs " == *" $dest "* ]] && continue
  seen_dirs="$seen_dirs $dest"
  echo "→ $agent: $dest"
  run mkdir -p "$dest"
  for skill in "$SRC"/*/; do
    name="$(basename "$skill")"
    want "$name" || continue
    [[ -f "$skill/SKILL.md" ]] || continue
    target="$dest/$name"
    if [[ -e "$target" || -L "$target" ]]; then
      if [[ "$MODE" == "link" && -L "$target" && "$(readlink "$target")" == "${skill%/}" ]]; then continue; fi
      if [[ $FORCE -eq 0 ]]; then skipped=$((skipped+1)); continue; fi
      run mv "$target" "$target.bak-$stamp"
    fi
    if [[ "$MODE" == "link" ]]; then run ln -s "${skill%/}" "$target"; else run cp -R "${skill%/}" "$target"; fi
    installed=$((installed+1))
  done
done
echo "done: $installed installed, $skipped already present (use --force to replace; originals are backed up)"
