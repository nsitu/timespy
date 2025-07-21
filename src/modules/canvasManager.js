export class CanvasManager {
    constructor() {
        this.canvases = [];
        this.contexts = [];
        this.canvasCount = 30;
        this.width = 0;
        this.height = 0;
        this.isInitialized = false;
        this.currentlyVisibleIndex = -1; // Track which canvas is currently visible
    }

    /**
     * Initialize the canvas manager with viewport dimensions
     * @param {number} width - Width of the viewport/video
     * @param {number} height - Height of the viewport/video
     */
    initialize(width, height) {
        this.width = width;
        this.height = height;

        // Clear existing canvases if reinitializing
        this.cleanup();

        // Create 30 regular DOM canvases
        for (let i = 0; i < this.canvasCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.id = `timespy-canvas-${i}`;

            // Set CSS for full viewport coverage and initially hidden
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.objectFit = 'cover';
            canvas.style.display = 'none'; // Initially hidden
            canvas.style.zIndex = '1'; // Below UI elements

            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,  // We're mostly writing
                alpha: false,               // No transparency needed
                desynchronized: true        // Allow async rendering
            });

            // Initialize canvas with transparent background
            ctx.clearRect(0, 0, width, height);

            // Append to the app container
            const appElement = document.getElementById('app');
            if (appElement) {
                appElement.appendChild(canvas);
            }

            this.canvases.push(canvas);
            this.contexts.push(ctx);
        }

        this.isInitialized = true;
        console.log(`CanvasManager initialized with ${this.canvasCount} DOM canvases (${width}x${height})`);
    }    /**
     * Get a specific canvas by index
     * @param {number} index - Canvas index (0-59)
     * @returns {OffscreenCanvas|null} The canvas at the specified index
     */
    getCanvas(index) {
        if (!this.isInitialized || index < 0 || index >= this.canvasCount) {
            console.warn(`Invalid canvas index: ${index}`);
            return null;
        }
        return this.canvases[index];
    }

    /**
     * Get a specific canvas context by index
     * @param {number} index - Canvas index (0-59)
     * @returns {OffscreenCanvasRenderingContext2D|null} The context at the specified index
     */
    getContext(index) {
        if (!this.isInitialized || index < 0 || index >= this.canvasCount) {
            console.warn(`Invalid canvas index: ${index}`);
            return null;
        }
        return this.contexts[index];
    }

    /**
     * Write pixel data from a source to a specific row on a target canvas
     * @param {number} canvasIndex - Index of the target canvas (0-59)
     * @param {ImageData} sourceImageData - Source image data containing the pixels
     * @param {number} sourceRow - Row index in the source image to copy from
     * @param {number} targetRow - Row index in the target canvas to write to
     * @param {number} startX - Starting X position (default: 0)
     * @param {number} width - Width of the row to copy (default: canvas width)
     */
    writePixelRow(canvasIndex, sourceImageData, sourceRow, targetRow, startX = 0, width = null) {
        const ctx = this.getContext(canvasIndex);
        if (!ctx) return false;

        const copyWidth = width || this.width;

        // Validate parameters
        if (sourceRow < 0 || sourceRow >= sourceImageData.height ||
            targetRow < 0 || targetRow >= this.height ||
            startX < 0 || startX + copyWidth > this.width) {
            console.warn('Invalid parameters for writePixelRow');
            return false;
        }

        try {
            // Create ImageData for the target row
            const rowImageData = new ImageData(copyWidth, 1);

            // Copy pixel data from source row to target row
            const sourceRowStart = sourceRow * sourceImageData.width * 4;
            const sourcePixelStart = sourceRowStart + (startX * 4);

            for (let i = 0; i < copyWidth * 4; i++) {
                rowImageData.data[i] = sourceImageData.data[sourcePixelStart + i];
            }

            // Write the row to the target canvas
            ctx.putImageData(rowImageData, startX, targetRow);
            return true;

        } catch (error) {
            console.error('Error writing pixel row:', error);
            return false;
        }
    }

    /**
     * Write a specific row from a frame directly to a target canvas (more efficient)
     * @param {number} canvasIndex - Index of the target canvas (0-59)
     * @param {VideoFrame} frame - Source video frame
     * @param {number} sourceRow - Row index in the source frame to copy from
     * @param {number} targetRow - Row index in the target canvas to write to
     * @param {number} startX - Starting X position (default: 0)
     * @param {number} width - Width of the row to copy (default: canvas width)
     */
    writeFrameRow(canvasIndex, frame, sourceRow, targetRow, startX = 0, width = null) {
        const ctx = this.getContext(canvasIndex);
        if (!ctx) return false;

        const copyWidth = width || this.width;

        // Validate parameters
        if (sourceRow < 0 || sourceRow >= frame.displayHeight ||
            targetRow < 0 || targetRow >= this.height ||
            startX < 0 || startX + copyWidth > this.width) {
            console.warn('Invalid parameters for writeFrameRow');
            return false;
        }

        try {
            // Debug frame type on first write (especially important for polyfill)
            if (canvasIndex === 0 && targetRow === 0) {
                console.log(`🖼️ Frame info for writeFrameRow:`, {
                    frameType: frame.constructor.name,
                    frameDisplayWidth: frame.displayWidth,
                    frameDisplayHeight: frame.displayHeight,
                    sourceRow,
                    targetRow,
                    copyWidth,
                    hasDrawImage: typeof ctx.drawImage === 'function'
                });
            }

            // Use drawImage with clipping to copy just the specific row
            // This is much more efficient than getting full ImageData
            ctx.drawImage(
                frame,
                startX, sourceRow,           // Source x, y
                copyWidth, 1,                // Source width, height (1 pixel tall)
                startX, targetRow,           // Destination x, y  
                copyWidth, 1                 // Destination width, height
            );
            return true;

        } catch (error) {
            console.error('Error writing frame row:', error, {
                frameType: frame.constructor.name,
                canvasIndex,
                sourceRow,
                targetRow,
                frameDisplayWidth: frame.displayWidth,
                frameDisplayHeight: frame.displayHeight
            });
            return false;
        }
    }    /**
     * Clear a specific canvas
     * @param {number} index - Canvas index to clear
     */
    clearCanvas(index) {
        const ctx = this.getContext(index);
        if (ctx) {
            ctx.clearRect(0, 0, this.width, this.height);
        }
    }

    /**
     * Clear all canvases
     */
    clearAllCanvases() {
        for (let i = 0; i < this.canvasCount; i++) {
            this.clearCanvas(i);
        }
    }

    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number, count: number}}
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height,
            count: this.canvasCount
        };
    }

    /**
     * Convert a canvas to a blob for downloading
     * @param {number} index - Canvas index
     * @param {string} type - Image type (default: 'image/png')
     * @returns {Promise<Blob|null>} The canvas as a blob
     */
    async getCanvasBlob(index, type = 'image/png') {
        const canvas = this.getCanvas(index);
        if (!canvas) return null;

        try {
            return await canvas.convertToBlob({ type });
        } catch (error) {
            console.error('Error converting canvas to blob:', error);
            return null;
        }
    }

    /**
     * Get all canvases as an array of blobs
     * @param {string} type - Image type (default: 'image/png')
     * @returns {Promise<Blob[]>} Array of canvas blobs
     */
    async getAllCanvasBlobs(type = 'image/png') {
        const blobs = [];
        for (let i = 0; i < this.canvasCount; i++) {
            const blob = await this.getCanvasBlob(i, type);
            if (blob) {
                blobs.push(blob);
            }
        }
        return blobs;
    }

    /**
     * Show a specific canvas and hide all others
     * @param {number} index - Canvas index to show (0-29)
     */
    showCanvas(index) {
        if (!this.isInitialized || index < 0 || index >= this.canvasCount) {
            console.warn(`Invalid canvas index: ${index}`);
            return false;
        }

        // If this canvas is already visible, no need to do anything
        if (this.currentlyVisibleIndex === index) {
            return true;
        }

        // Hide the previously visible canvas (if any)
        if (this.currentlyVisibleIndex >= 0 && this.currentlyVisibleIndex < this.canvasCount) {
            this.canvases[this.currentlyVisibleIndex].style.display = 'none';
        }

        // Show the new canvas
        this.canvases[index].style.display = 'block';

        // Update tracking
        this.currentlyVisibleIndex = index;
        return true;
    }

    /**
     * Hide all canvases
     */
    hideAllCanvases() {
        // Only hide the currently visible canvas (if any)
        if (this.currentlyVisibleIndex >= 0 && this.currentlyVisibleIndex < this.canvasCount) {
            this.canvases[this.currentlyVisibleIndex].style.display = 'none';
            this.currentlyVisibleIndex = -1;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Remove DOM canvases from the page
        this.canvases.forEach(canvas => {
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        });

        this.canvases = [];
        this.contexts = [];
        this.currentlyVisibleIndex = -1;
        this.isInitialized = false;
        console.log('CanvasManager cleaned up');
    }

    /**
     * Get the current status of the canvas manager
     * @returns {object} Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            canvasCount: this.canvasCount,
            dimensions: { width: this.width, height: this.height },
            canvasesCreated: this.canvases.length,
            currentlyVisible: this.currentlyVisibleIndex
        };
    }
}
