/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/no-unknown-property */
import { Suspense, useRef, useEffect, useState } from 'react';
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
            <mesh position={[0, -tHei / 2 - 0.15, 0]}>
                <boxGeometry args={[tLen + (isPlane ? 0.1 : 3.2), isPlane ? 0.1 : 0.3, isPlane ? tWid + 0.1 : tWid * 0.7]} />
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

            {/* Advanced Truck Cabin - Lowered and aligned */}
            {!isTrain && !isPlane && !isShip && (
                <group position={[-tLen / 2 - 1.4, -tHei / 2 + 0.9, 0]}>
                    {/* Lower Cabin Body */}
                    <mesh castShadow>
                        <boxGeometry args={[2.8, 1.8, tWid + 0.1]} />
                        <meshStandardMaterial color="#f8fafc" />
                    </mesh>

                    {/* Upper Cabin / Roof with Slant */}
                    <mesh position={[0.2, 1.1, 0]} rotation={[0, 0, -0.1]}>
                        <boxGeometry args={[2.2, 1.0, tWid + 0.1]} />
                        <meshStandardMaterial color="#f8fafc" />
                    </mesh>

                    {/* Windshield */}
                    <mesh position={[-1.41, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <planeGeometry args={[tWid - 0.2, 1.2]} />
                        <meshStandardMaterial color="#020617" roughness={0} metalness={1} transparent opacity={0.6} />
                    </mesh>

                    {/* Front Grill & Bumper */}
                    <mesh position={[-1.3, -0.85, 0]}>
                        <boxGeometry args={[0.3, 0.4, tWid + 0.2]} />
                        <meshStandardMaterial color="#1e293b" />
                    </mesh>

                    {/* Detailed Headlights */}
                    <mesh position={[-1.41, -0.7, tWid / 2 - 0.2]}>
                        <boxGeometry args={[0.05, 0.25, 0.5]} />
                        <meshStandardMaterial color="#f1f5f9" emissive="#f1f5f9" emissiveIntensity={1} />
                    </mesh>
                    <mesh position={[-1.41, -0.7, -tWid / 2 + 0.2]}>
                        <boxGeometry args={[0.05, 0.25, 0.5]} />
                        <meshStandardMaterial color="#f1f5f9" emissive="#f1f5f9" emissiveIntensity={1} />
                    </mesh>
                </group>
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
                // Trailer Rear Wheels
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 1.5, -tHei / 2 - 0.55, -tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, tWid / 2],
                [tLen / 2 - 3.2, -tHei / 2 - 0.55, -tWid / 2],
                // Cabin / Front Wheels
                [-tLen / 2 - 0.5, -tHei / 2 - 0.55, tWid / 2],
                [-tLen / 2 - 0.5, -tHei / 2 - 0.55, -tWid / 2],
                [-tLen / 2 - 2.4, -tHei / 2 - 0.55, tWid / 2],
                [-tLen / 2 - 2.4, -tHei / 2 - 0.55, -tWid / 2]
            ]).map((pos, i) => (
                <group key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
                    <mesh castShadow>
                        <cylinderGeometry args={[0.5, 0.5, 0.45, 32]} />
                        <meshStandardMaterial color="#020617" roughness={0.8} />
                    </mesh>
                    <mesh position={[0, 0.23, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
                        <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
                    </mesh>
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
