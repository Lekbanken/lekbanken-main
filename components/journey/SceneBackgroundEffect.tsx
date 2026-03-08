'use client'

import { cn } from '@/lib/utils'

export function SceneBackgroundEffect({
  className,
  accentColor,
}: {
  className?: string | null
  accentColor: string
}) {
  if (!className) return null

  if (className === 'scene-stars') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }, (_, index) => {
          const x = (index * 37 + 13) % 100
          const y = (index * 53 + 7) % 100
          const size = 1 + (index % 3) * 0.5
          const delay = (index * 0.3) % 5
          const duration = 3 + (index % 4)
          const color = index % 5 === 0 ? accentColor : 'rgba(255,255,255,0.9)'
          return (
            <div
              key={`far-star-${index}`}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                backgroundColor: color,
                opacity: 0.18,
                animation: `journey-star-twinkle ${duration}s ease-in-out infinite ${delay}s`,
              }}
            />
          )
        })}
        {Array.from({ length: 18 }, (_, index) => {
          const x = (index * 43 + 29) % 100
          const y = (index * 67 + 11) % 100
          const size = 2 + (index % 2)
          const delay = (index * 0.5) % 4
          return (
            <div
              key={`mid-star-${index}`}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                backgroundColor: accentColor,
                boxShadow: `0 0 ${size * 4}px ${accentColor}80`,
                opacity: 0.2,
                animation: `journey-star-twinkle ${2.5 + (index % 3)}s ease-in-out infinite ${delay}s`,
              }}
            />
          )
        })}
        {Array.from({ length: 5 }, (_, index) => {
          const x = ((index * 71 + 17) % 90) + 5
          const y = ((index * 83 + 23) % 80) + 10
          return (
            <div
              key={`near-star-${index}`}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, width: 8, height: 8 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                  animation: `journey-star-pulse ${4 + index}s ease-in-out infinite ${index * 0.8}s`,
                }}
              />
              <div
                className="absolute"
                style={{
                  top: '50%', left: '-120%', right: '-120%', height: 1,
                  background: `linear-gradient(90deg, transparent, ${accentColor}99, transparent)`,
                  transform: 'translateY(-50%)',
                }}
              />
              <div
                className="absolute"
                style={{
                  left: '50%', top: '-120%', bottom: '-120%', width: 1,
                  background: `linear-gradient(180deg, transparent, ${accentColor}99, transparent)`,
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          )
        })}
        <div
          className="absolute rounded-full"
          style={{
            width: 320,
            height: 320,
            top: '10%',
            right: '-5%',
            backgroundImage: `radial-gradient(ellipse at center, ${accentColor}24, transparent 70%)`,
            filter: 'blur(40px)',
            animation: 'journey-nebula-drift 20s ease-in-out infinite',
          }}
        />
      </div>
    )
  }

  if (className === 'scene-clouds') {
    const clouds = [
      { x: -8, y: 10, w: 360, h: 112, opacity: 0.28, duration: 45, delay: 0 },
      { x: 12, y: 34, w: 300, h: 92, opacity: 0.32, duration: 55, delay: -10 },
      { x: 58, y: 54, w: 390, h: 118, opacity: 0.22, duration: 50, delay: -25 },
      { x: -18, y: 72, w: 320, h: 96, opacity: 0.24, duration: 60, delay: -15 },
      { x: 38, y: 18, w: 250, h: 76, opacity: 0.34, duration: 40, delay: -30 },
      { x: 68, y: 78, w: 280, h: 84, opacity: 0.22, duration: 65, delay: -5 },
    ]
    const streaks = [
      { x: 8, y: 24, w: 420, h: 4, opacity: 0.14, duration: 35, delay: 0 },
      { x: -12, y: 48, w: 460, h: 3, opacity: 0.12, duration: 42, delay: -8 },
      { x: 22, y: 68, w: 380, h: 2.5, opacity: 0.1, duration: 38, delay: -18 },
    ]

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {clouds.map((cloud, index) => (
          <div
            key={`cloud-${index}`}
            className="absolute"
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: cloud.w,
              height: cloud.h,
              opacity: cloud.opacity,
              animation: `journey-cloud-drift-${index % 3} ${cloud.duration}s ease-in-out infinite ${cloud.delay}s`,
            }}
          >
            <svg
              viewBox="0 0 300 120"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              style={{ filter: 'blur(10px) drop-shadow(0 8px 18px rgba(255,255,255,0.08))' }}
            >
              <defs>
                <linearGradient id={`journey-cloud-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                  <stop offset="70%" stopColor="rgba(244,248,255,1)" />
                  <stop offset="100%" stopColor="rgba(220,232,248,1)" />
                </linearGradient>
                <linearGradient id={`journey-cloud-shadow-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor={`${accentColor}22`} />
                </linearGradient>
              </defs>
              <path
                d="M48 84 C32 84 20 74 20 60 C20 45 34 34 50 36 C55 22 70 14 86 14 C100 14 112 20 120 30 C128 18 144 10 162 10 C186 10 206 22 214 40 C218 38 223 36 230 36 C248 36 262 49 262 66 C262 79 250 90 234 90 H48 Z"
                fill={`url(#journey-cloud-fill-${index})`}
              />
              <path
                d="M48 84 C32 84 20 74 20 60 C20 45 34 34 50 36 C55 22 70 14 86 14 C100 14 112 20 120 30 C128 18 144 10 162 10 C186 10 206 22 214 40 C218 38 223 36 230 36 C248 36 262 49 262 66 C262 79 250 90 234 90 H48 Z"
                fill={`url(#journey-cloud-shadow-${index})`}
              />
            </svg>
            <div
              className="absolute inset-x-[12%] bottom-[10%] h-[18%] rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
          </div>
        ))}
        {streaks.map((streak, index) => (
          <div
            key={`cloud-streak-${index}`}
            className="absolute"
            style={{
              left: `${streak.x}%`,
              top: `${streak.y}%`,
              width: streak.w,
              height: streak.h,
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,${Math.min(streak.opacity * 0.85, 0.16)}), ${accentColor}${Math.round(streak.opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
              filter: 'blur(10px)',
              animation: `journey-cloud-drift-${(index + 1) % 3} ${streak.duration}s ease-in-out infinite ${streak.delay}s`,
            }}
          />
        ))}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: '72%',
            height: '56%',
            background: `conic-gradient(from 180deg at 50% 0%, transparent 33%, rgba(255,255,255,0.14) 40%, ${accentColor}20 44%, transparent 47%, transparent 50%, ${accentColor}14 54%, rgba(255,255,255,0.12) 58%, transparent 66%)`,
            filter: 'blur(18px)',
            animation: 'journey-sunray-pulse 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-40"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, ${accentColor}16 40%, transparent 100%)`,
          }}
        />
      </div>
    )
  }

  if (className === 'scene-leaves') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }, (_, index) => {
          const size = 14 + (index % 4) * 6
          const x = ((index * 29 + 7) % 95) + 2
          const duration = 10 + (index % 5) * 4
          const delay = (index * 1.8) % 14
          return (
            <div
              key={`leaf-${index}`}
              className="absolute"
              style={{
                left: `${x}%`,
                top: '-8%',
                width: size,
                height: size,
                animation: `journey-leaf-fall-${index % 3} ${duration}s ease-in-out infinite ${delay}s`,
                opacity: 0,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                style={{ filter: `drop-shadow(0 0 3px ${accentColor}40)` }}
              >
                <path
                  d={index % 3 === 0
                    ? 'M12 2 C6 6, 2 12, 6 18 C8 20, 12 22, 12 22 C12 22, 16 20, 18 18 C22 12, 18 6, 12 2Z'
                    : index % 3 === 1
                      ? 'M12 1 C8 4, 3 10, 5 16 C7 20, 12 23, 12 23 C12 23, 17 20, 19 16 C21 10, 16 4, 12 1Z'
                      : 'M12 2 C7 5, 4 11, 7 17 C9 20, 12 22, 12 22 C12 22, 15 20, 17 17 C20 11, 17 5, 12 2Z'}
                  fill={`${accentColor}${index % 2 === 0 ? '45' : '35'}`}
                  stroke={`${accentColor}50`}
                  strokeWidth="0.5"
                />
                <path d="M12 4 L12 20" fill="none" stroke={`${accentColor}30`} strokeWidth="0.5" />
                <path d="M12 8 L8 6" fill="none" stroke={`${accentColor}20`} strokeWidth="0.3" />
                <path d="M12 12 L16 10" fill="none" stroke={`${accentColor}20`} strokeWidth="0.3" />
                <path d="M12 16 L8 14" fill="none" stroke={`${accentColor}20`} strokeWidth="0.3" />
              </svg>
            </div>
          )
        })}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            backgroundImage: `linear-gradient(0deg, ${accentColor}12 0%, transparent 100%)`,
          }}
        />
      </div>
    )
  }

  if (className === 'scene-rays') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => {
          const angle = -24 + index * 8
          const width = 30 + (index % 3) * 20
          const duration = 8 + index * 1.5
          return (
            <div
              key={`ray-${index}`}
              className="absolute"
              style={{
                top: '-20%',
                left: '50%',
                width,
                height: '140%',
                backgroundImage: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}88 30%, transparent 80%)`,
                opacity: 0.015,
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: 'top center',
                animation: `journey-ray-breathe ${duration}s ease-in-out infinite ${index * 0.5}s`,
              }}
            />
          )
        })}
        <div
          className="absolute"
          style={{
            top: '-5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 120,
            backgroundImage: `radial-gradient(circle, ${accentColor}cc, ${accentColor}66, transparent 70%)`,
            borderRadius: '50%',
            opacity: 0.03,
            filter: 'blur(25px)',
            animation: 'journey-source-pulse 4s ease-in-out infinite',
          }}
        />
      </div>
    )
  }

  if (className === 'scene-meteors') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 25 }, (_, index) => {
          const x = (index * 37 + 13) % 100
          const y = (index * 53 + 7) % 100
          return (
            <div
              key={`meteor-star-${index}`}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: 1.5,
                height: 1.5,
                backgroundColor: 'rgba(255,255,255,0.55)',
                animation: `journey-star-twinkle ${3 + (index % 3)}s ease-in-out infinite ${(index * 0.4) % 5}s`,
              }}
            />
          )
        })}
        {[0, 1, 2, 3, 4].map((index) => {
          const startX = 10 + index * 20
          const width = 60 + (index % 3) * 30
          const duration = 2 + (index % 3) * 0.8
          const delay = index * 3.5
          return (
            <div
              key={`meteor-${index}`}
              className="absolute"
              style={{
                top: `${5 + (index * 13) % 40}%`,
                left: `${startX}%`,
                width,
                height: 1.5,
                transformOrigin: 'left center',
                transform: 'rotate(25deg)',
                animation: `journey-meteor-shoot ${duration}s ease-in ${delay}s infinite`,
                opacity: 0,
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, transparent, ${accentColor}66, ${accentColor})`,
                  boxShadow: `0 0 6px ${accentColor}55`,
                }}
              />
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                style={{
                  backgroundColor: 'white',
                  boxShadow: `0 0 8px ${accentColor}, 0 0 16px ${accentColor}66`,
                }}
              />
            </div>
          )
        })}
        <div
          className="absolute"
          style={{
            width: 250,
            height: 250,
            top: '5%',
            left: '60%',
            backgroundImage: `radial-gradient(ellipse, ${accentColor}18, transparent 70%)`,
            filter: 'blur(50px)',
          }}
        />
      </div>
    )
  }

  if (className === 'scene-bubbles') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }, (_, index) => {
          const size = 8 + (index % 5) * 8
          const x = ((index * 23 + 11) % 95) + 2
          const duration = 8 + (index % 6) * 3
          const delay = (index * 1.3) % 12
          return (
            <div
              key={`bubble-${index}`}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                bottom: '-5%',
                border: `1.5px solid ${accentColor}${index % 3 === 0 ? '90' : '60'}`,
                background: `radial-gradient(ellipse at 30% 30%, ${accentColor}40, ${accentColor}10 60%, transparent 80%)`,
                boxShadow: `inset 0 -2px 4px ${accentColor}15, 0 0 8px ${accentColor}15`,
                animation: `journey-bubble-rise-${index % 3} ${duration}s ease-in-out infinite ${delay}s`,
              }}
            />
          )
        })}
        <div
          className="absolute"
          style={{
            width: 300,
            height: 300,
            bottom: '5%',
            left: '30%',
            backgroundImage: `radial-gradient(ellipse, ${accentColor}25, transparent 70%)`,
            filter: 'blur(50px)',
            animation: 'journey-ambient-drift 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            bottom: '15%',
            right: '15%',
            backgroundImage: `radial-gradient(ellipse, ${accentColor}20, transparent 70%)`,
            filter: 'blur(40px)',
            animation: 'journey-ambient-drift 12s ease-in-out infinite 3s',
          }}
        />
      </div>
    )
  }

  if (className === 'scene-waves') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-x-0 bottom-[-2%] h-[30%] min-h-[180px]"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${accentColor}08 30%, ${accentColor}16 62%, ${accentColor}20 100%)`,
          }}
        >
          <div className="absolute inset-x-[-35%] bottom-[18%] h-[44%]" style={{ animation: 'journey-wave-drift-1 13s ease-in-out infinite' }}>
            <svg className="h-full w-full" viewBox="0 0 1600 140" preserveAspectRatio="none">
              <path d="M0 60 Q 100 20, 200 60 T 400 60 T 600 60 T 800 60 T 1000 60 T 1200 60 T 1400 60 T 1600 60 V 140 H 0 Z" fill={`${accentColor}30`} />
              <path d="M0 82 Q 100 50, 200 82 T 400 82 T 600 82 T 800 82 T 1000 82 T 1200 82 T 1400 82 T 1600 82 V 140 H 0 Z" fill={`${accentColor}1c`} />
            </svg>
          </div>
          <div className="absolute inset-x-[-30%] bottom-[10%] h-[34%]" style={{ animation: 'journey-wave-drift-2 10s ease-in-out infinite' }}>
            <svg className="h-full w-full" viewBox="0 0 1600 100" preserveAspectRatio="none">
              <path d="M0 40 Q 80 10, 160 40 T 320 40 T 480 40 T 640 40 T 800 40 T 960 40 T 1120 40 T 1280 40 T 1440 40 T 1600 40 V 100 H 0 Z" fill={`${accentColor}28`} />
            </svg>
          </div>
          <div className="absolute inset-x-[-25%] bottom-0 h-[24%]" style={{ animation: 'journey-wave-drift-3 7s ease-in-out infinite' }}>
            <svg className="h-full w-full" viewBox="0 0 1600 70" preserveAspectRatio="none">
              <path d="M0 25 Q 60 5, 120 25 T 240 25 T 360 25 T 480 25 T 600 25 T 720 25 T 840 25 T 960 25 T 1080 25 T 1200 25 T 1320 25 T 1440 25 T 1600 25 V 70 H 0 Z" fill={`${accentColor}24`} />
            </svg>
          </div>
          <div
            className="absolute inset-x-0 bottom-[6%] h-[48%]"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 18% 52% at 15% 78%, ${accentColor}28, transparent),
                radial-gradient(ellipse 14% 44% at 38% 72%, ${accentColor}22, transparent),
                radial-gradient(ellipse 20% 56% at 62% 76%, ${accentColor}1e, transparent),
                radial-gradient(ellipse 14% 40% at 85% 84%, ${accentColor}24, transparent)
              `,
              animation: 'journey-caustic-shift 6s ease-in-out infinite',
            }}
          />
          <div
            className="absolute left-[8%] right-[8%] top-[18%] h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}18 20%, rgba(255,255,255,0.22) 50%, ${accentColor}18 80%, transparent 100%)`,
              filter: 'blur(1px)',
              animation: 'journey-surface-shimmer 4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    )
  }

  if (className === 'scene-fireflies') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 25 }, (_, index) => {
          const x = ((index * 31 + 13) % 90) + 5
          const y = ((index * 47 + 17) % 80) + 10
          const size = 3 + (index % 3) * 2
          const driftDuration = 6 + (index % 7) * 2
          const glowDelay = (index * 0.7) % 8
          return (
            <div
              key={`firefly-${index}`}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 ${size * 2}px ${accentColor}80, 0 0 ${size * 4}px ${accentColor}40, 0 0 ${size * 6}px ${accentColor}20`,
                  animation: `journey-firefly-glow ${2 + (index % 3)}s ease-in-out infinite ${glowDelay}s`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  animation: `journey-firefly-drift-${index % 4} ${driftDuration}s ease-in-out infinite ${glowDelay}s`,
                }}
              />
            </div>
          )
        })}
        <div
          className="absolute bottom-0 left-0 right-0 h-48"
          style={{
            backgroundImage: `linear-gradient(0deg, ${accentColor}0a 0%, transparent 100%)`,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            top: '30%',
            left: '20%',
            backgroundImage: `radial-gradient(ellipse, ${accentColor}10, transparent 70%)`,
            filter: 'blur(40px)',
            animation: 'journey-ambient-pulse 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: 180,
            height: 180,
            top: '50%',
            right: '15%',
            backgroundImage: `radial-gradient(ellipse, ${accentColor}0c, transparent 70%)`,
            filter: 'blur(35px)',
            animation: 'journey-ambient-pulse 10s ease-in-out infinite 3s',
          }}
        />
      </div>
    )
  }

  return <div className={cn('absolute inset-0', className)} />
}

export function SceneBackgroundEffectStyles() {
  return (
    <style jsx global>{`
      @keyframes journey-star-twinkle {
        0%, 100% { opacity: 0.15; }
        50% { opacity: 0.75; }
      }
      @keyframes journey-star-pulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 0.95; transform: scale(1.2); }
      }
      @keyframes journey-nebula-drift {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
        50% { transform: translate(-20px, 15px) scale(1.08); opacity: 0.85; }
      }
      @keyframes journey-cloud-drift-0 {
        0%, 100% { transform: translateX(-24px); }
        50% { transform: translateX(24px); }
      }
      @keyframes journey-cloud-drift-1 {
        0%, 100% { transform: translateX(20px); }
        50% { transform: translateX(-20px); }
      }
      @keyframes journey-cloud-drift-2 {
        0%, 100% { transform: translateX(-16px); }
        50% { transform: translateX(16px); }
      }
      @keyframes journey-sunray-pulse {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 0.8; }
      }
      @keyframes journey-ray-breathe {
        0%, 100% { opacity: 0.1; }
        50% { opacity: 0.25; }
      }
      @keyframes journey-source-pulse {
        0%, 100% { opacity: 0.12; transform: translateX(-50%) scale(1); }
        50% { opacity: 0.22; transform: translateX(-50%) scale(1.15); }
      }
      @keyframes journey-leaf-fall-0 {
        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
        5% { opacity: 0.7; }
        25% { transform: translateY(25vh) translateX(30px) rotate(90deg); }
        50% { transform: translateY(50vh) translateX(-20px) rotate(200deg); opacity: 0.5; }
        75% { transform: translateY(75vh) translateX(25px) rotate(300deg); opacity: 0.3; }
        100% { transform: translateY(110vh) translateX(-10px) rotate(400deg); opacity: 0; }
      }
      @keyframes journey-leaf-fall-1 {
        0% { transform: translateY(0) translateX(0) rotate(30deg); opacity: 0; }
        8% { opacity: 0.6; }
        30% { transform: translateY(28vh) translateX(-25px) rotate(120deg); }
        55% { transform: translateY(52vh) translateX(20px) rotate(240deg); opacity: 0.45; }
        80% { transform: translateY(78vh) translateX(-15px) rotate(340deg); opacity: 0.25; }
        100% { transform: translateY(108vh) translateX(10px) rotate(440deg); opacity: 0; }
      }
      @keyframes journey-leaf-fall-2 {
        0% { transform: translateY(0) translateX(0) rotate(-20deg); opacity: 0; }
        6% { opacity: 0.65; }
        20% { transform: translateY(22vh) translateX(20px) rotate(80deg); }
        45% { transform: translateY(48vh) translateX(-30px) rotate(180deg); opacity: 0.5; }
        70% { transform: translateY(72vh) translateX(15px) rotate(280deg); opacity: 0.3; }
        100% { transform: translateY(112vh) translateX(-8px) rotate(380deg); opacity: 0; }
      }
      @keyframes journey-meteor-shoot {
        0% { opacity: 0; transform: rotate(25deg) translateX(-100px); }
        10% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; transform: rotate(25deg) translateX(calc(100vw)); }
      }
      @keyframes journey-bubble-rise-0 {
        0% { transform: translateY(0) translateX(0) scale(0.4); opacity: 0; }
        8% { opacity: 0.7; transform: translateY(-5vh) translateX(0) scale(0.8); }
        50% { transform: translateY(-50vh) translateX(20px) scale(1); opacity: 0.5; }
        85% { opacity: 0.2; }
        100% { transform: translateY(-105vh) translateX(-10px) scale(0.9); opacity: 0; }
      }
      @keyframes journey-bubble-rise-1 {
        0% { transform: translateY(0) translateX(0) scale(0.3); opacity: 0; }
        10% { opacity: 0.65; transform: translateY(-8vh) translateX(0) scale(0.7); }
        50% { transform: translateY(-50vh) translateX(-15px) scale(1); opacity: 0.45; }
        90% { opacity: 0.15; }
        100% { transform: translateY(-110vh) translateX(8px) scale(0.85); opacity: 0; }
      }
      @keyframes journey-bubble-rise-2 {
        0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
        12% { opacity: 0.6; transform: translateY(-6vh) translateX(0) scale(0.75); }
        50% { transform: translateY(-48vh) translateX(12px) scale(1.05); opacity: 0.4; }
        88% { opacity: 0.2; }
        100% { transform: translateY(-108vh) translateX(-5px) scale(0.8); opacity: 0; }
      }
      @keyframes journey-ambient-drift {
        0%, 100% { transform: translateX(0) scale(1); opacity: 0.6; }
        50% { transform: translateX(20px) scale(1.1); opacity: 0.9; }
      }
      @keyframes journey-wave-drift-1 {
        0%, 100% { transform: translateX(-4%); }
        50% { transform: translateX(4%); }
      }
      @keyframes journey-wave-drift-2 {
        0%, 100% { transform: translateX(3%); }
        50% { transform: translateX(-3%); }
      }
      @keyframes journey-wave-drift-3 {
        0%, 100% { transform: translateX(-2.5%); }
        50% { transform: translateX(2.5%); }
      }
      @keyframes journey-caustic-shift {
        0%, 100% { opacity: 0.6; transform: translateX(0); }
        50% { opacity: 1; transform: translateX(10px); }
      }
      @keyframes journey-surface-shimmer {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      @keyframes journey-firefly-glow {
        0%, 100% { opacity: 0.15; transform: scale(0.6); }
        30% { opacity: 0.9; transform: scale(1.2); }
        50% { opacity: 0.7; transform: scale(1); }
        70% { opacity: 0.95; transform: scale(1.1); }
      }
      @keyframes journey-firefly-drift-0 {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(15px, -10px); }
        50% { transform: translate(-8px, -18px); }
        75% { transform: translate(10px, 5px); }
      }
      @keyframes journey-firefly-drift-1 {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(-12px, 8px); }
        50% { transform: translate(10px, 15px); }
        75% { transform: translate(-6px, -12px); }
      }
      @keyframes journey-firefly-drift-2 {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(8px, 12px); }
        50% { transform: translate(-15px, -5px); }
        75% { transform: translate(12px, -8px); }
      }
      @keyframes journey-firefly-drift-3 {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(-10px, -15px); }
        50% { transform: translate(12px, 8px); }
        75% { transform: translate(-5px, 12px); }
      }
      @keyframes journey-ambient-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.15); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*='journey-star-twinkle'],
        [style*='journey-star-pulse'],
        [style*='journey-nebula-drift'],
        [style*='journey-cloud-drift-'],
        [style*='journey-sunray-pulse'],
        [style*='journey-ray-breathe'],
        [style*='journey-source-pulse'],
        [style*='journey-leaf-fall-'],
        [style*='journey-meteor-shoot'],
        [style*='journey-bubble-rise-'],
        [style*='journey-ambient-drift'],
        [style*='journey-wave-drift-'],
        [style*='journey-caustic-shift'],
        [style*='journey-surface-shimmer'],
        [style*='journey-firefly-glow'],
        [style*='journey-firefly-drift-'],
        [style*='journey-ambient-pulse'] {
          animation: none !important;
        }
      }
    `}</style>
  )
}