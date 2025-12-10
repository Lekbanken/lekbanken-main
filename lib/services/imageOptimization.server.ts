import 'server-only'

import sharp from 'sharp'

export type ImageFormat = 'webp' | 'avif' | 'png' | 'jpeg'
export type ImageSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CONFIGS: Record<ImageSize, { width: number; height: number }> = {
  sm: { width: 256, height: 256 },
  md: { width: 512, height: 512 },
  lg: { width: 1024, height: 1024 },
  xl: { width: 2048, height: 2048 },
}

export type OptimizationOptions = {
  format?: ImageFormat
  quality?: number
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

/**
 * Optimize an image buffer with Sharp
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options: OptimizationOptions = {}
): Promise<Buffer> {
  const {
    format = 'webp',
    quality = 80,
    width,
    height,
    fit = 'cover',
  } = options

  let pipeline = sharp(inputBuffer)

  // Resize if dimensions provided
  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit })
  }

  // Convert format and optimize
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality })
      break
    case 'avif':
      pipeline = pipeline.avif({ quality })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
      break
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 })
      break
  }

  return pipeline.toBuffer()
}

/**
 * Generate multiple responsive sizes for an image
 */
export async function generateResponsiveSizes(
  inputBuffer: Buffer,
  formats: ImageFormat[] = ['webp', 'jpeg']
): Promise<
  Array<{
    size: ImageSize
    format: ImageFormat
    buffer: Buffer
    width: number
    height: number
  }>
> {
  const results: Array<{
    size: ImageSize
    format: ImageFormat
    buffer: Buffer
    width: number
    height: number
  }> = []

  for (const size of Object.keys(SIZE_CONFIGS) as ImageSize[]) {
    const { width, height } = SIZE_CONFIGS[size]

    for (const format of formats) {
      const buffer = await optimizeImage(inputBuffer, {
        format,
        width,
        height,
        quality: format === 'avif' ? 75 : 80,
      })

      results.push({ size, format, buffer, width, height })
    }
  }

  return results
}

/**
 * Extract image metadata
 */
export async function getImageMetadata(inputBuffer: Buffer) {
  const metadata = await sharp(inputBuffer).metadata()
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: inputBuffer.length,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
  }
}

/**
 * Validate image dimensions and size
 */
export function validateImage(options: {
  maxWidth?: number
  maxHeight?: number
  maxSizeMB?: number
  allowedFormats?: string[]
}) {
  return async (buffer: Buffer): Promise<{ valid: boolean; error?: string }> => {
    const { maxWidth = 4096, maxHeight = 4096, maxSizeMB = 10, allowedFormats } = options

    const sizeMB = buffer.length / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return { valid: false, error: `File size exceeds ${maxSizeMB}MB` }
    }

    try {
      const metadata = await getImageMetadata(buffer)

      if (metadata.width && metadata.width > maxWidth) {
        return { valid: false, error: `Width exceeds ${maxWidth}px` }
      }

      if (metadata.height && metadata.height > maxHeight) {
        return { valid: false, error: `Height exceeds ${maxHeight}px` }
      }

      if (allowedFormats && metadata.format && !allowedFormats.includes(metadata.format)) {
        return { valid: false, error: `Format ${metadata.format} not allowed` }
      }

      return { valid: true }
    } catch {
      return { valid: false, error: 'Invalid image file' }
    }
  }
}
