"use strict";
/**
 * Satisfactory Bridge Planner - TypeScript Implementation
 * Alpine.js component for planning suspension bridges with precision
 */
function bridgePlanner() {
    return {
        length: 160,
        height: 40, // Tower Height
        sag: 21, // Cable Sag
        snapX: 8,
        snapY: 1,
        snappedPoints: [],
        maxError: 0,
        avgError: 0,
        // Alpine.js runtime properties (set by Alpine)
        $watch: undefined,
        $nextTick: undefined,
        $refs: undefined,
        // Create parabola function
        paraboler(length, height) {
            return function (x) {
                const a = height / Math.pow(length / 2, 2);
                return a * Math.pow(x, 2);
            };
        },
        init() {
            this.calculate();
            this.$watch('length', () => this.calculate());
            this.$watch('height', () => this.calculate());
            this.$watch('sag', () => this.calculate());
            this.$watch('snapX', () => this.calculate());
            this.$watch('snapY', () => this.calculate());
            // Initialize canvas size
            this.resizeCanvas();
            // Add window resize listener with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.resizeCanvas();
                }, 150);
            });
        },
        // ========================
        // Drawing helper functions
        // ========================
        drawCircle(ctx, x, y, radius) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        },
        drawVerticalLine(ctx, x, y1, y2) {
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();
        },
        drawLabel(ctx, text, x, y, align = 'center', rotation = 0) {
            ctx.save();
            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.textAlign = align;
            if (rotation !== 0) {
                ctx.translate(x, y);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.fillText(text, 0, 0);
            }
            else {
                ctx.fillText(text, x, y);
            }
            ctx.restore();
        },
        setStrokeStyle(ctx, color, width, lineCap = 'butt') {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = lineCap;
        },
        // Calculate the ideal parabola y-coordinate
        parabola(x) {
            const L = this.length;
            const H = this.height;
            const S = this.sag;
            const f = this.paraboler(L, S); // Use S (sag) as the "height" parameter
            const baseHeight = H - S;
            return f(x - L / 2) + baseHeight; // Shift to correct height
        },
        // Generate snapped points along the parabola
        // This is the core function of the bridge planner
        calculateSnappedPoints() {
            const L = this.length;
            const H = this.height; // Tower height
            const S = this.sag; // Cable sag
            const snapX = Math.max(1, this.snapX);
            const snapY = Math.max(1, this.snapY);
            // Validate inputs
            if (L <= 0) {
                this.snappedPoints = [];
                this.maxError = 0;
                this.avgError = 0;
                return;
            }
            // Create parabola function: S is the "height" rise from center to towers
            const f = this.paraboler(L, S);
            const rightPoints = [];
            const leftPoints = [];
            let prevSlope = 0.0;
            let prevY = 0.0;
            const startingX = this.length % (2 * snapX) == 0 ? 0 : snapX / 2;
            // Generate points from 0 to L/2
            for (let x = startingX; x <= L / 2; x += snapX) {
                const idealY = f(x);
                let snappedY = Math.round(idealY / snapY) * snapY;
                let currSlope = snappedY - prevY;
                // Prevent jagging
                // For downward parabolas (positive sag), slopes should never decrease
                // For upward parabolas (negative sag), slopes should never increase
                const preventJagging = S > 0 ? (currSlope < prevSlope) : (currSlope > prevSlope);
                if (preventJagging) {
                    snappedY = prevY + prevSlope;
                    currSlope = prevSlope;
                }
                prevSlope = currSlope;
                prevY = snappedY;
                rightPoints.push([x, snappedY]);
            }
            // Add final point at L/2 if not already included
            const halfL = L / 2;
            if (rightPoints.length === 0 || rightPoints[rightPoints.length - 1][0] < halfL) {
                rightPoints.push([halfL, S]);
            }
            // Mirror and translate to final coordinate
            leftPoints.push(...rightPoints.map(([x, y]) => [-x, y]));
            const allPoints = startingX > 0 ?
                [...leftPoints.reverse(), ...rightPoints] :
                [...leftPoints.reverse(), ...rightPoints.slice(1)];
            // Shift x by L/2 to center, and shift y by (H-S) to position cable correctly
            const baseHeight = H - S;
            this.snappedPoints = allPoints.map(([x, y]) => [x + (L / 2), y + baseHeight]);
            // Calculate error statistics
            if (this.snappedPoints.length === 0) {
                this.maxError = 0;
                this.avgError = 0;
            }
            else {
                const errors = this.snappedPoints.map(([x, y]) => {
                    const idealY = f(x - L / 2) + baseHeight;
                    return Math.abs(y - idealY);
                });
                this.maxError = Math.max(...errors);
                this.avgError = errors.reduce((a, b) => a + b) / errors.length;
            }
        },
        resizeCanvas() {
            const canvas = this.$refs.canvas;
            if (!canvas)
                return;
            const container = canvas.parentElement;
            if (!container)
                return;
            const containerWidth = container.clientWidth;
            // Calculate dimensions based on viewport
            const isMobile = window.innerWidth < 768;
            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
            // Set canvas dimensions with proper aspect ratio
            if (isMobile) {
                // Mobile: use most of container width, 4:3 aspect ratio
                canvas.width = containerWidth - 40;
                canvas.height = (containerWidth - 40) * 0.75;
            }
            else if (isTablet) {
                // Tablet: slightly wider, maintain 4:3
                canvas.width = containerWidth - 50;
                canvas.height = (containerWidth - 50) * 0.75;
            }
            else {
                // Desktop: use fixed dimensions or container-based
                const maxWidth = Math.min(containerWidth - 60, 800);
                canvas.width = maxWidth;
                canvas.height = maxWidth * 0.75; // 4:3 aspect ratio
            }
            // Redraw with new dimensions
            this.draw();
        },
        calculate() {
            this.calculateSnappedPoints();
            this.$nextTick(() => {
                this.draw();
            });
        },
        draw() {
            const canvas = this.$refs.canvas;
            if (!canvas)
                return;
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            const width = canvas.width;
            const height = canvas.height;
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            // Calculate scaling and offset
            const margin = 60;
            const plotWidth = width - 2 * margin;
            const plotHeight = height - 2 * margin;
            const L = this.length;
            const H = this.height;
            const S = this.sag;
            // Calculate actual Y range based on tower height and cable positions
            const cableMinY = H - Math.abs(S); // Lowest cable point
            const cableMaxY = H + Math.abs(S); // Highest cable point
            const yMin = Math.min(0, H, cableMinY) - 10; // Include ground, towers, and cable
            const yMax = Math.max(0, H, cableMaxY) + 10; // Add padding
            // Use the same scale for both axes to create square grid cells
            const scale = Math.min(plotWidth / L, plotHeight / (yMax - yMin));
            // Calculate actual used dimensions
            const usedWidth = L * scale;
            const usedHeight = (yMax - yMin) * scale;
            // Center the plot in available space
            const offsetX = margin + (plotWidth - usedWidth) / 2;
            const offsetY = margin + (plotHeight - usedHeight) / 2;
            // Transform functions
            const toCanvasX = (x) => offsetX + x * scale;
            const toCanvasY = (y) => height - offsetY - (y - yMin) * scale;
            // Draw grid with square cells
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            // Determine grid spacing (same for both axes to create square cells)
            const maxDimension = Math.max(L, yMax - yMin);
            const gridSpacing = maxDimension <= 50 ? 5 : maxDimension <= 100 ? 10 : 20;
            // Vertical grid lines
            for (let x = 0; x <= L; x += gridSpacing) {
                const cx = toCanvasX(x);
                ctx.beginPath();
                ctx.moveTo(cx, toCanvasY(yMax));
                ctx.lineTo(cx, toCanvasY(yMin));
                ctx.stroke();
            }
            // Horizontal grid lines
            for (let y = Math.ceil(yMin / gridSpacing) * gridSpacing; y <= yMax; y += gridSpacing) {
                const cy = toCanvasY(y);
                ctx.beginPath();
                ctx.moveTo(toCanvasX(0), cy);
                ctx.lineTo(toCanvasX(L), cy);
                ctx.stroke();
                // Y-axis label (show negative values)
                this.drawLabel(ctx, y + 'm', offsetX - 10, cy + 4, 'right');
            }
            // Draw towers (handle both positive and negative heights)
            this.setStrokeStyle(ctx, '#2196F3', 6, 'round');
            // Towers extend from ground (y=0) to height H
            const towerStart = Math.min(0, H);
            const towerEnd = Math.max(0, H);
            // Left tower
            this.drawVerticalLine(ctx, toCanvasX(0), toCanvasY(towerStart), toCanvasY(towerEnd));
            // Right tower
            this.drawVerticalLine(ctx, toCanvasX(L), toCanvasY(towerStart), toCanvasY(towerEnd));
            // Draw ground line at y=0 (make it more prominent)
            this.setStrokeStyle(ctx, '#795548', 4);
            ctx.setLineDash([]); // Ensure solid line
            ctx.beginPath();
            ctx.moveTo(toCanvasX(0), toCanvasY(0));
            ctx.lineTo(toCanvasX(L), toCanvasY(0));
            ctx.stroke();
            // Draw vertical cables at each snapping point
            this.setStrokeStyle(ctx, '#888888', 1.5);
            // Calculate intelligent label spacing
            // Reduced from 40 to 18 pixels because labels are rotated 75 degrees
            // At 75 degrees, labels are nearly vertical and take up much less horizontal space
            const minLabelSpacing = 18; // minimum pixels between labels for 75-degree rotated text
            const canvasWidth = toCanvasX(L) - toCanvasX(0);
            const availableSpacing = canvasWidth / this.snappedPoints.length;
            const labelSkip = Math.max(1, Math.ceil(minLabelSpacing / availableSpacing));
            this.snappedPoints.forEach((point, index) => {
                const cx = toCanvasX(point[0]);
                this.drawVerticalLine(ctx, cx, toCanvasY(point[1]), toCanvasY(0));
                // Only draw label if enough spacing, or first/last point
                const shouldDrawLabel = index % labelSkip === 0 ||
                    index === this.snappedPoints.length - 1;
                if (shouldDrawLabel) {
                    this.drawLabel(ctx, point[0] + 'm', cx, toCanvasY(0) + 20, 'center', 75);
                }
            });
            // Draw ideal parabola
            this.setStrokeStyle(ctx, '#4CAF50', 2);
            ctx.beginPath();
            for (let x = 0; x <= L; x += 0.5) {
                const y = this.parabola(x);
                const cx = toCanvasX(x);
                const cy = toCanvasY(y);
                if (x === 0) {
                    ctx.moveTo(cx, cy);
                }
                else {
                    ctx.lineTo(cx, cy);
                }
            }
            ctx.stroke();
            // Draw snapped cable segments (beams between attachment points)
            this.setStrokeStyle(ctx, '#FF5722', 3);
            ctx.beginPath();
            this.snappedPoints.forEach((point, i) => {
                const cx = toCanvasX(point[0]);
                const cy = toCanvasY(point[1]);
                if (i === 0) {
                    ctx.moveTo(cx, cy);
                }
                else {
                    ctx.lineTo(cx, cy);
                }
            });
            ctx.stroke();
            // Draw attachment points
            ctx.fillStyle = '#FF5722';
            this.snappedPoints.forEach(point => {
                const cx = toCanvasX(point[0]);
                const cy = toCanvasY(point[1]);
                this.drawCircle(ctx, cx, cy, 4);
            });
            // Draw ideal points for comparison (smaller, semi-transparent)
            ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
            this.snappedPoints.forEach(point => {
                const cx = toCanvasX(point[0]);
                const cy = toCanvasY(this.parabola(point[0])); // Use parabola() helper for ideal Y
                this.drawCircle(ctx, cx, cy, 2);
            });
        }
    };
}
// Make the function available globally for Alpine.js
window.bridgePlanner = bridgePlanner;
