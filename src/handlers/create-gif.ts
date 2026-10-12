import { fetchFile } from "@ffmpeg/util"
import { FFmpeg } from "@ffmpeg/ffmpeg"

export const createGif = async (blob: Blob, ffmpeg: FFmpeg) => {
  await ffmpeg.writeFile("video.mp4", await fetchFile(blob))

  await ffmpeg.exec([
    "-i",
    "video.mp4",
    "-vf",
    "fps=30,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    "-loop",
    "0",
    "image.gif",
  ])

  const fileData = await ffmpeg.readFile("image.gif")
  const data = new Uint8Array(fileData as unknown as ArrayBuffer)
  const imageGifBlob = new Blob([data], { type: "image/gif" })

  return URL.createObjectURL(imageGifBlob)
}
