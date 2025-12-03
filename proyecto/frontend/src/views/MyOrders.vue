<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import OrderDetailsModal from '@/components/OrderDetailsModal.vue'

const router = useRouter()

const usuario = ref(null)
const orders = ref([])
const loading = ref(true)
const error = ref('')

// Cart badge
const cartCount = ref(0)
function getUserId() {
  try {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.idUsuario || null
  } catch { return null }
}
async function loadCartCount() {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'
  if (uid) {
    try {
      const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
      if (res.ok) {
        const data = await res.json()
        cartCount.value = (data.items || []).length
        return
      }
    } catch {}
  }
  try {
    const raw = localStorage.getItem(key)
    const items = raw ? JSON.parse(raw) : []
    cartCount.value = items.length
  } catch { cartCount.value = 0 }
}

onMounted(async () => {
  const userData = localStorage.getItem('usuario')
  if (!userData) {
    router.push('/login')
    return
  }

  try {
    usuario.value = JSON.parse(userData)
    await loadOrders()
    await loadCartCount()
  } catch (e) {
    console.error('Error al parsear usuario:', e)
    localStorage.removeItem('usuario')
    router.push('/login')
  }
})

const loadOrders = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`http://localhost:3000/api/ordenes/usuario/${usuario.value.idUsuario}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar pedidos')
    }

    const backendOrders = Array.isArray(data.ordenes) ? data.ordenes : []
    backendOrders.sort((a, b) => {
      const da = new Date(a.fechaOrden || a.fecha || 0).getTime()
      const db = new Date(b.fechaOrden || b.fecha || 0).getTime()
      return db - da
    })

    orders.value = backendOrders
  } catch (err) {
    error.value = err.message || 'Error al cargar pedidos'
    orders.value = []
  } finally {
    loading.value = false
  }
}

const getStatusColor = (status) => {
  const colors = {
    'Pendiente': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    'Pagada': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Enviada': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Cancelada': 'bg-red-500/10 text-red-600 border-red-500/20'
  }
  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const showDetails = ref(false)
const selectedOrder = ref(null)
const openDetails = async (order) => {
  if (!order) return

  // Si la orden ya trae detalles (simulada o ya cargada), abrir directo
  const hasItems = Array.isArray(order.detalles) || Array.isArray(order.items) || Array.isArray(order.productos)
  if (!order.sim && !hasItems && order.idOrden != null) {
    try {
      const res = await fetch(`http://localhost:3000/api/ordenes/${order.idOrden}`)
      const data = await res.json()
      if (res.ok && data && data.detalle) {
        order = { ...order, detalles: data.detalle }
      }
    } catch {
      // si falla, seguimos mostrando lo que tengamos
    }
  }

  selectedOrder.value = order
  showDetails.value = true
}
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />

    <main class="flex-1 py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold">Mis Pedidos</h1>
          <p class="text-xs sm:text-sm text-muted-foreground mt-1">Historial de tus compras</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p class="mt-4 text-muted-foreground">Cargando pedidos...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <!-- Sin pedidos -->
        <div v-else-if="orders.length === 0" class="text-center py-12">
          <svg class="mx-auto h-24 w-24 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <h3 class="mt-4 text-lg font-semibold">No tienes pedidos</h3>
          <p class="text-muted-foreground mt-1">Cuando realices una compra, aparecerá aquí</p>
          <RouterLink
            to="/"
            class="inline-block mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition font-medium"
          >
            Ir a la tienda
          </RouterLink>
        </div>

        <!-- Lista de pedidos -->
        <div v-else class="space-y-4">
          <div
            v-for="order in orders"
            :key="order.idOrden"
            class="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition"
          >
            <!-- Header del pedido -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold">Pedido #{{ order.idOrden }}</h3>
                  <span :class="['text-xs px-2.5 py-1 rounded-full border font-medium', getStatusColor(order.estadoOrden)]">
                    {{ order.estadoOrden }}
                  </span>
                  <span v-if="order.sim" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">Simulado</span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">{{ formatDate(order.fechaOrden) }}</p>
              </div>
              <div class="text-left md:text-right">
                <p class="text-sm text-muted-foreground">Total</p>
                <p class="text-2xl font-bold text-primary">{{ formatCurrency(order.totalOrden) }}</p>
              </div>
            </div>

            <!-- Detalles del pedido -->
            <div class="space-y-2">
              <div v-if="order.direccionEnvio" class="flex items-start gap-2">
                <svg class="h-5 w-5 text-muted-foreground mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <p class="text-sm font-medium">Dirección de envío</p>
                  <p class="text-sm text-muted-foreground">{{ order.direccionEnvio }}</p>
                </div>
              </div>

              <div v-if="order.observaciones" class="flex items-start gap-2">
                <svg class="h-5 w-5 text-muted-foreground mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <div>
                  <p class="text-sm font-medium">Observaciones</p>
                  <p class="text-sm text-muted-foreground">{{ order.observaciones }}</p>
                </div>
              </div>
            </div>

            <!-- Acciones -->
            <div class="mt-4 pt-4 border-t border-border flex gap-2">
              <button class="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary transition font-medium" @click="openDetails(order)">
                Ver Detalles
              </button>
              <button
                v-if="order.estadoOrden === 'Pendiente'"
                class="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary transition font-medium text-red-500 hover:text-red-600"
              >
                Cancelar Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <OrderDetailsModal :open="showDetails" :order="selectedOrder" @close="showDetails = false" />

    <Footer />
  </div>
</template>
