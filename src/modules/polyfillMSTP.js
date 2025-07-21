// Polyfill for MediaStreamTrackProcessor (from Jan-Ivar)

if (!globalThis.MediaStreamTrackProcessor) {
    console.log("Polyfilling MediaStreamTrackProcessor");
    globalThis.MediaStreamTrackProcessor = class MediaStreamTrackProcessor {
        constructor({ track }) {
            if (track.kind === "video") {
                this.readable = new ReadableStream({
                    async start(controller) {
                        this.video = document.createElement("video");
                        this.video.srcObject = new MediaStream([track]);
                        await Promise.all([
                            this.video.play(),
                            new Promise(r => (this.video.onloadedmetadata = r))
                        ]);
                        this.track = track;
                        
                        // Ensure canvas dimensions are even for compatibility
                        const width = this.video.videoWidth % 2 === 0 ? 
                            this.video.videoWidth : 
                            this.video.videoWidth - 1;
                        const height = this.video.videoHeight % 2 === 0 ? 
                            this.video.videoHeight : 
                            this.video.videoHeight - 1;
                            
                        console.log(`Polyfill canvas dimensions: ${width}x${height} (video: ${this.video.videoWidth}x${this.video.videoHeight})`);
                        
                        this.canvas = new OffscreenCanvas(width, height);
                        this.ctx = this.canvas.getContext("2d", { desynchronized: true });
                        this.t1 = performance.now();
                    },
                    async pull(controller) {
                        while (performance.now() - this.t1 < 1000 / track.getSettings().frameRate) {
                            await new Promise(r => requestAnimationFrame(r));
                        }
                        this.t1 = performance.now();
                        
                        // Clear canvas before drawing to ensure fresh frame
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                        
                        // Create VideoFrame with proper timestamp and displayWidth/displayHeight
                        const videoFrame = new VideoFrame(this.canvas, { 
                            timestamp: this.t1 * 1000, // Convert to microseconds
                            displayWidth: this.canvas.width,
                            displayHeight: this.canvas.height
                        });
                        
                        controller.enqueue(videoFrame);
                    }
                });
            }
        }
    };
}

