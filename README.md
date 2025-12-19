# BRICKLAB

BRICKLAB is a high-precision mosaic generator designed to bridge the gap between pixel aesthetics and vector scalability. It transforms digital imagery into rigid, geometric brick layouts, optimized for professional workflows in large-format printing, plotting, and architectural visualization.

## FEATURES

### 🧱 Adaptive Grid Engine

At its core, BRICKLAB uses a custom quantization engine that maps source pixels to a variable-density grid. Unlike simple pixelation filters, this engine calculates the local color average within each "brick" cell using a weighted sampling method.

- **Color Averaging**: Ensures true-to-life color reproduction even at low resolutions.
- **Grid Alignment**: Forces every element into a perfect mathematical grid, eliminating anti-aliasing artifacts often found in raster resizing.

### 🎛️ Dynamic Precision Control

The density system is non-linear, allowing for granular control where it matters most.

- **Real-Time Block Sizing**: Ranging from abstract 8-bit interpretations to fine-detailed mosaics.
- **Robust History State**: Every adjustment to the block size is pushed to a history stack. You can Experiment fearlessly using `Cmd+Z` (Undo) and `Shift+Cmd+Z` (Redo) to navigate your design process.
- **Instant Reset**: A dedicated "RESET" function immediately snaps the engine back to its calibrated default (Block Size: 50), providing a quick baseline.

### 🚀 Production-Ready Export Pipeline

BRICKLAB generates assets that are ready for immediate professional use.

- **High-Res PNG**: The raster export pipeline automatically upscales the generated grid to a minimum height of **5000px**. This guarantees sharp edges for large prints (posters, billboards) without pixelation blur.
- **Resolution-Independent SVG**: The vector export is mathematically generated. Each "brick" is written as a distinct SVG `<rect>` element. This file is clean, layer-free, and perfect for:
  - **Pen Plotters (e.g., Axidraw)**: Clean paths for physical drawing.
  - **Vinyl Cutters**: distinct shapes for weeding.
  - **Vector Software**: Fully editable in Adobe Illustrator or Figma.
- **Smart Asset Tagging**: Exports are automatically named with a semantic timestamp format (`BRICKLAB YYYY-MM-DD HH.mm.ss`), keeping your project folder organized.

### 📂 Universal Format Support

The ingestion engine handles a wide array of formats, including modern web standards and professional image types:
`JPG`, `PNG`, `GIF`, `WEBP`, `TIFF`, and `HEIC` (native Apple photo format support via on-the-fly conversion).

---

**Mattia Capomagi 2025**
