"use client";

import React, { useState, useRef, useEffect } from 'react';
import Sphere from '@/components/compositions/Sphere';

interface DraggableSphereWrapperProps {
    transcript?: string;
    initialPosition?: { x: number; y: number };
    sizePercentage?: number;
    containerScale?: number; // This prop is kept to not alter the signature, but is no longer used for sizing.
}

export const DraggableSphereWrapper: React.FC<DraggableSphereWrapperProps> = ({ transcript = "", initialPosition, sizePercentage = 0.17, containerScale = 1 }) => {
    const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const sphereRef = useRef<HTMLDivElement>(null);
    const parentSize = 200; // Parent div is fixed at 200x200px

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevents text selection during drag
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    // Constrain position when window size changes
    useEffect(() => {
        const constrainPosition = () => {
            const maxX = window.innerWidth - parentSize;
            const maxY = window.innerHeight - parentSize;

            setPosition(prev => ({
                x: Math.max(0, Math.min(prev.x, maxX)),
                y: Math.max(0, Math.min(prev.y, maxY))
            }));
        };

        constrainPosition();
        window.addEventListener('resize', constrainPosition);
        return () => window.removeEventListener('resize', constrainPosition);
    }, []); // No dependency on a dynamic size anymore

    // Handle mouse move and mouse up for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position
                let newX = e.clientX - dragStartPos.current.x;
                let newY = e.clientY - dragStartPos.current.y;

                // Apply boundary constraints to keep the container within the viewport
                const maxX = window.innerWidth - parentSize;
                const maxY = window.innerHeight - parentSize;

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
    }, [isDragging]);

    return (
        <div
            ref={sphereRef}
            className="fixed z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${parentSize}px`,
                height: `${parentSize}px`,
                pointerEvents: 'none' // Parent is not interactive, only the child
            }}
        >
            {/* This div is the draggable handle and sizes the sphere to 75% of its parent */}
            <div
                style={{
                    width: '75%',
                    height: '75%',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    pointerEvents: 'auto' // This element is interactive
                }}
                onMouseDown={handleMouseDown}
            >
                <Sphere transcript={transcript} sizePercentage={sizePercentage} />
            </div>
        </div>
    );
};