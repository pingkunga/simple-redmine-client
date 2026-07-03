import { h } from 'vue'
import { UButton, UIcon } from '#components'
import type { Row } from '@tanstack/vue-table'

/**
 * Shortcut for rendering a draggable & group header, commonly used for group display columns in grouped tables.
 * @param title The title of the header.
 * @param columnId The ID of the column.
 * @param onDragStart The function to call when dragging starts.
 * @returns A VNode representing the header.
 */
export const renderGroupOnlyHeader = (title: string, columnId: string, onDragStart: any) => 
  renderSortableHeader(title, undefined, { 
    draggable: true, 
    columnId, 
    onDragStart 
  })


/**
 * Shortcut for rendering a sortable header, with optional drag-and-drop capabilities.
 * If a column object is provided, it will render with sorting functionality. 
 * If not, it will render as plain text (useful for non-sortable group display columns).
 * @param title The title of the header.
 * @param column The column object from the table.
 * @param options Additional options for rendering the header.
 * @returns A VNode representing the header.
 */
export function renderSortableHeader(
  title: string,
  column?: any, 
  options?: {
    draggable?: boolean,
    columnId?: string,
    onDragStart?: (e: DragEvent, columnId: string) => void
  }
) {
  // Create the inner content (either sortable or plain text)
  let headerContent

  if (column) {
    // Add sorting base if column is provided
    const isSorted = column.getIsSorted()
    const icon = isSorted === 'asc' 
      ? 'i-heroicons-arrow-up' 
      : isSorted === 'desc' 
        ? 'i-heroicons-arrow-down' 
        : 'i-heroicons-arrows-up-down'

    headerContent = h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label: title,
      icon: icon,
      class: '-ml-3',
      onClick: () => column.toggleSorting(isSorted === 'asc')
    })
  } else {
    // If no column is provided -> display as plain text
    headerContent = h('span', title)
  }

  // If draggable is required, wrap with a div for dragging
  if (options?.draggable && options.onDragStart && options.columnId) {
    return h('div', {
      draggable: true,
      onDragstart: (e: DragEvent) => options.onDragStart!(e, options.columnId!),
      class: 'cursor-grab active:cursor-grabbing flex items-center gap-1 hover:text-primary-500 transition-colors',
    }, [
      headerContent,
      h(UIcon, { name: 'i-heroicons-bars-2', class: 'w-4 h-4 text-gray-400' + (column ? ' -ml-2' : '') }),
    ])
  }

  return headerContent
}

// Group Row Cell
export function renderGroupCell<T>(
  row: Row<T>,
  columnLabels: Record<string, string>
) {
  if (!row.getIsGrouped()) return null

  const columnId = row.groupingColumnId
  if (!columnId) return null
  
  const label = columnLabels[columnId] || columnId
  const value = row.getValue(columnId)

  return h('div', {
    class: 'flex items-center gap-2',
    style: { paddingLeft: `${row.depth * 1.5}rem` },
  }, [
    h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      icon: row.getIsExpanded() ? 'i-heroicons-minus' : 'i-heroicons-plus',
      size: 'xs',
      class: '-ml-2',
      onClick: (e: Event) => {
        e.stopPropagation()
        row.toggleExpanded()
      },
    }),
    h('span', { class: 'font-bold text-sm text-nowrap' },
      `${label}: ${value} (${row.subRows.length})`
    ),
  ])
}

/**
 * Shortcut for rendering a regular cell, with optional link and formatting capabilities.
 * @param row The row object from the table.
 * @param columnLabels A record of column labels.
 * @param columnId The ID of the column.
 * @param options Additional options for rendering the cell.
 * @returns A VNode representing the cell.
 */
export function renderCell<T>(
  row: Row<T>,
  columnLabels: Record<string, string>,
  columnId: string,
  options?: {
    isGroupDisplayColumn?: boolean,
    urlBuilder?: (id: string) => string | undefined,
    formatValue?: (val: any) => any,
    className?: string
  }
) {
  // If row is grouped, only render in the designated display column
  if (row.getIsGrouped()) {
    return options?.isGroupDisplayColumn ? renderGroupCell(row, columnLabels) : null
  }

  const value = row.getValue(columnId)
  const displayValue = options?.formatValue ? options.formatValue(value) : value

  // If we have a URL builder, render as a link
  if (options?.urlBuilder) {
    const url = options.urlBuilder(value as string)
    if (url) {
      return h('a', {
        href: url,
        target: '_blank',
        class: 'text-primary hover:underline ' + (options.className || ''),
      }, displayValue as string)
    }
  }

  return h('span', { class: options?.className }, displayValue as string)
}