export type LinkifiedPart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function stripTrailingPunctuation(url: string): { href: string; trailing: string } {
  let href = url;
  let trailing = '';

  while (href.length > 0) {
    const last = href.at(-1);
    if (!last || !/[)\].,;:!?]/.test(last)) break;

    if (last === ')') {
      const opens = (href.match(/\(/g) ?? []).length;
      const closes = (href.match(/\)/g) ?? []).length;
      if (closes <= opens) break;
    }

    trailing = last + trailing;
    href = href.slice(0, -1);
  }

  return { href, trailing };
}

export function splitTextWithLinks(text: string): LinkifiedPart[] {
  if (!text) return [];

  const parts: LinkifiedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    const { href, trailing } = stripTrailingPunctuation(raw);
    if (href.startsWith('http://') || href.startsWith('https://')) {
      parts.push({ type: 'link', value: href, href });
      if (trailing) parts.push({ type: 'text', value: trailing });
    } else {
      parts.push({ type: 'text', value: raw });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}
