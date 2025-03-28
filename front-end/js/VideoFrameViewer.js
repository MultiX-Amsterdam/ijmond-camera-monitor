class VideoFrameViewer {
    constructor(viewerId) {
        this.frames = [];
        this.playing = false;
        this.playInterval = null;
        this.viewerId = viewerId;
        this.actualFrame = 0;
        this.viewer = this.createViewer();
        this.setupControls();
        this.abortController = null;  // Add abort controller
    }

    createViewer() {
        const viewerHtml = `
            <div class="frames-view" id="viewer-${this.viewerId}">
                <div class="frame-display">
                    <canvas class="current-frame"></canvas>
                </div>
                <div class="slider-controls">
                    <button class="play-pause custom-button-flat"><img src="img/play.png"></button>
                    <input type="range" class="slider" min="1" value="1" />
                    <span class="frame-counter">1/1</span>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = viewerHtml;
        return div.firstElementChild;
    }

    getViewer() {
        return this.viewer;
    }

    setupControls() {
        this.slider = this.viewer.querySelector('.slider');
        this.canvas = this.viewer.querySelector('.current-frame');
        this.frameCounter = this.viewer.querySelector('.frame-counter');
        this.playPauseBtn = this.viewer.querySelector('.play-pause');
        this.slider.addEventListener('input', (e) => this.updateCurrentFrame(parseInt(e.target.value) - 1));
        this.playPauseBtn.addEventListener('click', () => this.playPause());
    }

    updateCurrentFrame(frameIndex) {
        // Note that frameIndex is 0-based, but the slider is 1-based
        if (this.frames.length === 0) return;
        this.slider.value = frameIndex + 1;
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.frames[frameIndex], 0, 0);
        this.frameCounter.textContent = `${frameIndex + 1}/${this.frames.length}`;
    }

    playPause() {
        this.playing = !this.playing;
        if (this.playing) {
            // Reset to the first frame when starting playback
            this.updateCurrentFrame(0);
            // Start looping the frames
            this.playInterval = setInterval(() => {
                // Note that the slider is 1-based, but the nextFrame is 0-based
                // So we do not need to subtract 1 when computing the next frame index
                let nextFrame = parseInt(this.slider.value);
                if (nextFrame > this.frames.length - 1) {
                    // When reaching the end, stop playing and return to the frame that needs labeling
                    clearInterval(this.playInterval);
                    this.playing = false;
                    this.updateCurrentFrame(this.actualFrame);
                } else {
                    this.updateCurrentFrame(nextFrame);
                }
            }, 1500 / 36);
        } else {
            // Stop looping the frames
            clearInterval(this.playInterval);
            // Seek to the frame that we want the user to label
            this.updateCurrentFrame(this.actualFrame);
        }
    }

    pause() {
        if (this.playing) {
            this.playPause();
        }
    }

    async captureFrames(videoUrl, initialFrame, segUrl) {
        // Abort any existing capture process
        if (this.abortController) {
            this.abortController.abort();
        }
        // Create new abort controller for this capture process
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Clean up any existing video
        if (this.currentVideo) {
            this.currentVideo.src = '';
            this.currentVideo.load();
            this.currentVideo = null;
        }

        this.pause();
        this.frames = [];
        this.initialFrame = initialFrame;
        this.videoUrl = videoUrl;
        this.segUrl = segUrl;

        const video = document.createElement('video');
        this.currentVideo = video;
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.playsInline = true; // Required for iOS
        video.muted = true; // Required for autoplay on mobile

        try {
            // Check if aborted
            if (signal.aborted) return;

            // Wait for both metadata and enough data to play
            await new Promise((resolve, reject) => {
                if (signal.aborted) {
                    reject(new Error('Capture aborted'));
                    return;
                }

                let metadataLoaded = false;
                let canPlay = false;

                const checkReady = () => {
                    if (signal.aborted) {
                        reject(new Error('Capture aborted'));
                        return;
                    }
                    if (metadataLoaded && canPlay) {
                        resolve();
                    }
                };

                video.addEventListener('loadedmetadata', () => {
                    metadataLoaded = true;
                    checkReady();
                });

                video.addEventListener('canplaythrough', () => {
                    canPlay = true;
                    checkReady();
                });

                video.addEventListener('error', (e) => {
                    reject(new Error(`Video loading failed: ${video.error.message}`));
                });

                video.src = videoUrl;
                video.load();
            });

            if (signal.aborted) return;

            const totalFrames = 36; // TODO: this number should come from the server metadata
            // Since initialFrame is 1-based, subtract 1 when storing in actualFrame (which is 0-based)
            this.actualFrame = initialFrame > totalFrames ? totalFrames - 1 : initialFrame - 1;
            const timeStep = video.duration / totalFrames;

            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;

            this.slider.max = totalFrames;
            this.slider.value = this.actualFrame + 1;

            // Preload segmentation image if we have a URL
            let segImg;
            if (this.segUrl) {
                segImg = new Image();
                segImg.crossOrigin = "anonymous";
                await new Promise((resolve) => {
                    segImg.onload = resolve;
                    segImg.onerror = () => {
                        console.error('Failed to load segmentation image:', this.segUrl);
                        resolve(); // Continue even if seg image fails to load
                    };
                    segImg.src = this.segUrl;
                });
            }

            // Helper function to seek and capture a frame
            const captureFrame = async (frameCount) => {
                if (signal.aborted) throw new Error('Capture aborted');

                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = video.videoWidth;
                frameCanvas.height = video.videoHeight;
                const frameCtx = frameCanvas.getContext('2d');

                if (frameCount === this.actualFrame && segImg && segImg.complete && segImg.naturalWidth !== 0) {
                    frameCtx.drawImage(segImg, 0, 0);
                    return frameCanvas;
                }

                await new Promise((resolve, reject) => {
                    if (signal.aborted) {
                        reject(new Error('Capture aborted'));
                        return;
                    }

                    const handleSeeked = () => {
                        video.removeEventListener('seeked', handleSeeked);
                        // Add a small delay for mobile Safari to ensure frame is ready
                        setTimeout(resolve, 50);
                    };

                    video.addEventListener('seeked', handleSeeked);
                    video.currentTime = frameCount * timeStep;
                });

                if (signal.aborted) throw new Error('Capture aborted');

                frameCtx.drawImage(video, 0, 0);
                return frameCanvas;
            };

            // Capture frames with error handling
            for (let frameCount = 0; frameCount < totalFrames; frameCount++) {
                if (signal.aborted) break;

                try {
                    const frameCanvas = await captureFrame(frameCount);
                    this.frames.push(frameCanvas);

                    if (frameCount % 10 === 0) {
                        await new Promise((resolve, reject) => {
                            if (signal.aborted) {
                                reject(new Error('Capture aborted'));
                                return;
                            }
                            setTimeout(resolve, 10);
                        });
                    }
                } catch (error) {
                    if (error.message === 'Capture aborted') break;
                    console.error(`Error capturing frame ${frameCount}:`, error);
                    reject(error);
                }
            }

            if (!signal.aborted) {
                // Clean up
                video.src = '';
                video.load();
                this.currentVideo = null;

                this.updateCurrentFrame(this.actualFrame);
                this.viewer.classList.add('loaded');
            }
        } catch (error) {
            if (error.message !== 'Capture aborted') {
                console.error('Capture process failed:', error);
            }
            // Clean up if error occurs
            if (this.currentVideo === video) {
                video.src = '';
                video.load();
                this.currentVideo = null;
            }
        }
    }
}
