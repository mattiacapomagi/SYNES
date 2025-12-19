/**
 * Draws a single "Plastic Brick" on the canvas context.
 * 
 * @param ctx - The canvas 2D context
 * @param x - X position (top-left)
 * @param y - Y position (top-left)
 * @param size - Size of the square block
 * @param color - The rgb color {r, g, b}
 */
export const drawBrick = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: { r: number, g: number, b: number }
) => {
    // 1. Base Color
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fillRect(x, y, size, size);

    // Bevel Configuration
    // We want a subtle 3D pop.
    const bevelSize = Math.max(2, size * 0.15); // Dynamic bevel size, min 2px
    
    // 2. Highlights (Top and Left) - White Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Semi-transparent white
    
    // Top Trapezoid
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size - bevelSize, y + bevelSize);
    ctx.lineTo(x + bevelSize, y + bevelSize);
    ctx.fill();

    // Left Trapezoid
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + bevelSize, y + size - bevelSize);
    ctx.lineTo(x + bevelSize, y + bevelSize);
    ctx.fill();

    // 3. Shadows (Bottom and Right) - Black Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Semi-transparent black

    // Right Trapezoid
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + size - bevelSize, y + size - bevelSize);
    ctx.lineTo(x + size - bevelSize, y + bevelSize);
    ctx.fill();

    // Bottom Trapezoid
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + size - bevelSize, y + size - bevelSize);
    ctx.lineTo(x + bevelSize, y + size - bevelSize);
    ctx.fill();
    
    // Optional: Inner flat surface to reinforce the plate look?
    // The bevel approach above leaves the center naturally "flat" because we didn't draw over it.
    // It already looks like a raised plate.
};
