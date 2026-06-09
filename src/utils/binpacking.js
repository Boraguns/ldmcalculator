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

        // Front-axle protection (semi-trailer only): the first `frontZoneCm` of
        // the deck must not carry more than `frontZoneMaxKg`. While packing we
        // budget weight in this zone and push over-budget stacks behind it, so
        // the load stays solid but the front (kingpin / drive axles) is not
        // overloaded. Disabled (no effect) when frontZoneCm is 0 / unset.
        this.frontZoneCm = containerDims.frontZoneCm || 0;
        this.frontZoneMaxKg = (containerDims.frontZoneMaxKg && containerDims.frontZoneMaxKg > 0)
            ? containerDims.frontZoneMaxKg
            : Infinity;
        this.frontZoneWeight = 0;

        // Items to pack (boxes/pallets)
        this.items = items.map((item) => ({
            id: item.id,
            length: parseFloat(item.length),
            width: parseFloat(item.width),
            height: parseFloat(item.height),
            weight: parseFloat(item.weight),
            quantity: parseInt(item.quantity),
            // A non-stackable item must never form a tower of itself, so its
            // effective max stack is forced to 1. (Cross-product stacking is
            // handled separately in canPlaceAt.)
            maxStack: (item.stackable === false) ? 1 : (parseInt(item.maxStack) || 999),
            allowRotation: item.allowRotation !== false,
            // Cross-product stacking control. Default true. When false, no
            // OTHER product may sit on top of this one, and this product may
            // not be placed on top of any other product (only on the floor or
            // on more units of itself).
            stackable: item.stackable !== false,
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

        // Track per-item placed counts so we can report unplaced quantities
        const placedPerItem = {};
        for (let it of this.items) placedPerItem[it.id] = 0;

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
                    placedPerItem[item.id] = (placedPerItem[item.id] || 0) + placedAmount;
                } else {
                    console.warn(`⚠️ Cannot fit remaining ${remaining} items of #${item.id}`);
                    break; // Cannot fit anymore of this item
                }
            }
        }

        const stats = this.calculateStatistics();
        const remainingWeight = this.container.maxWeight - stats.totalWeight;

        // Calculate remaining capacity for each item type using trial-packing
        // This actually tests how many more items can physically fit
        for (let itemDef of this.items) {
            const remaining = this.calculateRemainingByTrialPacking(itemDef, remainingWeight);
            const placedCount = placedPerItem[itemDef.id] || 0;
            const unplaced = Math.max(0, (itemDef.quantity || 0) - placedCount);

            // Rotation hint: if rotation was disabled and items couldn't fit,
            // estimate how many MORE could fit if rotation were enabled.
            let rotationHint = 0;
            if (unplaced > 0 && !itemDef.allowRotation) {
                const swapped = { ...itemDef, length: itemDef.width, width: itemDef.length };
                const withRotation = this.calculateMaxPotential(swapped);
                const withoutRotation = this.calculateMaxPotential(itemDef);
                if (withRotation > withoutRotation) {
                    rotationHint = Math.min(unplaced, withRotation - withoutRotation);
                }
            }

            const breakdown = stats.itemBreakdown[itemDef.id] || {
                count: 0,
                totalWeight: 0,
                rows: 0,
                columns: 0,
                layers: 0
            };
            breakdown.remainingCapacity = remaining;
            breakdown.requestedQuantity = itemDef.quantity || 0;
            breakdown.unplaced = unplaced;
            breakdown.rotationHint = rotationHint;
            stats.itemBreakdown[itemDef.id] = breakdown;
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
            if (volB !== volA) return volB - volA;
            // Stable tie-break by id so results are reproducible
            return String(a.id).localeCompare(String(b.id));
        });
    }

    /**
     * Tries to place a stack of 'stackSize' items
     */
    tryPlaceStack(item, stackSize, isTemp = false) {
        let orientations = this.getAllOrientations(item);

        // HEURISTIC: Prioritize orientations that allow MORE items to fit across the container WIDTH.
        // If counts are equal, prioritize the one that fills the width TIGHTER (less waste).
        // Then consider height utilization as tertiary.
        orientations.sort((a, b) => {
            const countA = Math.floor(this.container.width / a.width);
            const countB = Math.floor(this.container.width / b.width);

            if (countA !== countB) {
                return countB - countA; // Higher count first
            }

            // Tie-breaker 1: Less remaining width waste is better
            const wasteA = this.container.width - (countA * a.width);
            const wasteB = this.container.width - (countB * b.width);
            if (wasteA !== wasteB) return wasteA - wasteB;

            // Tie-breaker 2: Prefer orientations that maximize vertical stacking
            const stackCountA = Math.min(Math.floor(this.container.height / a.height), item.maxStack);
            const stackCountB = Math.min(Math.floor(this.container.height / b.height), item.maxStack);
            return stackCountB - stackCountA;
        });

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
            let position = this.findBestPosition(stackDims, { ...item, maxStack: 99999 });

            if (!position) continue;

            // Front-axle protection: if this stack's centre lands in the front
            // zone and would push the front-zone weight past its limit, try to
            // re-place it behind the zone (the rest of the deck stays packed
            // solid). If nothing fits behind, fall back to the original spot —
            // placing beats dropping, and the result then flags a front-zone
            // overload so the user knows to shed/redistribute weight.
            const stackWeight = (item.weight || 0) * stackSize;
            if (this.frontZoneCm > 0 && Number.isFinite(this.frontZoneMaxKg)) {
                const cx = position.x + stackDims.length / 2;
                if (cx < this.frontZoneCm && this.frontZoneWeight + stackWeight > this.frontZoneMaxKg) {
                    const alt = this.findBestPosition(stackDims, { ...item, maxStack: 99999 }, this.frontZoneCm);
                    if (alt) position = alt;
                }
            }

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

            // Track committed front-zone weight (ignore temporary trial fills).
            if (this.frontZoneCm > 0 && !isTemp) {
                const cx = position.x + stackDims.length / 2;
                if (cx < this.frontZoneCm) this.frontZoneWeight += stackWeight;
            }
            return true;
        }
        return false;
    }

    getAllOrientations(item) {
        const orientations = [];
        // Orientation 0: Original
        orientations.push({ length: item.length, width: item.width, height: item.height, rotation: 0 });

        if (item.allowRotation) {
            // Rotation 1: Swap L & W (Standard Z-axis rotation)
            orientations.push({ length: item.width, width: item.length, height: item.height, rotation: 1 });
        }

        // TIPPING (Changing Height) DISABLED
        // Users reported "wrong placement", often caused by unrealistic tipping of pallets.
        // We restrict rotation to only spinning on the floor (Z-axis).

        return orientations;
    }

    findBestPosition(itemDims, item, minX = 0) {
        // OPTIMIZATION: Coordinate Point Search (Corner Point Heuristic)
        // Instead of checking every 1cm grid point (which causes millions of checks -> freezing),
        // we only check coordinates defined by the corners of already placed items.
        //
        // `minX` (optional): forbid any placement whose left edge is before this
        // X. Used by the front-axle protection to push an over-budget stack
        // behind the front zone.

        const xPoints = new Set([0]);
        if (minX > 0) xPoints.add(minX);
        const yPoints = new Set([0]);
        const zPoints = new Set([0]);

        // Add potential snap points from existing items
        for (const placed of this.placedItems) {
            xPoints.add(placed.position.x + placed.dimensions.length);
            yPoints.add(placed.position.y + placed.dimensions.width);
            zPoints.add(placed.position.z + placed.dimensions.height);
        }

        const sortedX = [...xPoints].sort((a, b) => a - b);
        const sortedY = [...yPoints].sort((a, b) => a - b);
        const sortedZ = [...zPoints].sort((a, b) => a - b);

        const effMaxZ = this.container.height - itemDims.height;
        const effMaxX = this.container.length - itemDims.length;
        const effMaxY = this.container.width - itemDims.width;

        for (let z of sortedZ) {
            if (z > effMaxZ) break;
            for (let x of sortedX) {
                if (x < minX) continue; // front-zone exclusion (axle protection)
                if (x > effMaxX) break;
                for (let y of sortedY) {
                    if (y > effMaxY) break;

                    const position = { x, y, z };
                    if (this.canPlaceAt(position, itemDims, item)) {
                        return position;
                    }
                }
            }
        }
        return null;
    }

    canPlaceAt(position, itemDims, candidateItem) {
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

        // Stacking rules (only relevant when placing above the floor).
        //  - A NON-stackable candidate may rest on the floor ONLY (never on top
        //    of anything, including more units of itself).
        //  - NOTHING may be placed on top of a non-stackable item.
        //  - Otherwise (both stackable) same- and cross-product stacking is OK.
        if (candidateItem && position.z > 0) {
            // Non-stackable item: floor placements only.
            if (candidateItem.stackable === false) return false;
            for (const placed of this.placedItems) {
                const placedTop = placed.position.z + placed.dimensions.height;
                if (Math.abs(placedTop - position.z) > 0.001) continue; // not touching from below
                // Footprint overlap in X/Y?
                const overlapX = !(position.x + itemDims.length <= placed.position.x ||
                                    placed.position.x + placed.dimensions.length <= position.x);
                const overlapY = !(position.y + itemDims.width <= placed.position.y ||
                                    placed.position.y + placed.dimensions.width <= position.y);
                if (!overlapX || !overlapY) continue;
                // The item directly below must allow something on top of it.
                if (placed.stackable === false) return false;
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

    calculateMaxPotential(itemDef, length = this.container.length, weightLimit = this.container.maxWeight) {
        const orientations = this.getAllOrientations(itemDef);
        let maxFound = 0;
        for (let orient of orientations) {
            const rowL = Math.floor(length / orient.length);
            const rowW = Math.floor(this.container.width / orient.width);
            const rowH = Math.min(Math.floor(this.container.height / orient.height), itemDef.maxStack);
            const volumeCount = rowL * rowW * rowH;
            const weightLimitCount = itemDef.weight > 0 ? Math.floor(weightLimit / itemDef.weight) : 999999;
            const count = Math.min(volumeCount, weightLimitCount);

            if (count > maxFound) maxFound = count;
        }
        return maxFound;
    }

    /**
     * Calculate remaining capacity by actually trying to place items into a cloned state.
     * This is much more accurate than pure geometric estimation because it accounts
     * for gaps and irregular shapes in the current packing.
     */
    calculateRemainingByTrialPacking(itemDef, remainingWeight) {
        // Save current state
        const savedPlacedItems = [...this.placedItems];
        const savedWeight = this.currentWeight;

        let count = 0;
        const maxTrials = 200; // Safety limit to prevent infinite loops

        while (count < maxTrials) {
            // Check weight limit against actual container capacity
            if (itemDef.weight > 0 && this.currentWeight + itemDef.weight > this.container.maxWeight) break;

            // Try to place one more item (stack of 1)
            const placed = this.tryPlaceStack(itemDef, 1, true);
            if (!placed) break;

            // Reflect the trial item's weight so internal checks stay consistent
            this.currentWeight += itemDef.weight;
            count++;
        }

        // Restore original state: remove all trial items
        this.placedItems = savedPlacedItems;
        this.currentWeight = savedWeight;

        return count;
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
            totalVolume, // Added for remaining capacity calculation
            volumeEfficiency,
            utilization: Math.min(volumeEfficiency, weightUtilization),
            itemBreakdown
        };
    }

    /**
     * Rebalance the existing packing along the X-axis (front/rear of the
     * trailer) for realistic axle weight distribution.
     *
     * Real-world rules this models:
     *  - The load must stay packed SOLID from the front (headboard). A loader
     *    never leaves an air gap in the middle/front of a trailer, so we never
     *    relocate a box into empty space — we only SWAP the positions of pairs
     *    of already-placed items that share the same footprint
     *    (length×width×height). Such a swap is collision-safe and, crucially,
     *    leaves the occupied volume unchanged → no gaps are ever created.
     *  - The centre of gravity should sit near the middle of the deck, biased
     *    slightly FORWARD (toward the kingpin / tractor drive axles). A
     *    rear-biased load overloads the trailer axles and lightens the drive
     *    axles — unsafe and illegal. We therefore target the CoG at ~48% of the
     *    trailer length and shuffle heavier boxes toward that point.
     *
     * Returns { cg, targetCx, swapsMade, improved }. Mutates placedItems.
     */
    rebalance() {
        const L = this.container.length;
        // Target centre of gravity: 48% of length from the front (just forward
        // of centre). Measured to each item's centre along X.
        const targetCx = L * 0.48;

        const totalW = this.placedItems.reduce((a, it) => a + (it.weight || 0), 0);
        if (totalW <= 0 || this.placedItems.length < 2) {
            this.placedItems = this.placedItems.map(it => ({ ...it, position: { ...it.position } }));
            return { cg: 0, targetCx, swapsMade: 0, improved: false };
        }

        const cogX = () => this.placedItems.reduce(
            (a, it) => a + (it.weight || 0) * (it.position.x + it.dimensions.length / 2), 0
        ) / totalW;
        const dimsKey = (it) => `${it.dimensions.length}x${it.dimensions.width}x${it.dimensions.height}`;

        // A swap (a<->b) is only allowed if it doesn't put an unstackable item
        // under a different product (or leave one stranded). Same logic the old
        // code used, scoped to the two movers.
        const wouldViolate = (a, b, newPos, mover) => {
            if (newPos.z <= 0) {
                // Floor placement: still must not strand an unstackable mover
                // that has a different product on top after the swap.
            }
            // Items DIRECTLY BELOW the mover's new position.
            for (const p of this.placedItems) {
                if (p === a || p === b) continue;
                const ptop = p.position.z + p.dimensions.height;
                if (Math.abs(ptop - newPos.z) > 0.001) continue;
                const overlapX = !(newPos.x + mover.dimensions.length <= p.position.x ||
                                    p.position.x + p.dimensions.length <= newPos.x);
                const overlapY = !(newPos.y + mover.dimensions.width <= p.position.y ||
                                    p.position.y + p.dimensions.width <= newPos.y);
                if (!overlapX || !overlapY) continue;
                if (p.id === mover.id) continue;
                if (p.stackable === false || mover.stackable === false) return true;
            }
            // If mover is unstackable, nothing of a different product may sit
            // directly on top of its new position.
            if (mover.stackable === false) {
                const moverTop = newPos.z + mover.dimensions.height;
                for (const p of this.placedItems) {
                    if (p === a || p === b) continue;
                    if (Math.abs(p.position.z - moverTop) > 0.001) continue;
                    const overlapX = !(newPos.x + mover.dimensions.length <= p.position.x ||
                                        p.position.x + p.dimensions.length <= newPos.x);
                    const overlapY = !(newPos.y + mover.dimensions.width <= p.position.y ||
                                        p.position.y + p.dimensions.width <= newPos.y);
                    if (!overlapX || !overlapY) continue;
                    if (p.id !== mover.id) return true;
                }
            }
            return false;
        };

        let cg = cogX();
        const initialErr = Math.abs(cg - targetCx);
        let swapsMade = 0;

        const MAX_ITER = 500;
        for (let iter = 0; iter < MAX_ITER; iter++) {
            if (Math.abs(cg - targetCx) / L <= 0.02) break; // within 2% of length

            // Greedily find the same-footprint pair whose swap moves the CoG
            // closest to the target. Swapping a<->b shifts the CoG numerator by
            // (wa-wb)(bx-ax), so newCg = cg + (wa-wb)(bx-ax)/totalW.
            let bestPair = null;
            let bestImprove = 1e-6;
            for (let i = 0; i < this.placedItems.length; i++) {
                const a = this.placedItems[i];
                const ax = a.position.x + a.dimensions.length / 2;
                const wa = a.weight || 0;
                for (let j = i + 1; j < this.placedItems.length; j++) {
                    const b = this.placedItems[j];
                    if (dimsKey(a) !== dimsKey(b)) continue;
                    const wb = b.weight || 0;
                    if (wa === wb) continue; // swap changes nothing
                    const bx = b.position.x + b.dimensions.length / 2;
                    const newCg = cg + ((wa - wb) * (bx - ax)) / totalW;
                    const improve = Math.abs(cg - targetCx) - Math.abs(newCg - targetCx);
                    if (improve > bestImprove) {
                        if (!wouldViolate(a, b, b.position, a) && !wouldViolate(a, b, a.position, b)) {
                            bestImprove = improve;
                            bestPair = [a, b];
                        }
                    }
                }
            }

            if (!bestPair) break;
            const [a, b] = bestPair;
            const tmp = a.position; a.position = b.position; b.position = tmp;
            swapsMade++;
            cg = cogX();
        }

        // Rebuild the array reference so React state updates detect the change
        // even though individual item positions were mutated in place.
        this.placedItems = this.placedItems.map(it => ({ ...it, position: { ...it.position } }));

        return {
            cg,
            targetCx,
            swapsMade,
            improved: Math.abs(cg - targetCx) < initialErr - 0.5
        };
    }
}
