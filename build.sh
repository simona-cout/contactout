#!/usr/bin/env bash
# Builds index.html (web, with Google sign-in) and claude.html (the same app for the Claude artifact) from src/.
set -euo pipefail
cd "$(dirname "$0")"
app() { echo '<title>My Day</title>'; sed '1d' src/css.html; cat src/css2.html; echo '</style>'; cat src/markup.html src/js1.js src/js2.js src/js3.js src/js4.js src/js5.js; }
app > claude.html
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  echo '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%225%22 fill=%22%2323252A%22/%3E%3Cpath d=%22M6 18v-6M10 18V7M14 18v-4M18 18v-8%22 stroke=%22white%22 stroke-width=%222.4%22 stroke-linecap=%22round%22/%3E%3C/svg%3E">'
  echo '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>'
  echo '<script src="/web.js"></script>'
  app
} > index.html
sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/myday-check.js && node --check /tmp/myday-check.js
node --check web.js && for f in api/*.js; do node --check "$f"; done
echo "built index.html + claude.html"
