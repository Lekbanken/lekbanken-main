import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]} 
      skipHtml
      components={{
        // Style h2 headers (main sections)
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-foreground mt-8 mb-4 first:mt-0 pb-2 border-b border-border">
            {children}
          </h2>
        ),
        // Style h3 headers with more prominence and spacing
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-foreground mt-6 mb-3 first:mt-0">
            {children}
          </h3>
        ),
        // Style h4 headers
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 first:mt-0">
            {children}
          </h4>
        ),
        // Style paragraphs with proper spacing
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-relaxed">
            {children}
          </p>
        ),
        // Style unordered lists
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5">
            {children}
          </ul>
        ),
        // Style ordered lists
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-5 mb-4 space-y-1.5">
            {children}
          </ol>
        ),
        // Style list items
        li: ({ children }) => (
          <li className="leading-relaxed pl-1">
            {children}
          </li>
        ),
        // Style strong/bold text
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">
            {children}
          </strong>
        ),
        // Style links
        a: ({ children, href }) => (
          <a href={href} className="text-primary hover:underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
