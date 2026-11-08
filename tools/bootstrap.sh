#!/usr/bin/env bash
# Bootstrap the GitHub repository.
#
# Everything except secrets. Secrets are deliberately not created here: they are
# the one thing that must come from you and must never pass through a script.
#
#   ./tools/bootstrap.sh --dry-run          # print the commands, change nothing
#   ./tools/bootstrap.sh                    # create and push
#   ./tools/bootstrap.sh --public           # create the repo public
#
# Safe to re-run: each step checks whether the thing already exists.

set -euo pipefail

OWNER="${OWNER:-yasn77}"
NAME="${NAME:-cilium-cca-prep}"
DRY_RUN=0
VISIBILITY="--private"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --public) VISIBILITY="--public" ;;
    --help|-h)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  would run: %s\n' "$*"
  else
    printf '  %s\n' "$*"
    "$@"
  fi
}

say() { printf '\n== %s\n' "$*"; }

say "Preflight"
if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is not installed" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "node 24 or newer is required (found $(node -v))" >&2
  exit 1
fi
if [ "$DRY_RUN" -eq 0 ] && ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated; run: gh auth login" >&2
  exit 1
fi
echo "  gh $(gh --version | head -1 | awk '{print $3}')"
echo "  node $(node -v)"

say "Repository"
if gh repo view "$OWNER/$NAME" >/dev/null 2>&1; then
  echo "  $OWNER/$NAME already exists"
else
  run gh repo create "$OWNER/$NAME" "$VISIBILITY" \
    --description "Offline practice app and corpus pipeline for the Cilium Certified Associate exam, built from the Cilium documentation" \
    --source=. --remote=origin --disable-wiki
fi

say "Git identity and initial commit"
if [ -d .git ]; then
  echo "  git repository already initialised"
else
  run git init -b main
fi
if [ -n "$(git status --porcelain)" ]; then
  run git add -A
  run git commit -m "feat: offline CCA prep app and documentation-grounded corpus pipeline"
else
  echo "  working tree clean, nothing to commit"
fi

say "Default branch"
run git branch -M main

say "Push"
if git remote get-url origin >/dev/null 2>&1; then
  run git push -u origin main
else
  echo "  no origin remote; skipping push"
fi

say "Pages"
# GitHub Pages must be driven by Actions for this repo, because the site is
# assembled from app/ plus generated data. Being served from a branch would
# publish the pipeline and the corpus generations alongside it.
run gh api -X POST "repos/$OWNER/$NAME/pages" \
  -f "build_type=workflow" >/dev/null 2>&1 || \
  run gh api -X PUT "repos/$OWNER/$NAME/pages" -f "build_type=workflow" >/dev/null 2>&1 || \
  echo "  could not set Pages build type automatically; set Settings → Pages → Source: GitHub Actions"

say "Labels"
for label in "corpus:0e8a16:question corpus refresh" \
             "automated:ededed:opened by a workflow" \
             "bad question:d93f0b:question the learner believes is wrong" \
             "missing topic:1d76db:a blueprint topic with no questions"; do
  IFS=':' read -r lname lcolor ldesc <<< "$label"
  run gh label create "$lname" --color "$lcolor" --description "$ldesc" --force
done

say "Secrets and variables (do not run automatically)"
cat <<'EOF'
  Add these yourself. Nothing above has touched them.

  gh secret set LLM_API_KEY          # token for the generator's chat API
  gh secret set TYPESAFE_API_KEY     # SystemOne key, if it is a separate credential

  gh variable set LLM_BASE_URL       # e.g. https://api.openai.com/v1
  gh variable set LLM_MODEL          # a pinned model id
  gh variable set TYPESAFE_BASE_URL  # e.g. https://api.typesafe.ai

  Both keys are optional. Without them the pipeline still runs: generation and
  judging are skipped, and the site deploys with whatever corpus is committed.
EOF

say "Done"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "  dry run: nothing was changed"
fi
