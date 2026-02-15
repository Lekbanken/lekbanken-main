'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarDownloadButtonProps {
  getPng: () => Promise<string | null>
  className?: string
}

/**
 * AvatarDownloadButton
 *
 * Downloads the current avatar as a PNG file.
 */
export function AvatarDownloadButton({ getPng, className = '' }: AvatarDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    try {
      const dataUrl = await getPng()
      if (!dataUrl) return

      const link = document.createElement('a')
      link.download = 'min-avatar.png'
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setIsDownloading(false)
    }
  }, [getPng])

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        'border border-border bg-card text-foreground hover:bg-muted',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
      </svg>
      {isDownloading ? 'Laddar ner...' : 'Ladda ner'}
    </button>
  )
}

export default AvatarDownloadButton
