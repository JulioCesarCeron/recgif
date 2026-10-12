  emcc encoder.cpp \
  -I/Users/juceron/github-julioceron/recgif/core \
  /Users/juceron/github-julioceron/libimagequant/blur.c \
  /Users/juceron/github-julioceron/libimagequant/kmeans.c \
  /Users/juceron/github-julioceron/libimagequant/libimagequant.c \
  /Users/juceron/github-julioceron/libimagequant/mediancut.c \
  /Users/juceron/github-julioceron/libimagequant/nearest.c \
  /Users/juceron/github-julioceron/libimagequant/pam.c \
  /Users/juceron/github-julioceron/libimagequant/mempool.c \
  /Users/juceron/github-julioceron/gifsicle/src/giffunc.c \
  /Users/juceron/github-julioceron/gifsicle/src/gifread.c \
  /Users/juceron/github-julioceron/gifsicle/src/gifunopt.c \
  /Users/juceron/github-julioceron/gifsicle/src/gifwrite.c \
  /Users/juceron/github-julioceron/gifsicle/src/gifx.c \
  /Users/juceron/github-julioceron/gifsicle/src/kcolor.c \
  -o ../src/wasm-output/gif_wasm.js \
  -I/Users/juceron/github-julioceron/libimagequant \
  -I/Users/juceron/github-julioceron/gifsicle/include \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s EXPORT_NAME='initWasm' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s "EXPORTED_RUNTIME_METHODS=['cwrap','HEAPU8','HEAP32']" \
  -s "EXPORTED_FUNCTIONS=['_process_frames','_malloc','_free']" \
  -O3