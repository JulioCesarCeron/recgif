export type FFMessageLoadConfig = {
  /**
   * `ffmpeg-core.js` URL.
   *
   * @defaultValue `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;
   */
  coreURL?: string
  /**
   * `ffmpeg-core.wasm` URL.
   *
   * @defaultValue `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.wasm`;
   */
  wasmURL?: string
  /**
   * `ffmpeg-core.worker.js` URL. This worker is spawned when using multithread version of ffmpeg-core.
   *
   * @ref: https://ffmpegwasm.netlify.app/docs/overview#architecture
   * @defaultValue `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd/ffmpeg-core.worker.js`;
   */
  workerURL?: string
  /**
   * `ffmpeg.worker.js` URL. This worker is spawned when FFmpeg.load() is called, it is an essential worker and usually you don't need to update this config.
   *
   * @ref: https://ffmpegwasm.netlify.app/docs/overview#architecture
   * @defaultValue `./worker.js`
   */
  classWorkerURL?: string
}
