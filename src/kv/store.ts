import type { Env, Settings, TeamMember, Facilitators, SqaSelection } from '../types';

const KEYS = {
  SETTINGS: 'settings',
  MEMBERS: 'members',
  FACILITATORS: 'facilitators',
  SQA_SELECTIONS: 'sqa_selections',
} as const;

export async function getSettings(kv: KVNamespace): Promise<Settings | null> {
  return kv.get<Settings>(KEYS.SETTINGS, 'json');
}

export async function saveSettings(kv: KVNamespace, settings: Settings): Promise<void> {
  await kv.put(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getMembers(kv: KVNamespace): Promise<TeamMember[]> {
  const members = await kv.get<TeamMember[]>(KEYS.MEMBERS, 'json');
  return members ?? [];
}

export async function saveMembers(kv: KVNamespace, members: TeamMember[]): Promise<void> {
  await kv.put(KEYS.MEMBERS, JSON.stringify(members));
}

export async function addMember(kv: KVNamespace, member: TeamMember): Promise<void> {
  const members = await getMembers(kv);
  const exists = members.some((m) => m.slackUserId === member.slackUserId);
  if (!exists) {
    members.push(member);
    await saveMembers(kv, members);
  }
}

export async function removeMember(kv: KVNamespace, slackUserId: string): Promise<void> {
  const members = await getMembers(kv);
  const filtered = members.filter((m) => m.slackUserId !== slackUserId);
  await saveMembers(kv, filtered);
}

export async function getFacilitators(kv: KVNamespace): Promise<Facilitators | null> {
  return kv.get<Facilitators>(KEYS.FACILITATORS, 'json');
}

export async function saveFacilitators(kv: KVNamespace, facilitators: Facilitators): Promise<void> {
  await kv.put(KEYS.FACILITATORS, JSON.stringify(facilitators));
}

export function isMember(members: TeamMember[], slackUserId: string): boolean {
  return members.some((m) => m.slackUserId === slackUserId);
}

export async function getSqaSelections(kv: KVNamespace): Promise<SqaSelection[]> {
  const selections = await kv.get<SqaSelection[]>(KEYS.SQA_SELECTIONS, 'json');
  return selections ?? [];
}

export async function saveSqaSelections(kv: KVNamespace, selections: SqaSelection[]): Promise<void> {
  await kv.put(KEYS.SQA_SELECTIONS, JSON.stringify(selections));
}
