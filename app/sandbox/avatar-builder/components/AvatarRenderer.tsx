'use client'

import { forwardRef, useImperativeHandle, useCallback, useState } from 'react'
import Image from 'next/image'
import type { AvatarConfig, AvatarCategory } from '../types'
import { LAYER_ORDER, getColorLookupCategory } from '../types'
import { getPartById, getLayerFilter, getLayerTint } from '../seed-data'
import { cn } from '@/lib/utils'

export interface AvatarRendererHandle {
  exportToPng: () => Promise<string | null>
}

interface AvatarRendererProps {
  config: AvatarConfig
  size?: number
  className?: string
}

/** Load an image and return a promise */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

/**
 * AvatarRenderer v2
 *
 * Renders stacked PNG layers with optional CSS filter tinting.
 * Exposes exportToPng() via imperative handle for canvas export.
 */
export const AvatarRenderer = forwardRef<AvatarRendererHandle, AvatarRendererProps>(
  function AvatarRenderer({ config, size = 200, className = '' }, ref) {
    const [_loadedLayers, setLoadedLayers] = useState<Set<string>>(new Set())

    // Export the composite avatar to a PNG data URL via canvas
    const exportToPng = useCallback(async (): Promise<string | null> => {
      try {
        const s = size * 2 // 2x for retina
        const canvas = document.createElement('canvas')
        canvas.width = s
        canvas.height = s
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        // Circular clip + background
        ctx.fillStyle = '#f1f5f9'
        ctx.beginPath()
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.clip()

        // Draw each layer in order, applying filter
        for (const category of LAYER_ORDER) {
          const layerConfig = config.layers[category]
          if (!layerConfig?.partId) continue

          const part = getPartById(category, layerConfig.partId)
          if (!part) continue

          // Resolve linked color (e.g. nose inherits face's skin color)
          const lookupCat = getColorLookupCategory(category)
          const effectiveColorId = config.layers[lookupCat]?.colorId
          const tintColor = getLayerTint(lookupCat, effectiveColorId)
          const filterStr = tintColor ? 'none' : getLayerFilter(lookupCat, effectiveColorId)
          const img = await loadImage(part.src)

          if (tintColor) {
            // Tint via canvas composite: color-blend the tint onto the image
            const tmp = document.createElement('canvas')
            tmp.width = s
            tmp.height = s
            const tCtx = tmp.getContext('2d')!
            // 1. Draw original image
            tCtx.drawImage(img, 0, 0, s, s)
            // 2. Apply 'color' blend (takes hue+sat from fill, luminance from image)
            tCtx.globalCompositeOperation = 'color'
            tCtx.fillStyle = tintColor
            tCtx.fillRect(0, 0, s, s)
            // 3. Clip to original alpha
            tCtx.globalCompositeOperation = 'destination-in'
            tCtx.drawImage(img, 0, 0, s, s)
            // 4. Draw result onto main canvas
            ctx.drawImage(tmp, 0, 0)
          } else if (filterStr && filterStr !== 'none') {
            ctx.save()
            ctx.filter = filterStr
            ctx.drawImage(img, 0, 0, s, s)
            ctx.restore()
          } else {
            ctx.drawImage(img, 0, 0, s, s)
          }
        }

        return canvas.toDataURL('image/png')
      } catch (error) {
        console.error('Failed to export avatar to PNG:', error)
        return null
      }
    }, [config, size])

    useImperativeHandle(ref, () => ({ exportToPng }), [exportToPng])

    const handleLayerLoad = useCallback((category: string) => {
      setLoadedLayers((prev) => new Set(prev).add(category))
    }, [])

    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-slate-200',
          className
        )}
        style={{ width: size, height: size }}
      >
        {/* Render layers in correct z-order */}
        {LAYER_ORDER.map((category, index) => (
          <LayerImage
            key={category}
            category={category}
            config={config}
            size={size}
            zIndex={index + 1}
            onLoad={() => handleLayerLoad(category)}
          />
        ))}
      </div>
    )
  }
)

// Individual PNG layer with optional CSS filter
interface LayerImageProps {
  category: AvatarCategory
  config: AvatarConfig
  size: number
  zIndex: number
  onLoad?: () => void
}

function LayerImage({ category, config, size, zIndex, onLoad }: LayerImageProps) {
  const layerConfig = config.layers[category]
  if (!layerConfig?.partId) return null

  const part = getPartById(category, layerConfig.partId)
  if (!part) return null

  // Resolve linked color (e.g. nose inherits face's skin color)
  const lookupCat = getColorLookupCategory(category)
  const effectiveColorId = config.layers[lookupCat]?.colorId
  const tintColor = getLayerTint(lookupCat, effectiveColorId)
  const filterStr = tintColor ? undefined : getLayerFilter(lookupCat, effectiveColorId)

  // Unique SVG filter ID per layer
  const filterId = tintColor ? `avatar-tint-${category}` : null

  return (
    <>
      {/* Inline SVG filter: feFlood + feBlend(color) applies hue/sat from tint, keeps image luminance */}
      {tintColor && filterId && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feFlood floodColor={tintColor} result="tint" />
              <feBlend in="SourceGraphic" in2="tint" mode="color" result="tinted" />
              <feComposite in="tinted" in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
        </svg>
      )}
      <Image
        src={part.src}
        alt={part.name}
        width={size}
        height={size}
        className="absolute inset-0 w-full h-full object-contain transition-all duration-200"
        style={{
          zIndex,
          filter: filterId
            ? `url(#${filterId})`
            : filterStr && filterStr !== 'none'
              ? filterStr
              : undefined,
        }}
        onLoad={onLoad}
        draggable={false}
        priority={category === 'face'}
      />
    </>
  )
}

export default AvatarRenderer
