export type ResendMailConfig = {
  apiKey: string;
  fromEmail: string;
};

export function isResendConfigComplete(config: {
  apiKey?: string | null;
  fromEmail?: string | null;
}): config is ResendMailConfig {
  const apiKey = config.apiKey?.trim() ?? '';
  const fromEmail = config.fromEmail?.trim() ?? '';
  return Boolean(apiKey && fromEmail && !apiKey.includes('your-'));
}

export function maskResendApiKey(apiKey: string | null | undefined): string | null {
  const key = apiKey?.trim() ?? '';
  if (!key) return null;
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

function buildGuestOtpEmail(code: string): { subject: string; text: string; html: string } {
  const subject = '[객실료 컨펌] 게스트 일회용 PIN';
  const text = [
    '호텔 인수인계 · 객실료 컨펌',
    '',
    '게스트 화면 입장을 위한 일회용 PIN입니다.',
    '',
    `일회용 PIN: ${code}`,
    '',
    '사용 방법',
    '1. 게스트 화면(/rate-confirm/guest)을 엽니다.',
    '2. PIN 요청에 사용한 이메일을 입력합니다.',
    '3. 위 PIN을 입력하고 입장합니다.',
    '',
    '유효 시간: 요청 후 약 15분',
    '한 번 사용하면 다시 쓸 수 없습니다. 만료되면 새로 요청해 주세요.',
    '',
    '본인이 요청하지 않았다면 이 메일을 무시하세요.',
    '고정 PIN이 필요한 경우 관리자에게 문의하세요.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1ec;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ec;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px 16px;background:#1e3a5f;color:#f8fafc;">
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Hotel Handover</p>
              <h1 style="margin:0;font-size:20px;font-weight:700;line-height:1.35;">객실료 컨펌 게스트 PIN</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">
                게스트 화면 입장을 위한 <strong>일회용 PIN</strong>입니다.<br />
                아래 번호를 게스트 입장 화면에 입력해 주세요.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                <tr>
                  <td align="center" style="padding:18px 12px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:12px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#64748b;letter-spacing:0.06em;">ONE-TIME PIN</p>
                    <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1c1917;">사용 방법</p>
              <ol style="margin:0 0 18px;padding-left:1.25rem;font-size:14px;line-height:1.7;color:#57534e;">
                <li>게스트 화면(<code style="font-size:12px;">/rate-confirm/guest</code>)을 엽니다.</li>
                <li>PIN 요청에 사용한 이메일을 입력합니다.</li>
                <li>위 PIN을 입력하고 입장합니다.</li>
              </ol>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
                <tr>
                  <td style="padding:12px 14px;font-size:13px;line-height:1.55;color:#92400e;">
                    <strong>유효 시간 약 15분</strong> · 한 번 사용하면 다시 쓸 수 없습니다.<br />
                    만료되었으면 게스트 화면에서 PIN을 다시 요청해 주세요.
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#78716c;">
                본인이 요청하지 않았다면 이 메일을 무시하세요.<br />
                메일 발송이 어려운 경우에는 관리자의 고정 PIN(백업)을 사용해 주세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendGuestOtpEmail(input: {
  to: string;
  code: string;
  config: ResendMailConfig;
}): Promise<void> {
  const apiKey = input.config.apiKey.trim();
  const from = input.config.fromEmail.trim();
  if (!apiKey || !from) {
    throw new Error('메일 발송 설정(Resend API 키·발신 메일)이 없습니다.');
  }

  const { subject, text, html } = buildGuestOtpEmail(input.code);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `메일 발송에 실패했습니다. (${res.status})`);
  }
}
