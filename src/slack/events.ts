import type { Env, SlackEvent } from '../types';
import { publishHomeTab } from './api';
import { buildHomeTab } from './views/home-tab';
import { getMembers, getSettings, getFacilitators, getSqaSelections, isMember } from '../kv/store';

export async function handleEvent(event: SlackEvent, env: Env): Promise<Response> {
  // URL verification challenge
  if (event.type === 'url_verification') {
    return new Response(JSON.stringify({ challenge: event.challenge }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (event.type === 'event_callback' && event.event) {
    const { type: eventType, user, tab } = event.event;

    // app_home_opened event
    if (eventType === 'app_home_opened' && tab === 'home' && user) {
      await refreshHomeTab(env, user);
    }
  }

  return new Response('ok');
}

export async function refreshHomeTab(env: Env, userId: string): Promise<void> {
  const [members, facilitators, settings, sqaSelections] = await Promise.all([
    getMembers(env.KV),
    getFacilitators(env.KV),
    getSettings(env.KV),
    getSqaSelections(env.KV),
  ]);

  const isTeamMemberOrEmpty = members.length === 0 || isMember(members, userId);
  const view = buildHomeTab(members, facilitators, settings, isTeamMemberOrEmpty, sqaSelections);

  await publishHomeTab(env.SLACK_BOT_TOKEN, userId, view);
}
