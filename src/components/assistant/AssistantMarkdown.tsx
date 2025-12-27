/**
 * Assistant Markdown Renderer
 * 
 * Renders markdown content with custom styling for the Assistant chat.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface AssistantMarkdownProps {
  content: string;
  className?: string;
}

export function AssistantMarkdown({ content, className }: AssistantMarkdownProps) {
  return (
    <div className={cn("assistant-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),

          // Headers
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-white mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-white mb-1">{children}</h3>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-zinc-300">{children}</li>
          ),

          // Code
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-zinc-700 text-indigo-300 text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-zinc-800 rounded-lg p-3 overflow-x-auto mb-2">
                <code className="text-xs font-mono text-zinc-300" {...props}>
                  {children}
                </code>
              </pre>
            );
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-zinc-400 italic">
              {children}
            </blockquote>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-zinc-700" />
          ),

          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-700">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left text-zinc-300 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-zinc-400">{children}</td>
          ),

          // Task lists (GFM)
          input: ({ checked, ...props }: any) => (
            <input
              type="checkbox"
              checked={checked}
              disabled
              className="mr-2 accent-indigo-500"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default AssistantMarkdown;
