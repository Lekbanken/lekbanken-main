'use client'

import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react'
import type { AvatarConfig, AvatarCategory } from '../types'
import { LAYER_ORDER } from '../types'
import { getPartById, getColorHex } from '../seed-data'

export interface AvatarRendererHandle {
  exportToPng: () => Promise<string | null>
}

interface AvatarRendererProps {
  config: AvatarConfig
  size?: number
  className?: string
}

/**
 * AvatarRenderer
 * 
 * Renders stacked SVG layers based on the avatar configuration.
 * Exposes an imperative handle to export the avatar as a PNG data URL.
 */
export const AvatarRenderer = forwardRef<AvatarRendererHandle, AvatarRendererProps>(
  function AvatarRenderer({ config, size = 200, className = '' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Export the avatar to PNG using canvas
    const exportToPng = useCallback(async (): Promise<string | null> => {
      if (!containerRef.current) return null

      try {
        // Create a combined SVG from all layers
        const svgContent = buildCombinedSvg(config, size)
        
        // Create a blob URL for the SVG
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)

        // Load into an image
        const img = new Image()
        img.width = size
        img.height = size

        const loadPromise = new Promise<string>((resolve, reject) => {
          img.onload = () => {
            // Draw to canvas
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'))
              return
            }

            // Fill background (optional - transparent by default)
            ctx.fillStyle = '#f8fafc' // Light gray background
            ctx.fillRect(0, 0, size, size)
            
            // Draw the image
            ctx.drawImage(img, 0, 0, size, size)
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png')
            URL.revokeObjectURL(svgUrl)
            resolve(dataUrl)
          }

          img.onerror = () => {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to load SVG'))
          }
        })

        img.src = svgUrl
        return await loadPromise
      } catch (error) {
        console.error('Failed to export avatar to PNG:', error)
        return null
      }
    }, [config, size])

    // Expose the export function via ref
    useImperativeHandle(ref, () => ({
      exportToPng,
    }), [exportToPng])

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Render layers in correct z-order */}
        {LAYER_ORDER.map((category, index) => (
          <LayerSvg
            key={category}
            category={category}
            config={config}
            size={size}
            zIndex={index + 1}
          />
        ))}
      </div>
    )
  }
)

// Individual layer component
interface LayerSvgProps {
  category: AvatarCategory
  config: AvatarConfig
  size: number
  zIndex: number
}

function LayerSvg({ category, config, size, zIndex }: LayerSvgProps) {
  const layerConfig = config.layers[category]
  if (!layerConfig?.partId) return null

  const part = getPartById(category, layerConfig.partId)
  if (!part) return null

  // Get the color to apply
  const colorHex = layerConfig.color 
    ? getColorHex(category, layerConfig.color)
    : part.defaultColorToken 
      ? getColorHex(category, part.defaultColorToken)
      : undefined

  // Apply color to SVG via style
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: size,
    height: size,
    zIndex,
    ...(colorHex && part.supportsColor ? { color: colorHex } : {}),
  }

  return (
    <div
      style={style}
      dangerouslySetInnerHTML={{ __html: part.svg }}
    />
  )
}

// Build a combined SVG string for export
function buildCombinedSvg(config: AvatarConfig, size: number): string {
  const layers: string[] = []

  for (const category of LAYER_ORDER) {
    const layerConfig = config.layers[category]
    if (!layerConfig?.partId) continue

    const part = getPartById(category, layerConfig.partId)
    if (!part) continue

    // Get the color
    const colorHex = layerConfig.color 
      ? getColorHex(category, layerConfig.color)
      : part.defaultColorToken 
        ? getColorHex(category, part.defaultColorToken)
        : '#888888'

    // Extract the inner content of the SVG (without the wrapper)
    const svgContent = part.svg
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, '')

    // Wrap in a group with the color applied
    if (part.supportsColor && colorHex) {
      layers.push(`<g fill="${colorHex}" color="${colorHex}">${svgContent}</g>`)
    } else {
      layers.push(`<g>${svgContent}</g>`)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
    <rect width="100" height="100" fill="#f8fafc" rx="50"/>
    ${layers.join('\n')}
  </svg>`
}

export default AvatarRenderer
