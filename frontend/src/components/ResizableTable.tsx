import { useState, useCallback } from 'react';
import { Table } from 'antd';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

// Resizable header cell for drag-to-resize columns
const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;
    if (!width) return <th {...restProps} />;
    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    style={{ position: 'absolute', right: -5, bottom: 0, top: 0, width: 10, cursor: 'col-resize', zIndex: 1 }}
                    onClick={e => e.stopPropagation()}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

interface ResizableTableProps {
    columns: any[];
    dataSource: any[];
    rowKey: string;
    size?: 'small' | 'middle' | 'large';
    scroll?: { x?: number | string; y?: number | string };
    pagination?: false | object;
    [key: string]: any;
}

export default function ResizableTable({ columns: initColumns, ...rest }: ResizableTableProps) {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        initColumns.forEach(col => {
            if (col.width && col.key) map[col.key] = col.width;
        });
        return map;
    });

    const handleResize = useCallback((key: string) => (_: any, { size }: any) => {
        setColumnWidths(prev => ({ ...prev, [key]: size.width }));
    }, []);

    const mergedColumns = initColumns.map(col => ({
        ...col,
        width: columnWidths[col.key] || col.width,
        onHeaderCell: (column: any) => ({
            width: column.width,
            onResize: handleResize(col.key),
        }),
    }));

    return (
        <Table
            {...rest}
            columns={mergedColumns}
            components={{ header: { cell: ResizableTitle } }}
        />
    );
}
