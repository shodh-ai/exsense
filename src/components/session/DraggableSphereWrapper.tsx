"use client";

import React, { useState, useRef, useEffect } from 'react';
import Sphere from '@/components/compositions/Sphere';

interface DraggableSphereWrapperProps {
    transcript?: string;
    initialPosition?: { x: number; y: number };
}

export const DraggableSphereWrapper: React.FC<DraggableSphereWrapperProps> = ({ transcript = "", initialPosition }) => {
    const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [sphereSize, setSphereSize] = useState(200);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const sphereRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    // Calculate sphere size based on viewport (matching Sphere component's BLOB_SIZE_PERCENTAGE = 0.17)
    useEffect(() => {
        const updateSphereSize = () => {
            const minDimension = Math.min(window.innerWidth, window.innerHeight);
            // Sphere is 17% of viewport, and we add some padding for the shell effects
            const calculatedSize = minDimension * 0.17 * 1.2; // 1.2 multiplier for shell and effects
            setSphereSize(calculatedSize);
        };

        updateSphereSize();
        window.addEventListener('resize', updateSphereSize);
        return () => window.removeEventListener('resize', updateSphereSize);
    }, []);

    // Constrain position when sphere size or window size changes
    useEffect(() => {
        const constrainPosition = () => {
            const maxX = window.innerWidth - sphereSize;
            const maxY = window.innerHeight - sphereSize;

            setPosition(prev => ({
                x: Math.max(0, Math.min(prev.x, maxX)),
                y: Math.max(0, Math.min(prev.y, maxY))
            }));
        };

        constrainPosition();
        window.addEventListener('resize', constrainPosition);
        return () => window.removeEventListener('resize', constrainPosition);
    }, [sphereSize]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position
                let newX = e.clientX - dragStartPos.current.x;
                let newY = e.clientY - dragStartPos.current.y;

                // Apply boundary constraints to keep sphere within viewport
                const maxX = window.innerWidth - sphereSize;
                const maxY = window.innerHeight - sphereSize;

                // Clamp position within bounds
                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));

                setPosition({
                    x: newX,
                    y: newY
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, sphereSize]);

    return (
        <div
            ref={sphereRef}
            className="fixed z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${sphereSize}px`,
                height: `${sphereSize}px`,
                pointerEvents: 'none'
            }}
        >
            <div 
                style={{ 
                    width: '100%', 
                    height: '100%',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    pointerEvents: 'auto'
                }}
                onMouseDown={handleMouseDown}
            >
                <Sphere transcript={transcript} />
            </div>
        </div>
    );
};
