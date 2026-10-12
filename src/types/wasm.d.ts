export type GifWasmModule = {
  HEAPU8: Uint8Array
  HEAP32: Int32Array
  _malloc(size: number): number
  _free(pointer: number): void
  _process_frames(
    allFramesPointer: number,
    frameCount: number,
    width: number,
    height: number,
    delay: number,
    outSizePointer: number
  ): number
}

declare module "*/wasm/gif_wasm.js" {
  import { GifWasmModule } from "src/types/wasm" // auto-referência para o tipo acima
  const initWasm: () => Promise<GifWasmModule>
  export default initWasm
}
