FROM emscripten/emsdk:4.0.7

WORKDIR /opt

# libimagequant 
RUN git clone --depth=1 --branch 2.17.0 \
  https://github.com/ImageOptim/libimagequant.git \
  libimagequant && \
  #gifsicle
  git clone --depth=1 \
  https://github.com/kohler/gifsicle.git \
  gifsicle

WORKDIR /work