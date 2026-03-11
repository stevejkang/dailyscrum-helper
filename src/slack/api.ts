const SLACK_API = 'https://slack.com/api';

async function slackRequest(
  method: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!data.ok) {
    console.error(`Slack API error [${method}]:`, data);
  }
  return data;
}

export async function postMessage(
  token: string,
  channel: string,
  blocks: unknown[],
  text: string,
): Promise<Record<string, unknown>> {
  return slackRequest('chat.postMessage', token, { channel, blocks, text });
}

export async function postThreadReply(
  token: string,
  channel: string,
  threadTs: string,
  blocks: unknown[],
  text: string,
): Promise<void> {
  await slackRequest('chat.postMessage', token, {
    channel,
    thread_ts: threadTs,
    blocks,
    text,
  });
}

export async function updateMessage(
  token: string,
  channel: string,
  ts: string,
  blocks: unknown[],
  text: string,
): Promise<void> {
  await slackRequest('chat.update', token, { channel, ts, blocks, text });
}

export async function publishHomeTab(
  token: string,
  userId: string,
  view: Record<string, unknown>,
): Promise<void> {
  await slackRequest('views.publish', token, { user_id: userId, view });
}

export async function openModal(
  token: string,
  triggerId: string,
  view: Record<string, unknown>,
): Promise<void> {
  await slackRequest('views.open', token, { trigger_id: triggerId, view });
}

export async function getUserInfo(
  token: string,
  userId: string,
): Promise<{ display_name: string; real_name: string } | null> {
  const data = await slackRequest('users.info', token, { user: userId });
  if (!data.ok) return null;
  const user = data.user as { profile: { display_name: string; real_name: string } };
  return user.profile;
}
