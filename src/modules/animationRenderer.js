import { previewCanvas } from './domElements.js';

export class AnimationRenderer {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.previewCanvas = previewCanvas;
        this.previewCtx = null;
        this.isRendering = false;
        this.currentFrameIndex = 0;
        this.direction = 1; // 1 for forward (0→29), -1 for backward (29→0)
        this.renderingInterval = null;
        this.frameRate = 30; // 30 FPS for smooth animation
        this.frameInterval = 1000 / this.frameRate; // ~33.33ms between frames

    }


    /**
     * Start the animation rendering loop
     */
    startRendering() {
        if (this.isRendering) {
            return; // Already rendering
        }

        if (!this.canvasManager.isInitialized) {
            console.warn('Canvas manager not initialized, cannot start rendering');
            return;
        }

        this.isRendering = true;
        this.currentFrameIndex = 0;
        this.direction = 1; // Start going forward

        // Use setInterval for consistent 30 FPS
        this.renderingInterval = setInterval(() => {
            this.renderCurrentFrame();
        }, this.frameInterval);

        console.log('Animation rendering started at 30 FPS');
    }

    /**
     * Stop the animation rendering loop
     */
    stopRendering() {
        if (!this.isRendering) {
            return;
        }

        this.isRendering = false;

        if (this.renderingInterval) {
            clearInterval(this.renderingInterval);
            this.renderingInterval = null;
        }

        console.log('Animation rendering stopped');
    }

    /**
     * Render the current frame by showing the appropriate DOM canvas
     */
    renderCurrentFrame() {
        if (!this.canvasManager.isInitialized) {
            return;
        }

        try {

            // console.log(`Rendering frame ${this.currentFrameIndex} (direction: ${this.direction})`);
            // Simply show the current canvas and hide others
            this.canvasManager.showCanvas(this.currentFrameIndex);

            // Move to next frame with ping-pong behavior (0→29→28→...→1→0→1→...)
            this.currentFrameIndex += this.direction;

            // Check boundaries and reverse direction if needed
            if (this.currentFrameIndex >= 29) {
                this.currentFrameIndex = 29;
                this.direction = -1; // Start going backward
            } else if (this.currentFrameIndex <= 0) {
                this.currentFrameIndex = 0;
                this.direction = 1; // Start going forward
            }

        } catch (error) {
            console.error('Error rendering frame:', error);
        }
    }

    /**
     * Clear the preview canvas
     */
    clearPreviewCanvas() {
        if (this.previewCtx) {
            this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        }
    }

    /**
     * Manually render a specific frame (useful for debugging)
     * @param {number} frameIndex - Frame index to render (0-29)
     */
    renderSpecificFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= 30) {
            console.warn(`Invalid frame index: ${frameIndex}`);
            return;
        }
        console.log(`Rendering frame ${frameIndex}`);
        // Simply show the specified canvas
        this.canvasManager.showCanvas(frameIndex);
    }

    /**
     * Set the animation frame rate
     * @param {number} fps - Frames per second (1-60)
     */
    setFrameRate(fps) {
        if (fps < 1 || fps > 60) {
            console.warn('Frame rate must be between 1 and 60 FPS');
            return;
        }

        this.frameRate = fps;
        this.frameInterval = 1000 / this.frameRate;

        // Restart rendering with new frame rate if currently rendering
        if (this.isRendering) {
            this.stopRendering();
            this.startRendering();
        }

        console.log(`Animation frame rate set to ${fps} FPS`);
    }

    /**
     * Get current animation status
     * @returns {object} Status information
     */
    getStatus() {
        return {
            isRendering: this.isRendering,
            currentFrame: this.currentFrameIndex,
            direction: this.direction > 0 ? 'forward' : 'backward',
            frameRate: this.frameRate,
            canvasManagerReady: this.canvasManager.isInitialized
        };
    }

    /**
     * Handle canvas resize (e.g., viewport changes)
     */
    onResize() {
        if (this.canvasManager.isInitialized) {
            this.initializePreviewCanvas();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRendering();
        this.currentFrameIndex = 0;
        this.direction = 1;

        // Hide all canvases when cleaning up
        if (this.canvasManager && this.canvasManager.isInitialized) {
            this.canvasManager.hideAllCanvases();
        }

        console.log('Animation renderer cleaned up');
    }
}
