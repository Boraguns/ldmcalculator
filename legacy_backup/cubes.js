// ==================================
// 3D VISUALIZATION - CUBE ANIMATOR
// ==================================

class CubeAnimator {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.options = {
            packedItems: options.packedItems || [],
            containerDims: options.containerDims || { length: 1360, width: 245, height: 270 },
            entryAnimation: options.entryAnimation !== false
        };

        this.cubes = [];
        this.currentView = '3d';
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.renderLegend();

        // Create Rotation Controls (added dynamically)
        const controls = document.createElement('div');
        controls.className = 'view-controls';
        controls.innerHTML = `
            <button class="view-btn" data-view="iso">ISO</button>
            <button class="view-btn" data-view="side">Yan</button>
            <button class="view-btn" data-view="top">Üst</button>
            <button class="view-btn" data-view="front">Ön</button>
            <button class="view-btn" data-view="back">Arka</button>
        `;

        // Fix: Append to the main visual canvas wrapper to ensure absolute positioning is relative to the full view, not the inner world
        const wrapper = document.getElementById('truckVisualCanvas');
        if (wrapper) {
            // Remove existing controls if any
            const existing = wrapper.querySelector('.view-controls');
            if (existing) existing.remove();
            wrapper.appendChild(controls);
        } else {
            this.container.appendChild(controls);
        }

        controls.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent bubbling to drag
                e.stopPropagation();
                this.applyView(btn.dataset.view);
            });
        });

        // Create Truck World (Wrapper for Perspective)
        const world = document.createElement('div');
        world.className = 'truck-world';
        world.style.width = '100%';
        world.style.height = '100%';
        world.style.display = 'flex';
        world.style.alignItems = 'center';
        world.style.justifyContent = 'center';
        world.style.perspective = '1200px';

        this.container.appendChild(world);

        setTimeout(() => {
            this.truckBody = document.createElement('div');
            this.truckBody.className = 'truck-body-3d';

            const rect = world.getBoundingClientRect();
            const availableWidth = rect.width * 0.90;
            const availableHeight = rect.height * 0.80;

            const tLen = this.options.containerDims.length;
            const tWid = this.options.containerDims.width;

            const scaleX = availableWidth / tLen;
            const scaleY = availableHeight / tWid;

            this.scale = Math.min(scaleX, scaleY * 2.0);
            if (this.scale < 0.5) this.scale = 0.5;

            const displayLength = tLen * this.scale;
            const displayWidth = tWid * this.scale;

            this.truckBody.style.width = `${displayLength}px`;
            this.truckBody.style.height = `${displayWidth}px`;

            this.applyView('3d');

            // Removing grid-floor as requested
            // const grid = document.createElement('div');
            // grid.className = 'grid-floor';
            // this.truckBody.appendChild(grid);

            // Create Truck Cabin
            const cabinLength = 250 * this.scale;
            const cabinWidth = this.options.containerDims.width * this.scale;
            const cabinHeight = 300 * this.scale;

            const cabin = document.createElement('div');
            cabin.className = 'cabin-3d';
            cabin.style.width = `${cabinLength}px`;
            cabin.style.height = `${cabinWidth}px`;
            cabin.style.left = `-${cabinLength + 10}px`;
            cabin.style.top = '0px';
            cabin.style.setProperty('--c-len', `${cabinLength}px`);
            cabin.style.setProperty('--c-wid', `${cabinWidth}px`);
            cabin.style.setProperty('--c-hei', `${cabinHeight * 0.8}px`);

            ['front', 'back', 'left', 'right', 'top', 'bottom'].forEach(side => {
                const face = document.createElement('div');
                face.className = `cabin-face cabin-face-${side}`;

                // Add Door/Handle to the front face (Viewer Side)
                if (side === 'front') {
                    // Door Handle
                    const handle = document.createElement('div');
                    handle.className = 'door-handle';
                    face.appendChild(handle);
                }

                cabin.appendChild(face);
            });
            this.truckBody.appendChild(cabin);

            // Add Independent Wheels
            this.addWheels(cabinLength, cabinWidth, displayLength, displayWidth);

            // Trailer Wireframe
            const trailerHeightPx = this.options.containerDims.height * this.scale;
            const wireframe = document.createElement('div');
            wireframe.className = 'trailer-wireframe';
            wireframe.style.width = '100%';
            wireframe.style.height = '100%';
            wireframe.style.setProperty('--trailer-height', `${trailerHeightPx}px`);

            ['front', 'back', 'left', 'right', 'top'].forEach(side => {
                const wall = document.createElement('div');
                wall.className = `trailer-wall trailer-wall-${side}`;
                wireframe.appendChild(wall);
            });
            this.truckBody.appendChild(wireframe);

            this.renderGridCoordinates(this.truckBody, this.scale);

            this.options.packedItems.forEach((item, index) => {
                const box = this.create3DBox(item, this.scale, index);
                this.truckBody.appendChild(box);
                this.cubes.push(box);
            });

            world.appendChild(this.truckBody);
            this.setupInteractions(world);
        }, 50);
    }

    applyView(mode) {
        this.currentView = '3d'; // Always keep in 3D mode but change angles
        if (!this.truckBody) return;

        // Default Rotation Angles
        // X = Tilt (up/down). 0 = Top View (looking down), 90 = Side View.
        // Z = Rotation around vertical axis.

        switch (mode) {
            case 'top':
                this.rotation = { x: 0, z: 0 };
                break;
            case 'side':
                // Side view: Looking at the side of the truck
                this.rotation = { x: 90, z: 0 };
                // Wait, Z=0 with X=90 might show Top if axes are different.
                // In this CSS setup:
                // x rotates around X axis. z rotates around Z axis.
                // Truck lies on X-Y plane (Z=0).
                // X axis is horizontal length. Y is vertical width.
                // rotateX(0) -> Looking at XY plane (Top).
                // rotateX(90) -> Plane stands up. We see the Edge (Side).
                // Let's test standard values:
                this.rotation = { x: 85, z: 0 }; // Nearly flat side view
                break;
            case 'front':
                // Nose of truck
                // Rotate Z to 90 or -90
                this.rotation = { x: 80, z: -90 };
                break;
            case 'back':
                // Rear of trailer
                this.rotation = { x: 80, z: 90 };
                break;
            case 'iso':
            default:
                this.rotation = { x: 60, z: -45 };
                break;
        }
        this.updateTransform();
    }

    setupInteractions(element) {
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.rotation = { x: 60, z: -40 }; // Default 3D angles

        element.style.cursor = 'grab';

        element.addEventListener('mousedown', (e) => {
            if (this.currentView !== '3d') return;
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            element.style.cursor = 'grabbing';
            // Disable tooltip while dragging
            this.hideTooltip();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.lastMouse.x;
            const deltaY = e.clientY - this.lastMouse.y;

            this.lastMouse = { x: e.clientX, y: e.clientY };

            // Update rotation
            // Moving mouse X rotates around Z axis
            this.rotation.z += deltaX * 0.5;

            // Reverse direction: Moving mouse DOWN (positive Y) should INCREASE X rotation 
            // (tilting the camera down / viewing from lower angle)
            this.rotation.x += deltaY * 0.5;

            // Limit X rotation to avoid flipping upside down too awkwardly
            this.rotation.x = Math.max(0, Math.min(90, this.rotation.x));

            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            if (element) element.style.cursor = 'grab';
        });
    }

    updateTransform() {
        if (!this.truckBody) return;
        this.truckBody.style.transform =
            `rotateX(${this.rotation.x}deg) rotateZ(${this.rotation.z}deg) translateZ(-50px)`;
    }

    renderLegend() {
        const legendContainer = document.getElementById('productLegend');
        if (!legendContainer) return;
        legendContainer.innerHTML = '';
        const itemsById = {};
        this.options.packedItems.forEach(item => {
            if (!itemsById[item.id]) itemsById[item.id] = [];
            itemsById[item.id].push(item);
        });
        const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#fb923c'];
        Object.keys(itemsById).forEach(id => {
            const items = itemsById[id];
            const color = colors[items[0].id % colors.length];
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background: ${color}"></div>
                <span class="legend-text">#${items[0].id} - ${items.length} adet</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    renderGridCoordinates(container, scale) {
        const truckLengthM = Math.ceil(this.options.containerDims.length / 100);
        for (let i = 0; i <= truckLengthM; i++) {
            const mark = document.createElement('div');
            mark.className = 'grid-number x-axis';
            mark.textContent = i + 'm';
            mark.style.left = `${(i * 100) * scale}px`;
            mark.style.top = '100%';
            mark.style.marginTop = '10px';
            container.appendChild(mark);
        }
    }

    addWheels(cLen, cWid, tLen, tWid) {
        // Wheel params
        const wSize = 60 * this.scale;
        const wRad = wSize / 2;
        const zPos = -wRad * 0.6; // Slightly embedded in floor or just below body

        // Helper to create a wheel
        const createWheel = (x, y) => {
            const wheel = document.createElement('div');
            wheel.className = 'wheel-3d-primitive';
            wheel.style.width = `${wSize}px`;
            wheel.style.height = `${wSize}px`;

            // X, Y are Top/Left coordinates. Center them.
            // In truck coordinate system:
            // X is Length (from left to right).
            // Y is Depth (Width of truck).

            // Positioning:
            wheel.style.left = `${x - wRad}px`;
            wheel.style.top = `${y - wRad}px`;

            // Transform:
            // Rotate 90deg X to stand up.
            // Translate Z to position it relative to floor.
            wheel.style.transform = `translateZ(${zPos}px) rotateX(90deg)`;

            this.truckBody.appendChild(wheel);
        };

        // --- TRAILER WHEELS ---
        // 3 Axles at rear
        // Positions along X (Trailer starts at 0, goes to tLen)
        const trailerWheelX = [
            tLen * 0.85,
            tLen * 0.73,
            tLen * 0.61
        ];

        trailerWheelX.forEach(axleX => {
            // Near side (Viewer, Y=tWid)
            // Offset slightly out? tWid + gap? Or just tWid. We can use translateZ in local wheel space if needed, 
            // but setting top = tWid works if we want it centered on edge. 
            // Better: center of thickness is at tWid.
            createWheel(axleX, tWid); // Near
            createWheel(axleX, 0);    // Far
        });

        // --- CABIN WHEELS ---
        // Cabin is attached at left of trailer.
        // It extends from -cLen to 0.
        // 1 Front Axle, 1 Rear Axle (under cabin)
        const cabinWheelX = [
            -cLen * 0.25, // Front
            -cLen * 0.80  // Rear (near trailer connection)
        ];

        cabinWheelX.forEach(axleX => {
            createWheel(axleX, cWid); // Near
            createWheel(axleX, 0);    // Far
        });
    }

    create3DBox(item, scale, index) {
        const widthPx = Math.max(item.dimensions.length * scale, 1);
        const depthPx = Math.max(item.dimensions.width * scale, 1);
        const heightPx = Math.max(item.dimensions.height * scale, 1);
        const xPx = item.position.x * scale;
        const yPx = item.position.y * scale;
        const zPx = item.position.z * scale;

        const box = document.createElement('div');
        box.className = 'cargo-cube-3d';
        box.style.width = `${widthPx}px`;
        box.style.height = `${depthPx}px`;
        box.style.left = `${xPx}px`;
        box.style.top = `${yPx}px`;
        box.style.transform = `translateZ(${zPx}px)`;

        const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#fb923c'];
        box.style.setProperty('--color', colors[item.id % colors.length]);

        const faces = [
            { cls: 'top', style: `width: 100%; height: 100%; transform: translateZ(${heightPx}px);` },
            { cls: 'bottom', style: `width: 100%; height: 100%; transform: rotateX(180deg);` },
            { cls: 'front', style: `width: 100%; height: ${heightPx}px; transform-origin: bottom; bottom: 0; left: 0; transform: rotateX(-90deg);` },
            { cls: 'back', style: `width: 100%; height: ${heightPx}px; transform-origin: top; top: 0; left: 0; transform: rotateX(90deg);` },
            { cls: 'left', style: `width: ${heightPx}px; height: 100%; transform-origin: left; top: 0; left: 0; transform: rotateY(-90deg);` },
            { cls: 'right', style: `width: ${heightPx}px; height: 100%; transform-origin: right; top: 0; right: 0; transform: rotateY(90deg);` },
        ];

        faces.forEach(f => {
            const face = document.createElement('div');
            face.className = `cube-face cube-face-${f.cls}`;
            face.style.cssText = f.style;
            box.appendChild(face);
        });

        box.addEventListener('mouseenter', (e) => this.showTooltip(e, item));
        box.addEventListener('mouseleave', () => this.hideTooltip());
        return box;
    }

    showTooltip(e, item) {
        if (this.tooltip) this.tooltip.remove();
        const stackLevel = Math.round(item.position.z / item.dimensions.height) + 1;
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'box-tooltip';
        this.tooltip.innerHTML = `
            <strong>Ürün #${item.id}</strong><br>
            ${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height}<br>
            Sıra: ${stackLevel}
        `;
        document.body.appendChild(this.tooltip);
        this.tooltip.style.left = `${e.clientX + 10}px`;
        this.tooltip.style.top = `${e.clientY - 40}px`;
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}

window.CubeAnimator = CubeAnimator;
