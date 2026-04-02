import type { Settings, TeamMember, Facilitators, Weekday, SqaSelection, BoardConfig } from '../../types';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
};

const WEEKDAY_ORDER: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export function buildHomeTab(
  members: TeamMember[],
  facilitators: Facilitators | null,
  settings: Settings | null,
  isTeamMember: boolean,
  sqaSelections?: SqaSelection[],
  boards?: BoardConfig[],
): Record<string, unknown> {
  const blocks: unknown[] = [];

  // ─── Header ───
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: '📋 Daily Scrum Helper 설정', emoji: true },
  });
  blocks.push({ type: 'divider' });

  // ─── Team Members ───
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*👥 팀 인원 (${members.length}명)*`,
    },
  });

  if (members.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_등록된 팀원이 없습니다._' },
    });
  } else {
    for (const member of members) {
      const memberBlock: Record<string, unknown> = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${member.slackUserId}>  │  Jira: \`${member.jiraAccountId}\``,
        },
      };

      if (isTeamMember) {
        memberBlock.accessory = {
          type: 'button',
          text: { type: 'plain_text', text: '삭제', emoji: true },
          action_id: `remove_member_${member.slackUserId}`,
          style: 'danger',
          confirm: {
            title: { type: 'plain_text', text: '팀원 삭제' },
            text: {
              type: 'mrkdwn',
              text: `<@${member.slackUserId}>님을 팀에서 제거할까요?`,
            },
            confirm: { type: 'plain_text', text: '삭제' },
            deny: { type: 'plain_text', text: '취소' },
          },
        };
      }

      blocks.push(memberBlock);
    }
  }

  if (isTeamMember || members.length === 0) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ 팀원 추가', emoji: true },
          action_id: 'add_member',
          style: 'primary',
        },
      ],
    });
  }

  blocks.push({ type: 'divider' });

  // ─── Facilitators ───
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*📅 요일별 진행자*' },
  });

  if (facilitators) {
    const facilitatorLines = WEEKDAY_ORDER.map((day) => {
      const userId = facilitators[day];
      return `${WEEKDAY_LABELS[day]}: ${userId ? `<@${userId}>` : '_미지정_'}`;
    });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: facilitatorLines.join('  │  ') },
    });
  } else {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_진행자가 설정되지 않았습니다._' },
    });
  }

  if (isTeamMember) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '진행자 설정 변경', emoji: true },
          action_id: 'edit_facilitators',
        },
      ],
    });
  }

  blocks.push({ type: 'divider' });

  // ─── SQA ───
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*🔍 현재 SQA*' },
  });

  if (sqaSelections && sqaSelections.length > 0) {
    const sqaLines = sqaSelections.map((s) => `• *${s.key}* - ${s.summary}`);
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: sqaLines.join('\n') },
    });
  } else {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_설정된 SQA가 없습니다._' },
    });
  }

  if (isTeamMember) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: sqaSelections && sqaSelections.length > 0 ? 'SQA 변경' : 'SQA 설정',
            emoji: true,
          },
          action_id: 'open_sqa_select_home',
        },
      ],
    });
  }

  blocks.push({ type: 'divider' });

  // ─── Boards ───
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*📋 Jira 보드 (${boards?.length ?? 0}개)*` },
  });

  if (boards && boards.length > 0) {
    for (const board of boards) {
      const boardBlock: Record<string, unknown> = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${board.url}|${board.name}>`,
        },
      };

      if (isTeamMember) {
        boardBlock.accessory = {
          type: 'button',
          text: { type: 'plain_text', text: '삭제', emoji: true },
          action_id: `remove_board_${board.id}`,
          style: 'danger',
          confirm: {
            title: { type: 'plain_text', text: '보드 삭제' },
            text: {
              type: 'mrkdwn',
              text: `*${board.name}* 보드를 제거할까요?`,
            },
            confirm: { type: 'plain_text', text: '삭제' },
            deny: { type: 'plain_text', text: '취소' },
          },
        };
      }

      blocks.push(boardBlock);
    }
  } else {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_등록된 보드가 없습니다._' },
    });
  }

  if (isTeamMember) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ 보드 추가', emoji: true },
          action_id: 'add_board',
          style: 'primary',
        },
      ],
    });
  }

  blocks.push({ type: 'divider' });

  // ─── Settings ───
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*⚙️ 기본 설정*' },
  });

  const channelText = settings?.channelId
    ? `<#${settings.channelId}>`
    : '_미설정_';

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*📺 발송 채널*\n${channelText}` },
  });

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '*📹 요일별 Meet 링크*' },
  });

  if (settings?.meetLinks) {
    const meetLines = WEEKDAY_ORDER.map((day) => {
      const link = settings.meetLinks[day];
      return `${WEEKDAY_LABELS[day]}: ${link || '_미설정_'}`;
    });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: meetLines.join('  │  ') },
    });
  } else {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_미설정_' },
    });
  }

  if (isTeamMember) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '채널 변경', emoji: true },
          action_id: 'edit_channel',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Meet 링크 변경', emoji: true },
          action_id: 'edit_meet_link',
        },
      ],
    });
  }

  return {
    type: 'home',
    blocks,
  };
}
