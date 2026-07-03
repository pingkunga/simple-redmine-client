export function useTableGrouping(allowedColumns: string[]) {
  const groupedColumns = ref<string[]>([])
  const isDragOver = ref(false)
  const draggedColumn = ref<string | null>(null)

  const handleDragStart = (event: DragEvent, columnId: string) => {
    draggedColumn.value = columnId
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', columnId)
    }
  }

  const handleDrop = (event: DragEvent) => {
    isDragOver.value = false
    const columnId = event.dataTransfer?.getData('text/plain')
    if (columnId && allowedColumns.includes(columnId)) {
      if (!groupedColumns.value.includes(columnId)) {
        groupedColumns.value = [...groupedColumns.value, columnId]
      }
    }
  }

  const handleRemoveGroup = (columnId: string) => {
    groupedColumns.value = groupedColumns.value.filter(id => id !== columnId)
  }

  return {
    groupedColumns,
    isDragOver,
    handleDragStart,
    handleDrop,
    handleRemoveGroup,
  }
}