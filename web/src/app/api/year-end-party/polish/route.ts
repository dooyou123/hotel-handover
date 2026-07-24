import { NextResponse } from 'next/server';
import { polishInvitationLocally } from '@/lib/year-end-party/helpers';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? '';
  if (!text) {
    return NextResponse.json({ error: '문구가 비어 있습니다.' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      text: polishInvitationLocally(text),
      source: 'local',
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `다음 연말 회식 초청 문구를 카카오톡/슬랙에 보내기 좋게 센스 있고 친근하게 다듬어 주세요. 내용은 유지하고 과장하지 마세요. 결과만 한국어로 출력하세요.\n\n${text}`,
                },
              ],
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      return NextResponse.json({
        text: polishInvitationLocally(text),
        source: 'local-fallback',
      });
    }
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const polished =
      json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim() ||
      polishInvitationLocally(text);
    return NextResponse.json({ text: polished, source: 'gemini' });
  } catch {
    return NextResponse.json({
      text: polishInvitationLocally(text),
      source: 'local-fallback',
    });
  }
}
