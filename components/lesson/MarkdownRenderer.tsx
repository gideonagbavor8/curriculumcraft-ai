import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={key++} className="font-semibold text-gray-900">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length === 0 ? text : parts;
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    const bullet = line.match(/^[-•]\s+(.+)/);
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    const blank = line.trim() === "";

    if (h3) {
      elements.push(
        <p
          key={index}
          className="text-[11px] font-bold uppercase tracking-widest text-green-700 mt-4 mb-1"
        >
          {inlineFormat(h3[1])}
        </p>
      );
    } else if (h2) {
      elements.push(
        <p
          key={index}
          className="text-sm font-bold text-gray-900 mt-4 mb-1"
        >
          {inlineFormat(h2[1])}
        </p>
      );
    } else if (h1) {
      elements.push(
        <p
          key={index}
          className="text-base font-bold text-gray-900 mt-4 mb-2"
        >
          {inlineFormat(h1[1])}
        </p>
      );
    } else if (bullet) {
      elements.push(
        <div key={index} className="flex gap-2 my-0.5 pl-1">
          <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">•</span>
          <span className="text-sm text-gray-700 leading-relaxed">
            {inlineFormat(bullet[1])}
          </span>
        </div>
      );
    } else if (numbered) {
      elements.push(
        <div key={index} className="flex gap-2 my-0.5 pl-1">
          <span className="text-green-700 font-semibold text-sm flex-shrink-0 min-w-[18px]">
            {numbered[1]}.
          </span>
          <span className="text-sm text-gray-700 leading-relaxed">
            {inlineFormat(numbered[2])}
          </span>
        </div>
      );
    } else if (blank) {
      elements.push(<div key={index} className="h-1.5" />);
    } else {
      elements.push(
        <p key={index} className="text-sm text-gray-700 leading-relaxed my-0.5">
          {inlineFormat(line)}
        </p>
      );
    }
  });

  return <div className={`space-y-0 ${className}`}>{elements}</div>;
}