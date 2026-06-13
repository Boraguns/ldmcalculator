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

        // When true, items are packed lightest-per-volume first so the
        // weight-capped front zone fills with the lightest cargo (heavier
        // cargo is pushed to the rear). Used to fill the front 4 m fully while
        // staying under the front-axle limit.
        this.lightFirst = containerDims.lightFirst === true;

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
        // ================= BLOCK LOADING (clean, correct by construction) =====
        // Real trucks are loaded product-by-product as tight grid BLOCKS placed
        // flush from the headboard toward the rear: each product fills the full
        // width (as many rows as fit) and stacks up to its allowed height, in
        // contiguous slots along the deck length. This guarantees: no boxes
        // outside the deck, no overlaps, no floating, and no puzzle-gaps inside
        // a product. Different products simply form adjacent blocks.
        const C = this.container;
        const placedPerItem = {};
        for (const it of this.items) placedPerItem[it.id] = 0;

        // Best orientation for a product = the one that packs the most boxes per
        // box-length slot (rows across the width × layers high). null if it
        // physically cannot fit the deck at all.
        const planFor = (item) => {
            const orients = this.getAllOrientations(item);
            let best = null;
            for (const o of orients) {
                if (o.length > C.length || o.width > C.width || o.height > C.height) continue;
                const perRow = Math.floor(C.width / o.width);            // across width (y)
                const maxByHeight = Math.floor(C.height / o.height);
                const layers = (item.stackable === false)
                    ? 1                                                  // nothing on top → single layer
                    : Math.max(1, Math.min(item.maxStack || 1, maxByHeight));
                if (perRow < 1 || layers < 1) continue;
                const perSlot = perRow * layers;
                if (!best || perSlot > best.perSlot) best = { o, perRow, layers, perSlot };
            }
            return best;
        };

        let cursorX = 0;          // next free position along the deck length
        let totalWeight = 0;

        // Block order honours all three priorities:
        //  (1) WEIGHT BALANCE — lighter products go toward the FRONT so the first
        //      metres of the deck (over the kingpin / drive axles) stay light,
        //      while heavier products sit further back. We compare each product's
        //      weight PER DECK-METRE it occupies (weight × boxes-per-slot / slot
        //      length), so a heavy-but-compact product isn't unfairly pushed back.
        //  (2) STACKING — stackable products first so they compress vertically and
        //      a big non-stackable one can't hog the deck and starve the others.
        //  (3) GROUPING — each product still goes down as one contiguous block.
        const idx = new Map(this.items.map((it, i) => [it, i]));
        const loadPerMetre = (it) => {
            const pl = planFor(it);
            if (!pl) return 0;
            return (it.weight || 0) * pl.perSlot / Math.max(1, pl.o.length); // kg per cm of deck
        };
        const placementOrder = [...this.items].sort((a, b) => {
            const sa = a.stackable !== false ? 0 : 1;
            const sb = b.stackable !== false ? 0 : 1;
            if (sa !== sb) return sa - sb;                 // stackable first (capacity)
            const la = loadPerMetre(a), lb = loadPerMetre(b);
            if (Math.abs(la - lb) > 1e-9) return la - lb;  // lighter-per-metre toward the front
            return idx.get(a) - idx.get(b);
        });

        for (const item of placementOrder) {
            const plan = planFor(item);
            if (!plan) continue;  // cannot fit this product in the deck at all
            const { o, perRow, layers } = plan;
            let remaining = item.quantity;

            while (remaining > 0 && cursorX + o.length <= C.length + 0.001) {
                let placedInSlot = 0;
                for (let row = 0; row < perRow && remaining > 0; row++) {
                    for (let layer = 0; layer < layers && remaining > 0; layer++) {
                        if (item.weight > 0 && totalWeight + item.weight > C.maxWeight) {
                            remaining = 0; break;
                        }
                        this.placedItems.push({
                            ...item,
                            position: { x: cursorX, y: row * o.width, z: layer * o.height },
                            dimensions: { length: o.length, width: o.width, height: o.height },
                            rotation: o.rotation,
                        });
                        totalWeight += item.weight;
                        placedPerItem[item.id]++;
                        remaining--;
                        placedInSlot++;
                    }
                }
                if (placedInSlot === 0) break;
                cursorX += o.length;   // next slot sits flush against this one
            }
        }
        this.currentWeight = totalWeight;

        const stats = this.calculateStatistics();
        const remLen = Math.max(0, C.length - cursorX);

        // Per-product breakdown + remaining capacity (how many more would fit in
        // the leftover deck length, also bounded by remaining weight).
        for (const itemDef of this.items) {
            const plan = planFor(itemDef);
            const placedCount = placedPerItem[itemDef.id] || 0;
            const unplaced = Math.max(0, (itemDef.quantity || 0) - placedCount);

            let remainingCapacity = 0;
            if (plan) {
                const byLength = Math.floor((remLen + 1e-6) / plan.o.length) * plan.perSlot;
                const byWeight = itemDef.weight > 0
                    ? Math.floor((C.maxWeight - totalWeight) / itemDef.weight)
                    : Number.MAX_SAFE_INTEGER;
                remainingCapacity = Math.max(0, Math.min(byLength, byWeight));
            }

            // Rotation hint: would enabling rotation fit more per slot?
            let rotationHint = 0;
            if (unplaced > 0 && !itemDef.allowRotation) {
                const rotPlan = planFor({ ...itemDef, allowRotation: true });
                if (rotPlan && plan && rotPlan.perSlot > plan.perSlot) {
                    rotationHint = Math.min(unplaced, rotPlan.perSlot - plan.perSlot);
                }
            }

            const breakdown = stats.itemBreakdown[itemDef.id] || {
                count: 0, totalWeight: 0, rows: 0, columns: 0, layers: 0,
            };
            breakdown.remainingCapacity = remainingCapacity;
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
        const vol = (it) => it.length * it.width * it.height;

        // "Lightest to the front" mode: order by density (kg per cm³) ascending
        // so low-density cargo is placed first and fills the front zone with the
        // most volume per kg; denser/heavier cargo comes later and lands at the
        // rear. Volume desc breaks ties to keep packing tight.
        if (this.lightFirst) {
            return [...this.items].sort((a, b) => {
                const densA = (a.weight || 0) / Math.max(1, vol(a));
                const densB = (b.weight || 0) / Math.max(1, vol(b));
                if (Math.abs(densA - densB) > 1e-9) return densA - densB;
                const vA = vol(a), vB = vol(b);
                if (vB !== vA) return vB - vA;
                return String(a.id).localeCompare(String(b.id));
            });
        }

        return [...this.items].sort((a, b) => {
            const volA = vol(a);
            const volB = vol(b);
            if (volB !== volA) return volB - volA;
            // Stable tie-break by id so results are reproducible
            return String(a.id).localeCompare(String(b.id));
        });
    }

    /**
     * Tries to place a stack of 'stackSize' items
     */
    tryPlaceStack(item, stackSize, isTemp = false, opts = {}) {
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
            // For single-unit layer fills we let canPlaceAt enforce the real
            // max-stack (column height) limit; tower placements handle height
            // themselves so they bypass it with a large value.
            const probe = { ...item, maxStack: opts.respectMaxStack ? item.maxStack : 99999 };
            const position = this.findBestPosition(stackDims, probe, opts);

            if (!position) continue;

            // Found a spot — pack SOLID from the front (no gaps). Front-axle
            // balance is handled by ordering (lightest cargo first via
            // `lightFirst`), NOT by leaving voids in the deck: a real loader
            // never leaves an air gap mid-trailer.
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

    findBestPosition(itemDims, item, opts = {}) {
        // OPTIMIZATION: Coordinate Point Search (Corner Point Heuristic)
        // Instead of checking every 1cm grid point (which causes millions of checks -> freezing),
        // we only check coordinates defined by the corners of already placed items.
        //
        // opts.floorOnly: only accept floor (z === 0) positions — used by the
        //   PHASE-1 single-layer floor fill.
        // opts.rearFirst: scan X from the rear of the deck first — used by the
        //   PHASE-2 overflow stacking so extra weight settles toward the rear
        //   (keeps the front ≈ 20% of total weight).
        const { floorOnly = false, rearFirst = false } = opts;

        const xPoints = new Set([0]);
        const yPoints = new Set([0]);
        const zPoints = new Set([0]);

        // Add potential snap points from existing items
        for (const placed of this.placedItems) {
            xPoints.add(placed.position.x + placed.dimensions.length);
            yPoints.add(placed.position.y + placed.dimensions.width);
            zPoints.add(placed.position.z + placed.dimensions.height);
        }

        let sortedX = [...xPoints].sort((a, b) => a - b);
        if (rearFirst) sortedX = sortedX.reverse(); // try the rear (largest X) first
        const sortedY = [...yPoints].sort((a, b) => a - b);
        const sortedZ = [...zPoints].sort((a, b) => a - b);

        const effMaxZ = this.container.height - itemDims.height;
        const effMaxX = this.container.length - itemDims.length;
        const effMaxY = this.container.width - itemDims.width;

        for (let z of sortedZ) {
            if (z > effMaxZ) break;
            if (floorOnly && z > 0) break; // single-layer pass: floor only
            for (let x of sortedX) {
                // x can be visited descending (rearFirst), so bound-check both ways.
                if (x < 0 || x > effMaxX) continue;
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

        // ===================== SUPPORT CHECK (no floating) =====================
        // Anything above the floor must rest on enough base beneath it. We allow
        // a realistic overhang (e.g. a slightly larger box centred on a smaller
        // one — its centre of gravity still sits over the support) but reject
        // mid-air / severe-overhang placements. Threshold = 60% of the placed
        // box's footprint must be supported. (gravitySettle() is the final
        // backstop that drops anything onto its actual support, so true floating
        // is impossible regardless.)
        if (position.z > 0) {
            const baseArea = itemDims.length * itemDims.width;
            let supportArea = 0;
            for (const placed of this.placedItems) {
                const placedTop = placed.position.z + placed.dimensions.height;
                if (Math.abs(placedTop - position.z) > 0.001) continue; // not a direct support
                const ox = Math.min(position.x + itemDims.length, placed.position.x + placed.dimensions.length)
                         - Math.max(position.x, placed.position.x);
                const oy = Math.min(position.y + itemDims.width, placed.position.y + placed.dimensions.width)
                         - Math.max(position.y, placed.position.y);
                if (ox > 0 && oy > 0) supportArea += ox * oy;
            }
            if (supportArea < baseArea * 0.6) return false; // not enough support → would float / topple
        }

        // ===================== STACKING RULES (z > 0 only) =====================
        // Column model (matches the agreed behaviour):
        //   1. Nothing may rest on top of a NON-stackable item (its top is closed).
        //   2. A column's TOTAL height (item count in a footprint) is capped by
        //      the BASE (bottom) item's max-stack. So a stackable base with
        //      max 4 accepts up to 4 items in its column — INCLUDING a different
        //      product on top — while a base whose stack is already full takes
        //      nothing more. Same- and cross-product stacking are both allowed
        //      as long as they fit under the base's cap and the item directly
        //      below accepts something on top.
        if (candidateItem && position.z > 0) {
            let baseItem = null;
            let baseZ = Infinity;
            let columnCount = 0;

            for (const placed of this.placedItems) {
                if (placed.position.z >= position.z) continue; // only items below
                const overlapX = !(position.x + itemDims.length <= placed.position.x ||
                                    placed.position.x + placed.dimensions.length <= position.x);
                const overlapY = !(position.y + itemDims.width <= placed.position.y ||
                                    placed.position.y + placed.dimensions.width <= position.y);
                if (!overlapX || !overlapY) continue;

                columnCount++;
                if (placed.position.z < baseZ) { baseZ = placed.position.z; baseItem = placed; }

                // (1) Nothing on top of a non-stackable item directly below.
                const placedTop = placed.position.z + placed.dimensions.height;
                if (Math.abs(placedTop - position.z) <= 0.001 && placed.stackable === false) {
                    return false;
                }
            }

            // (2) Column height capped by the base product's max-stack.
            const cap = (baseItem && baseItem.maxStack) ? baseItem.maxStack : 999;
            if (columnCount >= cap) return false;
        }
        return true;
    }

    /**
     * Gravity pass: drop every placed item straight down until it rests on the
     * floor or on the top of an overlapping item below it. Guarantees no item
     * ever floats in mid-air and removes vertical gaps, regardless of how the
     * placement was produced (packing, rebalance, etc.). A no-op for an already
     * solid pack. Footprint (x,y) and column membership are unchanged, so
     * max-stack / stacking rules are preserved.
     */
    gravitySettle() {
        const arr = [...this.placedItems].sort((a, b) => a.position.z - b.position.z);
        for (let i = 0; i < arr.length; i++) {
            const it = arr[i];
            let restZ = 0;
            for (let j = 0; j < i; j++) {
                const o = arr[j]; // already settled (lower in the column)
                const ox = Math.min(it.position.x + it.dimensions.length, o.position.x + o.dimensions.length)
                         - Math.max(it.position.x, o.position.x);
                const oy = Math.min(it.position.y + it.dimensions.width, o.position.y + o.dimensions.width)
                         - Math.max(it.position.y, o.position.y);
                if (ox > 0 && oy > 0) {
                    const top = o.position.z + o.dimensions.height;
                    if (top > restZ) restZ = top;
                }
            }
            it.position.z = restZ;
        }
    }

    /**
     * Compaction: slide whole footprint COLUMNS together so boxes sit flush
     * (no gaps between them) instead of snapping to far-away neighbours' edges.
     * Columns move as rigid units (X then Y), so stacks stay intact and stacking
     * rules are preserved. Run gravitySettle afterwards as a Z backstop.
     */
    compact() {
        // Group placed boxes into footprint columns (same x,y origin).
        const colMap = new Map();
        for (const it of this.placedItems) {
            const k = Math.round(it.position.x) + '|' + Math.round(it.position.y);
            if (!colMap.has(k)) colMap.set(k, []);
            colMap.get(k).push(it);
        }
        const cols = [...colMap.values()].map(boxes => ({
            boxes,
            x: Math.min(...boxes.map(b => b.position.x)),
            y: Math.min(...boxes.map(b => b.position.y)),
            L: Math.max(...boxes.map(b => b.dimensions.length)),
            W: Math.max(...boxes.map(b => b.dimensions.width)),
        }));

        // X-compaction: pull every column toward the front (headboard).
        cols.sort((a, b) => a.x - b.x);
        for (const c of cols) {
            let minX = 0;
            for (const o of cols) {
                if (o === c || o.x >= c.x) continue;
                const overlapY = !(c.y + c.W <= o.y || o.y + o.W <= c.y);
                if (overlapY) minX = Math.max(minX, o.x + o.L);
            }
            const dx = minX - c.x;
            if (dx !== 0) { c.boxes.forEach(b => { b.position.x += dx; }); c.x = minX; }
        }

        // Y-compaction: pull every column toward one side.
        cols.sort((a, b) => a.y - b.y);
        for (const c of cols) {
            let minY = 0;
            for (const o of cols) {
                if (o === c || o.y >= c.y) continue;
                const overlapX = !(c.x + c.L <= o.x || o.x + o.L <= c.x);
                if (overlapX) minY = Math.max(minY, o.y + o.W);
            }
            const dy = minY - c.y;
            if (dy !== 0) { c.boxes.forEach(b => { b.position.y += dy; }); c.y = minY; }
        }
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

            // Try to place one more item (stack of 1), honouring the real
            // stacking rules + max-stack so "remaining" reflects what can
            // ACTUALLY still fit (previously it ignored max-stack and reported
            // too many free slots).
            const placed = this.tryPlaceStack(itemDef, 1, true, { respectMaxStack: true });
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

        // Re-settle so any swap that moved a support out cannot leave a floater.
        this.gravitySettle();

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
