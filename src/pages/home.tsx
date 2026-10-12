import { useEffect, useState } from "react"
import Version from "../components/version"
import type { GifWasmModule } from "../types/wasm"

import initWasm from "../wasm-output/gif_wasm"
import { useGifRecoreder } from "../hooks/useGifRecorder"

export const Home = () => {
  const [wasm, setWasm] = useState<GifWasmModule | null>(null)
  const [wasmError, setWasmError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    initWasm()
      .then((module) => {
        if (mounted) {
          setWasm(module)
        }
      })
      .catch((error: unknown) => {
        console.error("Erro ao inicializar o módulo WASM:", error)
        if (mounted) {
          setWasmError("Erro ao inicializar o módulo WASM.")
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const { startRecording, stopRecording, isRecording, gifUrl } =
    useGifRecoreder(wasm)

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>
        REC <span className="rec-pin">๏</span> GIF
      </h1>

      {wasmError && <p role="alert">{wasmError}</p>}

      <div style={{ marginBottom: "1rem" }}>
        {!isRecording ? (
          <button
            type="button"
            onClick={() => {
              void startRecording()
            }}
            disabled={!wasm || Boolean(wasmError)}
          >
            Iniciar Gravação
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            style={{ background: "#ff4d4d", color: "white" }}
          >
            Parar Gravação
          </button>
        )}
      </div>

      {!wasm && !wasmError && <p>Carregando módulo WASM...</p>}

      {gifUrl && (
        <section>
          <h2>Seu GIF está pronto:</h2>
          <img
            src={gifUrl}
            alt="Preview do GIF"
            style={{
              border: "2px solid #ddd",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "1500px",
              height: "auto",
            }}
          />
          <p>
            <a href={gifUrl} download="screen-capture.gif">
              Baixar GIF
            </a>
          </p>
        </section>
      )}

      <footer className="footer">
        <Version />
      </footer>
    </main>
  )
}
