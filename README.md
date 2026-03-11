# dailyscrum-helper

Slack app that sends daily scrum reminders at 10 AM KST. Built on Cloudflare Workers + Hono.

**Features**: facilitator mention, Google Meet & PI board links, SQA ticket selection with auto-generated DEF board filter URLs, team settings via Slack Home Tab.

## Initial Setup

```bash
npm install
npm run setup # Creates KV, sets secrets, patches configs
```

Then create the Slack app at https://api.slack.com/apps → **From a manifest**.

### Slack App Manifest

`manifest.json` is gitignored because it contains environment-specific URLs and identifiers. Create your own based on this template:

```json
{
  "display_information": {
    "name": "Daily Scrum Helper",
    "description": "Daily scrum reminder bot",
    "background_color": "#1264A3"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": false,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "Daily Scrum Helper",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "chat:write.public", "channels:read", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://<YOUR_WORKER>.workers.dev/slack/events",
      "bot_events": ["app_home_opened"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://<YOUR_WORKER>.workers.dev/slack/interactions",
      "message_menu_options_url": "https://<YOUR_WORKER>.workers.dev/slack/interactions"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

Replace `<YOUR_WORKER>` with your actual Cloudflare Worker subdomain.

Set **Options Load URL** (Interactivity & Shortcuts) to the same value as Request URL.

### Secrets

| Secret | Where to find |
|---|---|
| `SLACK_BOT_TOKEN` | Slack App → OAuth & Permissions (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Slack App → Basic Information → App Credentials |
| `JIRA_API_EMAIL` | Your Jira login email |
| `JIRA_API_TOKEN` | https://id.atlassian.com/manage-profile/security/api-tokens |

## Local Development

```bash
cp .dev.vars.example .dev.vars   # Fill in actual values
npm run dev                      # Local KV
npm run dev -- --remote          # Production KV
```

### Test Cron Trigger

```bash
npm run dev -- --test-scheduled --remote
curl http://localhost:8787/__scheduled
```

## Deploy

```bash
npm run deploy
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run setup` | Interactive first-time setup |

Cron schedule: `0 1 * * 1-5` (UTC 01:00 = KST 10:00, Mon–Fri)
