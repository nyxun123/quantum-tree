import { Visuals } from './visuals.js';
import { Gestures } from './gestures.js';
import { AudioSystem } from './audio.js';
import { State } from './state.js';

class App {
    constructor() {
        this.state = new State();
        this.visuals = new Visuals(this.state);
        this.gestures = new Gestures(this.state);
        this.audio = new AudioSystem(this.state);

        this.ui = {
            overlay: document.getElementById('overlay-permission'),
            btnAllow: document.getElementById('btn-allow-cam'),
            btnDeny: document.getElementById('btn-deny-cam'),
            drawer: document.getElementById('drawer-settings'),
            btnSettings: document.getElementById('btn-settings'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            hudMode: document.getElementById('status-mode'),
            hudGesture: document.getElementById('status-gesture'),
            hudFPS: document.getElementById('status-fps'),
            toastContainer: document.getElementById('toast-container')
        };

        this.lastTime = 0;
        this.fpsFrame = 0;
        this.fpsTime = 0;
    }

    async init() {
        // Mobile Detection & Optimization
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Setup UI (Always, but tweak for mobile)
        this.setupUI();

        if (isMobile) {
            console.log('Mobile detected: Optimizing...');

            // Enable Debug Console on Mobile
            const debugEl = document.getElementById('debug-console');
            if (debugEl) {
                debugEl.style.display = 'block';
                const log = console.log;
                const err = console.error;
                const warn = console.warn;
                console.log = (...args) => {
                    log(...args);
                    debugEl.innerHTML += `<div>LOG: ${args.join(' ')}</div>`;
                    debugEl.scrollTop = debugEl.scrollHeight;
                };
                console.error = (...args) => {
                    err(...args);
                    debugEl.innerHTML += `<div style="color:red">ERR: ${args.join(' ')}</div>`;
                    debugEl.scrollTop = debugEl.scrollHeight;
                };
                console.warn = (...args) => {
                    warn(...args);
                    debugEl.innerHTML += `<div style="color:yellow">WARN: ${args.join(' ')}</div>`;
                    debugEl.scrollTop = debugEl.scrollHeight;
                };
            }

            this.state.params.particleCount = 5000; // Reduce further for safety

            // Adjust Overlay
            this.ui.overlay.innerHTML = `
                <div class="modal">
                    <h2>🎄 手机模式 🎄</h2>
                    <p>使用 <b>双指捏合 / 张开</b> 来 收拢 / 展开 圣诞树</p>
                    <p>使用 <b>单指滑动</b> 旋转视角</p>
                    <div class="btn-group">
                        <button id="btn-start-mobile">开启圣诞之旅</button>
                    </div>
                </div>
            `;

            // Re-bind click
            const btn = document.getElementById('btn-start-mobile');
            if (btn) {
                btn.onclick = () => {
                    this.ui.overlay.classList.add('hidden');
                    if (this.audio) this.audio.resume();
                };
            }

            // Hide Settings Button (drawer logic might be buggy on mobile without re-bind)
            // Actually setupUI bound it, but we might want to hide it if logic is complex
            // For now keep it.

        }

        console.log('Init Visuals...');
        try {
            // Init Visuals (WebGL)
            this.visuals.init();
            console.log('Visuals initialized.');
        } catch (e) {
            console.error('Visuals Init Failed:', e);
        }

        // Init Audio
        if (this.audio) this.audio.init();

        // Start Loop
        console.log('Starting Loop...');
        requestAnimationFrame(this.render.bind(this));
    }

    setupUI() {
        // Permissions
        this.ui.btnAllow.onclick = () => {
            this.ui.overlay.classList.add('hidden');
            this.gestures.startCamera();
            this.audio.resume();
        };

        this.ui.btnDeny.onclick = () => {
            this.ui.overlay.classList.add('hidden');
            this.showToast('已进入自动巡航模式');
            // Gestures remain disabled
        };

        // Settings Drawer
        this.ui.btnSettings.onclick = () => {
            this.ui.drawer.classList.add('open');
        };

        this.ui.btnCloseSettings.onclick = () => {
            this.ui.drawer.classList.remove('open');
        };

        // Bind Settings
        const elTheme = document.getElementById('set-theme');
        const elParticles = document.getElementById('set-particles');
        const elBrightness = document.getElementById('set-brightness');
        const elHud = document.getElementById('set-hud');
        const elPhotos = document.getElementById('set-photos');
        const btnReset = document.getElementById('btn-reset');
        const btnMute = document.getElementById('btn-mute');

        // Initialize values from state
        elParticles.value = this.state.params.particleCount;
        elBrightness.value = this.state.params.brightness;

        elTheme.onchange = (e) => {
            this.state.params.theme = e.target.value;
            this.showToast(`主题切换: ${e.target.value}`);
            // Trigger visual update if needed (Visuals checks this or we force it)
            // For simple logic, we can rely on render loop or force update
            this.visuals.updateTheme(e.target.value);
        };

        elParticles.onchange = (e) => {
            // Recreation needed
            this.state.params.particleCount = parseInt(e.target.value);
            this.visuals.recreateParticles();
            this.showToast(`粒子数: ${e.target.value}`);
        };

        elBrightness.oninput = (e) => {
            this.state.params.brightness = parseFloat(e.target.value);
            // Visuals will pick this up in shader/material uniform if mapped
        };

        elHud.onchange = (e) => {
            const val = e.target.checked;
            document.getElementById('top-right').style.display = val ? 'flex' : 'none';
        };

        elPhotos.onchange = (e) => {
            this.state.params.photosEnabled = e.target.checked;
            this.visuals.togglePhotos(e.target.checked);
        };

        btnReset.onclick = () => {
            // Reset logic
            elParticles.value = 20000;
            this.state.params.particleCount = 20000;
            this.visuals.recreateParticles();
            this.showToast('已恢复默认设置');
        };

        btnMute.onclick = () => {
            this.audio.toggleMute();
            btnMute.innerText = this.audio.isMuted ? '🔇' : '🔊';
        };
    }

    render(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // FPS Counter
        this.fpsFrame++;
        if (time - this.fpsTime >= 1000) {
            this.ui.hudFPS.innerText = `FPS: ${this.fpsFrame}`;
            this.fpsFrame = 0;
            this.fpsTime = time;
        }

        // Update State (Gestures -> Logic)
        this.state.update(dt);

        // Update Visuals
        this.visuals.render(dt);

        // Update HUD from State
        this.updateHUD();

        requestAnimationFrame(this.render.bind(this));
    }

    updateHUD() {
        const modeMap = {
            'CRUISE': '自动巡航 (Cruise)',
            'INTERACTIVE': '交互模式 (Interactive)',
            'Initializing': '初始化中'
        };
        // Simplified mode text or logic to determine string
        // Actually mode is likely just 'CRUISE' or undefined initially.
        // Let's just pass state directly but map it if possible? 
        // state.currentMode is set in state.js

        this.ui.hudMode.innerText = `模式: ${this.state.currentMode}`;

        const gestureMap = {
            'Close Hands': '双手合拢 (收缩)',
            'Open Hands': '双手展开 (绽放)',
            'Touch: Expand': '双指张开',
            'Touch: Condense': '双指捏合',
            'Touch: Spin': '滑动旋转',
            'HANDS_DETECTED': '检测到手势',
            null: '无'
        };
        const gestureText = gestureMap[this.state.lastGesture] || this.state.lastGesture || '无';

        this.ui.hudGesture.innerText = `手势: ${gestureText}`;
    }

    showToast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = msg;
        this.ui.toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}

// Bootstrap
window.onload = () => {
    const app = new App();
    app.init();
};
