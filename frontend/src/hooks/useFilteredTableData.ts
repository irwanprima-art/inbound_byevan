import { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { FilterValue } from 'antd/es/table/interface';
import type { ColumnsType } from 'antd/es/table';

export default function useFilteredTableData<T extends { id: number }>(
    rows: T[],
    columns: ColumnsType<T>,
) {
    const [tableFilters, setTableFilters] = useState<Record<string, FilterValue | null>>({});

    const onTableChange: NonNullable<TableProps<T>['onChange']> = (_, filters) => {
        setTableFilters(filters);
    };

    const filteredRows = useMemo(() => {
        const activeFilters = Object.entries(tableFilters).filter(([, values]) => values?.length);
        if (activeFilters.length === 0) return rows;

        return rows.filter(row => activeFilters.every(([key, values]) => {
            const column = columns.find(item => {
                const columnKey = 'key' in item ? item.key : undefined;
                const dataIndex = 'dataIndex' in item ? item.dataIndex : undefined;
                return String(columnKey ?? dataIndex ?? '') === key;
            });
            if (typeof column?.onFilter !== 'function') return true;
            return values!.some(value => column.onFilter!(value as string | number | boolean, row));
        }));
    }, [rows, columns, tableFilters]);

    return {
        filteredRows,
        onTableChange,
        hasColumnFilters: Object.values(tableFilters).some(values => values?.length),
    };
}
