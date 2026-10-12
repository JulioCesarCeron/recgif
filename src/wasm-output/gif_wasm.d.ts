export type GifWasmModule = {
  _process_frames(
    framesPtr: number,
    frameCount: number,
    width: number,
    height: number,
    delay: number,
    outSizePtr: number
  ): number

  _malloc(size: number): number
  _free(ptr: number): void

  HEAPU8: Uint8Array
  HEAP32: Int32Array
}

export type GifWasmModuleOptions = {
  locateFile?: (
    path: string,
    prefix: string
  ) => string
}

declare const initWasm: (
  options?: GifWasmModuleOptions
) => Promise<GifWasmModule>

export default initWasm