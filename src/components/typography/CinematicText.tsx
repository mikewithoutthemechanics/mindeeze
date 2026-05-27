'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface CinematicTextProps {
  text: string
  className?: string
  delay?: number
}

export default function CinematicText({ text, className = '', delay = 0 }: CinematicTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chars = containerRef.current.querySelectorAll('.char')
    
    gsap.fromTo(
      chars,
      {
        y: 100,
        opacity: 0,
        rotationX: -90,
      },
      {
        y: 0,
        opacity: 1,
        rotationX: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: 'back.out(1.7)',
        delay,
      }
    )
  }, [delay])

  return (
    <div ref={containerRef} className={className}>
      {text.split('').map((char, i) => (
        <span key={i} className="char inline-block">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  )
}

export function WordReveal({ text, className = '', delay = 0 }: CinematicTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const words = containerRef.current.querySelectorAll('.word')
    
    gsap.fromTo(
      words,
      {
        y: 50,
        opacity: 0,
        skewY: 10,
      },
      {
        y: 0,
        opacity: 1,
        skewY: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        delay,
      }
    )
  }, [delay])

  return (
    <div ref={containerRef} className={className}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="word inline-block mr-2">
          {word}
        </span>
      ))}
    </div>
  )
}

export function GradientText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${className}`}>
      {text}
    </span>
  )
}

export function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const element = containerRef.current
    
    const glitch = () => {
      gsap.to(element, {
        x: () => gsap.utils.random(-5, 5),
        y: () => gsap.utils.random(-5, 5),
        skewX: () => gsap.utils.random(-10, 10),
        duration: 0.1,
        onComplete: () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            skewX: 0,
            duration: 0.2,
          })
        }
      })
    }

    const interval = setInterval(glitch, 3000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div ref={containerRef} className={className}>
      {text}
    </div>
  )
}
