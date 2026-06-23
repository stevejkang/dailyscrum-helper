import type { Env, JiraSearchResponse, JiraIssue, JiraBoardResponse } from '../types';

function authHeader(email: string, token: string): string {
  return `Basic ${btoa(`${email}:${token}`)}`;
}

export async function fetchSqaTickets(env: Env, maxResults = 20): Promise<JiraIssue[]> {
  const jql = `project = ${env.JIRA_PROJECT_KEY_SQA} ORDER BY created DESC`;
  const url = new URL(`${env.JIRA_BASE_URL}/rest/api/3/search/jql`);
  url.searchParams.set('jql', jql);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('fields', 'summary,status');

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': authHeader(env.JIRA_API_EMAIL, env.JIRA_API_TOKEN),
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    console.error('Jira API error:', res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as JiraSearchResponse;
  return data.issues;
}

export async function fetchBoardName(env: Env, boardId: string): Promise<string | null> {
  const url = `${env.JIRA_BASE_URL}/rest/agile/1.0/board/${boardId}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': authHeader(env.JIRA_API_EMAIL, env.JIRA_API_TOKEN),
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    console.error('Jira Board API error:', res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as JiraBoardResponse;
  return data.name;
}

export function parseBoardIdFromUrl(boardUrl: string): string | null {
  const match = boardUrl.match(/\/boards\/(\d+)/);
  return match ? match[1] : null;
}

export function buildDefBoardUrls(
  baseUrl: string,
  jiraAccountIds: string[],
  sqaKeys: string[],
): Array<{ sqaKey: string; url: string }> {
  return sqaKeys.map((sqaKey) => {
    const assigneeList = jiraAccountIds.map((id) => `"${id}"`).join(', ');
    const filter = `assignee IN (${assigneeList}) AND "품질점검" ~ ${sqaKey}`;
    const url = `${baseUrl}?filter=${encodeURIComponent(filter)}&groupBy=status&sortBy=key&direction=DESC`;
    return { sqaKey, url };
  });
}
