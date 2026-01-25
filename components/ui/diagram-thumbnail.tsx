'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type DiagramThumbnailProps = {
  url: string
  alt?: string
  className?: string
}

/**
 * DiagramThumbnail displays a coach diagram SVG with its background court image.
 * 
 * The SVG from /api/coach-diagrams/{id}/svg contains relative image URLs
 * (e.g., /court/basket-court.png) which don't load when displayed via <img>.
 * 
 * This component loads the SVG content and renders it as inline SVG,
 * overlaid on the court background, allowing the images to load correctly.
 * 
 * IMPORTANT: Both the background image and SVG overlay must have identical
 * dimensions to ensure markers appear in correct positions.
 */
export function DiagramThumbnail({ url, alt = '', className }: DiagramThumbnailProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [courtUrl, setCourtUrl] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState<{ width: number; height: number } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchSvg() {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch SVG')
        
        const text = await res.text()
        if (cancelled) return

        // Parse SVG to extract court background image and viewBox
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(text, 'image/svg+xml')
        const svgEl = svgDoc.documentElement
        
        // Extract viewBox dimensions
        const viewBoxAttr = svgEl.getAttribute('viewBox')
        if (viewBoxAttr) {
          const parts = viewBoxAttr.split(/\s+/)
          if (parts.length >= 4) {
            setViewBox({ width: parseFloat(parts[2]), height: parseFloat(parts[3]) })
          }
        }
        
        const imageEl = svgDoc.querySelector('image')
        
        if (imageEl) {
          const href = imageEl.getAttribute('href') || imageEl.getAttribute('xlink:href')
          if (href?.startsWith('/court/')) {
            setCourtUrl(href)
            // Remove the background image from SVG (we'll show it separately)
            imageEl.remove()
          }
        }

        // Get the modified SVG as string
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgDoc.documentElement)
        setSvgContent(svgString)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    void fetchSvg()
    return () => { cancelled = true }
  }, [url])

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-muted text-muted-foreground text-xs', className)}>
        Kunde inte ladda diagram
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/50', className)}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  // Calculate aspect ratio from viewBox (default to 600x1000 = 3:5)
  const aspectRatio = viewBox ? viewBox.width / viewBox.height : 0.6

  return (
    <div className={cn('relative w-full h-full pointer-events-none overflow-hidden', className)}>
      {/* Container that maintains the SVG aspect ratio and centers content */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
      >
        <div 
          className="relative h-full max-w-full"
          style={{ aspectRatio: aspectRatio }}
        >
          {/* Background court image - fills the aspect-ratio container */}
          {courtUrl && (
            <Image
              src={courtUrl}
              alt=""
              fill
              className="object-fill"
              sizes="400px"
            />
          )}
          {/* SVG overlay - exactly same size as background */}
          <div
            className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            aria-label={alt}
          />
        </div>
      </div>
    </div>
  )
}
