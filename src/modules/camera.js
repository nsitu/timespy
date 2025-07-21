import { debugElement, cameraToggle } from './domElements.js';

// Camera resolution is now dynamically calculated based on viewport dimensions and orientation.
// For portrait mobile devices, the camera resolution is optimized to match the aspect ratio
// while considering performance constraints (max 1920x1080).

export class CameraManager {
    constructor() {
        this.debugElement = debugElement;
        this.stream = null;
        this.reader = null;
        this.videoWidth = 640;
        this.videoHeight = 480;
        this.currentFacingMode = this.getPreferredFacingMode(); // Smart default based on viewport
        this.isStreaming = false;
        this.hasMultipleCameras = false;

        // Calculate optimal resolution based on viewport
        this.calculateOptimalResolution();
    }

    /**
     * Determine preferred camera based on viewport orientation
     * @returns {string} Preferred facing mode
     */
    getPreferredFacingMode() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isPortrait = viewportHeight > viewportWidth;

        // Portrait = mobile device = prefer environment (rear) camera
        // Landscape = desktop/laptop = prefer user (front) camera
        return isPortrait ? 'environment' : 'user';
    }

    /**
     * Calculate optimal camera resolution based on viewport dimensions and orientation
     */
    calculateOptimalResolution() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isPortrait = viewportHeight > viewportWidth;

        console.log(`Viewport: ${viewportWidth}x${viewportHeight}, Portrait: ${isPortrait}`);

        // For mobile devices in portrait mode, we want the camera to capture
        // in landscape orientation but rotated to match the viewport aspect ratio
        if (isPortrait) {
            // Request landscape resolution that matches portrait aspect ratio
            // Camera width should match viewport height, camera height should match viewport width
            this.videoWidth = Math.min(viewportHeight, 1920); // Cap at 1920 for performance
            this.videoHeight = Math.min(viewportWidth, 1080);  // Cap at 1080 for performance
        } else {
            // Landscape orientation - match directly
            this.videoWidth = Math.min(viewportWidth, 1920);
            this.videoHeight = Math.min(viewportHeight, 1080);
        }

        // Ensure minimum resolution
        this.videoWidth = Math.max(this.videoWidth, 640);
        this.videoHeight = Math.max(this.videoHeight, 480);

        console.log(`Optimal camera resolution: ${this.videoWidth}x${this.videoHeight}`);

        // Update facing mode preference based on current viewport
        this.currentFacingMode = this.getPreferredFacingMode();
        console.log(`Preferred facing mode: ${this.currentFacingMode} (viewport: ${window.innerWidth}x${window.innerHeight})`);
    }

    updateDebug(message) {
        if (this.debugElement) {
            this.debugElement.textContent = `Status: ${message}`;
        }
        console.log('Debug:', message);
    }

    async initialize() {
        try {
            // Recalculate optimal resolution and facing mode in case viewport changed
            this.calculateOptimalResolution();

            // Check for multiple cameras and setup toggle
            await this.setupCameraToggle();

            this.updateDebug(`Requesting ${this.currentFacingMode} camera (${this.videoWidth}x${this.videoHeight})...`);

            // Simple camera request with ideal facing mode
            const videoConstraints = {
                width: { ideal: this.videoWidth, min: 640 },
                height: { ideal: this.videoHeight, min: 480 },
                facingMode: { ideal: this.currentFacingMode },
                frameRate: { ideal: 30, max: 60 }
            };

            // Get user media stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints
            }); this.updateDebug('Camera access granted, setting up stream processor...');            // Check if MediaStreamTrackProcessor is supported
            if (!window.MediaStreamTrackProcessor) {
                throw new Error('MediaStreamTrackProcessor not supported in this browser');
            }

            // Get video track and create processor
            const track = this.stream.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            this.reader = processor.readable.getReader();

            // Get first frame to determine actual dimensions
            const { value: firstFrame } = await this.reader.read();
            this.videoWidth = firstFrame.displayWidth;
            this.videoHeight = firstFrame.displayHeight;

            this.updateDebug(`Camera stream ready (${this.videoWidth}x${this.videoHeight})`);

            // Close the first frame
            firstFrame.close();

            return {
                width: this.videoWidth,
                height: this.videoHeight,
                facingMode: this.currentFacingMode
            };
        } catch (error) {
            this.updateDebug(`Camera error: ${error.message}`);
            console.error('Camera initialization failed:', error);
            throw error;
        }
    }

    async setupCameraToggle() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            console.log('Available video devices:', videoDevices);

            this.hasMultipleCameras = videoDevices.length > 1;

            // Show camera toggle button if multiple cameras are available
            if (this.hasMultipleCameras) {
                cameraToggle.style.display = 'block';
            } else {
                cameraToggle.style.display = 'none';
            }

            // Log camera availability for debugging
            if (videoDevices.length === 0) {
                console.warn('No video input devices found');
            } else {
                console.log(`Found ${videoDevices.length} video device(s):`,
                    videoDevices.map(d => ({ label: d.label || 'Unknown', deviceId: d.deviceId })));
            }

            return this.hasMultipleCameras;
        } catch (error) {
            console.error('Error setting up camera toggle:', error);
            return false;
        }
    }

    async toggleCamera() {
        try {
            // Switch facing mode
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

            this.updateDebug(`Switching to ${this.currentFacingMode} camera...`);

            // Stop current stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Stop current reader
            if (this.reader) {
                this.reader.releaseLock();
                this.reader = null;
            }

            // Recalculate optimal resolution in case viewport changed
            this.calculateOptimalResolution();

            // Try to get camera with new facing mode, with fallback
            let stream = null;
            let actualFacingMode = this.currentFacingMode;

            try {
                // First attempt: Try with specific facing mode
                const videoConstraints = {
                    width: { ideal: this.videoWidth, min: 640 },
                    height: { ideal: this.videoHeight, min: 480 },
                    facingMode: { ideal: this.currentFacingMode }, // Use 'ideal' instead of exact
                    frameRate: { ideal: 30, max: 60 },
                    aspectRatio: { ideal: this.videoWidth / this.videoHeight }
                };

                stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints
                });

            } catch (firstError) {
                console.log(`Failed to get ${this.currentFacingMode} camera during toggle, trying fallback...`);

                try {
                    // Second attempt: Remove facing mode constraint
                    const fallbackConstraints = {
                        width: { ideal: this.videoWidth, min: 640 },
                        height: { ideal: this.videoHeight, min: 480 },
                        frameRate: { ideal: 30, max: 60 },
                        aspectRatio: { ideal: this.videoWidth / this.videoHeight }
                    };

                    stream = await navigator.mediaDevices.getUserMedia({
                        video: fallbackConstraints
                    });

                    // Determine which camera we actually got
                    const track = stream.getVideoTracks()[0];
                    const settings = track.getSettings();
                    actualFacingMode = settings.facingMode || 'unknown';

                } catch (secondError) {
                    throw new Error(`Camera toggle failed: ${firstError.message}. Fallback also failed: ${secondError.message}`);
                }
            }

            this.stream = stream;
            this.currentFacingMode = actualFacingMode;

            // Set up new stream processor
            const track = this.stream.getVideoTracks()[0];
            const processor = new MediaStreamTrackProcessor({ track });
            this.reader = processor.readable.getReader();

            // Update actual dimensions from the new stream
            const { value: firstFrame } = await this.reader.read();
            this.videoWidth = firstFrame.displayWidth;
            this.videoHeight = firstFrame.displayHeight;
            firstFrame.close();

            this.updateDebug(`Switched to ${this.currentFacingMode} camera (${this.videoWidth}x${this.videoHeight})`);

            // Return camera info for other components to use
            return {
                width: this.videoWidth,
                height: this.videoHeight,
                facingMode: this.currentFacingMode
            };

        } catch (error) {
            console.error('Camera toggle failed:', error);
            this.updateDebug(`Camera toggle failed: ${error.message}`);

            // Try to revert to previous camera
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            throw error;
        }
    }

    async *getFrameStream() {
        this.isStreaming = true;
        let frameCount = 0;
        const targetFPS = 24; // Reduce from 30fps for better performance
        const frameInterval = Math.floor(30 / targetFPS); // Process every Nth frame

        try {
            while (this.isStreaming) {
                const { done, value: frame } = await this.reader.read();
                if (done) break;

                frameCount++;

                // Process fewer frames but more efficiently
                if (frameCount % frameInterval === 0) {
                    yield frame;
                } else {
                    frame.close();
                }
            }
        } catch (error) {
            console.error('Stream processing error:', error);
            this.updateDebug(`Stream error: ${error.message}`);
        }
    }

    stop() {
        this.isStreaming = false;

        // Stop the stream reader
        if (this.reader) {
            this.reader.releaseLock();
            this.reader = null;
        }

        // Stop video stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    getDimensions() {
        return {
            width: this.videoWidth,
            height: this.videoHeight
        };
    }

    getFacingMode() {
        return this.currentFacingMode;
    }

    hasMultipleCamerasAvailable() {
        return this.hasMultipleCameras;
    }

    /**
     * Get current viewport information
     * @returns {object} Viewport dimensions and orientation
     */
    getViewportInfo() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isPortrait = viewportHeight > viewportWidth;

        return {
            width: viewportWidth,
            height: viewportHeight,
            isPortrait,
            aspectRatio: viewportWidth / viewportHeight
        };
    }

    /**
     * Handle viewport resize - recalculate optimal resolution
     * Call this method when the viewport changes (e.g., device rotation)
     */
    onViewportResize() {
        const oldWidth = this.videoWidth;
        const oldHeight = this.videoHeight;

        this.calculateOptimalResolution();

        // Log if resolution changed significantly
        if (Math.abs(this.videoWidth - oldWidth) > 100 || Math.abs(this.videoHeight - oldHeight) > 100) {
            console.log(`Viewport changed, new optimal resolution: ${this.videoWidth}x${this.videoHeight}`);
            // Note: You may want to restart the camera stream here for optimal quality
        }
    }

}
