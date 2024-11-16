import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const defaultLayouts = {
    lg: [
        { i: 'account', x: 0, y: 0, w: 12, h: 1 },
        { i: 'positions', x: 0, y: 1, w: 12, h: 4 },
        { i: 'chart', x: 0, y: 5, w: 8, h: 4 },
        { i: 'orders', x: 8, y: 5, w: 4, h: 4 }
    ]
};

export const CustomLayout = ({ children, layout, onLayoutChange, isEditing }) => {
    return (
        <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
            rowHeight={60}
            margin={[16, 16]}
            containerPadding={[16, 16]}
            isDraggable={isEditing}
            isResizable={isEditing}
            onLayoutChange={(newLayout) => onLayoutChange?.(newLayout)}
            draggableHandle=".panel-header"
            preventCollision={true}
        >
            {children}
        </ResponsiveGridLayout>
    );
};
