export default class InputHandler {
    constructor(config) {
        this.config = {
            DAS: 100,    // Delayed Auto Shift - initial delay
            ARR: 0,      // Auto-Repeat Rate - 0 for instant movement
            SDF: 20,     // Soft Drop Factor - multiplier for soft drop speed
            ...config
        };

        this.heldKeys = new Set();
        this.dasTimer = {};
        this.dasActive = {};
        this.lastMoveTime = {};
        this.arrTimer = {};
    }

    setupEvents(handleInput) {
        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (!this.heldKeys.has(key)) {
                this.heldKeys.add(key);
                this.dasTimer[key] = 0;
                this.dasActive[key] = false;
                this.lastMoveTime[key] = performance.now();
                handleInput(key);
            }
        });

        document.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            this.heldKeys.delete(key);
            delete this.dasTimer[key];
            delete this.dasActive[key];
            delete this.lastMoveTime[key];
        });
    }

    update(deltaTime, handleInput) {
        this.heldKeys.forEach(key => {
            // Handle horizontal movement (left/right)
            if (['j', 'l'].includes(key)) {
                this.dasTimer[key] += deltaTime;

                if (!this.dasActive[key] && this.dasTimer[key] >= this.config.DAS) {
                    // Once DAS triggers, immediately move as much as possible
                    this.dasActive[key] = true;
                    for (let i = 0; i < 10; i++) { // Try to move up to 10 times
                        handleInput(key);
                    }
                }
            }
            // Handle soft drop (down)
            else if (key === 'k') {
                // Continuously trigger soft drops without delay
                for (let i = 0; i < this.config.SDF; i++) {
                    handleInput(key);
                }
            }
        });
    }
}
