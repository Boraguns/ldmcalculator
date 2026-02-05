import { useEffect, useRef } from 'react';
import '../cubes.css';
import '../utils/cubes.js'; // Ensure this loads the window.CubeAnimator

const TruckVisual = ({ packedItems, truckType }) => {
    const containerRef = useRef(null);
    const animatorRef = useRef(null);

    useEffect(() => {
        // Initialize or update the visualizer
        // Since the original CubeAnimator expects an ID, we'll give our container one
        // Ideally we refactor CubeAnimator to accept a DOM element, but for now we stick to legacy compat logic wrapper

        if (!containerRef.current) return;

        // Cleanup previous instance if any (though CubeAnimator implementation doesn't have a destroy method yet, 
        // we can just re-init as it clears innerHTML)

        const containerId = 'react-cube-container-unique';
        containerRef.current.id = containerId;

        if (window.CubeAnimator) {
            animatorRef.current = new window.CubeAnimator(containerId, {
                packedItems: packedItems || [],
                containerDims: truckType || { length: 1360, width: 245, height: 270 },
                entryAnimation: true
            });
        }

        // Cleanup function
        return () => {
            if (animatorRef.current) {
                // animatorRef.current.destroy() // If implemented later
                animatorRef.current = null;
            }
        };
    }, [packedItems, truckType]); // Re-run when items or truck changes

    return (
        <div className="truck-visual-canvas" id="truckVisualCanvas" style={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
        }}>
            <div className="truck-canvas-container" style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                perspective: '1200px',
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
            }}>
                <div id="productLegend" className="product-legend"></div>
                <div ref={containerRef} className="cube-animation-container" style={{ width: '100%', height: '100%' }}></div>
            </div>
        </div>
    );
};

export default TruckVisual;
