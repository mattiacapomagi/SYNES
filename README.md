# BRICKLAB

BRICKLAB is a specialized brutalist mosaic generator that transforms images into high-precision brick/grid art. It is designed for creative professionals who need vector-ready or print-ready outputs of pixelated/reconstructed imagery.

![BRICKLAB UI](https://placehold.co/800x400/000000/FFFFFF/png?text=BRICKLAB+PREVIEW)

## Features

- **Drag & Drop Workspace**: Supports JPG, PNG, GIF, WEBP, TIFF, and HEIC formats.
- **Adaptive Grid Engine**: Automatically averages pixel colors to create a clean, geometric reconstruction.
- **Precision Control**:
  - **Block Density Slider**: Fine-tune the grid resolution (mapped from UI 0-100 to robust internal values).
  - **Auto-Reset**: Quickly revert to standard density.
  - **Undo/Redo**: Full history support for density adjustments via `Cmd+Z` / `Shift+Cmd+Z`.
- **Professional Export**:
  - **High-Res PNG**: Upscales output to a minimum of 5000px height for large-format printing.
  - **Vector SVG**: Exports pure SVG paths for plotters, vinyl cutters, or further vector editing.
- **Brutalist UI**: A stripped-back, high-contrast interface focused purely on the workflow.

## Technology Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Processing**:
  - `heic2any`: For Apple ecosystem image support.
  - HTML5 Canvas: For real-time grid computation and rendering.

## Development

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Run Development Server**:

   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## License

Private / Proprietary.
Designed by Mattia Capomagi.
