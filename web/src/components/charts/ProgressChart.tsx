'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface ProgressChartProps {
  data: { date: string; value: number }[]
  label: string
  color?: string
}

export default function ProgressChart({ data, label, color = '#6366f1' }: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find min/max values
    const values = data.map(d => d.value)
    const minValue = Math.min(...values) - 5
    const maxValue = Math.max(...values) + 5
    const valueRange = maxValue - minValue

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - padding * 2) * (i / 5)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw data line
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      const y = padding + (height - padding * 2) * (1 - (point.value - minValue) / valueRange)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      const y = padding + (height - padding * 2) * (1 - (point.value - minValue) / valueRange)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(width - padding, height - padding)
    ctx.lineTo(padding, height - padding)
    ctx.closePath()
    ctx.fill()

    // Draw data points
    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      const y = padding + (height - padding * 2) * (1 - (point.value - minValue) / valueRange)
      
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw labels
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      ctx.fillText(new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, height - 10)
    })

    // Draw Y-axis labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const value = minValue + valueRange * (1 - i / 5)
      const y = padding + (height - padding * 2) * (i / 5)
      ctx.fillText(Math.round(value).toString(), padding - 10, y + 4)
    }
  }, [data, color])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{label}</h3>
      <div className="relative" style={{ height: '300px' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </motion.div>
  )
}

export function ProgressPrediction({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const padding = 40

    ctx.clearRect(0, 0, width, height)

    const values = data.map(d => d.value)
    const minValue = Math.min(...values) - 5
    const maxValue = Math.max(...values) + 5
    const valueRange = maxValue - minValue

    // Draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - padding * 2) * (i / 5)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw historical data
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      const y = padding + (height - padding * 2) * (1 - (point.value - minValue) / valueRange)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw prediction (dashed line)
    if (data.length >= 2) {
      const lastPoint = data[data.length - 1]
      const secondLastPoint = data[data.length - 2]
      const trend = (lastPoint.value - secondLastPoint.value) / 2
      
      ctx.strokeStyle = '#a855f7'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      
      const lastX = padding + (width - padding * 2) * ((data.length - 1) / (data.length - 1))
      const lastY = padding + (height - padding * 2) * (1 - (lastPoint.value - minValue) / valueRange)
      
      ctx.moveTo(lastX, lastY)
      
      // Predict next 3 points
      for (let i = 1; i <= 3; i++) {
        const predictedValue = lastPoint.value + (trend * i)
        const x = padding + (width - padding * 2) * ((data.length - 1 + i) / (data.length + 2))
        const y = padding + (height - padding * 2) * (1 - (predictedValue - minValue) / valueRange)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw labels
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    data.forEach((point, i) => {
      const x = padding + (width - padding * 2) * (i / (data.length - 1))
      ctx.fillText(new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, height - 10)
    })

    // Add prediction labels
    ctx.fillStyle = '#a855f7'
    for (let i = 1; i <= 3; i++) {
      const x = padding + (width - padding * 2) * ((data.length - 1 + i) / (data.length + 2))
      ctx.fillText('Pred', x, height - 10)
    }
  }, [data])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{label}</h3>
      <div className="relative" style={{ height: '300px' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full" />
          <span className="text-gray-600">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full" />
          <span className="text-gray-600">Predicted</span>
        </div>
      </div>
    </motion.div>
  )
}
