// ==================================
// 3D BIN PACKING ALGORITHM
// ==================================
// Advanced cargo optimization using Stack-Based First Fit Decreasing

export class BinPacking3D {
    constructor(containerDims, items) {
        // Container dimensions (truck/dorse) in cm
        this.container = {
            length: containerDims.length,
            width: containerDims.width,
            height: containerDims.height,
            maxWeight: containerDims.maxWeight || 22000 // kg
        };

        // Items to pack (boxes/pallets)
        this.items = items.map((item) => ({
            id: item.id,
            length: parseFloat(item.length),
            width: parseFloat(item.width),
            height: parseFloat(item.height),
            weight: parseFloat(item.weight),
            quantity: parseInt(item.quantity),
            maxStack: parseInt(item.maxStack) || 999, // User defined constraint
            allowRotation: item.allowRotation !== false,
            placed: false,
            position: null,
            rotation: null
        }));

        this.placedItems = [];
        this.currentWeight = 0;
    }

    /**
     * Main packing algorithm
     */
    pack() {
        // Sort items by volume (largest first)
        const sortedItems = this.sortItemsByVolume();

        for (let item of sortedItems) {
            let remaining = item.quantity;

            while (remaining > 0) {
                // Determine max allowed stack size for this batch
                const currentMaxStack = Math.min(remaining, item.maxStack);
                let placedAmount = 0;

                if (this.currentWeight + (item.weight * 1) > this.container.maxWeight) {
                    console.warn(`⚠️ Weight limit reached for #${item.id}`);
                    break;
                }

                // Try to place the largest possible stack first (Greedy Stacking)
                for (let s = currentMaxStack; s >= 1; s--) {
                    // Also check weight for the full stack
                    if (this.currentWeight + (item.weight * s) <= this.container.maxWeight) {
                        if (this.tryPlaceStack(item, s)) {
                            placedAmount = s;
                            this.currentWeight += (item.weight * s);
                            break;
                        }
                    }
                }

                if (placedAmount > 0) {
                    remaining -= placedAmount;
                } else {
                    console.warn(`⚠️ Cannot fit remaining ${remaining} items of #${item.id}`);
                    break; // Cannot fit anymore of this item
                }
            }
        }

        const stats = this.calculateStatistics();

        // Calculate remaining capacity for each item type
        for (let itemDef of this.items) {
            // New calculation: (Max capacity of this item alone in empty trailer) - (Actually loaded)
            const maxPotential = this.calculateMaxPotential(itemDef);
            const loaded = stats.itemBreakdown[itemDef.id]?.count || 0;
            const remaining = Math.max(0, maxPotential - loaded);

            if (stats.itemBreakdown[itemDef.id]) {
                stats.itemBreakdown[itemDef.id].remainingCapacity = remaining;
            } else {
                stats.itemBreakdown[itemDef.id] = {
                    count: 0,
                    remainingCapacity: maxPotential,
                    totalWeight: 0,
                    rows: 0,
                    columns: 0,
                    layers: 0
                };
            }
        }

        return {
            success: this.placedItems.length > 0,
            placedItems: this.placedItems,
            totalItems: this.placedItems.length,
            totalWeight: stats.totalWeight,
            efficiency: stats.volumeEfficiency,
            utilization: stats.utilization,
            itemBreakdown: stats.itemBreakdown
        };
    }

    sortItemsByVolume() {
        return [...this.items].sort((a, b) => {
            const volA = a.length * a.width * a.height;
            const volB = b.length * b.width * b.height;
            // Sort by Max Stack as secondary criteria? No, volume is standard.
            return volB - volA;
        });
    }

    /**
     * Tries to place a stack of 'stackSize' items
     */
    tryPlaceStack(item, stackSize, isTemp = false) {
        const orientations = this.getAllOrientations(item);

        for (let orientation of orientations) {
            // Create a virtual item representing the full stack
            // The stack grows in Height (Z)
            const stackDims = {
                length: orientation.length,
                width: orientation.width,
                height: orientation.height * stackSize
            };

            // Check if this TOWER fits anywhere
            // We pass a dummy item with infinite maxStack because we are handling the height manually here
            const position = this.findBestPosition(stackDims, { ...item, maxStack: 99999 });

            if (position) {
                // Found a spot! 
                // Now place individual items in the stack at this position
                for (let i = 0; i < stackSize; i++) {
                    this.placedItems.push({
                        ...item,
                        isTemp, // Mark as temporary for capacity testing
                        // Unique ID for each placed instance could be useful, but keeping ref is fine
                        // Override properties for the placed instance
                        position: {
                            x: position.x,
                            y: position.y,
                            z: position.z + (i * orientation.height) // Stack up
                        },
                        dimensions: {
                            length: orientation.length,
                            width: orientation.width,
                            height: orientation.height
                        },
                        rotation: orientation.rotation
                    });
                }
                return true;
            }
        }
        return false;
    }

    getAllOrientations(item) {
        const orientations = [];
        orientations.push({ length: item.length, width: item.width, height: item.height, rotation: 0 });

        if (!item.allowRotation) return orientations;

        // Rotation 1: Swap L & W (Standard rotation)
        orientations.push({ length: item.width, width: item.length, height: item.height, rotation: 1 });

        // Other rotations (tipping over) could be enabled, but usually cargo is 'this side up'
        // For now, let's stick to Z-axis rotation for stability unless explicitly requested.
        // User only asked for "90 degree turn", usually implying Z-axis spin.
        // But the code previously had 6 orientations. Let's keep them if "tipping" is allowed?
        // Usually pallets cannot be tipped. Boxes can.
        // Let's assume FULL rotation is allowed if checkbox is checked.

        orientations.push({ length: item.height, width: item.width, height: item.length, rotation: 2 });
        orientations.push({ length: item.length, width: item.height, height: item.width, rotation: 3 });
        orientations.push({ length: item.width, width: item.height, height: item.length, rotation: 4 });
        orientations.push({ length: item.height, width: item.length, height: item.width, rotation: 5 });

        return orientations;
    }

    findBestPosition(itemDims, item) {
        // Start from bottom-left-back
        // Priority: Z (Layer) -> X (Length) -> Y (Width)
        // This fills the truck floor-to-ceiling, back-to-front

        const stepSize = 1; // High precision (1cm steps) to avoid wasted space

        const effectiveMaxZ = this.container.height - itemDims.height;

        for (let z = 0; z <= effectiveMaxZ; z += stepSize) {
            for (let x = 0; x <= this.container.length - itemDims.length; x += stepSize) {
                for (let y = 0; y <= this.container.width - itemDims.width; y += stepSize) {
                    const position = { x, y, z };

                    if (this.canPlaceAt(position, itemDims)) {
                        return position;
                    }
                }
            }
        }
        return null;
    }

    canPlaceAt(position, itemDims) {
        // Bounds check
        if (position.x + itemDims.length > this.container.length) return false;
        if (position.y + itemDims.width > this.container.width) return false;
        if (position.z + itemDims.height > this.container.height) return false;

        // Collision check
        for (let placed of this.placedItems) {
            if (this.isColliding(position, itemDims, placed.position, placed.dimensions)) {
                return false;
            }
        }
        return true;
    }

    isColliding(pos1, dims1, pos2, dims2) {
        return !(
            pos1.x + dims1.length <= pos2.x ||
            pos2.x + dims2.length <= pos1.x ||
            pos1.y + dims1.width <= pos2.y ||
            pos2.y + dims2.width <= pos1.y ||
            pos1.z + dims1.height <= pos2.z ||
            pos2.z + dims2.height <= pos1.z
        );
    }

    calculateMaxPotential(itemDef) {
        const orientations = this.getAllOrientations(itemDef);
        let maxFound = 0;
        for (let orient of orientations) {
            const rowL = Math.floor(this.container.length / orient.length);
            const rowW = Math.floor(this.container.width / orient.width);
            const rowH = Math.min(Math.floor(this.container.height / orient.height), itemDef.maxStack);
            const volumeCount = rowL * rowW * rowH;
            const weightLimitCount = itemDef.weight > 0 ? Math.floor(this.container.maxWeight / itemDef.weight) : 999999;
            const count = Math.min(volumeCount, weightLimitCount);

            if (count > maxFound) maxFound = count;
        }
        return maxFound;
    }

    calculateStatistics() {
        let totalWeight = 0;
        let totalVolume = 0;
        const itemBreakdown = {};

        for (let item of this.placedItems) {
            totalWeight += item.weight;
            totalVolume += item.dimensions.length * item.dimensions.width * item.dimensions.height;

            if (!itemBreakdown[item.id]) {
                itemBreakdown[item.id] = {
                    count: 0,
                    totalWeight: 0,
                    xPositions: new Set(),
                    yPositions: new Set(),
                    zPositions: new Set()
                };
            }
            itemBreakdown[item.id].count++;
            itemBreakdown[item.id].totalWeight += item.weight;

            // Track unique positions to infer "Rows, Columns, Layers"
            // We use a small epsilon to avoid floating point issues
            itemBreakdown[item.id].xPositions.add(Math.round(item.position.x * 10) / 10);
            itemBreakdown[item.id].yPositions.add(Math.round(item.position.y * 10) / 10);
            itemBreakdown[item.id].zPositions.add(Math.round(item.position.z * 10) / 10);
        }

        // Convert Sets to counts for the report
        for (let id in itemBreakdown) {
            itemBreakdown[id].rows = itemBreakdown[id].xPositions.size;
            itemBreakdown[id].columns = itemBreakdown[id].yPositions.size;
            itemBreakdown[id].layers = itemBreakdown[id].zPositions.size;

            // Clean up to keep data lightweight
            delete itemBreakdown[id].xPositions;
            delete itemBreakdown[id].yPositions;
            delete itemBreakdown[id].zPositions;
        }

        const containerVolume = this.container.length * this.container.width * this.container.height;
        const volumeEfficiency = (totalVolume / containerVolume) * 100;
        const weightUtilization = (totalWeight / this.container.maxWeight) * 100;

        return {
            totalWeight,
            volumeEfficiency,
            utilization: Math.min(volumeEfficiency, weightUtilization),
            itemBreakdown
        };
    }
}
