import { useCallback, useEffect, useRef, useState } from "react"
import type { GifWasmModule } from "../../types/wasm"
import type { RecordingMetadata } from "./useGifRecorder.types"
import { FPS } from "./useGifRecorder.constants"

export const useGifRecoreder = (wasm: GifWasmModule | null) => {
  const [isRecording, setIsRecording] = useState(false)
  const [gifUrl, setGifUrl] = useState<string | null>(null)

  const framesRef = useRef<Uint8Array[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const recordingRef = useRef(false)

  const metadataRef = useRef<RecordingMetadata>({
    width: 0,
    height: 0,
    fps: FPS,
  })

  const releasePreviousGifUrl = useCallback(() => {
    setGifUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      return null
    })
  }, [])

  const stopCaptureLoop = useCallback(() => {
    recordingRef.current = false

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const stopMediaStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop()
    })

    streamRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    if (!wasm || recordingRef.current) {
      return
    }

    releasePreviousGifUrl()

    framesRef.current = []

    const fps = metadataRef.current.fps

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: fps },
      audio: false,
    })

    streamRef.current = stream

    const video = document.createElement("video")
    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    await video.play()

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      stopMediaStream()
      return
    }

    metadataRef.current = {
      width,
      height,
      fps,
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    if (!ctx) {
      stopMediaStream()
      return
    }

    recordingRef.current = true
    setIsRecording(true)

    const captureFrame = () => {
      if (!recordingRef.current) {
        return
      }

      ctx.drawImage(video, 0, 0, width, height)
      const frameData = ctx.getImageData(0, 0, width, height)
      framesRef.current.push(new Uint8Array(frameData.data))
      timeoutRef.current = window.setTimeout(captureFrame, 1000 / fps)
    }

    const videoTrack = stream.getVideoTracks()[0]
    videoTrack.addEventListener("ended", stopCaptureLoop)

    captureFrame()
  }, [releasePreviousGifUrl, stopCaptureLoop, stopMediaStream, wasm])

  const stopRecording = useCallback(() => {
    stopCaptureLoop()
    stopMediaStream()
    setIsRecording(false)

    if (!wasm) {
      console.error("WASM module is not loaded. Cannot generate GIF.")
      return
    }

    const frames = framesRef.current
    const { height, width, fps } = metadataRef.current

    if (frames.length === 0 || width <= 0 || height <= 0) {
      return
    }

    const frameSize = width * height * 4
    const totalSize = frames.length * frameSize

    const memoryPointer = wasm._malloc(totalSize)
    const integerMemoryPointerSize = wasm._malloc(4)

    if (!memoryPointer || !integerMemoryPointerSize) {
      if (memoryPointer) {
        wasm._free(memoryPointer)
      }

      if (integerMemoryPointerSize) {
        wasm._free(integerMemoryPointerSize)
      }

      return
    }

    try {
      let offset = 0

      for (const frame of frames) {
        wasm.HEAPU8.set(frame, memoryPointer + offset)
        offset += frame.length
      }

      const delay = Math.max(1, Math.round(100 / fps))

      const gifPtr = wasm._process_frames(
        memoryPointer,
        frames.length,
        width,
        height,
        delay,
        integerMemoryPointerSize
      )

      const gifSize = wasm.HEAP32[integerMemoryPointerSize >> 2]

      if (!gifPtr || gifSize <= 0) {
        throw new Error(
          "The WASM encoder failed to process the frames and generate a GIF."
        )
      }

      const gifData = wasm.HEAPU8.slice(gifPtr, gifPtr + gifSize)

      const gifBuffer = gifData.buffer.slice(
        gifData.byteOffset,
        gifData.byteOffset + gifData.byteLength
      )

      const blob = new Blob([gifBuffer], { type: "image/gif" })
      setGifUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }

        return URL.createObjectURL(blob)
      })
    } catch (error) {
      console.error("Error generating GIF:", error)
    } finally {
      wasm._free(memoryPointer)
      wasm._free(integerMemoryPointerSize)

      framesRef.current = []
    }
  }, [stopCaptureLoop, stopMediaStream, wasm])

  useEffect(() => {
    return () => {
      stopCaptureLoop()
      stopMediaStream()

      if (gifUrl) {
        URL.revokeObjectURL(gifUrl)
      }
    }
  }, [gifUrl, stopCaptureLoop, stopMediaStream])

  return {
    startRecording,
    stopRecording,
    isRecording,
    gifUrl,
  }
}
