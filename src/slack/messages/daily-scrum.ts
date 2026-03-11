import type { Settings } from '../../types';

export interface SqaLink {
  sqaKey: string;
  summary?: string;
  url: string;
}

export function buildDailyScrumMessage(
  facilitatorSlackId: string,
  settings: Settings,
  boardBaseUrl: string,
  sqaLinks?: SqaLink[],
): { blocks: unknown[]; text: string } {
  const boardUrl = `${boardBaseUrl}${settings.boardId}`;
  const hasSqa = sqaLinks && sqaLinks.length > 0;

  const text = `<@${facilitatorSlackId}> 오늘의 데일리 스크럼 진행자입니다!`;

  const blocks: unknown[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<@${facilitatorSlackId}> 오늘의 데일리 스크럼 진행자입니다! 🎙️`,
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📹 Google Meet 참여하기', emoji: true },
          url: settings.meetLink,
          action_id: 'open_meet',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '📋 PI 보드 바로가기', emoji: true },
          url: boardUrl,
          action_id: 'open_board',
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*현재 진행중인 QA가 있나요?*\nSQA 티켓을 선택해주세요.',
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: hasSqa ? '✏️ SQA 수정하기' : '🔍 SQA 입력하기',
          emoji: true,
        },
        action_id: 'open_sqa_select',
        style: 'primary',
      },
    },
  ];

  // ─── Append SQA results if present ───
  if (hasSqa) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*📌 QA 관련 DEF 보드 링크*' },
    });
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '👥 우리 팀 멤버가 담당자(assignee)인 티켓만 필터링된 보드입니다.',
        },
      ],
    });

    for (const link of sqaLinks) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: link.summary ? `*${link.sqaKey}* - ${link.summary}` : `*${link.sqaKey}*`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: `${link.sqaKey} DEF 보드`, emoji: true },
          url: link.url,
          action_id: `open_def_${link.sqaKey}`,
        },
      });
    }
  }

  return { blocks, text };
}
