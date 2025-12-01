<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const items = computed(() => {
  const o = props.order || {}
  return (
    o.detalles || o.items || o.productos || []
  )
})

const total = computed(() => props.order?.totalOrden ?? props.order?.total ?? null)
const fecha = computed(() => props.order?.fechaOrden ?? props.order?.fecha ?? null)
const estado = computed(() => props.order?.estadoOrden ?? props.order?.estado ?? null)
const direccion = computed(() => props.order?.direccionEnvio ?? null)
const observaciones = computed(() => props.order?.observaciones ?? null)

const closeOnEsc = (e) => {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.open, (val) => {
  if (val) document.addEventListener('keydown', closeOnEsc)
  else document.removeEventListener('keydown', closeOnEsc)
}, { immediate: true })

onMounted(() => {
  if (props.open) document.addEventListener('keydown', closeOnEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEsc)
})
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100]">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-card text-foreground border border-border rounded-2xl shadow-lg">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="space-y-0.5">
              <h3 class="text-xl font-semibold">Detalles del pedido</h3>
              <p v-if="order?.idOrden" class="text-sm text-muted-foreground">Pedido #{{ order.idOrden }}</p>
            </div>
            <button class="h-8 w-8 grid place-items-center rounded-md hover:bg-secondary" @click="emit('close')">
              <span class="sr-only">Cerrar</span>
              ✕
            </button>
          </div>

          <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-muted/30 rounded-lg p-3">
                <div class="text-xs text-muted-foreground">Estado</div>
                <div class="text-sm font-medium">{{ estado || '—' }}</div>
              </div>
              <div class="bg-muted/30 rounded-lg p-3">
                <div class="text-xs text-muted-foreground">Fecha</div>
                <div class="text-sm font-medium">{{ fecha ? new Date(fecha).toLocaleString('es-ES') : '—' }}</div>
              </div>
              <div class="bg-muted/30 rounded-lg p-3">
                <div class="text-xs text-muted-foreground">Total</div>
                <div class="text-sm font-bold text-primary">{{ total != null ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(total) : '—' }}</div>
              </div>
              <div v-if="direccion" class="bg-muted/30 rounded-lg p-3 sm:col-span-2">
                <div class="text-xs text-muted-foreground">Dirección de envío</div>
                <div class="text-sm font-medium">{{ direccion }}</div>
              </div>
              <div v-if="observaciones" class="bg-muted/30 rounded-lg p-3 sm:col-span-2">
                <div class="text-xs text-muted-foreground">Observaciones</div>
                <div class="text-sm">{{ observaciones }}</div>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-semibold mb-2">Productos</h4>
              <div v-if="items.length" class="divide-y divide-border border border-border rounded-lg overflow-hidden">
                <div v-for="(it, idx) in items" :key="idx" class="p-3 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">{{ it.nombreProducto || it.nombre || it.titulo || 'Producto' }}</div>
                    <div class="text-xs text-muted-foreground">Cantidad: {{ it.cantidad || it.qty || 1 }}</div>
                  </div>
                  <div class="text-sm font-medium">
                    {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format((it.subtotal ?? it.precioTotal ?? ((it.precioUnitario ?? it.precio ?? 0) * (it.cantidad ?? it.qty ?? 1)))) }}
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-muted-foreground">No hay productos disponibles para este pedido.</div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-border flex justify-end">
            <button class="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary transition" @click="emit('close')">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
