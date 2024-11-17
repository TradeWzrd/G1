import React, { useEffect, useState, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export const CustomLayout = ({
    children,
    layout,
    onLayoutChange,
    isEditing,
    className,
}) => {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(1200);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const newWidth = containerRef.current.offsetWidth;
                setWidth(newWidth);
            }
        };

        // Initial width
        updateWidth();

        // Debounced resize handler
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateWidth, 100);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, []);

    const handleResizeStart = (layout, oldItem, newItem, placeholder, e, element) => {
        // Add resize class to indicate active resizing
        element.classList.add('resizing');
    };

    const handleResizeStop = (layout, oldItem, newItem, placeholder, e, element) => {
        // Remove resize class when done
        element.classList.remove('resizing');
        
        // Ensure minimum sizes are maintained
        const adjustedLayout = layout.map(item => ({
            ...item,
            w: Math.max(item.w, 2), // Minimum width of 2 units
            h: Math.max(item.h, 2)  // Minimum height of 2 units
        }));

        // Update layout with adjusted sizes
        onLayoutChange(adjustedLayout);
    };

    const handleDragStart = (layout, oldItem, newItem, placeholder, e, element) => {
        element.classList.add('dragging');
    };

    const handleDragStop = (layout, oldItem, newItem, placeholder, e, element) => {
        element.classList.remove('dragging');
        onLayoutChange(layout);
    };

    return (
        <div ref={containerRef} className={`layout-container ${isEditing ? 'select-none' : ''} ${className || ''}`}>
            <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={30}
                width={width}
                onLayoutChange={(currentLayout) => onLayoutChange(currentLayout)}
                isDraggable={isEditing}
                isResizable={isEditing}
                margin={[10, 10]}
                containerPadding={[10, 10]}
                useCSSTransforms={true}
                preventCollision={false}
                compactType="vertical"
                onResizeStart={handleResizeStart}
                onResizeStop={handleResizeStop}
                onDragStart={handleDragStart}
                onDragStop={handleDragStop}
                resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
            >
                {children}
            </GridLayout>
        </div>
    );
};
