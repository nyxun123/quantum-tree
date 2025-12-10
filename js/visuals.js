export class Visuals {
    constructor(state) {
        this.state = state;
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
    }

    init() {
        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 30;
        this.camera.position.y = 10;
        this.camera.lookAt(0, 5, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Resize Listener
        window.addEventListener('resize', this.onResize.bind(this));

        // Create Objects
        this.createParticles();
        this.createBackground();
    }

    createParticles() {
        const count = this.state.params.particleCount;

        // Arrays for attributes
        const positions = new Float32Array(count * 3);
        const targets = new Float32Array(count * 3); // Target positions
        const colors = new Float32Array(count * 3);

        // Geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Save references for animation
        this.particleSystem = {
            geometry: geometry,
            positions: positions,
            targets: targets,
            colors: colors,
            count: count
        };

        // Material
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.8
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // Initialize Targets for current state
        this.updateTargets();

        // Snap positions to targets initially
        for (let i = 0; i < count * 3; i++) {
            positions[i] = targets[i];
        }
    }

    createBackground() {
        // Deep Space Background Stars
        const starCount = 2000;
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const r = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            starPos[i * 3 + 2] = r * Math.cos(phi);
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.6
        });

        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);

        // Start loading photos
        this.loadPhotos();
    }

    loadPhotos() {
        if (!this.state.params.particleCount) return; // check params

        const fileNames = [
            '11749dc4d0a049cbe2e235d0bd49b432.JPG',
            '522e4b47f95c15cd954c66ee45b06d8a.JPG',
            'IDG_20251123_130836_554.JPG',
            'IMG_4023.JPG',
            'IMG_4057.jpg',
            'IMG_6230.JPG',
            'IMG_6271.JPG',
            'IMG_6528.JPG',
            'IMG_6642.JPG',
            'IMG_6646.JPG',
            'b1ff5b13073b54fd216e6c4a038c35a2.JPG',
            'd709c76bd771ba709b8b0b115b026dc0.JPG'
        ];

        const loader = new THREE.TextureLoader();
        this.photoSprites = [];
        this.photoGroup = new THREE.Group();
        this.scene.add(this.photoGroup);

        fileNames.forEach((name, index) => {
            loader.load(`assets/photos/${name}`, (texture) => {
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.9
                });
                const sprite = new THREE.Sprite(material);

                // Random position in the tree area
                const angle = Math.random() * Math.PI * 2;
                const radius = 2 + Math.random() * 5;
                const h = (Math.random() - 0.5) * 15;

                sprite.position.set(
                    Math.cos(angle) * radius,
                    h,
                    Math.sin(angle) * radius
                );

                // Scale based on aspect ratio usually, but square for now
                sprite.scale.set(3, 3, 1);

                this.photoGroup.add(sprite);
                this.photoSprites.push({
                    sprite: sprite,
                    basePos: sprite.position.clone(),
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.5 + Math.random() * 0.5
                });
            }, undefined, (err) => {
                console.warn(`Failed to load image: ${name}`, err);
            });
        });
    }

    recreateParticles() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        this.createParticles();
    }

    togglePhotos(visible) {
        if (this.photoGroup) {
            this.photoGroup.visible = visible;
        }
    }

    updateTheme(themeName) {
        // Simple theme logic: just force update targets which includes color logic
        // ideally we store theme mappings.
        // For now, let's just trigger target update and maybe bias colors in updateTargets based on state.params.theme
        this.updateTargets();
    }

    updateTargets() {
        if (!this.particleSystem) return;
        const { count, targets, colors } = this.particleSystem;
        const mode = this.state.treeState; // EXPANDED, CONDENSED, SUPERPOSITION
        const theme = this.state.params.theme;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            let x, y, z, r, g, b;

            if (mode === 'EXPANDED') {
                // Cone / Tree Shape
                const h = Math.random() * 20 - 10; // -10 to 10
                const normalizedH = (h + 10) / 20; // 0 to 1 (Bottom to Top)
                const maxR = 8 * (1 - normalizedH) + 0.5; // Tapering
                const angle = Math.random() * Math.PI * 2 * 5 + (normalizedH * 10); // Spiral
                const radius = Math.random() * maxR;

                x = Math.cos(angle) * radius;
                y = h;
                z = Math.sin(angle) * radius;

                // Color: Festive Mix
                const rand = Math.random();
                if (rand > 0.95) {
                    // Gold Ornaments
                    r = 1.0; g = 0.84; b = 0.0;
                } else if (rand > 0.90) {
                    // Red Ornaments
                    r = 1.0; g = 0.2; b = 0.2;
                } else {
                    // Green Tree (varying shades)
                    r = 0.1; g = 0.5 + Math.random() * 0.5; b = 0.2;
                }

            } else if (mode === 'CONDENSED') {
                // Central Beam
                const h = Math.random() * 20 - 10;
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.5; // Tight column

                x = Math.cos(angle) * radius;
                y = h;
                z = Math.sin(angle) * radius;

                // Color: Quantum Blue/White
                r = 0.2; g = 0.8; b = 1.0;
            } else { // SUPERPOSITION
                // Chaotic Cloud
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const rad = 10 + Math.random() * 5;

                x = rad * Math.sin(phi) * Math.cos(theta);
                y = rad * Math.sin(phi) * Math.sin(theta);
                z = rad * Math.cos(phi);

                // Color: Magic Purple/Gold
                r = 0.6; g = 0.0; b = 0.8;
                if (Math.random() > 0.8) { r = 1.0; g = 0.8; b = 0.0; }
            }

            targets[i3] = x;
            targets[i3 + 1] = y;
            targets[i3 + 2] = z;

            colors[i3] = r;
            colors[i3 + 1] = g;
            colors[i3 + 2] = b;
        }

        this.particleSystem.geometry.attributes.color.needsUpdate = true;

        // Handle Photo Visibility based on state
        // Only visible in EXPANDED state (Open Hands)
        if (this.photoGroup) {
            this.photoGroup.visible = (mode === 'EXPANDED');
        }
    }

    render(dt) {
        if (!this.renderer || !this.particleSystem) return;

        // State Transition Logic (Lerp positions to targets)
        const { positions, targets, count } = this.particleSystem;
        const lerpFactor = 2.0 * dt; // Speed of transition

        // If state changed, we might need to update targets
        if (this.lastTreeState !== this.state.treeState) {
            this.updateTargets();
            this.lastTreeState = this.state.treeState;
        }

        let needsUpdate = false;
        for (let i = 0; i < count * 3; i++) {
            const dist = targets[i] - positions[i];
            if (Math.abs(dist) > 0.01) {
                positions[i] += dist * lerpFactor;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Animate Photos
        if (this.photoSprites && this.photoGroup.visible) {
            const time = performance.now() * 0.001;
            this.photoSprites.forEach(p => {
                // Gentle floating
                p.sprite.position.y = p.basePos.y + Math.sin(time * p.speed + p.phase) * 0.5;
            });
        }

        // Auto Rotate container
        this.particles.rotation.y += this.state.params.autoRotateSpeed * dt;
        if (this.photoGroup) {
            this.photoGroup.rotation.y += this.state.params.autoRotateSpeed * dt;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
