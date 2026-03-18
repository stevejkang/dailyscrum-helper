import type { Env, Weekday } from '../types';
import { getSettings, getMembers, getFacilitators, getSqaSelections, getBoards } from '../kv/store';
import { postMessage } from '../slack/api';
import { buildDailyScrumMessage } from '../slack/messages/daily-scrum';
import { buildDefBoardUrls } from '../jira/client';

const DAY_INDEX_TO_WEEKDAY: Record<number, Weekday> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
};

export async function handleDailyScrum(env: Env): Promise<void> {
  // Determine today's weekday in KST (UTC+9)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  const dayOfWeek = kstDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  const weekday = DAY_INDEX_TO_WEEKDAY[dayOfWeek];
  if (!weekday) {
    console.log('Not a weekday, skipping daily scrum.');
    return;
  }

  const [settings, members, facilitators, sqaSelections, boards] = await Promise.all([
    getSettings(env.KV),
    getMembers(env.KV),
    getFacilitators(env.KV),
    getSqaSelections(env.KV),
    getBoards(env.KV),
  ]);

  if (!settings?.channelId) {
    console.error('No channel configured. Skipping daily scrum.');
    return;
  }

  if (!settings.meetLink) {
    console.error('Meet link not configured. Skipping daily scrum.');
    return;
  }

  if (members.length === 0) {
    console.error('No team members configured. Skipping daily scrum.');
    return;
  }

  const facilitatorId = facilitators?.[weekday];
  if (!facilitatorId) {
    console.error(`No facilitator set for ${weekday}. Skipping daily scrum.`);
    return;
  }

  const sqaLinks = sqaSelections.length > 0
    ? buildDefBoardUrls(
        env.JIRA_DEF_LIST_BASE_URL,
        members.map((m) => m.jiraAccountId),
        sqaSelections.map((s) => s.key),
      ).map((link, i) => ({ ...link, summary: sqaSelections[i].summary }))
    : undefined;

  const { blocks, text } = buildDailyScrumMessage(
    facilitatorId,
    settings,
    boards,
    sqaLinks,
  );

  const result = await postMessage(env.SLACK_BOT_TOKEN, settings.channelId, blocks, text);
  console.log('Daily scrum message sent:', result.ok ? 'success' : 'failed');
}
