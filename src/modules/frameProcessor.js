import { debugElement } from './domElements.js';

export class FrameProcessor {
    constructor() {
        this.debugElement = debugElement;
        this.frameProcessingCount = 0;
        this.lastVideoTime = -1;
        this.isProcessing = false;

        // Create OffscreenCanvas for mask processing
        this.offscreenCanvas = new OffscreenCanvas(640, 480);
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
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
                this.updateDebug(`Processing frames... (${this.frameProcessingCount} processed)`);
            }

            // here we should process the frame by writing pixels to canvas

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
        this.isProcessing = false;
    }
}
