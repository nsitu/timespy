import { downloadFile } from './domElements.js';
import {
    Output,
    BufferTarget,
    Mp4OutputFormat,
    CanvasSource,
    QUALITY_HIGH,
} from 'mediabunny';

export class DownloadManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.setupDownloadButton();
        this.renderCanvas = null; // Canvas for video rendering
        this.renderContext = null;
    }

    setupDownloadButton() {
        if (downloadFile) {
            downloadFile.style.display = 'block';
            downloadFile.addEventListener('click', () => {
                this.generateVideoDownload();
            });
        }
    }

    /**
     * Create a dedicated canvas for video rendering
     */
    createRenderCanvas() {
        if (!this.renderCanvas) {
            this.renderCanvas = document.createElement('canvas');
            this.renderCanvas.width = this.canvasManager.width;
            this.renderCanvas.height = this.canvasManager.height;
            this.renderContext = this.renderCanvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false,
                desynchronized: true
            });
        }
        return this.renderCanvas;
    }

    /**
     * Generate and download MP4 video from canvas frames
     */
    async generateVideoDownload() {
        try {
            // Update download button to show progress
            const originalText = downloadFile.textContent;
            downloadFile.textContent = 'Generating Video...';
            downloadFile.disabled = true;

            // Create render canvas
            const renderCanvas = this.createRenderCanvas();

            // Create mediabunny output
            const output = new Output({
                format: new Mp4OutputFormat(),
                target: new BufferTarget(),
            });

            // Create video source from our render canvas
            const videoSource = new CanvasSource(renderCanvas, {
                codec: 'avc',
                bitrate: QUALITY_HIGH,
            });
            output.addVideoTrack(videoSource);

            await output.start();

            // Generate a complete cycle: 0->29->0 (60 frames total for smooth loop)
            const frameDuration = 1 / 30; // 30 FPS
            let currentTime = 0;

            downloadFile.textContent = 'Rendering Frames...';

            // Forward direction: 0 to 29
            for (let i = 0; i < this.canvasManager.canvasCount; i++) {
                // Copy the canvas content to our render canvas
                this.copyCanvasFrame(i);

                // Add frame to video
                await videoSource.add(currentTime, frameDuration);
                currentTime += frameDuration;

                // Update progress
                const progress = Math.round((i / (this.canvasManager.canvasCount * 2)) * 100);
                downloadFile.textContent = `Rendering: ${progress}%`;
            }

            // Backward direction: 28 to 1 (skip 29 and 0 to avoid duplicates)
            for (let i = this.canvasManager.canvasCount - 2; i > 0; i--) {
                // Copy the canvas content to our render canvas
                this.copyCanvasFrame(i);

                // Add frame to video
                await videoSource.add(currentTime, frameDuration);
                currentTime += frameDuration;

                // Update progress
                const totalFrames = this.canvasManager.canvasCount * 2 - 2;
                const currentFrame = this.canvasManager.canvasCount + (this.canvasManager.canvasCount - 2 - i);
                const progress = Math.round((currentFrame / totalFrames) * 100);
                downloadFile.textContent = `Rendering: ${progress}%`;
            }

            downloadFile.textContent = 'Finalizing Video...';

            // Finalize the video
            await output.finalize();

            // Get the buffer and create download
            const buffer = output.target.buffer;
            const blob = new Blob([buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `timespy-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);

            // Reset button
            downloadFile.textContent = originalText;
            downloadFile.disabled = false;

            console.log('Video download completed successfully');

        } catch (error) {
            console.error('Video generation failed:', error);

            // Reset button on error
            downloadFile.textContent = 'Download Failed - Retry';
            downloadFile.disabled = false;

            // Show user-friendly error
            alert(`Video generation failed: ${error.message}\n\nPlease ensure all frames are captured before downloading.`);
        }
    }

    /**
     * Copy a specific canvas frame to the render canvas
     * @param {number} frameIndex - Index of the frame to copy
     */
    copyCanvasFrame(frameIndex) {
        if (!this.renderContext || !this.canvasManager.contexts[frameIndex]) {
            throw new Error(`Cannot copy frame ${frameIndex}: canvas not available`);
        }

        // Clear the render canvas
        this.renderContext.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

        // Get the source canvas
        const sourceCanvas = this.canvasManager.canvases[frameIndex];

        // Copy the frame to render canvas
        this.renderContext.drawImage(sourceCanvas, 0, 0);
    }

    /**
     * Legacy SVG download method (keeping for compatibility)
     */
    downloadSVG() {
        console.log('SVG download not implemented yet');
    }
}
