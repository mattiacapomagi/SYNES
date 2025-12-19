import { drawBrick } from './brickRenderer';

export type RGB = { r: number; g: number; b: number };
export type Grid = {
  columns: number;
  rows: number;
  data: (RGB | null)[]; // null = transparent
};

/**
 * analyzes the image and returns a grid of colors
 */
export const computeMosaicGrid = (image: HTMLImageElement, blockSize: number): Grid => {
  const w = image.width;
  const h = image.height;
  
  const columns = Math.ceil(w / blockSize);
  const rows = Math.ceil(h / blockSize);

  // Helper canvas for downsampling (averaging)
  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  
  ctx.drawImage(image, 0, 0, columns, rows);
  const pixelData = ctx.getImageData(0, 0, columns, rows).data;
  
  const data: (RGB | null)[] = [];

  for (let i = 0; i < pixelData.length; i += 4) {
      const alpha = pixelData[i + 3];
      if (alpha < 50) {
          data.push(null);
      } else {
          data.push({
              r: pixelData[i],
              g: pixelData[i + 1],
              b: pixelData[i + 2]
          });
      }
  }

  return { columns, rows, data };
};

/**
 * Renders a computed grid to a target canvas context
 */
export const renderGridToCanvas = (
    ctx: CanvasRenderingContext2D, 
    grid: Grid, 
    pixelSize: number
) => {
    const { columns, rows, data } = grid;
    
    // Iterate
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const index = r * columns + c;
            const color = data[index];
            if (color) {
                drawBrick(ctx, c * pixelSize, r * pixelSize, pixelSize, color);
            }
        }
    }
};

/**
 * Generates an SVG string of the mosaic
 */
export const renderGridToSVG = (grid: Grid, totalWidth: number, totalHeight: number): string => {
    const { columns, rows, data } = grid;
    // Calculate effective block size based on total width
    // Actually we can just work in "grid units" or mapping.
    // Let's assume the SVG coordinate system matches the pixel dimensions we provide.
    // If we want high res SVG, it's vector, so dimensions matter less, but aspect ratio matters.
    // Let's use the grid count as the coordinate system for simplicity? 
    // No, better to use the physical dimensions passed in so specific sizes are respected if needed.
    
    const blockW = totalWidth / columns;
    const blockH = totalHeight / rows;
    // Assume square blocks generally, but we'll use blockW for the brick size 
    // (bricks are usually square, if aspect ratio forces non-square, we might stretch, 
    // but calculating grid usually preserves aspect). 
    
    let svgBody = '';
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const index = r * columns + c;
            const color = data[index];
            if (color) {
                const x = c * blockW;
                const y = r * blockH;
                const fill = `rgb(${color.r},${color.g},${color.b})`;
                
                // Base rect
                svgBody += `<rect x="${x}" y="${y}" width="${blockW}" height="${blockH}" fill="${fill}" />`;
                
                // Bevels (Simple overlay approximations for vector)
                // Top Light
                svgBody += `<path d="M${x},${y} h${blockW} l-${blockW*0.15},${blockH*0.15} h-${blockW*0.7} z" fill="white" fill-opacity="0.4" />`;
                // Left Light
                svgBody += `<path d="M${x},${y} v${blockH} l${blockW*0.15},-${blockH*0.15} v-${blockH*0.7} z" fill="white" fill-opacity="0.4" />`;
                // Bottom Dark
                svgBody += `<path d="M${x},${y+blockH} h${blockW} l-${blockW*0.15},-${blockH*0.15} h-${blockW*0.7} z" fill="black" fill-opacity="0.2" />`;
                // Right Dark
                svgBody += `<path d="M${x+blockW},${y} v${blockH} l-${blockW*0.15},-${blockH*0.15} v-${blockH*0.7} z" fill="black" fill-opacity="0.2" />`;
            }
        }
    }

    return `
      <svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="transparent"/>
        ${svgBody}
      </svg>
    `.trim();
};
