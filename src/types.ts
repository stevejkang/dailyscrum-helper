// ─── KV Data Models ───

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type MeetLinks = Record<Weekday, string>;

export interface Settings {
  channelId: string;
  meetLinks: MeetLinks;
}

export interface BoardConfig {
  id: string;
  name: string;
  url: string;
}

export interface TeamMember {
  slackUserId: string;
  jiraAccountId: string;
}

export interface Facilitators {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
}

export interface SqaSelection {
  key: string;
  summary: string;
}

// ─── Cloudflare Bindings ───

export interface Env {
  KV: KVNamespace;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  JIRA_API_EMAIL: string;
  JIRA_API_TOKEN: string;
  JIRA_BASE_URL: string;
  JIRA_PROJECT_KEY_SQA: string;
  JIRA_PROJECT_KEY_DEF: string;
  JIRA_DEF_LIST_BASE_URL: string;
  SLACK_APP_ID: string;
}

// ─── Slack API Types ───

export interface SlackEvent {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    user: string;
    tab?: string;
    [key: string]: unknown;
  };
}

export interface SlackInteraction {
  type: string;
  trigger_id: string;
  user: { id: string; name: string };
  actions?: Array<{
    action_id: string;
    type: string;
    value?: string;
    selected_option?: { value: string };
    selected_options?: Array<{ value: string }>;
    [key: string]: unknown;
  }>;
  view?: {
    callback_id: string;
    private_metadata?: string;
    state?: {
      values: Record<string, Record<string, {
        type: string;
        value?: string | null;
        selected_user?: string | null;
        selected_users?: string[];
        selected_channel?: string | null;
        selected_conversation?: string | null;
        selected_option?: { value: string } | null;
        selected_options?: Array<{ value: string }>;
      }>>;
    };
  };
  message?: {
    ts: string;
    channel?: string;
  };
  channel?: { id: string };
  container?: { message_ts: string; channel_id: string };
}

// ─── Jira API Types ───

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

export interface JiraBoardResponse {
  id: number;
  name: string;
  location?: {
    projectKey: string;
  };
}
