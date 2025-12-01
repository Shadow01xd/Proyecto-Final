<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import FeaturedProducts from '@/components/FeaturedProducts.vue'

const route = useRoute()
const id = route.params.id
const loading = ref(false)
const error = ref('')
const producto = ref(null)
const cantidad = ref(1)
const cartCount = ref(0)
const lastAddedProduct = ref(null)
const showCartAlert = ref(false)

const precioMostrar = computed(() => {
  if (!producto.value) return 0
  const of = producto.value.precioOferta
  return Number((of ?? producto.value.precioProducto) || 0)
})

const precioTotal = computed(() => {
  const unit = Number(precioMostrar.value || 0)
  const qty = Number(cantidad.value || 1)
  return unit * qty
})

const ahorro = computed(() => {
  if (!producto.value?.precioOferta) return 0
  return (Number(producto.value.precioProducto) - Number(producto.value.precioOferta)) * cantidad.value
})

const incrementar = () => {
  if (cantidad.value < Number(producto.value.stockProducto || 0)) {
    cantidad.value++
  }
}

const decrementar = () => {
  if (cantidad.value > 1) {
    cantidad.value--
  }
}

function getUserId() {
  try {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.idUsuario || null
  } catch {
    return null
  }
}

async function addToCart() {
  if (!producto.value) return
  const uid = getUserId()
  const qty = Number(cantidad.value || 1)
  if (uid) {
    try {
      await fetch('http://localhost:3000/api/carrito/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario: uid, idProducto: producto.value.idProducto, cantidad: qty })
      })
      // refrescar contador
      try {
        const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
        const data = res.ok ? await res.json() : { items: [] }
        cartCount.value = (data.items || []).length
      } catch {}
    } catch {}
  } else {
    // Invitado: almacenar como un item con precio total
    const key = 'cart'
    try {
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []
      const item = {
        id: producto.value.idProducto,
        name: producto.value.nombreProducto,
        price: Number(precioTotal.value || 0),
        image: producto.value.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'
      }
      items.push(item)
      localStorage.setItem(key, JSON.stringify(items))
      cartCount.value = items.length
    } catch {}
  }
  lastAddedProduct.value = { name: producto.value.nombreProducto }
  showCartAlert.value = true
  setTimeout(() => { showCartAlert.value = false }, 2000)
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`http://localhost:3000/api/productos/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'No se pudo cargar el producto')
    }
    const data = await res.json()
    producto.value = data
  } catch (e) {
    error.value = e.message || 'Error al cargar el producto'
  } finally {
    loading.value = false
  }
  // init cart count
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
  } catch {
    cartCount.value = 0
  }
})
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />
    
    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <!-- Loading State -->
      <div v-if="loading" class="py-24 text-center">
        <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p class="mt-4 text-muted-foreground">Cargando producto...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-16 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <p class="text-red-500 font-semibold">{{ error }}</p>
      </div>

      <!-- Not Found State -->
      <div v-else-if="!producto" class="py-16 text-center">
        <p class="text-muted-foreground text-lg">Producto no encontrado</p>
      </div>

      <!-- Product Detail -->
      <div v-else class="grid gap-8 lg:grid-cols-2 items-start">
        <!-- Image Section -->
        <div class="space-y-4">
          <div class="relative group">
            <div class="w-full bg-muted flex items-center justify-center p-8 rounded-2xl border border-border overflow-hidden transition-all hover:shadow-xl" style="aspect-ratio: 1/1;">
              <img 
                :src="producto.imgProducto || 'https://via.placeholder.com/800x800?text=Producto'" 
                :alt="producto.nombreProducto" 
                class="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" 
              />
            </div>
            
            <!-- Badge de Descuento -->
            <div v-if="producto.porcentajeDescuento" class="absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold shadow-lg bg-blue-600 text-white dark:bg-red-600 dark:text-white animate-pulse">
              -{{ producto.porcentajeDescuento }}%
            </div>
            
            <!-- Badge de Oferta -->
            <div v-if="producto.nombreOferta" class="absolute bottom-4 left-4 right-4">
              <div class="backdrop-blur-md bg-blue-600/90 dark:bg-red-600/90 px-4 py-2.5 rounded-xl text-sm font-bold text-center shadow-lg text-white border border-white/20">
                {{ producto.nombreOferta }}
              </div>
            </div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="space-y-6">
          <!-- Header -->
          <div class="space-y-2">
            <div class="inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
              {{ producto.nombreCategoria }}
            </div>
            <h1 class="text-2xl md:text-3xl font-bold leading-tight">{{ producto.nombreProducto }}</h1>
            <p class="text-xs text-muted-foreground">
              <span>SKU: {{ producto.skuProducto }}</span>
            </p>
          </div>

          <!-- Price Section -->
          <div class="space-y-3">
            <div class="flex items-baseline gap-3">
              <p class="text-3xl md:text-4xl font-bold text-foreground">
                <span :class="producto?.precioOferta ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">
                  ${{ precioMostrar.toFixed(2) }}
                </span>
              </p>
              <span v-if="producto.precioOferta" class="text-lg line-through text-muted-foreground">
                ${{ Number(producto.precioProducto || 0).toFixed(2) }}
              </span>
            </div>
            
            <div class="flex items-center gap-3">
              <div v-if="ahorro > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span class="text-xs font-semibold">Ahorras ${{ ahorro.toFixed(2) }}</span>
              </div>

              <!-- Stock Badge -->
              <div class="inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold"
                :class="Number(producto.stockProducto || 0) > 5 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'">
                <span class="w-1.5 h-1.5 rounded-full" :class="Number(producto.stockProducto || 0) > 5 ? 'bg-emerald-500' : 'bg-red-500'"></span>
                <span>{{ Number(producto.stockProducto || 0) > 5 ? 'En stock' : 'Stock limitado' }}</span>
                <span>({{ producto.stockProducto ?? 0 }})</span>
              </div>
            </div>
            <!-- Total -->
            <div class="flex items-baseline gap-2 text-sm text-muted-foreground">
              <span>Total:</span>
              <span class="text-lg font-semibold text-foreground">${{ precioTotal.toFixed(2) }}</span>
              <span class="opacity-70">(x{{ cantidad }})</span>
            </div>
          </div>

          <!-- Description -->
          <div class="space-y-2 bg-muted/30 p-4 rounded-lg border border-border">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Descripción
            </h2>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ producto.descripcionProducto || 'Este producto no cuenta con una descripción detallada.' }}
            </p>
          </div>

          <!-- Quantity & Add to Cart -->
          <div class="space-y-3 pt-2">
            <!-- Quantity Selector -->
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold">Cantidad:</span>
              <div class="flex items-center gap-0 border border-border rounded-lg overflow-hidden bg-muted/30">
                <button 
                  @click="decrementar"
                  :disabled="cantidad <= 1"
                  class="px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm">
                  -
                </button>
                <span class="px-4 py-2 font-semibold text-sm min-w-[2.5rem] text-center border-x border-border">{{ cantidad }}</span>
                <button 
                  @click="incrementar"
                  :disabled="cantidad >= Number(producto.stockProducto || 0)"
                  class="px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm">
                  +
                </button>
              </div>
            </div>

            <!-- Add to Cart Button -->
            <button 
              :disabled="Number(producto.stockProducto || 0) === 0"
              @click="addToCart"
              class="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">
              <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span>{{ Number(producto.stockProducto || 0) === 0 ? 'Sin stock' : 'Agregar al carrito' }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Sección de productos destacados para rellenar la parte inferior -->
      <section class="mt-10 sm:mt-12">
        <FeaturedProducts />
      </section>
    </main>

    <Footer />
    <transition name="fade">
      <div
        v-if="showCartAlert && lastAddedProduct"
        class="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 bg-primary text-primary-foreground px-3 py-2 sm:px-4 sm:py-2 rounded shadow-lg text-xs sm:text-sm max-w-full sm:max-w-sm md:max-w-md mx-auto sm:mx-0"
      >
        {{ lastAddedProduct.name }} agregado al carrito
      </div>
    </transition>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>