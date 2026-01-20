import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Optimized SphereImageGrid - Interactive 3D Image Sphere Component
 */

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface SphericalPosition {
    theta: number;
    phi: number;
    radius: number;
}

export interface WorldPosition extends Position3D {
    scale: number;
    zIndex: number;
    isVisible: boolean;
    fadeOpacity: number;
    originalIndex: number;
}

export interface ImageData {
    id: string;
    src: string;
    alt: string;
    title?: string;
    description?: string;
    originalData?: any;
}

export interface SphereImageGridProps {
    images?: ImageData[];
    sphereRadius?: number;
    dragSensitivity?: number;
    momentumDecay?: number;
    maxRotationSpeed?: number;
    baseImageScale?: number;
    perspective?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    className?: string;
    onSelect?: (image: ImageData | null) => void;
}

const SPHERE_MATH = {
    degreesToRadians: (degrees: number): number => degrees * (Math.PI / 180),
    normalizeAngle: (angle: number): number => {
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        return angle;
    }
};

const SphereImageGrid: React.FC<SphereImageGridProps> = ({
    images = [],
    sphereRadius = 300,
    dragSensitivity = 0.5,
    momentumDecay = 0.95,
    maxRotationSpeed = 5,
    baseImageScale = 0.15,
    perspective = 1000,
    autoRotate = false,
    autoRotateSpeed = 0.3,
    className = '',
    onSelect
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [rotation, setRotation] = useState({ x: 15, y: 15 });
    const [velocity, setVelocity] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const animationFrame = useRef<number | null>(null);

    // Responsive actual radius
    const actualRadius = sphereRadius * zoom;
    const baseSize = 100 * zoom;

    // Static distribution positions
    const imagePositions = useMemo(() => {
        const positions: SphericalPosition[] = [];
        const count = images.length;
        if (count === 0) return [];

        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const angleIncrement = 2 * Math.PI / goldenRatio;

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const inclination = Math.acos(1 - 2 * t);
            const azimuth = angleIncrement * i;
            let phi = inclination * (180 / Math.PI);
            let theta = (azimuth * (180 / Math.PI)) % 360;
            phi = 15 + (phi / 180) * 150;
            positions.push({ theta, phi, radius: sphereRadius });
        }
        return positions;
    }, [images.length, sphereRadius]);

    // Handle Zoom
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                setZoom(prev => Math.min(Math.max(0.4, prev - e.deltaY * 0.001), 3));
            }
        };
        const node = containerRef.current;
        if (node) node.addEventListener('wheel', handleWheel, { passive: false });
        return () => node?.removeEventListener('wheel', handleWheel);
    }, []);

    const worldPositions = useMemo(() => {
        if (!imagePositions.length) return [];

        const rotX = SPHERE_MATH.degreesToRadians(rotation.x);
        const rotY = SPHERE_MATH.degreesToRadians(rotation.y);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        return imagePositions.map((pos, index) => {
            const theta = SPHERE_MATH.degreesToRadians(pos.theta);
            const phi = SPHERE_MATH.degreesToRadians(pos.phi);
            const r = pos.radius * zoom;

            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.cos(phi);
            let z = r * Math.sin(phi) * Math.sin(theta);

            const x1 = x * cosY + z * sinY;
            const z1 = -x * sinY + z * cosY;
            x = x1;
            z = z1;

            const y2 = y * cosX - z * sinX;
            const z2 = y * sinX + z * cosX;
            y = y2;
            z = z2;

            const isVisible = z > -100 * zoom;
            const fadeOpacity = z <= 0 ? Math.max(0, (z + 100 * zoom) / (100 * zoom)) : 1;
            const zScale = (z + actualRadius) / (2 * actualRadius);
            const scale = Math.max(0.1, 0.6 + zScale * 0.6);

            return { x, y, z, scale, zIndex: Math.round(1000 + z), isVisible, fadeOpacity, originalIndex: index };
        });
    }, [imagePositions, rotation, actualRadius, zoom]);

    // Momentum loop
    useEffect(() => {
        const animate = () => {
            if (!isDragging) {
                setVelocity(v => ({ x: v.x * momentumDecay, y: v.y * momentumDecay }));
                setRotation(r => ({
                    x: SPHERE_MATH.normalizeAngle(r.x + Math.max(-maxRotationSpeed, Math.min(maxRotationSpeed, velocity.x))),
                    y: SPHERE_MATH.normalizeAngle(r.y + (autoRotate ? autoRotateSpeed : 0) + Math.max(-maxRotationSpeed, Math.min(maxRotationSpeed, velocity.y)))
                }));
            }
            animationFrame.current = requestAnimationFrame(animate);
        };
        animationFrame.current = requestAnimationFrame(animate);
        return () => animationFrame.current ? cancelAnimationFrame(animationFrame.current) : undefined;
    }, [isDragging, autoRotate, autoRotateSpeed, momentumDecay, velocity, maxRotationSpeed]);

    const lastTouchDistance = useRef<number | null>(null);

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.touches.length === 2) {
            lastTouchDistance.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            return;
        }
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setIsDragging(true);
        lastMousePos.current = { x: clientX, y: clientY };
        dragStartPos.current = { x: clientX, y: clientY };
        setVelocity({ x: 0, y: 0 });
    };

    useEffect(() => {
        const move = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e && e.touches.length === 2) {
                const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                if (lastTouchDistance.current !== null) {
                    setZoom(prev => Math.min(Math.max(0.4, prev + (d - lastTouchDistance.current!) * 0.005), 3));
                }
                lastTouchDistance.current = d;
                return;
            }
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            const dx = clientX - lastMousePos.current.x;
            const dy = clientY - lastMousePos.current.y;
            const vx = -dy * dragSensitivity;
            const vy = dx * dragSensitivity;
            setRotation(r => ({ x: SPHERE_MATH.normalizeAngle(r.x + vx), y: SPHERE_MATH.normalizeAngle(r.y + vy) }));
            setVelocity({ x: vx, y: vy });
            lastMousePos.current = { x: clientX, y: clientY };
        };
        const up = (e: MouseEvent | TouchEvent) => {
            if (isDragging && !('touches' in e)) {
                const dx = Math.abs(e.clientX - dragStartPos.current.x);
                const dy = Math.abs(e.clientY - dragStartPos.current.y);
                // If it's a click on the backdrop (not on an image)
                if (dx < 5 && dy < 5 && e.target === containerRef.current) {
                    onSelect?.(null);
                }
            }
            setIsDragging(false);
            lastTouchDistance.current = null;
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
    }, [isDragging, dragSensitivity, onSelect]);

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    return (
        <div ref={containerRef} className={cn("relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing", className)}
            style={{ perspective }}
            onMouseDown={handlePointerDown} onTouchStart={handlePointerDown}>

            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                {images.map((img, i) => {
                    const pos = worldPositions[i];
                    if (!pos?.isVisible) return null;

                    const isHovered = hoveredIndex === i;
                    const isMobile = window.innerWidth < 768;
                    const finalScale = pos.scale * (isHovered ? 1.2 : 1);

                    return (
                        <div key={img.id}
                            className="absolute pointer-events-auto transition-opacity duration-300"
                            style={{
                                width: baseSize,
                                height: baseSize,
                                left: '50%',
                                top: '50%',
                                zIndex: pos.zIndex,
                                opacity: pos.fadeOpacity,
                                transform: `translate3d(${pos.x - baseSize / 2}px, ${pos.y - baseSize / 2}px, 0) scale(${finalScale})`,
                                willChange: 'transform'
                            }}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(img);
                            }}
                        >
                            <div className="w-full h-full rounded-full overflow-hidden border border-white/20 shadow-2xl bg-zinc-800">
                                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" draggable={false} />
                            </div>
                            {(isMobile || isHovered) && (
                                <div className={cn("absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md transition-all duration-200", isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90")}>
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">{img.title}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default SphereImageGrid;
