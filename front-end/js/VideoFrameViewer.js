class VideoFrameViewer {
    constructor(viewerId) {
        this.frames = [];
        this.playing = false;
        this.playInterval = null;
        this.viewerId = viewerId;
        this.actualFrame = 0;
        this.viewer = this.createViewer();
        this.setupControls();
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
            }, 1000 / 30);
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

    async captureFrames(videoUrl, initialFrame) {
        this.pause();
        this.frames = [];
        this.initialFrame = initialFrame;
        this.videoUrl = videoUrl;

        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.preload = "auto";

        await new Promise(resolve => {
            video.addEventListener('canplay', resolve);
        });

        const totalFrames = 36; // TODO: this number should come from the server metadata
        // Since initialFrame is 1-based, subtract 1 when storing in actualFrame (which is 0-based)
        this.actualFrame = initialFrame > totalFrames ? totalFrames - 1 : initialFrame - 1;
        const timeStep = video.duration / totalFrames;

        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');

        this.slider.max = totalFrames;

        this.slider.value = this.actualFrame + 1;

        for (let frameCount = 0; frameCount < totalFrames; frameCount++) {
            await new Promise((resolve) => {
                function seeked() {
                    video.removeEventListener('seeked', seeked);
                    setTimeout(resolve, 10);
                }
                video.addEventListener('seeked', seeked);
                video.currentTime = frameCount * timeStep;
            });

            tempCtx.drawImage(video, 0, 0);

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = video.videoWidth;
            frameCanvas.height = video.videoHeight;
            const frameCtx = frameCanvas.getContext('2d');
            frameCtx.drawImage(tempCanvas, 0, 0);
            this.frames.push(frameCanvas);

            if (frameCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        this.updateCurrentFrame(this.actualFrame);
        this.viewer.classList.add('loaded');
    }
}