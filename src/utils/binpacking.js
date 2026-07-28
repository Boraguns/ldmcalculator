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
        this.items = items.map((item) => {
            // Three stacking categories, captured per product:
            //   'none' — not stackable: nothing on top, never stacked (floor only)
            //   'full' — fully stackable BOTH ways: bears other loads on top AND
            //            may sit on top of other loads; no restriction (used as a
            //            carrier). Deck weight balance is handled separately.
            //   'self' — stacks only on its OWN kind (same product, no cross).
            // Legacy fallback: stackable:false → 'none', stackable:true → 'full'.
            // Older categories collapse into this 3-way model: 'both'/'bear'/'top'
            // all map to 'full' (fully stackable both ways).
            // Five stacking modes (chosen in the product's stacking dropdown):
            //   'none'    — floor only, nothing on top.
            //   'self'    — stacks only on its OWN kind.
            //   'full'    — fully stackable both ways (bears others AND rides others).
            //   'carrier' — a BASE: bears other products on top and gets floor/base
            //               priority (placed first) so the user pins what stays at
            //               the bottom; it does not ride on top of others.
            //   'topper'  — rides on top of OTHER products (and the floor); nothing
            //               is placed on top of it.
            // Legacy: both→full, bear→carrier, top→topper, stackable flags as before.
            let mode = item.stackMode || (item.stackable === false ? 'none' : 'full');
            if (mode === 'both') mode = 'full';
            else if (mode === 'bear') mode = 'carrier';
            else if (mode === 'top') mode = 'topper';
            // Legacy per-product flag drafts still honoured.
            const isCarrier = (mode === 'carrier') || item.isCarrier === true;
            const goesOnTop = (mode === 'topper') || item.goesOnTop === true;
            const canBearOther = (mode === 'full' || mode === 'carrier') || item.isCarrier === true; // OTHERS may sit on top
            const canGoOnOther = (mode === 'full' || mode === 'topper') || item.goesOnTop === true;   // this may sit on OTHERS
            // own kind on own kind. A CARRIER does NOT self-stack: it is the
            // single-layer base that stays on the floor with other products laid
            // on top of it — self-stacking would build carrier towers instead.
            const selfStack = (mode === 'full' || mode === 'self' || mode === 'topper');
            return {
                id: item.id,
                length: parseFloat(item.length),
                width: parseFloat(item.width),
                height: parseFloat(item.height),
                weight: parseFloat(item.weight),
                quantity: parseInt(item.quantity),
                stackMode: mode,
                isCarrier,
                goesOnTop,
                canBearOther,
                canGoOnOther,
                selfStack,
                // Same-product self-stacking allowed only when selfStack; else 1 layer.
                maxStack: selfStack ? (parseInt(item.maxStack) || 999) : 1,
                allowRotation: item.allowRotation !== false,
                allowTip: item.allowTip === true, // may rest on any face (off by default)
                stackable: mode !== 'none', // legacy reference
                placed: false,
                position: null,
                rotation: null,
            };
        });

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
            let orients = this.getAllOrientations(item);
            const fitsDeck = (o) => o.length <= C.length && o.width <= C.width && o.height <= C.height;
            // "Rotate"/"tip" are PERMISSION: the packer may use any allowed
            // orientation and picks the one that loads the MOST (e.g. 111×95
            // turned so 14 columns of 95 fit instead of 12 of 111 → 56 vs 48).
            // Ties prefer the entered (upright) orientation so boxes are never
            // rotated without a capacity gain.
            if (!orients.some(fitsDeck)) {
                // Not even the allowed set fits — last resort: force the swapped
                // footprint so the product can still be loaded rather than dropped.
                const swapped = { length: item.width, width: item.length, height: item.height, rotation: 1 };
                if (fitsDeck(swapped)) orients = [swapped];
            }
            let best = null;
            for (const o of orients) {
                if (!fitsDeck(o)) continue;
                const perRow = Math.floor(C.width / o.width);            // across width (y)
                const maxByHeight = Math.floor(C.height / o.height);
                const layers = (item.stackable === false)
                    ? 1                                                  // nothing on top → single layer
                    : Math.max(1, Math.min(item.maxStack || 1, maxByHeight));
                if (perRow < 1 || layers < 1) continue;
                const perSlot = perRow * layers;
                // CAPACITY metric = boxes per cm of deck LENGTH, not per slot:
                // two orientations can tie per-slot while one uses a SHORTER slot
                // and therefore fits more columns (111×95: upright 2/row × 111cm
                // vs turned 2/row × 95cm → 12 vs 14 columns → 48 vs 56 boxes).
                const density = perSlot / o.length;
                // Tie-breaks: prefer the ENTERED (upright) orientation so boxes
                // are never rotated without a real capacity gain, then the
                // orientation that fills the deck height best (less wasted air).
                const usedH = layers * o.height;
                const upright = o.rotation === 0 ? 1 : 0;
                const EPS = 1e-9;
                if (!best || density > best.density + EPS ||
                    (Math.abs(density - best.density) <= EPS && upright > best.upright) ||
                    (Math.abs(density - best.density) <= EPS && upright === best.upright && usedH > best.usedH)) {
                    best = { o, perRow, layers, perSlot, density, usedH, upright };
                }
            }
            return best;
        };

        // Block order honours all three priorities:
        //  (1) WEIGHT BALANCE — lighter products go toward the FRONT so the first
        //      metres of the deck (over the kingpin / drive axles) stay light.
        //  (2) STACKING — stackable products first so they compress vertically and
        //      a big non-stackable one can't hog the deck and starve the others.
        //  (3) GROUPING — each product is one contiguous, gap-free block.
        // A "full" product that overflows its own block (deck ran out) may have
        // the remainder cross-stacked flush on top of carrier blocks.
        const isTopper = (it) => it.canGoOnOther;       // full products cross-stack overflow
        const toppers = this.items.filter(isTopper);

        const idx = new Map(this.items.map((it, i) => [it, i]));
        const loadPerMetre = (it) => {
            const pl = planFor(it);
            if (!pl) return 0;
            return (it.weight || 0) * pl.perSlot / Math.max(1, pl.o.length); // kg per cm of deck
        };
        const placementOrder = [...this.items].sort((a, b) => {
            // User-pinned carriers get floor/base priority — placed first so they
            // stay at the bottom and other products' overflow caps them.
            if (!!a.isCarrier !== !!b.isCarrier) return a.isCarrier ? -1 : 1;
            const sa = a.maxStack > 1 ? 0 : 1;             // self-stackable bases first (capacity)
            const sb = b.maxStack > 1 ? 0 : 1;
            if (sa !== sb) return sa - sb;
            const la = loadPerMetre(a), lb = loadPerMetre(b);
            if (Math.abs(la - lb) > 1e-9) return la - lb;  // lighter-per-metre toward the front
            return idx.get(a) - idx.get(b);
        });

        // FLOOR-FIRST BLOCK LOADER — the general rule.
        // "Stackable" does NOT mean "pile up": it means spread on the deck FLOOR
        // first, and only start stacking on top once the floor cannot hold any
        // more. So we find the LOWEST uniform stack height H (in layers) at which
        // the whole load fits on the deck as contiguous full-width blocks:
        //   H = 1  → everything lies in a single floor layer (no stacking);
        //   H rises by one only when the floor is too short to hold the load flat.
        // Each product is then ONE solid block — full deck width (perRow rows),
        // columns flush (no gaps), stacked to an even height of about H — blocks
        // sitting directly adjacent, lightest to the front. "Not stackable"
        // products are capped at a single layer; "self" stacks only its own kind;
        // a "full" product whose share overruns the deck has its overflow laid
        // flush on top of carrier blocks by the cross-stack pass below.
        this.placedItems = [];
        this.currentWeight = 0;
        let cursorX = 0;
        const weightOK = (w) => !(w > 0 && this.currentWeight + w > C.maxWeight);

        // Columns a product needs when stacked H high (bounded by its own max),
        // and the total deck length the whole load needs at height H.
        const colsAtHeight = (it, pl, H) =>
            Math.max(1, Math.ceil(it.quantity / (pl.perRow * Math.min(H, pl.layers))));
        const lenAtHeight = (H) => placementOrder.reduce((s, it) => {
            const pl = planFor(it);
            return pl ? s + colsAtHeight(it, pl, H) * pl.o.length : s;
        }, 0);
        const maxLayersAll = Math.max(1, ...placementOrder.map((it) => {
            const pl = planFor(it); return pl ? pl.layers : 1;
        }));
        // Raise H from 1 until the load fits the deck length (or until the
        // tallest any product can stack — any remaining overflow then goes to the
        // cross-stack pass). H=1 stays whenever the load fits flat on the floor.
        let H = 1;
        while (H < maxLayersAll && lenAtHeight(H) > C.length) H++;

        // BALANCE: when the load does not fill the deck, CENTRE it so its weight
        // sits between the axles instead of all over the front.
        const usedLen = Math.min(C.length, lenAtHeight(H));
        cursorX = Math.max(0, (C.length - usedLen) / 2);

        for (const item of placementOrder) {
            const plan = planFor(item);
            if (!plan) continue;
            const { o, perRow, layers } = plan;
            // Columns of this product that still fit on the remaining deck.
            const colsAvail = Math.floor((C.length - cursorX + 1e-6) / o.length);
            if (colsAvail < 1) continue; // no floor room; overflow handled below
            // Wide floor share at the chosen height H: spread across the floor,
            // stacked only ~H high (never taller than needed to make it fit).
            const nCols = Math.min(colsAtHeight(item, plan, H), colsAvail);
            const cols = [];
            for (let c = 0; c < nCols; c++) { cols.push(cursorX); cursorX += o.length; }

            // EVEN FILL — layer by layer across ALL columns, so the block top is
            // flat; any partial top layer falls on contiguous front columns (a
            // clean step, never an isolated spike). Bottom-up keeps it grounded.
            let remaining = item.quantity;
            for (let layer = 0; layer < layers && remaining > 0; layer++) {
                for (let c = 0; c < nCols && remaining > 0; c++) {
                    for (let row = 0; row < perRow && remaining > 0; row++) {
                        if (!weightOK(item.weight)) { remaining = 0; break; }
                        this.placedItems.push({
                            ...item,
                            position: { x: cols[c], y: row * o.width, z: layer * o.height },
                            dimensions: { length: o.length, width: o.width, height: o.height },
                            rotation: o.rotation,
                        });
                        this.currentWeight += item.weight;
                        placedPerItem[item.id]++;
                        remaining--;
                    }
                }
            }
        }

        // CROSS-STACK — only genuine overflow (a product that did not fit as its
        // own block) is laid flush on top of contiguous carrier tops, rear first.
        this._placeToppers(toppers, placedPerItem, planFor);

        // Snapshot the block-loader result so we can compare it against the
        // extreme-point optimiser below and keep whichever loads better.
        const blockResult = {
            placed: this.placedItems,
            perItem: { ...placedPerItem },
            weight: this.currentWeight,
            count: this.placedItems.length,
            usedLen: Math.max(0, ...this.placedItems.map((p) => p.position.x + p.dimensions.length), 0),
        };

        // EXTREME-POINT OPTIMISER — a gap-filling, compacting packer (deepest-
        // bottom-left-fill). It places big pieces first and slots small ones into
        // the gaps between/over them, rotating as allowed, pushing everything
        // toward the front to fill every reachable space and minimise the loading
        // metres used. This is the PRIMARY goal now (maximum-density packing):
        // we run both the block loader and the optimiser and keep whichever
        // packs best — more boxes wins; on a tie the more compact (smaller used
        // length) result wins, so the load is always filled as densely as
        // possible across every scenario.
        // MULTI-START: run the optimiser with several "big first" orderings and
        // keep the densest result. Different loads pack best under different
        // criteria (footprint, volume, height, longest side), so trying a few and
        // picking the winner gets noticeably closer to an optimal fill. Capped by
        // unit count so big loads stay fast (one pass only).
        const totalUnits = this.items.reduce((s, it) => s + (it.quantity || 0), 0);
        const keys = totalUnits <= 600
            ? [
                (it) => it.length * it.width,                    // footprint
                (it) => it.length * it.width * it.height,        // volume
                (it) => it.height,                               // tallest first
                (it) => Math.max(it.length, it.width, it.height),// longest side
                (it) => it.length,                               // longest along deck
                // Deterministic "shuffled" product orders: hashing the product id
                // with a fixed seed gives arbitrary-but-reproducible orderings.
                // Different interleavings escape local optima the size-driven
                // keys share, at the cost of one extra pass each.
                (it) => this._orderHash(it.id, 7),
                (it) => this._orderHash(it.id, 13),
                (it) => this._orderHash(it.id, 29),
            ]
            : [(it) => it.length * it.width * it.height];
        // Candidate selection maximises PLACED VOLUME ("fill the truck"), with
        // box count then shorter used length as tie-breaks. Count alone is a bad
        // objective on mixed loads: an ordering that squeezes in many small
        // boxes while dropping a few big ones wins on count yet leaves the
        // vehicle emptier.
        const volOf = (r) => r.placed.reduce((s, p) => s + p.dimensions.length * p.dimensions.width * p.dimensions.height, 0);
        const beats = (a, b, av, bv) => av > bv + 0.5 ||
            (Math.abs(av - bv) <= 0.5 && (a.count > b.count ||
                (a.count === b.count && a.usedLen < b.usedLen - 0.5)));
        let better = blockResult;
        let betterVol = volOf(better);
        for (const k of keys) {
            const ep = this._packExtreme(k);
            if (!ep) continue;
            const v = volOf(ep);
            if (beats(ep, better, v, betterVol)) { better = ep; betterVol = v; }
        }
        // TOP-UP PASSES — fill the whole vehicle before giving up on anything.
        // Whichever strategy won, seed the extreme-point placer with its layout
        // and try to slot every still-unplaced unit into the remaining gaps
        // (same hard rules: bounds, no overlap, full support, stacking modes,
        // weight cap). Two orders are tried — biggest-first, then a second pass
        // smallest-first (small leftovers often fit pockets the big ones opened).
        // Only what STILL doesn't fit is reported as left out.
        {
            const topped = this._packExtreme(null, better);
            if (topped) { const v = volOf(topped); if (beats(topped, better, v, betterVol)) { better = topped; betterVol = v; } }
            const topped2 = this._packExtreme((it) => -(it.length * it.width * it.height), better);
            if (topped2) { const v = volOf(topped2); if (beats(topped2, better, v, betterVol)) { better = topped2; betterVol = v; } }
        }
        this.placedItems = better.placed;
        this.currentWeight = better.weight;
        for (const k of Object.keys(placedPerItem)) placedPerItem[k] = better.perItem[k] || 0;

        cursorX = Math.max(0, ...this.placedItems.map((p) => p.position.x + p.dimensions.length), 0);

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
                    ? Math.floor((C.maxWeight - this.currentWeight) / itemDef.weight)
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

    /**
     * Cross-stack overflow of "full" products (canGoOnOther) on top of carrier
     * surfaces (the exposed top of any column whose top item canBearOther),
     * tiling within each surface. Called only with each product's leftover after
     * floor + same-product column stacking, so same-product blocks form first and
     * cross-product stacking is pure overflow. Leftover that still doesn't fit
     * goes on the floor at the rear. Mutates this.placedItems /
     * this.currentWeight and the passed placedPerItem.
     */
    _placeToppers(toppers, placedPerItem, planFor) {
        if (!toppers || !toppers.length) return;
        const C = this.container;

        for (const item of toppers) {
            let remaining = item.quantity - (placedPerItem[item.id] || 0);
            if (remaining <= 0) continue;

            // (Re)build carrier surfaces each product, since previous toppers may
            // have raised some column tops (a topper itself bears nothing, so its
            // top is NOT a surface).
            const colMap = new Map();
            for (const it of this.placedItems) {
                const k = Math.round(it.position.x) + '|' + Math.round(it.position.y);
                let c = colMap.get(k);
                if (!c) { c = { items: [] }; colMap.set(k, c); }
                c.items.push(it);
            }
            const surfaces = [];
            for (const c of colMap.values()) {
                let top = c.items[0];
                for (const e of c.items) if (e.position.z > top.position.z) top = e;
                if (!top.canBearOther) continue; // nothing may rest on this column's top
                surfaces.push({
                    x: top.position.x, y: top.position.y,
                    l: top.dimensions.length, w: top.dimensions.width,
                    z: top.position.z + top.dimensions.height,
                    carrierId: top.id,
                });
            }
            // CLEAN CAP: only cap each carrier product's EVEN top — its maximum
            // top height. A block whose quantity doesn't fill its last layer has
            // some columns one box shorter; capping those dips would drop lone
            // toppers into pits (the messy look the user rejected). So we keep
            // only the surfaces at each carrier's max height and ignore the dips.
            const maxZByCarrier = new Map();
            for (const s of surfaces) {
                const m = maxZByCarrier.get(s.carrierId) || 0;
                if (s.z > m) maxZByCarrier.set(s.carrierId, s.z);
            }
            const evenSurfaces = surfaces.filter(
                (s) => s.z >= maxZByCarrier.get(s.carrierId) - 0.5
            );
            // Merge each carrier's even surfaces into ONE region and tile the
            // topper as a SINGLE CONTINUOUS grid across it — boxes butting flush
            // against each other, ignoring where the carrier boxes underneath
            // start/end. (Tiling per carrier-box left periodic gaps wherever the
            // topper didn't divide the carrier-box footprint evenly — the gappy
            // cap the user rejected.) A topper cell is placed only where its whole
            // base rests on support, so edges/dips never float.
            const byCarrier = new Map();
            for (const s of evenSurfaces) {
                const g = byCarrier.get(s.carrierId) || [];
                g.push(s); byCarrier.set(s.carrierId, g);
            }
            // Carriers rear-first (keep the front light).
            const carrierRegions = [...byCarrier.values()].sort(
                (A, B) => Math.max(...B.map((s) => s.x)) - Math.max(...A.map((s) => s.x))
            );
            for (const surfs of carrierRegions) {
                if (remaining <= 0) break;
                const z = Math.max(...surfs.map((s) => s.z));
                const minX = Math.min(...surfs.map((s) => s.x));
                const maxX = Math.max(...surfs.map((s) => s.x + s.l));
                const minY = Math.min(...surfs.map((s) => s.y));
                const maxY = Math.max(...surfs.map((s) => s.y + s.w));
                // Is the cell [x..x+l]×[y..y+w] fully on the carrier's top surface?
                const supported = (x, y, l, w) => {
                    const pts = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.5]];
                    return pts.every(([fx, fy]) => {
                        const px = x + fx * l, py = y + fy * w;
                        return surfs.some((s) =>
                            px >= s.x - 0.5 && px <= s.x + s.l + 0.5 &&
                            py >= s.y - 0.5 && py <= s.y + s.w + 0.5);
                    });
                };
                // Orientation that fits the height and tiles the region densest.
                const orients = this.getAllOrientations(item).filter((o) => o.height <= C.height - z + 0.001);
                let best = null;
                for (const o of orients) {
                    const nx = Math.floor((maxX - minX + 0.001) / o.length);
                    const ny = Math.floor((maxY - minY + 0.001) / o.width);
                    if (nx >= 1 && ny >= 1 && (!best || nx * ny > best.nx * best.ny)) best = { o, nx, ny };
                }
                if (!best) continue;
                const { o, nx, ny } = best;
                for (let ix = 0; ix < nx && remaining > 0; ix++) {
                    for (let iy = 0; iy < ny && remaining > 0; iy++) {
                        const px = minX + ix * o.length, py = minY + iy * o.width;
                        if (!supported(px, py, o.length, o.width)) continue;
                        // Collision guard: never overlap an existing item (e.g. a
                        // taller neighbouring block whose edge falls inside this
                        // carrier's bounding box).
                        const collides = this.placedItems.some((q) =>
                            px < q.position.x + q.dimensions.length - 0.01 && px + o.length > q.position.x + 0.01 &&
                            py < q.position.y + q.dimensions.width - 0.01 && py + o.width > q.position.y + 0.01 &&
                            z < q.position.z + q.dimensions.height - 0.01 && z + o.height > q.position.z + 0.01);
                        if (collides) continue;
                        if (item.weight > 0 && this.currentWeight + item.weight > C.maxWeight) { remaining = 0; break; }
                        this.placedItems.push({
                            ...item,
                            position: { x: px, y: py, z },
                            dimensions: { length: o.length, width: o.width, height: o.height },
                            rotation: o.rotation,
                        });
                        this.currentWeight += item.weight;
                        placedPerItem[item.id] = (placedPerItem[item.id] || 0) + 1;
                        remaining--;
                    }
                }
            }

            // NOTE: no rear-floor fallback. Overflow that cannot cap a carrier
            // top stays unplaced — starting a separate rear floor block would
            // SPLIT the product (a contiguous block at the front plus a marooned
            // block at the rear) and re-introduce the gaps the user rejected.
            // Genuine overflow is reported as "did not fit" instead.
        }
    }

    /**
     * EXTREME-POINT 3D PACKER (deepest-bottom-left-fill with gap filling).
     *
     * A more global heuristic than the block loader: it places the biggest
     * pieces first and slots smaller ones into the gaps between and on top of
     * them, trying every allowed orientation, and always choosing the deepest-
     * bottom-left feasible spot — which compacts the load toward the front and
     * fills holes instead of leaving them (the EasyCargo-style behaviour).
     *
     * Hard rules enforced for every placement: inside the deck, no overlap,
     * fully supported (floor or box tops — never floating), weight cap, and the
     * stacking model (none = floor only; self = only its own kind above/below;
     * carrier bears others; topper rides others but nothing rests on it; full =
     * both ways). Returns null if nothing could be placed.
     */
    /**
     * Deterministic pseudo-random rank for a product id under a fixed seed.
     * Used to generate reproducible "shuffled" multi-start orderings — no
     * Math.random so identical inputs always pack identically.
     */
    _orderHash(id, seedVal) {
        let h = seedVal | 0;
        const s = String(id);
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }

    _packExtreme(secondaryKey, seed = null) {
        const C = this.container;
        // Expand to units; skip products that physically cannot fit at all.
        // With a SEED (an existing placement, e.g. the block loader's result)
        // only the still-unplaced remainder is expanded — the pass then TOPS UP
        // the seed by slotting leftovers into its gaps, so the vehicle is filled
        // completely before anything is reported as "did not fit".
        const fits = (it) => this.getAllOrientations(it).some(
            (o) => o.length <= C.length && o.width <= C.width && o.height <= C.height);
        const units = [];
        for (const it of this.items) {
            if (!fits(it)) continue;
            const already = seed ? (seed.perItem[it.id] || 0) : 0;
            const remaining = (it.quantity || 0) - already;
            for (let i = 0; i < remaining; i++) units.push(it);
        }
        if (!units.length) return null;
        // Guard: this per-unit search is O(units · points · placed); for very
        // large counts fall back to the block loader (return null). Uniform
        // mega-loads are exactly where the block grid is already optimal, so
        // skipping EP there costs nothing and keeps calculations snappy.
        if (units.length > 1200) return null;

        // Order: carriers (base) first, toppers last; within that, by the given
        // secondary key (descending) so the chosen "big first" criterion anchors
        // the load and small pieces fill the gaps. pack() tries several keys and
        // keeps the best result (multi-start search).
        const role = (it) => (it.isCarrier ? 0 : it.goesOnTop ? 2 : 1);
        const key = secondaryKey || ((it) => it.length * it.width); // default: footprint
        units.sort((a, b) => {
            if (role(a) !== role(b)) return role(a) - role(b);
            const ka = key(a), kb = key(b);
            if (kb !== ka) return kb - ka;
            return String(a.id).localeCompare(String(b.id));
        });

        const placed = seed ? seed.placed.map((p) => ({ ...p })) : [];
        const perItem = {};
        for (const it of this.items) perItem[it.id] = seed ? (seed.perItem[it.id] || 0) : 0;
        let weight = seed ? seed.weight : 0;
        let points = [{ x: 0, y: 0, z: 0 }];
        // Seed candidate points from every existing box's exposed corners so
        // leftovers can drop into the gaps between and on top of them.
        if (seed) {
            for (const q of placed) {
                const qx = q.position.x, qy = q.position.y, qz = q.position.z;
                const ql = q.dimensions.length, qw = q.dimensions.width, qh = q.dimensions.height;
                points.push({ x: qx + ql, y: qy, z: qz });
                points.push({ x: qx, y: qy + qw, z: qz });
                points.push({ x: qx, y: qy, z: qz + qh });
                points.push({ x: qx + ql, y: qy + qw, z: qz });
                points.push({ x: qx + ql, y: qy, z: qz + qh });
                points.push({ x: qx, y: qy + qw, z: qz + qh });
            }
            const seen = new Set();
            points = points.filter((p) => {
                const k = Math.round(p.x) + '|' + Math.round(p.y) + '|' + Math.round(p.z);
                if (seen.has(k)) return false; seen.add(k);
                return !placed.some((b) =>
                    p.x > b.position.x + 0.01 && p.x < b.position.x + b.dimensions.length - 0.01 &&
                    p.y > b.position.y + 0.01 && p.y < b.position.y + b.dimensions.width - 0.01 &&
                    p.z > b.position.z + 0.01 && p.z < b.position.z + b.dimensions.height - 0.01);
            });
        }

        const collides = (x, y, z, l, w, h) => placed.some((q) =>
            x < q.position.x + q.dimensions.length - 0.01 && x + l > q.position.x + 0.01 &&
            y < q.position.y + q.dimensions.width - 0.01 && y + w > q.position.y + 0.01 &&
            z < q.position.z + q.dimensions.height - 0.01 && z + h > q.position.z + 0.01);

        // Boxes whose TOP is exactly at z and overlap the [x..x+l]×[y..y+w] base.
        const supportersOf = (x, y, z, l, w) => placed.filter((q) =>
            Math.abs(q.position.z + q.dimensions.height - z) < 0.5 &&
            Math.min(x + l, q.position.x + q.dimensions.length) - Math.max(x, q.position.x) > 0.01 &&
            Math.min(y + w, q.position.y + q.dimensions.width) - Math.max(y, q.position.y) > 0.01);

        const supportFrac = (x, y, z, l, w, sup) => {
            if (z < 0.5) return 1; // floor
            let area = 0;
            for (const q of sup) {
                const ox = Math.min(x + l, q.position.x + q.dimensions.length) - Math.max(x, q.position.x);
                const oy = Math.min(y + w, q.position.y + q.dimensions.width) - Math.max(y, q.position.y);
                area += Math.max(0, ox) * Math.max(0, oy);
            }
            return area / (l * w);
        };

        const feasible = (it, x, y, z, o) => {
            const { length: l, width: w, height: h } = o;
            if (x + l > C.length + 0.01 || y + w > C.width + 0.01 || z + h > C.height + 0.01) return false;
            if (it.weight > 0 && weight + it.weight > C.maxWeight) return false;
            if (collides(x, y, z, l, w, h)) return false;
            if (z < 0.5) {
                return true; // on the floor — always allowed
            }
            // On top of something: must be fully supported and obey stack rules.
            if (it.stackMode === 'none') return false; // never rides
            const sup = supportersOf(x, y, z, l, w);
            if (!sup.length) return false;
            if (supportFrac(x, y, z, l, w, sup) < 0.92) return false;
            const allSame = sup.every((s) => s.id === it.id);
            const selfOK = allSame && it.selfStack;                       // same product on itself
            const crossOK = it.canGoOnOther && sup.every((s) => s.canBearOther); // rides carriers/full
            return selfOK || crossOK;
        };

        for (const it of units) {
            const orients = this.getAllOrientations(it).filter(
                (o) => o.length <= C.length && o.width <= C.width && o.height <= C.height);
            // First-fit deepest-bottom-left: front (x) first, then low (z), then
            // side (y) — compacts the load toward the front (minimises loading
            // metres). The rich extreme-point set (below) provides candidate
            // spots inside the gaps so they get filled rather than left as holes.
            points.sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
            // ORIENTATION PERMISSION, not obligation, applied PER POINT: at the
            // deepest-bottom-left feasible spot the ENTERED (upright) orientation
            // is preferred; the allowed rotations/tips are used when upright does
            // not fit THERE (tight gap) — so rotation serves fitting, and a box
            // is never turned when upright works at the same spot. (Grid-level
            // capacity gains from rotation are handled by the block loader's
            // density-driven planFor, and the best overall result wins.)
            const enteredFits = it.length <= C.length && it.width <= C.width && it.height <= C.height;
            const upright = enteredFits ? { length: it.length, width: it.width, height: it.height, rotation: 0 } : null;
            let best = null;
            for (const p of points) {
                if (upright && feasible(it, p.x, p.y, p.z, upright)) { best = { x: p.x, y: p.y, z: p.z, o: upright }; break; }
                let bo = null;
                for (const o of orients) {
                    if (o.rotation === 0) continue; // upright already tried
                    if (!feasible(it, p.x, p.y, p.z, o)) continue;
                    const base = o.length * o.width;
                    if (!bo || base > bo.length * bo.width ||
                        (base === bo.length * bo.width && o.height < bo.height)) bo = o;
                }
                if (bo) { best = { x: p.x, y: p.y, z: p.z, o: bo }; break; }
            }
            if (!best) continue; // this unit does not fit anywhere
            placed.push({
                ...it,
                position: { x: best.x, y: best.y, z: best.z },
                dimensions: { length: best.o.length, width: best.o.width, height: best.o.height },
                rotation: best.o.rotation,
            });
            weight += it.weight;
            perItem[it.id]++;
            // New extreme points at the box's exposed corners (floor-level
            // adjacents + tops), so later boxes have candidate spots to fill the
            // gaps around and on this one.
            const nx = best.x + best.o.length, ny = best.y + best.o.width, nz = best.z + best.o.height;
            points.push({ x: nx, y: best.y, z: best.z });
            points.push({ x: best.x, y: ny, z: best.z });
            points.push({ x: best.x, y: best.y, z: nz });
            points.push({ x: nx, y: ny, z: best.z });
            points.push({ x: nx, y: best.y, z: nz });
            points.push({ x: best.x, y: ny, z: nz });
            // Drop points that now sit inside a box, and de-duplicate, to keep
            // the candidate list small and fast.
            const seen = new Set();
            points = points.filter((q) => {
                const k = Math.round(q.x) + '|' + Math.round(q.y) + '|' + Math.round(q.z);
                if (seen.has(k)) return false; seen.add(k);
                return !placed.some((b) =>
                    q.x > b.position.x + 0.01 && q.x < b.position.x + b.dimensions.length - 0.01 &&
                    q.y > b.position.y + 0.01 && q.y < b.position.y + b.dimensions.width - 0.01 &&
                    q.z > b.position.z + 0.01 && q.z < b.position.z + b.dimensions.height - 0.01);
            });
        }

        return {
            placed,
            perItem,
            weight,
            count: placed.length,
            usedLen: Math.max(0, ...placed.map((p) => p.position.x + p.dimensions.length), 0),
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
        const seen = new Set();
        const add = (l, w, h, rotation) => {
            const k = l + 'x' + w + 'x' + h;
            if (!seen.has(k)) { seen.add(k); orientations.push({ length: l, width: w, height: h, rotation }); }
        };
        // Orientation 0: Original (upright, on its given base).
        add(item.length, item.width, item.height, 0);

        if (item.allowTip) {
            // TIPPING ALLOWED (per product): the box may rest on ANY face, so all
            // six axis-aligned orientations are valid. This lets a carton lie on
            // its side to fit more across the deck width / height. Off by default
            // (pallets should not be tipped) — enabled with the product's
            // "can be laid on its side" toggle.
            const d = [item.length, item.width, item.height];
            add(d[0], d[1], d[2], 0);
            add(d[1], d[0], d[2], 1);
            add(d[0], d[2], d[1], 2);
            add(d[2], d[1], d[0], 3);
            add(d[1], d[2], d[0], 4);
            add(d[2], d[0], d[1], 5);
        } else if (item.allowRotation) {
            // Rotation only: spin on the floor (Z-axis), height unchanged.
            add(item.width, item.length, item.height, 1);
        }

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
