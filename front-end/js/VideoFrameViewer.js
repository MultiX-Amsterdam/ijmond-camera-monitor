class VideoFrameViewer {
    constructor(videoUrl, viewerId, initialFrame) {
        this.videoUrl = videoUrl;
        this.frames = [];
        this.playing = false;
        this.playInterval = null;
        this.viewerId = viewerId;
        this.initialFrame = initialFrame;
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
                    <button class="play-pause">Play/Pause</button>
                    <input type="range" class="slider" min="0" value="0" />
                    <span class="frame-counter">0/0</span>
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

        this.slider.addEventListener('input', (e) => this.updateCurrentFrame(parseInt(e.target.value)));
        this.playPauseBtn.addEventListener('click', () => this.playPause());
    }

    updateCurrentFrame(index) {
        if (this.frames.length === 0) return;
        this.slider.value = index;
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.frames[index], 0, 0);
        this.frameCounter.textContent = `${index}/${this.frames.length - 1}`;
    }

    playPause() {
        this.playing = !this.playing;
        if (this.playing) {
            // Start looping the frames
            this.playInterval = setInterval(() => {
                let nextFrame = (parseInt(this.slider.value) + 1) % this.frames.length;
                this.updateCurrentFrame(nextFrame);
            }, 1000 / 30);
        } else {
            // Stop looping the frames
            clearInterval(this.playInterval);
            // Seek to the frame that we want the user to label
            this.updateCurrentFrame(this.actualFrame);
        }
    }

    async captureFrames() {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.src = this.videoUrl;
        video.preload = "auto";

        await new Promise(resolve => {
            video.addEventListener('canplay', resolve);
        });

        const totalFrames = 36; // TODO: this number should come from the server metadata
        this.actualFrame = this.initialFrame >= totalFrames ? totalFrames - 1 : this.initialFrame;
        const timeStep = video.duration / totalFrames;

        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');

        this.slider.max = totalFrames - 1;
        this.slider.value = this.actualFrame;

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