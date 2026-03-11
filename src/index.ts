import { Hono } from 'hono';
import type { Env, SlackEvent, SlackInteraction } from './types';
import { verifySlackRequest } from './slack/verify';
import { handleEvent } from './slack/events';
import { handleInteraction } from './slack/interactions';
import { handleDailyScrum } from './cron/daily-scrum';

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

// ─── Health check ───
app.get('/', (c) => c.text('dailyscrum-helper is running'));

// ─── Slack Events API ───
app.post('/slack/events', async (c) => {
  const body = await c.req.text();

  // Verify request signature
  const isValid = await verifySlackRequest(c.req.raw, c.env.SLACK_SIGNING_SECRET, body);
  if (!isValid) {
    return c.text('Invalid signature', 401);
  }

  const event = JSON.parse(body) as SlackEvent;
  return handleEvent(event, c.env);
});

// ─── Slack Interactions (buttons, modals) ───
app.post('/slack/interactions', async (c) => {
  const body = await c.req.text();

  // Verify request signature
  const isValid = await verifySlackRequest(c.req.raw, c.env.SLACK_SIGNING_SECRET, body);
  if (!isValid) {
    return c.text('Invalid signature', 401);
  }

  // Slack sends interactions as form-urlencoded with a `payload` field
  const params = new URLSearchParams(body);
  const payloadStr = params.get('payload');
  if (!payloadStr) {
    return c.text('Missing payload', 400);
  }

  const payload = JSON.parse(payloadStr) as SlackInteraction;
  return handleInteraction(payload, c.env);
});

// ─── Export for Cloudflare Worker ───
export default {
  fetch: app.fetch,

  // Cron trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleDailyScrum(env));
  },
};
