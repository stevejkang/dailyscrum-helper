#!/usr/bin/env bash
set -euo pipefail

WRANGLER_TOML="wrangler.toml"
MANIFEST="manifest.json"

echo "═══════════════════════════════════════════"
echo "  Daily Scrum Helper — Setup"
echo "═══════════════════════════════════════════"
echo ""

# ─── 1. Check wrangler auth ───
echo "▶ Checking wrangler authentication..."
WHOAㄴㄴMI_OUTPUT=$(npx wrangler whoami 2>&1) || true
if echo "$WHOAMI_OUTPUT" | grep -qi "not authenticated"; then
  echo "  ✗ Not logged in. Running 'wrangler login'..."
  npx wrangler login
fi
echo "  ✓ Authenticated"
echo ""

# ─── 2. Create KV Namespace ───
echo "▶ Creating KV namespace..."
KV_OUTPUT=$(npx wrangler kv namespace create KV 2>&1) || true
KV_ID=$(echo "$KV_OUTPUT" | sed -n 's/.*id = "\([^"]*\)".*/\1/p' | head -1)

if [ -z "$KV_ID" ]; then
  KV_ID=$(echo "$KV_OUTPUT" | grep -oE '[0-9a-f]{32}' | head -1 || true)
fi

if [ -z "$KV_ID" ]; then
  echo "  ⚠ Could not auto-extract KV ID. Output was:"
  echo "  $KV_OUTPUT"
  read -rp "  Paste the KV namespace ID manually: " KV_ID
fi

# Patch wrangler.toml
if [ -n "$KV_ID" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" "$WRANGLER_TOML"
  else
    sed -i "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" "$WRANGLER_TOML"
  fi
  echo "  ✓ KV namespace created & wrangler.toml updated (id: $KV_ID)"
else
  echo "  ✗ Skipped. Update wrangler.toml manually."
fi
echo ""

# ─── 3. Worker subdomain for manifest ───
echo "▶ Configuring Slack App Manifest URLs..."
read -rp "  Enter your Cloudflare Workers subdomain (e.g. 'my-team'): " CF_SUBDOMAIN

if [ -n "$CF_SUBDOMAIN" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/<YOUR_SUBDOMAIN>/$CF_SUBDOMAIN/g" "$MANIFEST"
  else
    sed -i "s/<YOUR_SUBDOMAIN>/$CF_SUBDOMAIN/g" "$MANIFEST"
  fi
  echo "  ✓ manifest.json updated with subdomain: $CF_SUBDOMAIN"
else
  echo "  ⚠ Skipped. Update manifest.json manually."
fi
echo ""

# ─── 4. Set secrets ───
echo "▶ Setting Cloudflare Worker secrets..."
echo "  (Get these from Slack App settings & Jira API tokens)"
echo ""

read -rp "  SLACK_BOT_TOKEN (xoxb-...): " SLACK_BOT_TOKEN
if [ -n "$SLACK_BOT_TOKEN" ]; then
  echo "$SLACK_BOT_TOKEN" | npx wrangler secret put SLACK_BOT_TOKEN
  echo "  ✓ SLACK_BOT_TOKEN set"
fi

read -rp "  SLACK_SIGNING_SECRET: " SLACK_SIGNING_SECRET
if [ -n "$SLACK_SIGNING_SECRET" ]; then
  echo "$SLACK_SIGNING_SECRET" | npx wrangler secret put SLACK_SIGNING_SECRET
  echo "  ✓ SLACK_SIGNING_SECRET set"
fi

read -rp "  JIRA_API_EMAIL: " JIRA_API_EMAIL
if [ -n "$JIRA_API_EMAIL" ]; then
  echo "$JIRA_API_EMAIL" | npx wrangler secret put JIRA_API_EMAIL
  echo "  ✓ JIRA_API_EMAIL set"
fi

read -rp "  JIRA_API_TOKEN: " JIRA_API_TOKEN
if [ -n "$JIRA_API_TOKEN" ]; then
  echo "$JIRA_API_TOKEN" | npx wrangler secret put JIRA_API_TOKEN
  echo "  ✓ JIRA_API_TOKEN set"
fi
echo ""

# ─── 5. Deploy ───
read -rp "▶ Deploy now? (y/N): " DEPLOY
if [[ "$DEPLOY" =~ ^[Yy]$ ]]; then
  npx wrangler deploy
  echo ""
  echo "  ✓ Deployed!"
else
  echo "  Skipped. Run 'npm run deploy' when ready."
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Go to https://api.slack.com/apps"
echo "  2. Click 'Create New App' → 'From a manifest'"
echo "  3. Select your workspace"
echo "  4. Paste the contents of manifest.json"
echo "  5. Install the app to your workspace"
echo "═══════════════════════════════════════════"
