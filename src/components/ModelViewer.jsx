/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/no-unknown-property */
import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

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
            enableDamping
            dampingFactor={0.1}
            // Allow user to take over
            onStart={() => {
                setIsAnimating(false);
                if (onUserInteraction) onUserInteraction();
            }}
        />
    );
};

import { useGLTF } from '@react-three/drei';

const TruckCabinModel = ({ position }) => {
    const { scene } = useGLTF('/src/truck.glb');
    const clone = useMemo(() => scene.clone(), [scene]);
    const groupRef = useRef();

    useEffect(() => {
        if (clone) {
            // Calculate bounding box to normalize scale/position
            const box = new THREE.Box3().setFromObject(clone);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Determine current dimensions

            // ROBUST SCALING STRATEGY:
            // Instead of using max dimension (which could be length), we target the HEIGHT (Y-axis).
            // A typical truck cabin is about 2.8m - 3.2m tall.
            // We want the visual height to match the trailer height (~2.75m).

            const targetHeight = 3.0; // Slightly taller than trailer for visual dominance
            const currentHeight = size.y || 1; // Avoid divide by zero

            const scale = targetHeight / currentHeight;

            // Apply normalization
            clone.scale.set(scale, scale, scale);

            // Re-center: Subtract the center offset so the model's pivot is (0,0,0)
            clone.position.copy(center).multiplyScalar(-scale);

            // If the model is facing Z instead of X, we might need rotation.
            // Usually car models face +Z or -Z. Our scene is X-aligned.
            // We'll leave the parent rotation control to the prop or below.
        }
    }, [clone]);

    return (
        <group position={position} rotation={[0, Math.PI / 2, 0]}>
            <primitive object={clone} />
        </group>
    );
};

const TruckWheelModel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    const { scene } = useGLTF('/src/truck.glb');
    const wheelRef = useRef();
    const [wheelNode, setWheelNode] = useState(null);

    useEffect(() => {
        // Attempt to find a wheel mesh in the GLB
        // Common names often used in 3D models
        let found = null;
        scene.traverse((child) => {
            if (!found && child.isMesh &&
                (child.name.toLowerCase().includes('wheel') ||
                    child.name.toLowerCase().includes('tire') ||
                    child.name.toLowerCase().includes('fr_') || // Front Right
                    child.name.toLowerCase().includes('rl_'))) { // Rear Left
                found = child;
            }
        });

        if (found) {
            setWheelNode(found.clone());
        }
    }, [scene]);

    if (!wheelNode) return null; // Fallback or empty if not found

    return (
        <primitive
            object={wheelNode}
            position={position}
            rotation={rotation}
            scale={scale}
        />
    );
};

const TruckContent = ({ truckType, packedItems, onHover, mode = 'truck' }) => {
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
            {/* Removed the extra length (3.2) and offset (-1.6) for truck mode to prevent protruding black surface */}
            <mesh position={[0, -tHei / 2 - 0.15, 0]}>
                <boxGeometry args={[tLen + (isPlane ? 0.1 : 0), isPlane ? 0.1 : 0.3, isPlane ? tWid + 0.1 : tWid * 0.7]} />
                <meshStandardMaterial color={(isPlane || isShip) ? "#cbd5e1" : "#0f172a"} metalness={(isPlane || isShip) ? 1 : 0.8} roughness={0.2} />
            </mesh>

            {/* Truck Bed / ULD Surface */}
            <mesh position={[0, -tHei / 2 - 0.05, 0]} receiveShadow>
                <boxGeometry args={[tLen, 0.1, tWid]} />
                <meshStandardMaterial color={isPlane ? "#94a3b8" : "#1e293b"} />
            </mesh>

            {/* Wireframe Outline */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(tLen, tHei, tWid)]} />
                <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
            </lineSegments>

            {/* 3D GLB Truck Model (Cabin) - Only for Truck mode */}
            {!isTrain && !isPlane && !isShip && (
                // Moved closer to 0 (was -2.5) to slide chassis under trailer
                <TruckCabinModel position={[-tLen / 2 - 0.2, -tHei / 2 - 0.8, 0]} />
            )}

            {/* Professional Wheel Assemblies */}
            {!isPlane && !isShip && (isTrain ? [
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, -tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, -tWid / 2],
                [-tLen / 2 + 1.5, -tHei / 2 - 0.55, tWid / 2],
                [-tLen / 2 + 1.5, -tHei / 2 - 0.55, -tWid / 2],
                [-tLen / 2 + 3.2, -tHei / 2 - 0.55, tWid / 2],
                [-tLen / 2 + 3.2, -tHei / 2 - 0.55, -tWid / 2]
            ] : [
                // Trailer Rear Wheels ONLY (Front wheels are part of the GLB model now)
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, -tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, -tWid / 2]
            ]).map((pos, i) => (
                <group key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
                    <TruckWheelModel
                        scale={[1.1, 1.1, 1.1]} // Match Truck Scale
                        rotation={[Math.PI / 2, 0, 0]} // Adjust rotation if needed
                    />
                    {/* Fallback visual if wheel not found in GLB - hidden if WheelModel works, or we can just rely on the user checking visuals */}
                </group>
            ))}

            {/* Placed Cargo Items */}
            {packedItems.map((item, i) => {
                const w = item.dimensions.length * scaleFactor;
                const d = item.dimensions.width * scaleFactor;
                const h = item.dimensions.height * scaleFactor;

                const x = (item.position.x * scaleFactor) - (tLen / 2) + (w / 2);
                const y = (item.position.z * scaleFactor) - (tHei / 2) + (h / 2);
                const z = (item.position.y * scaleFactor) - (tWid / 2) + (d / 2);

                const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                const color = colors[item.id % colors.length];

                return (
                    <mesh
                        key={i}
                        position={[x, y, z]}
                        castShadow
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            onHover(item, e.clientX, e.clientY);
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            onHover(null);
                        }}
                    >
                        <boxGeometry args={[w, h, d]} />
                        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
                        <lineSegments>
                            <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                            <lineBasicMaterial color="rgba(0,0,0,0.5)" />
                        </lineSegments>
                    </mesh>
                )
            })}
        </group>
    );
};

const ModelViewer = ({
    truckType,
    packedItems = [],
    viewMode = 'iso',
    onHoverItem,
    onUserInteraction,
    mode = 'truck'
}) => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '1rem', background: 'transparent' }}>
            <Canvas
                id="truck-canvas"
                shadows
                camera={{ fov: 38, position: [12, 12, 15] }}
                gl={{ preserveDrawingBuffer: true }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[15, 25, 15]} intensity={1.5} castShadow />
                <directionalLight position={[-15, 10, -5]} intensity={0.6} />
                <pointLight position={[0, 8, 0]} intensity={0.5} />

                <Suspense fallback={<Loader />}>
                    <TruckContent
                        truckType={truckType}
                        packedItems={packedItems}
                        onHover={onHoverItem}
                        mode={mode}
                    />
                </Suspense>

                <CameraController viewMode={viewMode} onUserInteraction={onUserInteraction} />
            </Canvas>
        </div>
    );
};

export default ModelViewer;
