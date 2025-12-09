"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Eraser, Pencil, RotateCcw, Download, Sparkles, Trash2 } from "lucide-react"

const COLORS = ["#000000", "#374151", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]

export function SketchToImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(4)
  const [brushColor, setBrushColor] = useState("#000000")
  const [tool, setTool] = useState<"brush" | "eraser">("brush")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Save initial state
    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory([initialState])
    setHistoryIndex(0)
  }, [])

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex <= 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const newIndex = historyIndex - 1
    ctx.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
  }

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : brushColor
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      saveToHistory()
    }
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
    setGeneratedImage(null)
  }

  const generateImage = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const canvas = canvasRef.current
      if (!canvas) {
        throw new Error("Canvas not found")
      }

      const imageData = canvas.toDataURL("image/png")

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          prompt:
            prompt ||
            "Transform this sketch into a detailed, realistic image with vibrant colors and professional quality",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      setGeneratedImage(data.image)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image")
      console.error("Generation error:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = (type: "sketch" | "generated") => {
    if (type === "sketch") {
      const canvas = canvasRef.current
      if (!canvas) return

      const link = document.createElement("a")
      link.download = "sketch.png"
      link.href = canvas.toDataURL()
      link.click()
    } else if (generatedImage) {
      const link = document.createElement("a")
      link.download = "generated.png"
      link.href = generatedImage
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Sketch to Image</h1>
              <p className="text-sm text-muted-foreground">Draw and transform with AI</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Drawing Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Your Sketch</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="w-full aspect-square cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            {/* Tools */}
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 space-y-4">
              {/* Tool Selection */}
              <div className="flex gap-2">
                <Button
                  variant={tool === "brush" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("brush")}
                  className={tool === "brush" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Brush
                </Button>
                <Button
                  variant={tool === "eraser" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("eraser")}
                  className={tool === "eraser" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  Eraser
                </Button>
              </div>

              {/* Brush Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Brush Size: {brushSize}px</label>
                <Slider
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        brushColor === color ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Download Sketch */}
              <Button variant="outline" className="w-full bg-transparent" onClick={() => downloadImage("sketch")}>
                <Download className="w-4 h-4 mr-2" />
                Download Sketch
              </Button>
            </div>
          </div>

          {/* Generated Image Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Generated Image</h2>
              {generatedImage && (
                <Button variant="outline" size="sm" onClick={() => downloadImage("generated")}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
            </div>

            {/* Generated Image Display */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 aspect-square flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Transforming your sketch...</p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage || "/placeholder.svg"}
                  alt="Generated image"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">No image generated yet</p>
                    <p className="text-sm text-muted-foreground">Draw something and click generate to see the magic</p>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prompt (optional)</label>
              <Input
                placeholder="Describe how to transform your sketch..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            {/* Generate Button */}
            <Button
              className="w-full h-14 text-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg"
              onClick={generateImage}
              disabled={isGenerating}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Add your HF_TOKEN environment variable to enable AI image generation
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
