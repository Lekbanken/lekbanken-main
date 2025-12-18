import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="space-y-4 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 text-xl font-semibold tracking-tight text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-7 text-foreground">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-foreground underline underline-offset-4"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className)
            if (isBlock) {
              return <code className={className}>{children}</code>
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
