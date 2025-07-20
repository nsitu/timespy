import './modules/polyfillMSTP.js';
import './style.css'
// main.js
import { loadIcons } from './modules/iconLoader.js';
const iconNames = ['cameraswitch', 'download', 'colors', 'share'];
loadIcons(iconNames);

import { startAppBtn, welcomeScreen, app, loadingSpinner, cameraToggle } from './modules/domElements.js';
import { CameraManager } from './modules/camera.js';
import { FrameProcessor } from './modules/frameProcessor.js';
import { DownloadManager } from './modules/download.js';

let cameraManager = null;
let frameProcessor = null;
let downloadManager = null;
let processingLoop = null;


// Start preloading immediately when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize both managers
        cameraManager = new CameraManager();
        frameProcessor = new FrameProcessor();
        // todo: review if loading is needed.
        loadingSpinner.style.display = 'none';
        startAppBtn.style.display = 'inline-block';
        startAppBtn.textContent = 'Start';
        startAppBtn.disabled = false;

    } catch (error) {

        // Show error state
        startAppBtn.textContent = 'Error loading app';
        startAppBtn.disabled = false;

        // Allow retry by clicking the button
        startAppBtn.addEventListener('click', () => {
            location.reload(); // Simple retry by reloading the page
        }, { once: true });
    }
});




// Initialize app after user clicks start button
startAppBtn.addEventListener('click', async () => {
    // Only proceed if the model is loaded
    if (!cameraManager || !frameProcessor || startAppBtn.textContent !== 'Start') {
        return;
    }

    startAppBtn.textContent = 'Starting camera...';
    startAppBtn.disabled = true;

    try {
        // Initialize camera
        const cameraInfo = await cameraManager.initialize();

        // Initialize frame processor with camera dimensions
        frameProcessor.setDimensions(cameraInfo.width, cameraInfo.height);

        // Initialize download manager
        downloadManager = new DownloadManager(cameraManager);

        // Set up camera toggle if multiple cameras available
        if (cameraManager.hasMultipleCamerasAvailable()) {
            cameraToggle.addEventListener('click', toggleCamera);
        }

        // Start processing loop
        startProcessingLoop();

        // Hide welcome screen and show app
        welcomeScreen.style.display = 'none';
        app.style.display = 'block';

        console.log('Application started successfully');

    } catch (error) {
        console.error('Error starting application:', error);

        // Show more specific error messages
        let errorMessage = 'Failed to start camera. Try again?';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.message.includes('MediaPipe')) {
            errorMessage = 'Failed to load AI model. Please check your internet connection.';
        }

        startAppBtn.textContent = errorMessage;
        startAppBtn.disabled = false;
    }
});


// Processing loop to handle camera frames
async function startProcessingLoop() {
    try {
        // Get the frame stream from camera
        const frameStream = cameraManager.getFrameStream();

        // Process frames
        for await (const frame of frameStream) {
            // Process each frame with frame processor
            await frameProcessor.processFrame(frame);
        }
    } catch (error) {
        console.error('Processing loop error:', error);
    }
}


// Camera toggle functionality
async function toggleCamera() {
    try {
        cameraToggle.disabled = true;

        // Stop current processing
        if (processingLoop) {
            cameraManager.stop();
        }

        // Toggle camera
        const newCameraInfo = await cameraManager.toggleCamera();

        // Update frame processor with new dimensions
        frameProcessor.setDimensions(newCameraInfo.width, newCameraInfo.height);

        // Restart processing loop
        startProcessingLoop();

    } catch (error) {
        console.error('Camera toggle failed:', error);
    } finally {
        cameraToggle.disabled = false;
    }
}


// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (cameraManager) {
        cameraManager.stop();
    }
    if (poseProcessor) {
        poseProcessor.cleanup();
    }
});