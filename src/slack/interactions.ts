import type { Env, SlackInteraction, Facilitators, Weekday } from '../types';
import {
  getMembers,
  getSettings,
  getFacilitators,
  getBoards,
  saveSettings,
  saveFacilitators,
  addMember,
  removeMember,
  addBoard,
  removeBoard,
  isMember,
  getSqaSelections,
  saveSqaSelections,
} from '../kv/store';
import { openModal, updateMessage } from './api';
import {
  buildAddMemberModal,
  buildFacilitatorsModal,
  buildChannelModal,
  buildAddBoardModal,
  buildMeetLinkModal,
  buildSqaSelectModal,
} from './views/modals';
import { buildDailyScrumMessage } from './messages/daily-scrum';
import { fetchSqaTickets, fetchBoardName, parseBoardIdFromUrl, buildDefBoardUrls } from '../jira/client';
import { refreshHomeTab } from './events';

const WEEKDAY_ORDER: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export async function handleInteraction(
  payload: SlackInteraction,
  env: Env,
): Promise<Response> {
  const userId = payload.user.id;



  // ─── Button actions ───
  if (payload.type === 'block_actions' && payload.actions) {
    for (const action of payload.actions) {
      const actionId = action.action_id;

      if (
        actionId !== 'open_sqa_select' &&
        actionId !== 'open_meet' &&
        !actionId.startsWith('open_board_')
      ) {
        const members = await getMembers(env.KV);
        if (members.length > 0 && !isMember(members, userId)) {
          return new Response('ok');
        }
      }

      if (actionId === 'add_member') {
        const modal = buildAddMemberModal();
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId.startsWith('remove_member_')) {
        const targetUserId = actionId.replace('remove_member_', '');
        await removeMember(env.KV, targetUserId);
        await refreshHomeTab(env, userId);
      }

      if (actionId === 'edit_facilitators') {
        const [members, facilitators] = await Promise.all([
          getMembers(env.KV),
          getFacilitators(env.KV),
        ]);
        const modal = buildFacilitatorsModal(members, facilitators);
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId === 'edit_channel') {
        const settings = await getSettings(env.KV);
        const modal = buildChannelModal(settings?.channelId);
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId === 'add_board') {
        const modal = buildAddBoardModal();
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId.startsWith('remove_board_')) {
        const boardId = actionId.replace('remove_board_', '');
        await removeBoard(env.KV, boardId);
        await refreshHomeTab(env, userId);
      }

      if (actionId === 'edit_meet_link') {
        const settings = await getSettings(env.KV);
        const modal = buildMeetLinkModal(settings?.meetLink);
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId === 'open_sqa_select') {
        const messageTs = payload.container?.message_ts;
        const channelId = payload.container?.channel_id;
        const currentSelections = await getSqaSelections(env.KV);
        const modal = buildSqaSelectModal(messageTs, channelId, currentSelections);
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }

      if (actionId === 'open_sqa_select_home') {
        const currentSelections = await getSqaSelections(env.KV);
        const modal = buildSqaSelectModal(undefined, undefined, currentSelections);
        await openModal(env.SLACK_BOT_TOKEN, payload.trigger_id, modal);
      }
    }

    return new Response('ok');
  }

  // ─── External select options (block_suggestion) ───
  if (payload.type === 'block_suggestion') {
    const raw = payload as unknown as Record<string, unknown>;
    const actionId = raw.action_id as string;
    const query = ((raw.value as string) ?? '').toLowerCase();

    if (actionId === 'sqa_select') {
      const issues = await fetchSqaTickets(env, 50);
      const filtered = query
        ? issues.filter((i) =>
            i.key.toLowerCase().includes(query) ||
            i.fields.summary.toLowerCase().includes(query)
          )
        : issues;

      const options = filtered.slice(0, 20).map((issue) => ({
        text: {
          type: 'plain_text' as const,
          text: `${issue.key} - ${issue.fields.summary}`.substring(0, 75),
        },
        value: `${issue.key}::${issue.fields.summary}`.substring(0, 150),
      }));

      return new Response(JSON.stringify({ options }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ options: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Modal submissions ───
  if (payload.type === 'view_submission' && payload.view) {
    const callbackId = payload.view.callback_id;
    const values = payload.view.state?.values ?? {};

    // Add member
    if (callbackId === 'add_member_submit') {
      const slackUserId = values.member_select_block?.member_select?.selected_user;
      const jiraAccountId = values.jira_id_block?.jira_id_input?.value;

      if (slackUserId && jiraAccountId) {
        await addMember(env.KV, { slackUserId, jiraAccountId });
        // Refresh home tab for the user who submitted
        await refreshHomeTab(env, userId);
      }

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Edit facilitators
    if (callbackId === 'edit_facilitators_submit') {
      const facilitators: Facilitators = {
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
      };

      for (const day of WEEKDAY_ORDER) {
        const selected = values[`facilitator_${day}`]?.[`select_${day}`]?.selected_option;
        facilitators[day] = selected?.value ?? '';
      }

      await saveFacilitators(env.KV, facilitators);
      await refreshHomeTab(env, userId);

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Edit channel
    if (callbackId === 'edit_channel_submit') {
      const channelId = values.channel_block?.channel_select?.selected_channel;

      if (channelId) {
        const settings = (await getSettings(env.KV)) ?? { channelId: '', meetLink: '' };
        settings.channelId = channelId;
        await saveSettings(env.KV, settings);
        await refreshHomeTab(env, userId);
      }

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (callbackId === 'add_board_submit') {
      const boardUrl = values.board_url_block?.board_url_input?.value;

      if (boardUrl) {
        const boardId = parseBoardIdFromUrl(boardUrl);
        if (boardId) {
          const boardName = await fetchBoardName(env, boardId);
          await addBoard(env.KV, {
            id: boardId,
            name: boardName ?? `Board ${boardId}`,
            url: boardUrl,
          });
          await refreshHomeTab(env, userId);
        }
      }

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (callbackId === 'edit_meet_link_submit') {
      const meetLink = values.meet_link_block?.meet_link_input?.value;

      if (meetLink) {
        const settings = (await getSettings(env.KV)) ?? { channelId: '', meetLink: '' };
        settings.meetLink = meetLink;
        await saveSettings(env.KV, settings);
        await refreshHomeTab(env, userId);
      }

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SQA selection
    if (callbackId === 'sqa_select_submit') {
      const selectedOptions = values.sqa_select_block?.sqa_select?.selected_options ?? [];
      const sqaEntries = selectedOptions
        .map((opt) => opt.value)
        .filter((v) => v !== 'none')
        .map((v) => {
          const [key, ...rest] = v.split('::');
          return { key, summary: rest.join('::') };
        });

      await saveSqaSelections(env.KV, sqaEntries);

      const metadata = JSON.parse(payload.view.private_metadata ?? '{}') as {
        messageTs?: string;
        channelId?: string;
        source?: string;
      };

      if (metadata.source === 'message' && metadata.messageTs && metadata.channelId) {
        const [settings, members, facilitators, boards] = await Promise.all([
          getSettings(env.KV),
          getMembers(env.KV),
          getFacilitators(env.KV),
          getBoards(env.KV),
        ]);

        if (settings && facilitators) {
          const now = new Date();
          const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
          const dayIndex = kstDate.getUTCDay();
          const DAY_MAP: Record<number, Weekday> = {
            1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday',
          };
          const weekday = DAY_MAP[dayIndex];
          const facilitatorId = weekday ? facilitators[weekday] : '';

          const jiraAccountIds = members.map((m) => m.jiraAccountId);
          const sqaKeys = sqaEntries.map((e) => e.key);
          const sqaLinks = sqaKeys.length > 0
            ? buildDefBoardUrls(env.JIRA_DEF_LIST_BASE_URL, jiraAccountIds, sqaKeys)
                .map((link, i) => ({ ...link, summary: sqaEntries[i].summary }))
            : undefined;

          const { blocks, text } = buildDailyScrumMessage(
            facilitatorId || userId,
            settings,
            boards,
            sqaLinks,
          );

          await updateMessage(
            env.SLACK_BOT_TOKEN,
            metadata.channelId,
            metadata.messageTs,
            blocks,
            text,
          );
        }
      }

      await refreshHomeTab(env, userId);

      return new Response(JSON.stringify({ response_action: 'clear' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('ok');
}
