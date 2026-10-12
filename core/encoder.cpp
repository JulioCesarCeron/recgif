#include "config.h"
#include <emscripten.h>

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <stdint.h>
#include <vector>

extern "C" {
#include <lcdfgif/gif.h>
#include <libimagequant.h>
}

static std::vector<uint8_t> outputBuffer;

static Gif_Colormap *create_colormap_from_palette(const liq_palette *palette) {
  Gif_Colormap *colormap = Gif_NewFullColormap(palette->count, palette->count);

  for (int i = 0; i < palette->count; i++) {
    colormap->col[i].pixel = i;
    colormap->col[i].gfc_red = palette->entries[i].r;
    colormap->col[i].gfc_green = palette->entries[i].g;
    colormap->col[i].gfc_blue = palette->entries[i].b;
    colormap->col[i].haspixel = 1;
  }

  return colormap;
}

static void destroyQuantizationResources(
    liq_attr *attr, liq_image *globalImage, liq_result *quantResult
) {
  if (quantResult) {
    liq_result_destroy(quantResult);
  }

  if (globalImage) {
    liq_image_destroy(globalImage);
  }

  if (attr) {
    liq_attr_destroy(attr);
  }
}

extern "C" {
  EMSCRIPTEN_KEEPALIVE
  uint8_t *process_frames(
      uint8_t *allFrames,
      int frameCount,
      int width,
      int height,
      int delay,
      int *outSize
  ) {
    outputBuffer.clear();

    if (outSize) {
      *outSize = 0;
    }

    if (!allFrames || !outSize || frameCount <= 0 || width <= 0 ||
        height <= 0) {
      return nullptr;
    }

    const size_t frameSize =
        static_cast<size_t>(width) * static_cast<size_t>(height) * 4;

    liq_attr *attr = liq_attr_create();

    if (!attr) {
      return nullptr;
    }

    liq_set_max_colors(attr, 256);
    liq_set_quality(attr, 90, 100);

    liq_image *globalImage =
        liq_image_create_rgba(attr, allFrames, width, height * frameCount, 0);

    if (!globalImage) {
      destroyQuantizationResources(attr, nullptr, nullptr);

      return nullptr;
    }

    liq_result *quantResult = liq_quantize_image(attr, globalImage);

    if (!quantResult) {
      destroyQuantizationResources(attr, globalImage, nullptr);

      return nullptr;
    }

    const liq_palette *palette = liq_get_palette(quantResult);

    if (!palette || palette->count <= 0) {
      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    Gif_Colormap *colormap = create_colormap_from_palette(palette);
    Gif_Stream *stream = Gif_NewStream();

    if (!stream) {
      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    stream->screen_width = width;
    stream->screen_height = height;
    stream->loopcount = 0;
    stream->global = colormap;

    Gif_CompressInfo compressInfo;
    Gif_InitCompressInfo(&compressInfo);

    /*
     * compress with loss from LCDFGIF.
     */
    compressInfo.loss = 20;

    std::vector<uint8_t> previousFrame(frameSize, 0);

    for (int frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      uint8_t *rgba = allFrames + (static_cast<size_t>(frameIndex) * frameSize);

      int minX = width;
      int minY = height;
      int maxX = 0;
      int maxY = 0;
      bool changed = false;

      if (frameIndex == 0) {
        minX = 0;
        minY = 0;
        maxX = width - 1;
        maxY = height - 1;
        changed = true;
      } else {
        for (int y = 0; y < height; y++) {
          for (int x = 0; x < width; x++) {
            int i = (y * width + x) * 4;

            if (rgba[i] != previousFrame[i] ||
                rgba[i + 1] != previousFrame[i + 1] ||
                rgba[i + 2] != previousFrame[i + 2] ||
                rgba[i + 3] != previousFrame[i + 3]) {
              changed = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
      }

      if (!changed) {
        continue;
      }

      int diffWidth = (maxX - minX) + 1;
      int diffHeight = (maxY - minY) + 1;

      std::vector<uint8_t> patchRGBA(diffWidth * diffHeight * 4);

      for (int y = 0; y < diffHeight; y++) {
        int srcY = minY + y;

        memcpy(
            patchRGBA.data() + (y * diffWidth * 4),
            rgba + ((srcY * width + minX) * 4),
            diffWidth * 4
        );
      }

      liq_image *frameImage = liq_image_create_rgba(
          attr,
          patchRGBA.data(),
          diffWidth,
          diffHeight,
          0
      );

      if (!frameImage) {
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      std::vector<uint8_t> indexed(diffWidth * diffHeight);

      const liq_error remapError = liq_write_remapped_image(
          quantResult,
          frameImage,
          indexed.data(),
          indexed.size()
      );

      liq_image_destroy(frameImage);

      if (remapError != LIQ_OK) {
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      uint8_t *gifData = Gif_NewArray(uint8_t, indexed.size());

      if (!gifData) {
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      memcpy(gifData, indexed.data(), indexed.size());

      Gif_Image *image = Gif_NewImage();

      if (!image) {
        Gif_Free(gifData);
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      image->left = minX;
      image->top = minY;
      image->width = diffWidth;
      image->height = diffHeight;
      image->delay = delay;
      image->disposal = GIF_DISPOSAL_ASIS;
      image->transparent = -1;
      image->local = nullptr;

      if (Gif_SetUncompressedImage(image, gifData, Gif_Free, 0) == 0) {
        Gif_Free(gifData);
        Gif_DeleteImage(image);
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      if (Gif_FullCompressImage(stream, image, &compressInfo) == 0) {
        Gif_DeleteImage(image);
        Gif_DeleteStream(stream);

        destroyQuantizationResources(attr, globalImage, quantResult);

        return nullptr;
      }

      Gif_AddImage(stream, image);

      memcpy(previousFrame.data(), rgba, frameSize);
    }

    const char *tempFile = "/output.gif";
    FILE *fp = fopen(tempFile, "wb");

    if (!fp) {
      Gif_DeleteStream(stream);

      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    const int writeResult = Gif_FullWriteFile(stream, &compressInfo, fp);
    fclose(fp);

    if (writeResult == 0) {
      remove(tempFile);
      Gif_DeleteStream(stream);

      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    fp = fopen(tempFile, "rb");

    if (!fp) {
      Gif_DeleteStream(stream);

      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    fseek(fp, 0, SEEK_END);
    long fileSize = ftell(fp);

    if (fileSize <= 0) {
      fclose(fp);
      remove(tempFile);
      Gif_DeleteStream(stream);

      destroyQuantizationResources(attr, globalImage, quantResult);

      return nullptr;
    }

    rewind(fp);

    outputBuffer.resize(fileSize);
    const size_t bytesRead = fread(outputBuffer.data(), 1, fileSize, fp);
    fclose(fp);
    remove(tempFile);

    Gif_DeleteStream(stream);
    destroyQuantizationResources(attr, globalImage, quantResult);

    if (bytesRead != outputBuffer.size()) {
      outputBuffer.clear();
      return nullptr;
    }

    *outSize = (int)outputBuffer.size();

    return outputBuffer.data();
  }
}