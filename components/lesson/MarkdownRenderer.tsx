import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import CitationTooltip from "./CitationTooltip";
import type { Citation } from "@/types/curriculum";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  citations?: Citation[];
  onInspect?: () => void;
}

export function parseInlineContent(text: string, citations?: Citation[], onInspect?: () => void): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Regex to match: NaCCA codes (e.g. B7.1.2.1), inline math ($...$), bold (**...**), or italic (*...*)
  const regex = /([A-Z]\d+\.\d+\.\d+\.\d+|\$\$[^\$]+\$\$|\$[^\$]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);

  parts.forEach((part, i) => {
    if (!part) return;

    // Check if part is a NaCCA indicator code
    const isNacca = /^[A-Z]\d+\.\d+\.\d+\.\d+$/.test(part);
    if (isNacca) {
      const citation = citations?.find(c => c.text.includes(part));
      if (citation) {
        tokens.push(
          <CitationTooltip
            key={i}
            text={citation.text}
            source={citation.source}
            onClick={onInspect}
          >
            <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
              {part}
            </span>
          </CitationTooltip>
        );
      } else {
        tokens.push(
          <span key={i} className="font-mono font-semibold text-amber-700 dark:text-amber-400">
            {part}
          </span>
        );
      }
    } else if (part.startsWith("$$") && part.endsWith("$$")) {
      const math = part.slice(2, -2);
      try {
        const html = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
        });
        tokens.push(
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      } catch (e) {
        tokens.push(
          <span key={i} className="text-red-500 font-mono">
            {part}
          </span>
        );
      }
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1);
      try {
        const html = katex.renderToString(math, {
          displayMode: false,
          throwOnError: false,
        });
        tokens.push(
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      } catch (e) {
        tokens.push(
          <span key={i} className="text-red-500 font-mono">
            {part}
          </span>
        );
      }
    } else if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      tokens.push(
        <strong key={i} className="font-semibold text-gray-900 dark:text-white">
          {parseInlineContent(boldText, citations, onInspect)}
        </strong>
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      const italicText = part.slice(1, -1);
      tokens.push(<em key={i}>{parseInlineContent(italicText, citations, onInspect)}</em>);
    } else {
      tokens.push(<React.Fragment key={i}>{part}</React.Fragment>);
    }
  });

  return tokens.length === 0 ? [text] : tokens;
}

function processNormalText(text: string, baseKey: number, citations?: Citation[], onInspect?: () => void): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const key = baseKey + index;
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    const bullet = line.match(/^[-•]\s+(.+)/);
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    const blank = line.trim() === "";

    if (h3) {
      elements.push(
        <p
          key={key}
          className="text-[11px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400 mt-4 mb-1"
        >
          {parseInlineContent(h3[1], citations, onInspect)}
        </p>
      );
    } else if (h2) {
      elements.push(
        <p
          key={key}
          className="text-sm font-bold text-gray-900 dark:text-white mt-4 mb-1"
        >
          {parseInlineContent(h2[1], citations, onInspect)}
        </p>
      );
    } else if (h1) {
      elements.push(
        <p
          key={key}
          className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2"
        >
          {parseInlineContent(h1[1], citations, onInspect)}
        </p>
      );
    } else if (bullet) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5 pl-1">
          <span className="text-green-500 dark:text-green-400 font-bold mt-0.5 flex-shrink-0">
            •
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {parseInlineContent(bullet[1], citations, onInspect)}
          </span>
        </div>
      );
    } else if (numbered) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5 pl-1">
          <span className="text-green-700 dark:text-green-400 font-semibold text-sm flex-shrink-0 min-w-[18px]">
            {numbered[1]}.
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {parseInlineContent(numbered[2], citations, onInspect)}
          </span>
        </div>
      );
    } else if (blank) {
      elements.push(<div key={key} className="h-1.5" />);
    } else {
      elements.push(
        <p
          key={key}
          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-0.5"
        >
          {parseInlineContent(line, citations, onInspect)}
        </p>
      );
    }
  });

  return elements;
}

export default function MarkdownRenderer({
  content,
  className = "",
  citations,
  onInspect,
}: MarkdownRendererProps) {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const blockMathRegex = /\$\$([\s\S]+?)\$\_/g;

  // Let's implement block math extraction manually or using regex split to keep it clean.
  // To avoid regex limitations on giant strings, we split by $$:
  const parts = content.split("$$");
  let baseKey = 0;

  parts.forEach((part, index) => {
    // If the index is odd, it means this part is inside $$ ... $$
    if (index % 2 === 1) {
      const mathContent = part.trim();
      try {
        const html = katex.renderToString(mathContent, {
          displayMode: true,
          throwOnError: false,
        });
        elements.push(
          <div
            key={`math-block-${baseKey++}`}
            className="my-4 overflow-x-auto py-2 text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (e) {
        elements.push(
          <div
            key={`math-block-err-${baseKey++}`}
            className="text-red-500 font-mono my-2 text-center p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded"
          >
            $${part}$$
          </div>
        );
      }
    } else {
      // Normal markdown lines
      const linesElements = processNormalText(part, baseKey, citations, onInspect);
      elements.push(...linesElements);
      baseKey += part.split("\n").length;
    }
  });

  return <div className={`space-y-0 ${className}`}>{elements}</div>;
}