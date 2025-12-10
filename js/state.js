export class State {
    constructor() {
        this.currentMode = 'CRUISE'; // CRUISE, INTERACTIVE
        this.treeState = 'EXPANDED'; // CONDENSED, EXPANDED, SUPERPOSITION
        this.lastGesture = null;
        this.gestureTime = 0;

        this.params = {
            particleCount: 20000,
            theme: 'aurora',
            brightness: 1.0,
            autoRotateSpeed: 0.2
        };
    }

    update(dt) {
        // State logic transitions
    }

    setGesture(gesture) {
        if (this.lastGesture !== gesture) {
            this.lastGesture = gesture;
            console.log('Gesture:', gesture);
        }
    }
}
