export class Gestures {
    constructor(state) {
        this.state = state;
        this.hands = null;
        this.camera = null;
        this.videoElement = document.createElement('video');

        // Touch State
        this.touch = {
            startDist: 0,
            startX: 0,
            active: false
        };

        this.initTouch();
    }

    initTouch() {
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    onTouchStart(e) {
        if (e.touches.length === 2) {
            // Pinch Start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.touch.startDist = Math.sqrt(dx * dx + dy * dy);
            e.preventDefault();
        } else if (e.touches.length === 1) {
            // Swipe Start
            this.touch.startX = e.touches[0].clientX;
            this.touch.active = true;
        }
    }

    onTouchMove(e) {
        if (e.touches.length === 2) {
            // Pinch Move
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const delta = dist - this.touch.startDist;

            if (delta > 50) { // Pinch Out -> Expand
                this.state.treeState = 'EXPANDED';
                this.state.setGesture('Touch: Expand');
            } else if (delta < -50) { // Pinch In -> Condense
                this.state.treeState = 'CONDENSED';
                this.state.setGesture('Touch: Condense');
            }
            e.preventDefault();
        } else if (e.touches.length === 1 && this.touch.active) {
            // Swipe Move -> Rotate
            const x = e.touches[0].clientX;
            const deltaX = x - this.touch.startX;

            // Map deltaX to rotation speed
            // deltaX > 0 (Right) -> Spin Left?
            this.state.params.autoRotateSpeed = deltaX * 0.01;
            this.state.setGesture('Touch: Spin');
        }
    }

    onTouchEnd(e) {
        this.touch.active = false;
        if (e.touches.length === 0) {
            // Reset speed dampening or keep spinning? 
            // Let's reset to default slowly or keep current -> reset for safety
            setTimeout(() => {
                if (!this.touch.active) this.state.params.autoRotateSpeed = 0.2;
            }, 500);
        }
    }

    async startCamera() {
        console.log('Starting Camera...');

        // Initialize MediaPipe Hands
        // Note: Assuming global 'Hands' object from script tag
        if (typeof Hands === 'undefined') {
            console.error('MediaPipe Hands library not loaded');
            return;
        }

        this.hands = new Hands({
            locateFile: (file) => {
                return `libs/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        // Start Camera Stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = stream;
            this.videoElement.play();

            // Start detection loop
            this.detectLoop();
        } catch (e) {
            console.error('Camera access denied or error:', e);
        }
    }

    async detectLoop() {
        if (this.videoElement.readyState >= 2) {
            await this.hands.send({ image: this.videoElement });
        }
        requestAnimationFrame(this.detectLoop.bind(this));
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks;

            // 2 Hands: Control Pulse (Expand/Condense)
            if (landmarks.length === 2) {
                const hand1 = landmarks[0][0]; // Wrist
                const hand2 = landmarks[1][0]; // Wrist

                // Calculate distance (x, y coordinates are normalized 0-1)
                const dx = hand1.x - hand2.x;
                const dy = hand1.y - hand2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Thresholds
                if (dist < 0.2) {
                    this.state.treeState = 'CONDENSED';
                    this.state.setGesture('Close Hands');
                } else if (dist > 0.4) {
                    this.state.treeState = 'EXPANDED';
                    this.state.setGesture('Open Hands');
                }
            }
            // 1 Hand: Special Actions
            else if (landmarks.length === 1) {
                const hand = landmarks[0];
                const thumbTip = hand[4];
                const indexTip = hand[8];

                // Check for "OK" or "Pinch" (Quantum Jump)
                const dx = thumbTip.x - indexTip.x;
                const dy = thumbTip.y - indexTip.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.05) {
                    this.state.treeState = 'SUPERPOSITION';
                    this.state.setGesture('Quantum Pinch');
                } else {
                    // Default single hand just rotates or does nothing
                    // Could map x position to rotation speed
                    const cx = hand[9].x; // Middle finger MCP (center of palm approx)
                    // Map 0-1 to -1 to 1 speed
                    this.state.params.autoRotateSpeed = (cx - 0.5) * 5.0;
                    this.state.setGesture('One Hand Spin');
                }
            }
        } else {
            this.state.setGesture(null);
            // Reset rotation speed if no hands
            this.state.params.autoRotateSpeed = 0.2;
        }
    }
}
