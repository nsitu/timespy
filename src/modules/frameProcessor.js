import { debugElement } from './domElements.js';
import { CanvasManager } from './canvasManager.js';
import { AnimationRenderer } from './animationRenderer.js';

export class FrameProcessor {
    constructor() {
        this.debugElement = debugElement;
        this.frameProcessingCount = 0;
        this.lastVideoTime = -1;
        this.isProcessing = false;
        this.currentTargetRow = 0; // Track which row we're currently filling across all canvases

        // Create OffscreenCanvas for frame processing
        this.offscreenCanvas = new OffscreenCanvas(640, 480);
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

        // Initialize canvas manager for the 30 animation frames
        this.canvasManager = new CanvasManager();

        // Initialize animation renderer (will be set up after canvas manager is initialized)
        this.animationRenderer = null;
    }

    updateDebug(message) {
        if (this.debugElement) {
            this.debugElement.textContent = `Status: ${message}`;
        }
        console.log('Debug:', message);
    }

    setDimensions(width, height) {
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;

        // Initialize the canvas manager with the same dimensions
        this.canvasManager.initialize(width, height);

        // Initialize animation renderer after canvas manager is ready
        this.animationRenderer = new AnimationRenderer(this.canvasManager);

        // Start the animation rendering loop
        this.animationRenderer.startRendering();
    }



    async processFrame(frame) {
        try {
            // Prevent overlapping processing
            if (this.isProcessing) {
                frame.close();
                return;
            }

            this.isProcessing = true;
            this.frameProcessingCount++;

            // Show periodic updates about frame processing
            if (this.frameProcessingCount % 30 === 0) { // Every 30 frames (~1 second at 30fps)
                const animStatus = this.animationRenderer ? this.animationRenderer.getStatus() : { isRendering: false };
                const totalRows = frame.displayHeight;
                const progressPercent = Math.round((this.currentTargetRow / totalRows) * 100);
                this.updateDebug(`Processing frames... (${this.frameProcessingCount} processed) | Row: ${this.currentTargetRow}/${totalRows} (${progressPercent}%) | Animation: ${animStatus.isRendering ? 'Playing' : 'Stopped'}`);
            }

            // Write 30 different rows from the current frame to all 30 canvases
            // Each canvas gets a different source row, but all write to the same target row
            if (this.canvasManager.isInitialized) {
                const frameHeight = frame.displayHeight;
                
                // Write one row to each of the 30 canvases
                for (let canvasIndex = 0; canvasIndex < 30; canvasIndex++) {
                    // Calculate which source row to use for this canvas
                    // Distribute the frame height across 30 canvases
                    const sourceRow = Math.floor((canvasIndex / 30) * frameHeight);
                    
                    // All canvases write to the same target row (current row being filled)
                    const targetRow = this.currentTargetRow;
                    
                    // Write this row to the canvas
                    this.canvasManager.writeFrameRow(canvasIndex, frame, sourceRow, targetRow);
                }
                
                // Move to the next target row for the next frame
                this.currentTargetRow++;
                
                // Reset to top when we've filled all rows
                if (this.currentTargetRow >= frameHeight) {
                    this.currentTargetRow = 0;
                    console.log(`Completed full cycle of ${frameHeight} rows, resetting to top`);
                }
            }

            // Clean up 
            frame.close();

        } catch (error) {
            console.error('Frame processing error:', error);
            // Always close the frame to prevent memory leaks
            frame.close();
        } finally {
            this.isProcessing = false;
        }
    }


    cleanup() {
        // Clear any ongoing processing 
        this.frameProcessingCount = 0;
        this.currentTargetRow = 0;
        this.isProcessing = false;

        // Cleanup animation renderer
        if (this.animationRenderer) {
            this.animationRenderer.cleanup();
            this.animationRenderer = null;
        }

        // Cleanup canvas manager
        if (this.canvasManager) {
            this.canvasManager.cleanup();
        }
    }

    /**
     * Get access to the canvas manager for external operations
     * @returns {CanvasManager} The canvas manager instance
     */
    getCanvasManager() {
        return this.canvasManager;
    }

    /**
     * Get access to the animation renderer for external operations
     * @returns {AnimationRenderer} The animation renderer instance
     */
    getAnimationRenderer() {
        return this.animationRenderer;
    }
}