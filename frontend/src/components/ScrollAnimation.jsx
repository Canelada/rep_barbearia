'use client'
import { useEffect, useRef, useState } from 'react'

export default function ScrollAnimation({ children, animation = 'fade-up', delay = 0, className = '' }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    const currentRef = ref.current

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [delay])

  const animations = {
    'fade-up': {
      initial: 'opacity-0 translate-y-8',
      animate: 'opacity-100 translate-y-0'
    },
    'fade-down': {
      initial: 'opacity-0 -translate-y-8',
      animate: 'opacity-100 translate-y-0'
    },
    'fade-left': {
      initial: 'opacity-0 translate-x-8',
      animate: 'opacity-100 translate-x-0'
    },
    'fade-right': {
      initial: 'opacity-0 -translate-x-8',
      animate: 'opacity-100 translate-x-0'
    },
    'zoom-in': {
      initial: 'opacity-0 scale-95',
      animate: 'opacity-100 scale-100'
    },
    'zoom-out': {
      initial: 'opacity-0 scale-105',
      animate: 'opacity-100 scale-100'
    }
  }

  const { initial, animate } = animations[animation] || animations['fade-up']

  return (
    <div
      ref={ref}
      className={`
        transition-all duration-700 ease-out
        ${isVisible ? animate : initial}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
