import type { TeamMember, Facilitators, Weekday, JiraIssue, SqaSelection } from '../../types';

const WEEKDAY_ORDER: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
};

// ─── Add Team Member Modal ───

export function buildAddMemberModal(): Record<string, unknown> {
  return {
    type: 'modal',
    callback_id: 'add_member_submit',
    title: { type: 'plain_text', text: '팀원 추가' },
    submit: { type: 'plain_text', text: '추가' },
    close: { type: 'plain_text', text: '취소' },
    blocks: [
      {
        type: 'input',
        block_id: 'member_select_block',
        label: { type: 'plain_text', text: 'Slack 사용자' },
        element: {
          type: 'users_select',
          action_id: 'member_select',
          placeholder: { type: 'plain_text', text: '팀원을 선택하세요' },
        },
      },
      {
        type: 'input',
        block_id: 'jira_id_block',
        label: { type: 'plain_text', text: 'Jira Account ID' },
        element: {
          type: 'plain_text_input',
          action_id: 'jira_id_input',
          placeholder: { type: 'plain_text', text: '예: 712020:5ae866a8-44af-4ec9-...' },
        },
        hint: {
          type: 'plain_text',
          text: 'Jira 프로필 URL에서 확인할 수 있습니다.',
        },
      },
    ],
  };
}

// ─── Edit Facilitators Modal ───

export function buildFacilitatorsModal(
  members: TeamMember[],
  currentFacilitators: Facilitators | null,
): Record<string, unknown> {
  const memberOptions = members.map((m) => ({
    text: { type: 'plain_text', text: `<@${m.slackUserId}>` },
    value: m.slackUserId,
  }));

  const blocks = WEEKDAY_ORDER.map((day) => {
    const block: Record<string, unknown> = {
      type: 'input',
      block_id: `facilitator_${day}`,
      label: { type: 'plain_text', text: WEEKDAY_LABELS[day] },
      element: {
        type: 'static_select',
        action_id: `select_${day}`,
        placeholder: { type: 'plain_text', text: '진행자 선택' },
        options: memberOptions,
      },
      optional: true,
    };

    // Pre-select current facilitator
    if (currentFacilitators?.[day]) {
      const currentOption = memberOptions.find(
        (opt) => opt.value === currentFacilitators[day],
      );
      if (currentOption) {
        (block.element as Record<string, unknown>).initial_option = currentOption;
      }
    }

    return block;
  });

  return {
    type: 'modal',
    callback_id: 'edit_facilitators_submit',
    title: { type: 'plain_text', text: '진행자 설정' },
    submit: { type: 'plain_text', text: '저장' },
    close: { type: 'plain_text', text: '취소' },
    blocks,
  };
}

// ─── Edit Channel Modal ───

export function buildChannelModal(currentChannelId?: string): Record<string, unknown> {
  const element: Record<string, unknown> = {
    type: 'channels_select',
    action_id: 'channel_select',
    placeholder: { type: 'plain_text', text: '채널을 선택하세요' },
  };
  if (currentChannelId) {
    element.initial_channel = currentChannelId;
  }

  return {
    type: 'modal',
    callback_id: 'edit_channel_submit',
    title: { type: 'plain_text', text: '발송 채널 변경' },
    submit: { type: 'plain_text', text: '저장' },
    close: { type: 'plain_text', text: '취소' },
    blocks: [
      {
        type: 'input',
        block_id: 'channel_block',
        label: { type: 'plain_text', text: '데일리 스크럼 발송 채널' },
        element,
      },
    ],
  };
}

// ─── Add Board Modal ───

export function buildAddBoardModal(): Record<string, unknown> {
  return {
    type: 'modal',
    callback_id: 'add_board_submit',
    title: { type: 'plain_text', text: '보드 추가' },
    submit: { type: 'plain_text', text: '추가' },
    close: { type: 'plain_text', text: '취소' },
    blocks: [
      {
        type: 'input',
        block_id: 'board_url_block',
        label: { type: 'plain_text', text: 'Jira 보드 링크' },
        element: {
          type: 'url_text_input',
          action_id: 'board_url_input',
          placeholder: {
            type: 'plain_text',
            text: 'https://xxx.atlassian.net/.../boards/234',
          },
        },
      },
    ],
  };
}

// ─── Edit Meet Link Modal ───

export function buildMeetLinkModal(currentLink?: string): Record<string, unknown> {
  return {
    type: 'modal',
    callback_id: 'edit_meet_link_submit',
    title: { type: 'plain_text', text: 'Meet 링크 변경' },
    submit: { type: 'plain_text', text: '저장' },
    close: { type: 'plain_text', text: '취소' },
    blocks: [
      {
        type: 'input',
        block_id: 'meet_link_block',
        label: { type: 'plain_text', text: 'Google Meet 링크' },
        element: {
          type: 'url_text_input',
          action_id: 'meet_link_input',
          placeholder: { type: 'plain_text', text: 'https://meet.google.com/xxx-xxxx-xxx' },
          ...(currentLink ? { initial_value: currentLink } : {}),
        },
      },
    ],
  };
}

// ─── SQA Select Modal ───

export function buildSqaSelectModal(
  messageTs?: string,
  channelId?: string,
  currentSelections?: SqaSelection[],
): Record<string, unknown> {
  const metadata = JSON.stringify({
    messageTs,
    channelId,
    source: messageTs ? 'message' : 'home',
  });

  const element: Record<string, unknown> = {
    type: 'multi_external_select',
    action_id: 'sqa_select',
    placeholder: { type: 'plain_text', text: 'SQA 티켓 검색 (복수 선택 가능)' },
    min_query_length: 0,
  };

  if (currentSelections && currentSelections.length > 0) {
    element.initial_options = currentSelections.map((s) => ({
      text: {
        type: 'plain_text' as const,
        text: `${s.key} - ${s.summary}`.substring(0, 75),
      },
      value: `${s.key}::${s.summary}`.substring(0, 150),
    }));
  }

  return {
    type: 'modal',
    callback_id: 'sqa_select_submit',
    title: { type: 'plain_text', text: 'SQA 선택' },
    submit: { type: 'plain_text', text: '확인' },
    close: { type: 'plain_text', text: '취소' },
    private_metadata: metadata,
    blocks: [
      {
        type: 'input',
        block_id: 'sqa_select_block',
        optional: true,
        label: { type: 'plain_text', text: '현재 진행중인 QA를 선택하세요' },
        element,
      },
    ],
  };
}
