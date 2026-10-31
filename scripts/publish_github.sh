#!/usr/bin/env bash
set -e

export PATH="/snap/bin:/snap/gh/751:/snap/gh/751/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

echo "🔄 1. Triggering remote reload on connected browser via MCP :3001..."
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"dispatch_tutor_command","arguments":{"action":"reload_page"}}}' || true

echo "🚀 2. Creating/Pushing GitHub repository via gh CLI..."
REPO_NAME="aap-noot-mies-tutor"
GH_USER=$(gh api user -q .login)
FULL_REPO="${GH_USER}/${REPO_NAME}"

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin master --force
else
  if gh repo view "${FULL_REPO}" >/dev/null 2>&1; then
    git remote add origin "https://github.com/${FULL_REPO}.git"
    git push -u origin master --force
  else
    gh repo create "${REPO_NAME}" --public --source=. --remote=origin --push \
      --description "Interactive Aap-Noot-Mies Leesplankje & Brain-Rocket Reading Game (Mobile & WebP Motion-Lamp Edition)"
  fi
fi

echo "🌐 3. Enabling GitHub Pages (github.io) from master /docs..."
gh api -X POST "repos/${FULL_REPO}/pages" \
  -f "source[branch]=master" \
  -f "source[path]=/docs" 2>/dev/null || \
gh api -X PUT "repos/${FULL_REPO}/pages" \
  -f "source[branch]=master" \
  -f "source[path]=/docs" 2>/dev/null || true

PAGES_URL="https://${GH_USER}.github.io/${REPO_NAME}/"
echo "✅ Published to GitHub: https://github.com/${FULL_REPO}"
echo "✅ Live GitHub Pages URL (Phone & Desktop): ${PAGES_URL}"
