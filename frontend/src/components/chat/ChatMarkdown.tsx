import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Models occasionally emit a stray "- " with no text before a heading; strip those
// so we don't render an empty bullet point.
function stripEmptyBullets(text: string) {
  return text.replace(/^[ \t]*[-*][ \t]*$\n?/gm, "");
}

export function ChatMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto rounded-xl border border-brown-100">
            <table className="w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-brown-50">{children}</thead>,
        tr: ({ children }) => <tr className="border-b border-brown-100 last:border-0">{children}</tr>,
        th: ({ children }) => <th className="px-2.5 py-1.5 font-semibold text-ink">{children}</th>,
        td: ({ children }) => <td className="px-2.5 py-1.5">{children}</td>,
      }}
    >
      {stripEmptyBullets(children)}
    </Markdown>
  );
}
