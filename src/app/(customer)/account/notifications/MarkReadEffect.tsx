'use client'
import { useEffect } from 'react'

export default function MarkReadEffect() {
  useEffect(() => {
    fetch('/api/notifications/read', { method: 'POST' })
  }, [])
  return null
}
