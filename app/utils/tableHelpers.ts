import { h } from 'vue'
import { UButton, UIcon } from '#components'
import type { Row } from '@tanstack/vue-table'

// Draggable Header
export function renderDraggableHeader(
  title: string,
  columnId: string,
  onDragStart: (e: DragEvent, columnId: string) => void
) {
  return h('div', {
    draggable: true,
    onDragstart: (e: DragEvent) => onDragStart(e, columnId),
    class: 'cursor-grab active:cursor-grabbing flex items-center gap-1 hover:text-primary-500 transition-colors',
  }, [
    h('span', title),
    h(UIcon, { name: 'i-heroicons-bars-2', class: 'w-4 h-4 text-gray-400' }),
  ])
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