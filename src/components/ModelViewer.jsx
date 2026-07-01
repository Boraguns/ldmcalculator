/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/no-unknown-property */
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useT } from '../i18n/LanguageContext';

/* ============================================================
   Per-box printed labels (like EasyCargo3D): each cargo box gets
   its product name/number printed on its faces via a CanvasTexture.
   Textures are cached per (color + label) so hundreds of boxes that
   share a product reuse a single GPU texture.
   ============================================================ */
const _labelTexCache = new Map();

const _wrapLines = (ctx, text, maxW) => {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur);
            cur = word;
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);
    return lines;
};

const _roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

// Build a label texture whose CANVAS aspect ratio matches the target face's
// aspect ratio. Mapping an aspect-matched canvas onto the face means the text
// is NOT stretched — it keeps a fixed proportion on every face regardless of
// how long/short that face is.
const makeLabelTexture = (label, color, aspect = 1) => {
    const text = String(label || '').trim();
    const aKey = Math.round(aspect * 10) / 10;
    const key = `${color || '#3b82f6'}|${text}|${aKey}`;
    if (_labelTexCache.has(key)) return _labelTexCache.get(key);

    const BASE = 256;
    let cw, ch;
    if (aspect >= 1) { cw = BASE; ch = Math.max(40, Math.round(BASE / aspect)); }
    else { ch = BASE; cw = Math.max(40, Math.round(BASE * aspect)); }

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    // Box surface = the product colour, with a faint inner border so the
    // face reads as a real crate panel rather than a flat plane.
    ctx.fillStyle = color || '#3b82f6';
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, cw - 8, ch - 8);

    if (text) {
        const padX = 14, padY = 8;
        const maxW = cw - padX * 2;
        const maxH = ch - padY * 2;
        // Font size scales with face height (so it stays proportional), then
        // we wrap to fit the width.
        let fontSize = Math.min(Math.round(ch * 0.42), 56);
        let lines = [];
        for (; fontSize >= 10; fontSize -= 2) {
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            lines = _wrapLines(ctx, text, maxW);
            const totalH = lines.length * fontSize * 1.15;
            if (totalH <= maxH) break;
        }
        const lineH = fontSize * 1.15;
        const blockH = lines.length * lineH;
        const blockW = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)));

        // Dark "label sticker" plate behind the text → readable on any colour.
        const pw = blockW + 18;
        const ph = blockH + 12;
        const px = (cw - pw) / 2;
        const py = (ch - ph) / 2;
        ctx.fillStyle = 'rgba(15,23,42,0.64)';
        _roundRect(ctx, px, py, pw, ph, Math.min(12, ph / 2));
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((l, i) => {
            const y = ch / 2 - blockH / 2 + lineH * (i + 0.5);
            ctx.fillText(l, cw / 2, y);
        });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    _labelTexCache.set(key, tex);
    return tex;
};

// Cache of the 6-material arrays (one per box face) keyed by colour+label+
// size+highlight-mode, so boxes that share a product/size reuse the same
// materials and we don't rebuild them on every hover re-render.
const _labelMatCache = new Map();

const getBoxMaterials = (label, color, w, h, d, mode) => {
    const r = (n) => Math.round(n * 100) / 100;
    const key = `${color}|${label}|${r(w)}|${r(h)}|${r(d)}|${mode}`;
    if (_labelMatCache.has(key)) return _labelMatCache.get(key);

    const emissive = mode === 'stanga' ? '#fbbf24' : (mode === 'spanzet' ? '#a855f7' : '#000000');
    const emissiveIntensity = mode === 'normal' ? 0 : 0.15;
    const mk = (aspect) => new THREE.MeshStandardMaterial({
        map: makeLabelTexture(label, color, aspect),
        color: 0xffffff,
        roughness: 0.45,
        metalness: 0.1,
        emissive: new THREE.Color(emissive),
        emissiveIntensity
    });
    // BoxGeometry face/material order: [+X, -X, +Y, -Y, +Z, -Z].
    // Face spans → aspect = faceWidth / faceHeight:
    //   ±X faces: width=depth(d), height=height(h)
    //   ±Y faces: width=length(w), height=depth(d)   (top / bottom)
    //   ±Z faces: width=length(w), height=height(h)
    const mX = mk(d / h);
    const mY = mk(w / d);
    const mZ = mk(w / h);
    const arr = [mX, mX, mY, mY, mZ, mZ];
    _labelMatCache.set(key, arr);
    return arr;
};

const Loader = () => {
    const { progress, active } = useProgress();
    if (!active) return null;
    return (
        <Html center>
            <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
                {Math.round(progress)} %
            </div>
        </Html>
    );
};

const CameraController = ({ viewMode, onUserInteraction }) => {
    const { camera } = useThree();
    const controlsRef = useRef();
    const [isAnimating, setIsAnimating] = useState(false);

    const targets = useRef({
        position: new THREE.Vector3(12, 12, 15),
        lookAt: new THREE.Vector3(0, 0, 0)
    });

    useEffect(() => {
        if (!viewMode) return;

        let pos = [12, 12, 15]; // Default ISO

        switch (viewMode) {
            case 'top': pos = [0, 25, 0]; break;
            case 'side': pos = [0, 2, 25]; break;
            case 'front': pos = [-25, 4, 0]; break;
            case 'back': pos = [25, 4, 0]; break;
            case 'iso':
            default: pos = [12, 12, 15]; break;
        }

        if (pos[0] === 0 && pos[2] === 0) pos[2] = 0.01;
        targets.current.position.set(...pos);
        setIsAnimating(true);
    }, [viewMode]);

    useFrame((state, delta) => {
        if (isAnimating) {
            camera.position.lerp(targets.current.position, delta * 5);

            // Check if lerp is close enough to stop animation and let controller take over
            if (camera.position.distanceTo(targets.current.position) < 0.1) {
                setIsAnimating(false);
            }
        }

        if (controlsRef.current) {
            controlsRef.current.update();
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            minDistance={3}
            maxDistance={70}
            // Never let the camera drop below horizontal (under the floor),
            // where the view goes black and the truck is no longer visible.
            // Top-down (0) stays allowed for the "Üst Bakış" preset.
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.04}
            enableDamping
            dampingFactor={0.1}
            // Zoom toward the mouse pointer instead of always recentring on the
            // scene origin — gives finer, more intuitive control of the truck.
            zoomToCursor
            zoomSpeed={1.1}
            // Allow user to take over
            onStart={() => {
                setIsAnimating(false);
                if (onUserInteraction) onUserInteraction();
            }}
        />
    );
};

import { useGLTF, useTexture } from '@react-three/drei';

// Kick off fetching the heavy truck + wheel meshes as soon as this module is
// evaluated (ModelViewer is part of the main bundle). The downloads then
// overlap with the time the user spends entering products in the wizard, so by
// the time results are shown the GLBs are usually already cached.
useGLTF.preload('/src/truck.glb');
useGLTF.preload('/src/rear-wheel.glb');

/**
 * Decorative banner (branda) hanging on the back wall around the flag grid.
 * Just a textured plane with a thin dark backing to keep the edges crisp
 * and avoid z-fighting with the wall.
 */
const Banner = ({ url, position, size }) => {
    const texture = useTexture(url);
    const [w, h] = size;
    return (
        <group position={position}>
            {/* Dark backing slightly larger than the print so the banner reads
                as a printed canvas with a small bezel. */}
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[w + 0.08, h + 0.08, 0.06]} />
                <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
            {/* Printed surface */}
            <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                    transparent={false}
                    depthWrite={true}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                />
            </mesh>
        </group>
    );
};

const CountryFlag = ({ code, position, onClick }) => {
    // Load texture with loose cors policy
    const texture = useTexture(`https://flagcdn.com/w640/${code}.png`);
    return (
        <group
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onClick(code);
            }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
        >
            {/* Frame (behind the flag, clearly separated to prevent z-fighting) */}
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[2.5, 1.7, 0.08]} />
                <meshStandardMaterial color="#111" roughness={0.6} />
            </mesh>
            {/* Flag plane — opaque, immune to lighting, polygonOffset keeps it crisp */}
            <mesh position={[0, 0, 0.05]}>
                <planeGeometry args={[2.4, 1.6]} />
                <meshBasicMaterial
                    map={texture}
                    toneMapped={false}
                    transparent={false}
                    depthWrite={true}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                />
            </mesh>
        </group>
    );
};

const GLBWheelPrototypeInstances = ({ targets = [], glbPath = '/src/rear-wheel.glb', prefer = 'rear' }) => {
    // Extract wheel-like meshes from a wheel-specific GLB and reuse them for each wheel position.
    // `prefer` tries to pick rear wheels out of a multi-wheel export (fallback to all wheel meshes).
    const { scene } = useGLTF(glbPath);

    const proto = useMemo(() => {
        const rotMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
        const groupQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

        const normalized = scene.clone(true);

        // Scale based on approximate wheel diameter, not model height (wheel-only GLB exports).
        // Our legacy fallback cylinders use radius ~0.45 => diameter ~0.9.
        const targetWheelDiameter = 0.9;

        // 1) Prefer wheel-like meshes by name in the whole hierarchy.
        // Exports sometimes use non-English tokens (e.g. Spanish "Llantas_delantera_*").
        const allMeshes = [];
        normalized.traverse((obj) => {
            if (obj.isMesh) allMeshes.push(obj);
        });

        const hierarchyText = (obj) => {
            let cur = obj;
            const parts = [];
            while (cur) {
                parts.push((cur.name || '').toLowerCase());
                cur = cur.parent;
            }
            return parts.join(' ');
        };

        const hasWheelInHierarchy = (obj) => {
            const t = hierarchyText(obj);
            // English + Spanish tokens
            return (
                /wheel|tire|tyre|rim/.test(t) ||
                /llanta|llantas|rueda/.test(t)
            );
        };

        const matchesFrontWheelInHierarchy = (obj) => {
            const t = hierarchyText(obj);
            // Front wheel tokens: "delantera" means "front" in Spanish.
            return (
                /delantera/.test(t) ||
                /front/.test(t)
            );
        };

        const matchesRearWheelInHierarchy = (obj) => {
            const t = hierarchyText(obj);
            // Rear wheel tokens: "trasera" means "rear" in Spanish.
            return (
                /trasera/.test(t) ||
                /trasero/.test(t) ||
                /rear/.test(t) ||
                /back/.test(t)
            );
        };

        // First select all wheel-like meshes, then prefer subset (rear/front) when possible.
        let wheelLikeMeshes = allMeshes.filter(hasWheelInHierarchy);
        const rearWheelMeshes = wheelLikeMeshes.filter(matchesRearWheelInHierarchy);
        const frontWheelMeshes = wheelLikeMeshes.filter(matchesFrontWheelInHierarchy);

        let candidateMeshes = wheelLikeMeshes;
        if (prefer === 'rear' && rearWheelMeshes.length > 0) candidateMeshes = rearWheelMeshes;
        if (prefer === 'front' && frontWheelMeshes.length > 0) candidateMeshes = frontWheelMeshes;
        

        // 2) Fallback heuristic: use bounding-box shape (thin disk-ish parts at the bottom).
        // This is intentionally conservative to avoid picking cargo/body parts.
        if (candidateMeshes.length === 0) {
            const tmpPos = new THREE.Vector3();
            let minY = Infinity;
            let maxY = -Infinity;

            // First pass: min/max Y across the model for "bottom" detection
            for (const mesh of allMeshes) {
                mesh.getWorldPosition(tmpPos);
                minY = Math.min(minY, tmpPos.y);
                maxY = Math.max(maxY, tmpPos.y);
            }

            const yRange = Math.max(1e-6, maxY - minY);
            const tmpBox = new THREE.Box3();
            const size = new THREE.Vector3();

            candidateMeshes = [];
            for (const mesh of allMeshes) {
                // Compute approximate world size for this mesh
                tmpBox.setFromObject(mesh);
                tmpBox.getSize(size);

                const maxXZ = Math.max(size.x, size.z);
                const thicknessRatio = size.y / (maxXZ || 1);
                mesh.getWorldPosition(tmpPos);
                const yNorm = (tmpPos.y - minY) / yRange; // 0 => bottom

                const wheelLike =
                    maxXZ > 0.12 &&
                    thicknessRatio < 0.35 &&
                    yNorm < 0.6;

                if (wheelLike) candidateMeshes.push(mesh);
            }
        }

        if (candidateMeshes.length === 0) return null;

        // Cluster by quantized X/Z (scene-space) so a "wheel assembly" is grouped.
        const clusters = new Map();
        const tmpV = new THREE.Vector3();

        for (const mesh of candidateMeshes) {
            mesh.getWorldPosition(tmpV);
            const scenePos = tmpV.clone().applyMatrix4(rotMatrix);
            const key = `${Math.round(scenePos.x * 10) / 10}|${Math.round(scenePos.z * 10) / 10}`;
            if (!clusters.has(key)) clusters.set(key, []);
            clusters.get(key).push(mesh);
        }

        if (clusters.size === 0) return null;

        // Choose the densest cluster as the prototype.
        let bestKey = null;
        let bestCount = -1;
        for (const [key, meshes] of clusters.entries()) {
            if (meshes.length > bestCount) {
                bestKey = key;
                bestCount = meshes.length;
            }
        }

        const bestMeshes = clusters.get(bestKey) || [];
        if (bestMeshes.length === 0) return null;

        // Apply wheel-only scaling so the visible diameter matches the legacy wheel size.
        // This keeps wheel scale consistent regardless of what the GLB exporter used as its model height.
        const tmpBox = new THREE.Box3();
        const tmpSize = new THREE.Vector3();
        tmpBox.makeEmpty();
        for (const mesh of bestMeshes) {
            const box = new THREE.Box3().setFromObject(mesh);
            tmpBox.union(box);
        }
        tmpBox.getSize(tmpSize);
        const currentDiameter = Math.max(tmpSize.x, tmpSize.z) || 1;
        const scale = targetWheelDiameter / currentDiameter;
        normalized.scale.setScalar(scale);
        normalized.updateMatrixWorld(true);

        const tmpQ = new THREE.Quaternion();
        const tmpS = new THREE.Vector3();
        const tmpCenter = new THREE.Vector3(0, 0, 0);

        const parts = bestMeshes.map((mesh) => {
            mesh.getWorldPosition(tmpV);
            const scenePos = tmpV.clone().applyMatrix4(rotMatrix);
            mesh.getWorldQuaternion(tmpQ);
            mesh.getWorldScale(tmpS);

            // After we remove the group rotation, we bake it into each part.
            const sceneQuat = groupQuat.clone().multiply(tmpQ);
            const worldScale = tmpS.clone();

            tmpCenter.add(scenePos);
            return {
                geometry: mesh.geometry,
                material: mesh.material,
                scenePos,
                sceneQuat,
                worldScale
            };
        });

        tmpCenter.multiplyScalar(1 / Math.max(1, parts.length));

        return { parts, center: tmpCenter };
    }, [scene, prefer]);

    // Fallback: if we couldn't detect wheel meshes from the GLB,
    // render the previous simple cylinder wheels to avoid disappearing wheels.
    if (!proto) {
        return (
            <group>
                {targets.map((t, idx) => {
                    const pos = Array.isArray(t) ? t : [t.x, t.y, t.z];
                    return (
                        <group key={idx} position={pos} rotation={[Math.PI / 2, 0, 0]}>
                            <mesh castShadow>
                                <cylinderGeometry args={[0.45, 0.45, 0.3, 32]} />
                                <meshStandardMaterial color="#111" roughness={0.8} />
                            </mesh>
                            <mesh position={[0, 0.15, 0]}>
                                <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
                                <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
                            </mesh>
                        </group>
                    );
                })}
            </group>
        );
    }
    if (!targets || targets.length === 0) return null;

    return (
        <group>
            {targets.map((t, idx) => {
                const targetPos = Array.isArray(t) ? t : [t.x, t.y, t.z];
                const offset = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]).sub(proto.center);

                return (
                    <group key={idx}>
                        {proto.parts.map((p, pIdx) => (
                            <mesh
                                // Wheel meshes may share geometry/material references; keys still required.
                                key={pIdx}
                                geometry={p.geometry}
                                material={p.material}
                                position={[p.scenePos.x + offset.x, p.scenePos.y + offset.y, p.scenePos.z + offset.z]}
                                quaternion={p.sceneQuat}
                                scale={[p.worldScale.x, p.worldScale.y, p.worldScale.z]}
                                castShadow
                            />
                        ))}
                    </group>
                );
            })}
        </group>
    );
};

const GLBWheelAssembly = ({ targets = [], glbPath = '/src/rear-wheel.glb' }) => {
    // Render individual wheel instances at each target position.
    // Each target gets its own clone of the GLB scene, properly scaled and positioned.
    const { scene } = useGLTF(glbPath);

    // Pre-process: compute bounding box, scale factor, and normalized clone data once.
    const wheelData = useMemo(() => {
        const normalized = scene.clone(true);

        // Rotate into our truck orientation (truck faces along X axis).
        normalized.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
        normalized.updateMatrixWorld(true);

        // Keep the GLB's OWN materials/textures (rim + tyre detail) — forcing
        // everything to #111 with the map stripped made the wheels read as
        // solid black blobs. Only tame extreme glossiness so they sit well in
        // the warehouse lighting.
        normalized.traverse((obj) => {
            if (!obj.isMesh) return;
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const mat of materials) {
                if (!mat) continue;
                if ('roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.5, 0.45);
                mat.needsUpdate = true;
            }
        });

        // Calculate bounding box for scaling
        const box = new THREE.Box3().setFromObject(normalized);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Target wheel diameter ~1.15m — big enough that the tyre top tucks
        // under the trailer body instead of leaving a visible air gap between
        // wheel and chassis (matches the cabin GLB's front wheels).
        const targetDiameter = 1.15;
        // The wheel's visual diameter is max of X and Y after rotation
        const currentDiameter = Math.max(size.x, size.y) || 1;
        const scale = targetDiameter / currentDiameter;

        return { normalized, box, size, center, scale, radius: targetDiameter / 2 };
    }, [scene]);

    if (!targets || targets.length === 0) return null;

    return (
        <group>
            {targets.map((t, idx) => {
                const pos = Array.isArray(t) ? t : [t.x, t.y, t.z];
                const clone = wheelData.normalized.clone(true);

                // Determine if this is a right-side wheel (negative Z = right side of truck)
                // If so, mirror on Z axis to create the opposite side wheel
                const isRightSide = pos[2] < 0;

                return (
                    <group
                        key={idx}
                        /* Lift by the wheel RADIUS so the tyre bottom stays at the
                           target's ground level regardless of diameter — growing
                           the wheel closes the gap upward (into the chassis),
                           not downward (through the floor). */
                        position={[pos[0], pos[1] + wheelData.radius, pos[2]]}
                        scale={[
                            wheelData.scale,
                            wheelData.scale,
                            isRightSide ? -wheelData.scale : wheelData.scale
                        ]}
                    >
                        {/* Recentre the GLB on its bounding-box centre so the
                            wheel truly spins/sits around the group origin —
                            without this the model's arbitrary origin left the
                            wheels hovering above the ground. */}
                        <group position={[-wheelData.center.x, -wheelData.center.y, -wheelData.center.z]}>
                            <primitive object={clone} />
                        </group>
                    </group>
                );
            })}
        </group>
    );
};

const TruckCabinModel = ({ position }) => {
    const { scene } = useGLTF('/src/truck.glb');
    
    // Deep clone and pre-calculate bounding box/scaling exactly once
    const truckData = useMemo(() => {
        const normalized = scene.clone(true);
        
        // Ensure PBR materials map correctly
        normalized.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                // Remove specular/glossiness limitations if any, 
                // force them into standard material if they got corrupted
                if (obj.material.type === 'MeshStandardMaterial') {
                    obj.material.needsUpdate = true;
                }
            }
        });

        const box = new THREE.Box3().setFromObject(normalized);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Typical truck cabin is about 3.0m tall
        const targetHeight = 3.0; 
        const currentHeight = size.y || 1;
        const scale = targetHeight / currentHeight;

        return { normalized, center, scale };
    }, [scene]);

    return (
        <group position={position} rotation={[0, Math.PI / 2, 0]}>
            <group scale={[truckData.scale, truckData.scale, truckData.scale]}>
                <group position={[-truckData.center.x, -truckData.center.y, -truckData.center.z]}>
                    <primitive object={truckData.normalized} />
                </group>
            </group>
        </group>
    );
};


/* Reusable small components for warehouse props */
const WarehouseContainer = ({ position, size = [2.4, 2.6, 6], color = '#2563eb' }) => (
    <group position={position}>
        {/* Main container body */}
        <mesh castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Corrugation ridges (horizontal lines) */}
        {[...Array(5)].map((_, i) => (
            <mesh key={i} position={[0, -size[1] / 2 + 0.4 + i * (size[1] / 6), size[2] / 2 + 0.01]}>
                <boxGeometry args={[size[0] - 0.1, 0.05, 0.02]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
            </mesh>
        ))}
        {/* Side ridges */}
        {[...Array(5)].map((_, i) => (
            <mesh key={`s${i}`} position={[size[0] / 2 + 0.01, -size[1] / 2 + 0.4 + i * (size[1] / 6), 0]}>
                <boxGeometry args={[0.02, 0.05, size[2] - 0.1]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
            </mesh>
        ))}
        {/* Container door bars (front face) */}
        <mesh position={[0, 0, -size[2] / 2 - 0.02]}>
            <boxGeometry args={[0.08, size[1] - 0.2, 0.04]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Door handle */}
        <mesh position={[0.15, -0.2, -size[2] / 2 - 0.04]}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.9} />
        </mesh>
    </group>
);

const PalletStack = ({ position, boxColor = '#c2884a', count = 3, boxSize = [1.2, 0.8, 1.0] }) => (
    <group position={position}>
        {/* Wooden pallet base */}
        <mesh position={[0, 0.075, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.15, 1.0]} />
            <meshStandardMaterial color="#8B7355" roughness={0.9} metalness={0} />
        </mesh>
        {/* Pallet slats */}
        {[-0.4, 0, 0.4].map((z, i) => (
            <mesh key={i} position={[0, -0.01, z]}>
                <boxGeometry args={[1.2, 0.04, 0.12]} />
                <meshStandardMaterial color="#6d5a3a" roughness={0.95} />
            </mesh>
        ))}
        {/* Stacked boxes on the pallet */}
        {[...Array(count)].map((_, i) => (
            <mesh key={`b${i}`} position={[0, 0.15 + 0.4 + i * (boxSize[1] + 0.02), 0]} castShadow>
                <boxGeometry args={boxSize} />
                <meshStandardMaterial color={boxColor} roughness={0.7} metalness={0.05} />
            </mesh>
        ))}
        {/* Stretch wrap effect (translucent) for top boxes */}
        {count > 2 && (
            <mesh position={[0, 0.15 + 0.4 + (count - 1) * (boxSize[1] + 0.02) / 2 + 0.2, 0]}>
                <boxGeometry args={[boxSize[0] + 0.02, count * (boxSize[1] + 0.02), boxSize[2] + 0.02]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.1} />
            </mesh>
        )}
    </group>
);

const SteelBeam = ({ position, size = [0.3, 0.3, 30], color = '#374151' }) => (
    <mesh position={position} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
);

const WarehouseEnvironment = ({ floorY, showFlags = true, onFlagClick, bannerUrls = {} }) => {
    const containerColors = ['#1e40af', '#15803d', '#b91c1c', '#854d0e', '#4338ca', '#0f766e', '#9f1239', '#1d4ed8'];
    const boxColors = ['#c2884a', '#a3855a', '#d4a574', '#b8956a', '#8B7355', '#c49a6c'];

    return (
        <group position={[0, floorY, 0]}>
            {/* ============= FLOORING ============= */}

            {/* Polished grey concrete warehouse floor. The truck is parked
                INSIDE a depot bay, so this is concrete — not an asphalt road. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[200, 120]} />
                <meshStandardMaterial color="#a3a8af" roughness={0.8} metalness={0.04} />
            </mesh>

            {/* Yellow forklift-lane / bay marking lines on the concrete */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4.2]}>
                <planeGeometry args={[200, 0.25]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -4.2]}>
                <planeGeometry args={[200, 0.25]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>

            {/* ============= WALLS ============= */}

            {/* End Walls — close the long ends so looking down the truck's
                direction hits a wall instead of an open, glaring foggy horizon.
                Single solid concrete slab, shifted FORWARD so it never overlaps
                the back wall's volume (the overlap was the source of the
                z-fighting shimmer). No coplanar detail meshes either. */}
            {[-60, 60].map((x, i) => (
                <mesh key={`endwall${i}`} position={[x, 15, 2]} receiveShadow>
                    <boxGeometry args={[1.2, 30, 42]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.85} metalness={0.05} />
                </mesh>
            ))}

            {/* Back Wall - Main Visible Wall (Concrete Panels) */}
            <group position={[0, 0, -20]}>
                {/* Base concrete wall */}
                <mesh position={[0, 15, 0]} receiveShadow>
                    <boxGeometry args={[120, 30, 0.8]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.85} metalness={0.05} />
                </mesh>
                {/* Concrete panel lines (horizontal) */}
                {[3, 6, 9, 12, 18, 24].map((y, i) => (
                    <mesh key={`wh${i}`} position={[0, y, 0.42]}>
                        <boxGeometry args={[120, 0.06, 0.02]} />
                        <meshStandardMaterial color="#64748b" roughness={0.7} metalness={0.1} />
                    </mesh>
                ))}
                {/* Concrete panel lines (vertical) */}
                {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((x, i) => (
                    <mesh key={`wv${i}`} position={[x, 15, 0.42]}>
                        <boxGeometry args={[0.06, 30, 0.02]} />
                        <meshStandardMaterial color="#64748b" roughness={0.7} metalness={0.1} />
                    </mesh>
                ))}
                {/* Lower wall kick plate (darker concrete) */}
                <mesh position={[0, 0.75, 0.42]} receiveShadow>
                    <boxGeometry args={[120, 1.5, 0.05]} />
                    <meshStandardMaterial color="#475569" roughness={0.9} />
                </mesh>

                {/* Blue Accent Light Strip (Top of wall) */}
                <mesh position={[0, 28, 0.5]}>
                    <boxGeometry args={[120, 0.4, 0.3]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.5} toneMapped={false} />
                </mesh>

                {/* Warning signs on back wall */}
                {[-45, -25, 25, 45].map((x, i) => (
                    <group key={`sign${i}`} position={[x, 22, 0.5]}>
                        {/* Sign plate */}
                        <mesh>
                            <boxGeometry args={[3, 1.5, 0.08]} />
                            <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.4} />
                        </mesh>
                        {/* Sign text area (white) */}
                        <mesh position={[0, 0, 0.05]}>
                            <planeGeometry args={[2.6, 1.1]} />
                            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
                        </mesh>
                    </group>
                ))}

                {/* Country Flags — raised so warehouse boxes in front don't block them. */}
                {showFlags && (
                    <group position={[0, 6, 0.6]}>
                        {/* ============= BANNERS (Brandalar) =============
                            Three banners decorate the back wall around the flag
                            grid: a tall banner on the left and right (height =
                            5 flag-rows, top edge aligned with the top flag row,
                            with a horizontal gap from the flags), and a wide
                            banner above (width = 6 flag-columns, with a
                            vertical gap from the top flag row). Images are
                            served from /banners/{left,right,top}.jpg. */}
                        {(() => {
                            // Flag-grid metrics matching the loop below.
                            const cols = 6;
                            const rows = 5;
                            const spacingX = 4.0;
                            const spacingY = 1.7;
                            const flagW = 2.4;
                            const flagH = 1.6;
                            const gridHalfW = (cols * spacingX) / 2; // 12
                            const gridHalfH = ((rows - 1) * spacingY) / 2 + flagH / 2; // top edge
                            const sideBannerH = rows * spacingY;     // 8.5 — matches 5 rows
                            const sideBannerW = 2.0;
                            const sideGap = 1.2;
                            const topBannerW = cols * spacingX;      // 24 — matches 6 cols
                            const topBannerH = 1.8;
                            const topGap = 1.0;
                            // Top edge alignment: banner top at gridHalfH (top of top row).
                            const sideCenterY = gridHalfH - sideBannerH / 2;
                            const sideX = gridHalfW + sideGap + sideBannerW / 2;
                            const topCenterY = gridHalfH + topGap + topBannerH / 2;
                            return (
                                <Suspense fallback={null}>
                                    <Banner url={bannerUrls.left  || '/banners/left.jpg'}
                                            position={[-sideX, sideCenterY, 0]}
                                            size={[sideBannerW, sideBannerH]} />
                                    <Banner url={bannerUrls.right || '/banners/right.jpg'}
                                            position={[ sideX, sideCenterY, 0]}
                                            size={[sideBannerW, sideBannerH]} />
                                    <Banner url={bannerUrls.top   || '/banners/top.jpg'}
                                            position={[0, topCenterY, 0]}
                                            size={[topBannerW, topBannerH]} />
                                </Suspense>
                            );
                        })()}
                        {[
                            'tr', 'de', 'fr', 'nl', 'it', 'be',
                            'es', 'gb', 'at', 'ch', 'pl', 'ro',
                            'cz', 'se', 'no', 'dk', 'gr', 'pt',
                            'hu', 'bg', 'cn', 'kz', 'tm', 'uz',
                            'jp', 'kr', 'in', 'id', 'vn', 'th'
                        ].map((code, index) => {
                            const cols = 6;
                            const rows = 5;
                            const col = index % cols;
                            const row = Math.floor(index / cols);

                            const spacingX = 4.0;
                            const spacingY = 1.7;

                            // Center the grid both horizontally and vertically around parent group
                            const startX = -((cols * spacingX) / 2) + (spacingX / 2);
                            const startY = ((rows - 1) * spacingY) / 2;

                            const x = startX + (col * spacingX);
                            const y = startY - (row * spacingY);

                            return (
                                <group key={code} position={[x, y, 0]}>
                                    <CountryFlag
                                        code={code}
                                        position={[0, 0, 0]}
                                        onClick={onFlagClick}
                                    />
                                </group>
                            );
                        })}
                    </group>
                )}
            </group>

            {/* Front Wall (behind camera) */}
            <mesh position={[0, 15, 40]} receiveShadow>
                <boxGeometry args={[120, 30, 0.8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>

            {/* Side Walls with Panels */}
            {[1, -1].map((side) => (
                <group key={`sidewall${side}`} position={[60 * side, 0, 10]}>
                    {/* Main wall */}
                    <mesh position={[0, 15, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                        <boxGeometry args={[60, 30, 0.8]} />
                        <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.05} />
                    </mesh>
                    {/* Wall panel grooves */}
                    {[5, 10, 15, 20, 25].map((y, i) => (
                        <mesh key={`sp${i}`} position={[side * 0.42, y, 0]} rotation={[0, Math.PI / 2, 0]}>
                            <boxGeometry args={[60, 0.05, 0.02]} />
                            <meshStandardMaterial color="#1e293b" roughness={0.6} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* ============= STRUCTURAL STEEL ============= */}

            {/* Vertical Steel Columns along back wall (removed center ones to make room for flags) */}
            {[-50, -35, -20, 25, 40, 55].map((x, i) => (
                <group key={`col${i}`} position={[x, 0, -19.5]}>
                    {/* H-beam column */}
                    <SteelBeam position={[0, 15, 0]} size={[0.4, 30, 0.4]} color="#374151" />
                    {/* Flange */}
                    <SteelBeam position={[0, 15, 0]} size={[0.6, 30, 0.12]} color="#4b5563" />
                </group>
            ))}

            {/* Horizontal Roof Beams (trusses) */}
            {[-40, -20, 0, 20, 40].map((x, i) => (
                <SteelBeam key={`truss${i}`} position={[x, 29, 10]} size={[0.25, 0.4, 60]} color="#374151" />
            ))}

            {/* Cross beams */}
            {[-30, -10, 10, 30].map((x, i) => (
                <SteelBeam key={`cross${i}`} position={[x, 28.5, 10]} size={[20, 0.15, 0.15]} color="#4b5563" />
            ))}

            {/* ============= CEILING ============= */}
            <mesh position={[0, 29.5, 10]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[120, 60]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>

            {/* ============= INDUSTRIAL LIGHTING ============= */}
            {[-30, -10, 10, 30].map((x, i) => (
                <group key={`light${i}`} position={[x, 28, 0]}>
                    {/* Light fixture housing */}
                    <mesh>
                        <boxGeometry args={[3, 0.2, 0.6]} />
                        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
                    </mesh>
                    {/* Light panel (emissive) */}
                    <mesh position={[0, -0.12, 0]}>
                        <boxGeometry args={[2.8, 0.05, 0.45]} />
                        <meshStandardMaterial
                            color="#f8fafc"
                            emissive="#e2e8f0"
                            emissiveIntensity={0.8}
                            toneMapped={false}
                        />
                    </mesh>
                    {/* Actual point light */}
                    <pointLight position={[0, -1, 0]} intensity={0.4} distance={20} decay={2} color="#f1f5f9" />
                </group>
            ))}

            {/* Left side was removed per request */}

            {/* ============= WAREHOUSE STORAGE - RIGHT SIDE (Z < -4) ============= */}
            <group position={[0, 0, -10]}>
                {/* Shipping Containers Row — single tier, shorter so flags above stay fully visible */}
                {[-20, -7, 6, 19, 32, 45].map((x, i) => (
                    <WarehouseContainer
                        key={`cr1_${i}`}
                        position={[x, 1.0, 0]}
                        size={[2.4, 2.0, 5]}
                        color={['#8B7355', '#a3855a', '#c2884a'][i % 3]}
                    />
                ))}

                {/* Pallet stacks */}
                {[-30, -26, -14, -10, 12, 16, 25, 29, 38, 50].map((x, i) => (
                    <PalletStack
                        key={`pr1_${i}`}
                        position={[x, 0, -5]}
                        boxColor={boxColors[(i + 2) % boxColors.length]}
                        count={2 + (i % 3)}
                        boxSize={[1.1 + (i % 2) * 0.2, 0.7 + (i % 3) * 0.15, 0.9]}
                    />
                ))}
            </group>

            {/* ============= FLOOR DETAILS ============= */}

            {/* Floor zone marking rectangles */}
            {[-30, -10, 10, 30].map((x, i) => (
                <group key={`zone${i}`}>
                    {/* Zone box on positive Z side */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, 7]}>
                        <planeGeometry args={[8, 4]} />
                        <meshBasicMaterial color="#1e40af" transparent opacity={0.08} />
                    </mesh>
                    {/* Zone box on negative Z side */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, -7]}>
                        <planeGeometry args={[8, 4]} />
                        <meshBasicMaterial color="#1e40af" transparent opacity={0.08} />
                    </mesh>
                </group>
            ))}

            {/* ============= LOADING DOCK DETAILS ============= */}

            {/* Dock bumpers at back wall */}
            {[-10, 0, 10].map((x, i) => (
                <group key={`dock${i}`} position={[x, 1.5, -19.5]}>
                    {/* Rubber bumper */}
                    <mesh>
                        <boxGeometry args={[0.8, 1.2, 0.3]} />
                        <meshStandardMaterial color="#111827" roughness={0.95} />
                    </mesh>
                    {/* Bumper bracket */}
                    <mesh position={[0, 0.7, 0]}>
                        <boxGeometry args={[1.2, 0.15, 0.15]} />
                        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
                    </mesh>
                </group>
            ))}

            {/* Fire extinguisher stations */}
            {[-45, 50].map((x, i) => (
                <group key={`fire${i}`} position={[x, 1.5, -19.2]}>
                    {/* Bracket */}
                    <mesh>
                        <boxGeometry args={[0.4, 0.8, 0.15]} />
                        <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.3} />
                    </mesh>
                    {/* Cylinder body */}
                    <mesh position={[0, -0.1, 0.15]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
                        <meshStandardMaterial color="#b91c1c" roughness={0.4} metalness={0.4} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};


const TruckContent = ({ truckType, packedItems, isolatedId = null, onHover, mode = 'truck', addStangaMode = false, stangas = [], onAddStanga, onRemoveStanga, addSpanzetMode = false, spanzets = [], onAddSpanzet, onRemoveSpanzet }) => {
    const scaleFactor = 0.01;
    const isTrain = mode === 'train';
    const isPlane = mode === 'plane';
    const isShip = mode === 'ship';

    const tLen = (truckType?.length || 1360) * scaleFactor;
    const tWid = (truckType?.width || 245) * scaleFactor;
    const tHei = (truckType?.height || 275) * scaleFactor;

    return (
        <group>
            {/* Main Chassis Frame / ULD Platform */}
            {/* Raised Y by +0.3 to lift trailer higher */}
            <mesh position={[0, -tHei / 2 + 0.15, 0]}>
                <boxGeometry args={[tLen + (isPlane ? 0.1 : 0), isPlane ? 0.1 : 0.3, isPlane ? tWid + 0.1 : tWid * 0.7]} />
                <meshStandardMaterial color={(isPlane || isShip) ? "#cbd5e1" : "#0f172a"} metalness={(isPlane || isShip) ? 1 : 0.8} roughness={0.2} />
            </mesh>

            {/* Truck Bed / ULD Surface */}
            <mesh position={[0, -tHei / 2 + 0.36, 0]} receiveShadow>
                <boxGeometry args={[tLen - 0.02, 0.1, tWid - 0.02]} />
                <meshStandardMaterial color={isPlane ? "#94a3b8" : "#1e293b"} />
            </mesh>

            {/* Solid trailer frame (replaces the ghostly wireframe). Slim metallic
                corner posts + bottom side rails so boxes inside stay visible while
                the trailer itself reads as a real structure, not a hologram.
                Lifted by the same +0.3 the cargo gets, so the cage floor/ceiling
                line up with the boxes — otherwise a load stacked to the full deck
                height appears to poke out the top of the frame. */}
            <group position={[0, 0.3, 0]}>
            {(() => {
                const t = 0.06; // strut thickness
                const hx = tLen / 2, hy = tHei / 2, hz = tWid / 2;
                const frameMat = (
                    <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
                );
                const edges = [
                    // 4 vertical corner posts
                    { p: [ hx, 0,  hz], s: [t, tHei, t] },
                    { p: [-hx, 0,  hz], s: [t, tHei, t] },
                    { p: [ hx, 0, -hz], s: [t, tHei, t] },
                    { p: [-hx, 0, -hz], s: [t, tHei, t] },
                    // top rails (along length)
                    { p: [0,  hy,  hz], s: [tLen, t, t] },
                    { p: [0,  hy, -hz], s: [tLen, t, t] },
                    // top rails (along width)
                    { p: [ hx,  hy, 0], s: [t, t, tWid] },
                    { p: [-hx,  hy, 0], s: [t, t, tWid] },
                    // bottom side rails (short wall feel)
                    { p: [0, -hy + 0.15,  hz], s: [tLen, 0.3, t] },
                    { p: [0, -hy + 0.15, -hz], s: [tLen, 0.3, t] },
                ];
                return edges.map((e, i) => (
                    <mesh key={`frame${i}`} position={e.p} castShadow>
                        <boxGeometry args={e.s} />
                        {frameMat}
                    </mesh>
                ));
            })()}
            </group>

            {/* 3D GLB Truck Model (Cabin) - Only for Truck mode */}
            {!isTrain && !isPlane && !isShip && (
                // Position Adjusted: Moved FURTHER forward (-3.5) and slightly UP (0.5) to align with trailer and avoid clipping/floor issues
                // Own Suspense boundary (null fallback) so the trailer + cargo
                // render instantly while the 6 MB cabin GLB streams in behind.
                <Suspense fallback={null}>
                    <TruckCabinModel position={[-tLen / 2 - 3.5, -tHei / 2 + 0.55, 0]} />
                </Suspense>
            )}

            {/* Professional Wheel Assemblies */}
            {!isPlane && !isShip && (
                isTrain ? (
                    [
                        [tLen / 2 - 1.5, -tHei / 2 - 0.55, tWid / 2],
                        [tLen / 2 - 1.5, -tHei / 2 - 0.55, -tWid / 2],
                        [tLen / 2 - 3.2, -tHei / 2 - 0.55, tWid / 2],
                        [tLen / 2 - 3.2, -tHei / 2 - 0.55, -tWid / 2],
                        [-tLen / 2 + 1.5, -tHei / 2 - 0.55, tWid / 2],
                        [-tLen / 2 + 1.5, -tHei / 2 - 0.55, -tWid / 2],
                        [-tLen / 2 + 3.2, -tHei / 2 - 0.55, tWid / 2],
                        [-tLen / 2 + 3.2, -tHei / 2 - 0.55, -tWid / 2]
                    ].map((pos, i) => (
                        <group key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
                            <mesh castShadow>
                                <cylinderGeometry args={[0.45, 0.45, 0.3, 32]} />
                                <meshStandardMaterial color="#111" roughness={0.8} />
                            </mesh>
                            <mesh position={[0, 0.15, 0]}>
                                <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
                                <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
                            </mesh>
                        </group>
                    ))
                ) : (
                    // Truck mode: Replace trailer rear wheels with GLB wheel visuals
                    // so it looks consistent with the (already good-looking) front wheels.
                    // Own Suspense boundary (null fallback) so the 14 MB wheel GLB
                    // does not hold back the rest of the scene from rendering.
                    <Suspense fallback={null}>
                        <GLBWheelAssembly
                            targets={[
                                [tLen / 2 - 1.5, -tHei / 2 - 0.9, tWid / 2],
                                [tLen / 2 - 1.5, -tHei / 2 - 0.9, -tWid / 2],
                                [tLen / 2 - 3.2, -tHei / 2 - 0.9, tWid / 2],
                                [tLen / 2 - 3.2, -tHei / 2 - 0.9, -tWid / 2]
                            ]}
                            glbPath="/src/rear-wheel.glb"
                        />
                    </Suspense>
                )
            )}

            {/* Placed Cargo Items */}
            {/* When the load is large (>120 items), drop the per-item edge
                wireframes and individual cast-shadows; they double the draw
                calls and tank framerate. The boxes still read clearly thanks
                to ambient/directional lighting. */}
            {packedItems.map((item, i) => {
                // Legend isolation: when a product is selected in the legend,
                // hide every other product so the user sees exactly where the
                // selected one sits in the stack. (Return null inside the map so
                // item indexes — used by ştanga/spanzet — stay stable.)
                if (isolatedId != null && item.id !== isolatedId) return null;
                const w = item.dimensions.length * scaleFactor;
                const d = item.dimensions.width * scaleFactor;
                const h = item.dimensions.height * scaleFactor;

                const x = (item.position.x * scaleFactor) - (tLen / 2) + (w / 2);
                const y = (item.position.z * scaleFactor) - (tHei / 2) + (h / 2) + 0.3;
                const z = (item.position.y * scaleFactor) - (tWid / 2) + (d / 2);

                const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                const color = item.color || colors[item.id % colors.length];
                const heavyLoad = packedItems.length > 400;
                const showEdges = packedItems.length <= 600;
                // Printed label on the box faces. For very large loads (>800
                // boxes) skip the canvas texture and fall back to flat colour to
                // keep texture memory/upload time in check.
                const labelText = (item.name && !String(item.name).startsWith('#')) ? item.name : `#${item.id}`;
                const labelMode = addStangaMode ? 'stanga' : (addSpanzetMode ? 'spanzet' : 'normal');
                // Aspect-matched per-face materials so the printed label is not
                // stretched on rectangular faces. Skip for very large loads.
                const matArray = packedItems.length <= 800 ? getBoxMaterials(labelText, color, w, h, d, labelMode) : null;

                return (
                    <mesh
                        key={i}
                        position={[x, y, z]}
                        castShadow={!heavyLoad}
                        {...(matArray ? { material: matArray } : {})}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            onHover(item, e.clientX, e.clientY);
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            onHover(null);
                        }}
                        onClick={(e) => {
                            if (addStangaMode && onAddStanga) { e.stopPropagation(); onAddStanga(i, item); return; }
                            if (addSpanzetMode && onAddSpanzet) { e.stopPropagation(); onAddSpanzet(i, item); return; }
                        }}
                    >
                        <boxGeometry args={[w, h, d]} />
                        {!matArray && (
                            <meshStandardMaterial
                                color={color}
                                roughness={0.45}
                                metalness={0.1}
                                emissive={addStangaMode ? '#fbbf24' : (addSpanzetMode ? '#a855f7' : '#000')}
                                emissiveIntensity={(addStangaMode || addSpanzetMode) ? 0.15 : 0}
                            />
                        )}
                        {showEdges && <lineSegments>
                            <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                            <lineBasicMaterial color="#000000" transparent opacity={0.5} />
                        </lineSegments>}
                    </mesh>
                )
            })}

            {/* ===== Manually-placed horizontal ştanga bars =====
                Each entry refers to a placedItems index. The bar lies horizontally
                across the trailer width on the +X face (rear edge) of the chosen
                item, at the item's vertical mid-height. Hovering shows a "Ştanga"
                tooltip. Clicking again removes it. */}
            {/* Spanzet (cargo strap / ratchet strap) — flat dark rubber band
                wrapped over the top of the cargo, hanging slightly down each
                side. Different look from the metal ştanga: low metalness,
                high roughness, dark color. */}
            {spanzets && spanzets.map((s, si) => {
                const item = packedItems[s.itemIndex];
                if (!item) return null;
                const w = item.dimensions.length * scaleFactor;
                const h = item.dimensions.height * scaleFactor;
                const d = item.dimensions.width * scaleFactor;
                const ix = (item.position.x * scaleFactor) - (tLen / 2) + (w / 2);
                const iy = (item.position.z * scaleFactor) - (tHei / 2) + (h / 2) + 0.3;
                const iz = (item.position.y * scaleFactor) - (tWid / 2) + (d / 2);
                const strapW = 0.16; // visual band width
                const overhang = 0.12; // hangs over each side
                const totalLen = d + overhang * 2; // spans across item depth + a bit on each side
                const hover = {
                    onPointerOver: (e) => { e.stopPropagation(); onHover && onHover({ __spanzet: true, name: 'Spanzet' }, e.clientX, e.clientY); },
                    onPointerOut:  (e) => { e.stopPropagation(); onHover && onHover(null); },
                    onClick:       (e) => { e.stopPropagation(); onRemoveSpanzet && onRemoveSpanzet(si); }
                };
                return (
                    <group key={`spanzet${si}`} position={[ix, iy + h / 2 + 0.005, iz]}>
                        <mesh castShadow {...hover}>
                            <boxGeometry args={[strapW, 0.02, totalLen]} />
                            <meshStandardMaterial color="#1f2937" roughness={0.95} metalness={0.0} />
                        </mesh>
                        <mesh position={[0, -h / 2 - overhang / 2,  d / 2 + 0.001]} {...hover}>
                            <boxGeometry args={[strapW, h + overhang, 0.02]} />
                            <meshStandardMaterial color="#1f2937" roughness={0.95} metalness={0.0} />
                        </mesh>
                        <mesh position={[0, -h / 2 - overhang / 2, -d / 2 - 0.001]} {...hover}>
                            <boxGeometry args={[strapW, h + overhang, 0.02]} />
                            <meshStandardMaterial color="#1f2937" roughness={0.95} metalness={0.0} />
                        </mesh>
                        <mesh position={[0, 0.02, 0]} {...hover}>
                            <boxGeometry args={[strapW * 1.25, 0.04, strapW * 1.6]} />
                            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.4} />
                        </mesh>
                    </group>
                );
            })}

            {stangas && stangas.map((s, si) => {
                const item = packedItems[s.itemIndex];
                if (!item) return null;
                const w = item.dimensions.length * scaleFactor;
                const h = item.dimensions.height * scaleFactor;
                const d = item.dimensions.width * scaleFactor;
                // Item center in scene coords:
                const ix = (item.position.x * scaleFactor) - (tLen / 2) + (w / 2);
                const iy = (item.position.z * scaleFactor) - (tHei / 2) + (h / 2) + 0.3;
                const iz = (item.position.y * scaleFactor) - (tWid / 2) + (d / 2);
                // Bar length spans trailer width (slightly inset).
                const barLen = (truckType?.width || 245) * scaleFactor * 0.95;
                // Sit on the +X side face of the item (its rear face), at mid-height.
                const barX = ix + w / 2 + 0.04;
                return (
                    <group key={`stanga${si}`} position={[barX, iy, 0]}>
                        <mesh
                            castShadow
                            rotation={[Math.PI / 2, 0, 0]}
                            onPointerOver={(e) => { e.stopPropagation(); onHover && onHover({ __stanga: true, name: 'Ştanga' }, e.clientX, e.clientY); }}
                            onPointerOut={(e) => { e.stopPropagation(); onHover && onHover(null); }}
                            onClick={(e) => { e.stopPropagation(); onRemoveStanga && onRemoveStanga(si); }}
                        >
                            <cylinderGeometry args={[0.05, 0.05, barLen, 14]} />
                            <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.25} />
                        </mesh>
                        <mesh position={[0, 0,  barLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.075, 0.075, 0.05, 14]} />
                            <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.4} />
                        </mesh>
                        <mesh position={[0, 0, -barLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.075, 0.075, 0.05, 14]} />
                            <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.4} />
                        </mesh>
                    </group>
                );
            })}

            {/* ============= ŞTANGA / HORIZONTAL ANTI-TIP BARS =============
                Manually placed by the user via the "Add Štanga" button: clicking
                a placed cargo item attaches a horizontal bar across the trailer
                width on the +X side of that item. */}
            {false && (() => {
                if (!packedItems || packedItems.length < 1) return null;
                // Group items into stack columns keyed by footprint position.
                const columns = {};
                for (const it of packedItems) {
                    const key = `${Math.round(it.position.x)}_${Math.round(it.position.y)}_${Math.round(it.dimensions.length)}_${Math.round(it.dimensions.width)}`;
                    if (!columns[key]) {
                        columns[key] = {
                            x0: it.position.x, y0: it.position.y,
                            l: it.dimensions.length, w: it.dimensions.width,
                            firstRowTopZ: it.position.z + it.dimensions.height,
                            topZ: it.position.z + it.dimensions.height,
                            count: 0
                        };
                    }
                    const top = it.position.z + it.dimensions.height;
                    if (top > columns[key].topZ) columns[key].topZ = top;
                    if (it.position.z < (columns[key].firstRowTopZ - it.dimensions.height + 1)) {
                        columns[key].firstRowTopZ = it.position.z + it.dimensions.height;
                    }
                    columns[key].count++;
                }
                const multiRowCols = Object.values(columns).filter(c => c.count > 1);
                if (multiRowCols.length === 0) return null;

                const bars = [];
                multiRowCols.forEach((c, ci) => {
                    // Only brace the EXTRA rows above the first row → bar starts at firstRowTopZ.
                    const z0cm = c.firstRowTopZ;
                    const z1cm = c.topZ;
                    if (z1cm - z0cm < 5) return;
                    // Two vertical bars: one on the +x side face, one on the -x side face,
                    // hugging the column's side at the y center.
                    const cyCm = c.y0 + c.w / 2;
                    bars.push({ key: `b${ci}A`, xCm: c.x0,           yCm: cyCm, z0cm, z1cm });
                    bars.push({ key: `b${ci}B`, xCm: c.x0 + c.l,     yCm: cyCm, z0cm, z1cm });
                });

                return bars.map((b) => {
                    const x = (b.xCm * scaleFactor) - (tLen / 2);
                    const z = (b.yCm * scaleFactor) - (tWid / 2);
                    const barLen = (b.z1cm - b.z0cm) * scaleFactor;
                    const yMid = ((b.z0cm + b.z1cm) / 2 * scaleFactor) - (tHei / 2) + 0.3;
                    return (
                        <group key={b.key} position={[x, yMid, z]}>
                            <mesh castShadow>
                                <cylinderGeometry args={[0.04, 0.04, barLen, 12]} />
                                <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.25} />
                            </mesh>
                            <mesh position={[0,  barLen / 2, 0]}>
                                <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
                                <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.4} />
                            </mesh>
                            <mesh position={[0, -barLen / 2, 0]}>
                                <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
                                <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.4} />
                            </mesh>
                        </group>
                    );
                });
            })()}
        </group>
    );
};

const ModelViewer = ({
    truckType,
    packedItems = [],
    isolatedId = null,
    viewMode = 'iso',
    onHoverItem,
    onUserInteraction,
    mode = 'truck',
    addStangaMode = false,
    stangas = [],
    onAddStanga,
    onRemoveStanga,
    addSpanzetMode = false,
    spanzets = [],
    onAddSpanzet,
    onRemoveSpanzet
}) => {
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [publicConfig, setPublicConfig] = useState({ banner: {}, companies: {} });
    const { t } = useT();

    // Pull live banner URLs + per-country company list from the admin-managed
    // database. Fails open: if the API isn't reachable we just show defaults.
    useEffect(() => {
        let cancelled = false;
        fetch('/api/public/config')
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (j && !cancelled) setPublicConfig(j); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '1rem', background: 'transparent' }}>
            <Canvas
                id="truck-canvas"
                shadows
                camera={{ fov: 38, position: [12, 12, 15] }}
                gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: 'high-performance' }}
                dpr={[1, 1.5]}
            >
                {/* Warehouse lighting (brighter for industrial indoor look) */}
                <ambientLight intensity={0.85} />
                <directionalLight position={[15, 25, 15]} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-15, 10, -5]} intensity={0.65} />
                <pointLight position={[0, 8, 0]} intensity={0.5} />

                {/* Mood Atmosphere — light grey scene to match the truck page.
                    Far distance pushed out so the end walls read as solid
                    surfaces instead of dissolving into a bright, glaring haze. */}
                <color attach="background" args={['#e7e7e7']} />
                <fog attach="fog" args={['#e7e7e7', 20, 130]} />

                <Suspense fallback={<Loader />}>
                    <WarehouseEnvironment
                        floorY={(-((truckType?.height || 275) * 0.01) / 2) - 0.85}
                        showFlags={true}
                        onFlagClick={(code) => setSelectedCountry(code)}
                        bannerUrls={publicConfig.banner || {}}
                    />
                    <TruckContent
                        truckType={truckType}
                        packedItems={packedItems}
                        isolatedId={isolatedId}
                        onHover={onHoverItem}
                        mode={mode}
                        addStangaMode={addStangaMode}
                        stangas={stangas}
                        onAddStanga={onAddStanga}
                        onRemoveStanga={onRemoveStanga}
                        addSpanzetMode={addSpanzetMode}
                        spanzets={spanzets}
                        onAddSpanzet={onAddSpanzet}
                        onRemoveSpanzet={onRemoveSpanzet}
                    />
                </Suspense>

                <CameraController viewMode={viewMode} onUserInteraction={onUserInteraction} />
            </Canvas>

            {/* UI Overlay Modal for Country Cargo Locations */}
            {selectedCountry && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(11, 18, 32, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#1e293b',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '500px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid #334155'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img 
                                    src={`https://flagcdn.com/w40/${selectedCountry}.png`} 
                                    alt={selectedCountry}
                                    style={{ borderRadius: '4px', width: '32px' }}
                                />
                                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>
                                    {t('viewer.shippers', { country: selectedCountry.toUpperCase() })}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setSelectedCountry(null)}
                                style={{ 
                                    background: 'transparent', border: 'none', color: '#94a3b8', 
                                    cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(() => {
                                const list = (publicConfig.companies && publicConfig.companies[selectedCountry]) || [];
                                if (list.length === 0) {
                                    // Fallback featured card when no admin data exists yet.
                                    return (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                                            padding: '20px', borderRadius: '10px',
                                            borderLeft: '4px solid #fbbf24'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '1.1rem' }}>Etnalog</div>
                                                <div style={{ fontSize: '0.7rem', color: '#0f172a', background: '#fbbf24', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>{t('viewer.featured')}</div>
                                            </div>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                {t('viewer.etnalogDesc', { country: selectedCountry.toUpperCase() })}
                                            </div>
                                        </div>
                                    );
                                }
                                return list.map((c, ci) => {
                                    const isFeat = !!c.is_featured;
                                    return (
                                        <a
                                            key={ci}
                                            href={c.website || undefined}
                                            target={c.website ? '_blank' : undefined}
                                            rel="noreferrer"
                                            style={{
                                                background: isFeat
                                                    ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)'
                                                    : 'rgba(15, 23, 42, 0.7)',
                                                padding: '16px 20px',
                                                borderRadius: '10px',
                                                borderLeft: `4px solid ${isFeat ? '#fbbf24' : '#475569'}`,
                                                textDecoration: 'none',
                                                display: 'block'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                    {c.logo_url && (
                                                        <img src={c.logo_url} alt={c.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff' }} />
                                                    )}
                                                    <div style={{ fontWeight: 'bold', color: isFeat ? '#fbbf24' : '#f1f5f9', fontSize: '1.05rem' }}>{c.name}</div>
                                                </div>
                                                {isFeat && (
                                                    <div style={{ fontSize: '0.7rem', color: '#0f172a', background: '#fbbf24', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>{t('viewer.featured')}</div>
                                                )}
                                            </div>
                                            {c.description && (
                                                <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 8 }}>{c.description}</div>
                                            )}
                                            {(c.phone || c.email || c.website) && (
                                                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.82rem', color: '#94a3b8' }}>
                                                    {c.phone && (
                                                        <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: '#93c5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>📞 {c.phone}</a>
                                                    )}
                                                    {c.email && (
                                                        <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} style={{ color: '#93c5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>✉️ {c.email}</a>
                                                    )}
                                                    {c.website && (
                                                        <span style={{ color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: 4 }}>🌐 {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                                    )}
                                                </div>
                                            )}
                                        </a>
                                    );
                                });
                            })()}
                        </div>
                        
                        <div style={{ marginTop: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                            <p>{t('viewer.moreShippers')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelViewer;
