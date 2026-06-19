import type { ElementType, ReactNode } from 'react';
import { splitTextWithLinks } from '@/lib/text/linkify';

type LinkifiedTextProps = {
  text: string;
  className?: string;
  as?: ElementType;
};

function renderParts(text: string): ReactNode[] {
  const lines = text.split('\n');

  return lines.flatMap((line, lineIndex) => {
    const nodes: ReactNode[] = [];
    if (lineIndex > 0) nodes.push(<br key={`br-${lineIndex}`} />);

    splitTextWithLinks(line).forEach((part, partIndex) => {
      const key = `${lineIndex}-${partIndex}`;
      if (part.type === 'link') {
        nodes.push(
          <a
            key={key}
            href={part.href}
            className="linkified-text__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.value}
          </a>,
        );
        return;
      }
      nodes.push(<span key={key}>{part.value}</span>);
    });

    return nodes;
  });
}

export function LinkifiedText({ text, className, as: Tag = 'div' }: LinkifiedTextProps) {
  return <Tag className={['linkified-text', className].filter(Boolean).join(' ')}>{renderParts(text)}</Tag>;
}
