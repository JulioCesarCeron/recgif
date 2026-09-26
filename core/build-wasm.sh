#!/usr/bin/env bash
set -e

mkdir -p src/wasm-output

emcc core/encoder.cpp \
  -Icore \
  /opt/libimagequant/blur.c \
  /opt/libimagequant/kmeans.c \
  /opt/libimagequant/libimagequant.c \
  /opt/libimagequant/mediancut.c \
  /opt/libimagequant/nearest.c \
  /opt/libimagequant/pam.c \
  /opt/libimagequant/mempool.c \
  /opt/gifsicle/src/giffunc.c \
  /opt/gifsicle/src/gifread.c \
  /opt/gifsicle/src/gifunopt.c \
  /opt/gifsicle/src/gifwrite.c \
  /opt/gifsicle/src/gifx.c \
  /opt/gifsicle/src/kcolor.c \
  -o src/wasm-output/gif_wasm.js \
  -I/opt/libimagequant \
  -I/opt/gifsicle/include \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s EXPORT_NAME=initWasm \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","HEAPU8","HEAP32"]' \
  -s EXPORTED_FUNCTIONS='["_process_frames","_malloc","_free"]' \
  -O3

echo "WASM build concluído"