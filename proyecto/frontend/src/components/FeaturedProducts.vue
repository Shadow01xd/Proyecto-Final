<script setup>
import { defineEmits, ref, onMounted, computed, watch } from 'vue'

const emit = defineEmits(['add-to-cart'])

const products = ref([])

// Roles: mostrar editor solo a ADMIN / ADMINISTRADOR / EMPLEADO
const isStaff = ref(false)
const FEATURED_KEY = 'featured_products_selection'

// IDs seleccionados (hasta 8)
const featuredIds = ref([])
// Modal editor
const isEditorOpen = ref(false)
const editorSearch = ref('')
const editorCategoryFilter = ref('')

function toCard(p) {
  return {
    id: p.idProducto,
    name: p.nombreProducto,
    category: p.nombreCategoria,
    stock: Number(p.stockProducto ?? 0),
    originalPrice: Number(p.precioProducto || 0),
    offerPrice: p.precioOferta != null ? Number(p.precioOferta) : null,
    discountPct: p.porcentajeDescuento || null,
    offerName: p.nombreOferta || '',
    price: `$${Number((p.precioOferta != null ? p.precioOferta : p.precioProducto) || 0).toFixed(2)}`,
    rating: 4.8,
    reviews: 100,
    badge: 'Destacado',
    image: p.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'
  }
}

function canAdd(card) {
  if (!card) return false
  const s = Number(card.stock ?? 0)
  return s > 0
}

function loadRole() {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null')
    const rol = (u?.nombreRol || '').toUpperCase()
    isStaff.value = rol === 'ADMIN' || rol === 'ADMINISTRADOR' || rol === 'EMPLEADO'
  } catch {
    isStaff.value = false
  }
}

function loadFeaturedFromStorage() {
  try {
    const raw = localStorage.getItem(FEATURED_KEY)
    const arr = raw ? JSON.parse(raw) : []
    if (Array.isArray(arr)) featuredIds.value = arr.slice(0, 8)
  } catch {
    featuredIds.value = []
  }
}

function saveFeaturedToStorage() {
  try {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredIds.value.slice(0, 8)))
  } catch { }
}

async function loadProducts() {
  try {
    const res = await fetch('http://localhost:3000/api/productos')
    if (!res.ok) throw new Error('No se pudieron cargar productos')
    const data = await res.json()
    const cards = (data || []).map(toCard)
    products.value = cards

    // si no hay selección previa, tomar primeros hasta 4 por defecto
    if (!featuredIds.value.length) {
      featuredIds.value = cards.slice(0, 4).map(p => p.id)
      saveFeaturedToStorage()
    }
  } catch (e) {
    products.value = []
  }
}

onMounted(() => {
  loadRole()
  loadFeaturedFromStorage()
  loadProducts()
})

watch(featuredIds, saveFeaturedToStorage, { deep: true })

const featuredProducts = computed(() => {
  if (!products.value.length) return []
  const map = new Map(products.value.map(p => [p.id, p]))
  const picked = featuredIds.value
    .map(id => map.get(id))
    .filter(Boolean)
    .slice(0, 8)
  if (picked.length) return picked
  // fallback por si algo falla
  return products.value.slice(0, 4)
})

// Carousel (para 1-3)
const currentSlide = ref(0)
const totalSlides = computed(() => featuredProducts.value.length)
const showSingle = computed(() => totalSlides.value === 1)
const showCarousel = computed(() => totalSlides.value >= 2 && totalSlides.value <= 3)
const showGrid = computed(() => totalSlides.value >= 4 && totalSlides.value <= 8)

function nextSlide() {
  if (!totalSlides.value) return
  currentSlide.value = (currentSlide.value + 1) % totalSlides.value
}
function prevSlide() {
  if (!totalSlides.value) return
  currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value
}

// Helpers UI editor
const maxReached = computed(() => featuredIds.value.length >= 8)
function toggleFeatured(id) {
  const idx = featuredIds.value.indexOf(id)
  if (idx >= 0) {
    featuredIds.value.splice(idx, 1)
    if (currentSlide.value >= featuredIds.value.length) currentSlide.value = 0
  } else {
    if (featuredIds.value.length < 8) featuredIds.value.push(id)
  }
}
const isChecked = id => featuredIds.value.includes(id)

const editorCategories = computed(() => {
  const set = new Set()
  for (const p of products.value) {
    if (p.category) set.add(p.category)
  }
  return Array.from(set)
})

const filteredEditorProducts = computed(() => {
  const q = (editorSearch.value || '').trim().toLowerCase()
  const cat = editorCategoryFilter.value

  return products.value.filter(p => {
    if (cat && p.category !== cat) return false
    if (!q) return true
    const name = (p.name || '').toLowerCase()
    const sku = (p.sku || '').toLowerCase?.() || ''
    return name.includes(q) || sku.includes(q)
  })
})

// Mantener índice válido si cambia el número de slides
watch(totalSlides, (n) => {
  if (currentSlide.value >= n) currentSlide.value = 0
})
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fade-in-up-soft">
    <div class="space-y-12">
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <h2 class="text-3xl md:text-4xl font-bold text-foreground">Productos Destacados</h2>
            <p class="text-lg text-muted-foreground">Los componentes más veloces y confiables del mercado</p>
          </div>
          <div v-if="isStaff" class="mt-1">
            <button
              class="px-4 py-2 rounded-md text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-red-600 dark:hover:bg-red-700"
              @click="isEditorOpen = true">
              Editar destacados
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Editor: visible solo para staff -->
      <div v-if="isStaff && isEditorOpen" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-black/50" @click="isEditorOpen = false"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="w-full max-w-2xl bg-card border border-border rounded-lg shadow-lg">
            <div class="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
              <h3 class="font-semibold text-foreground">Editar destacados</h3>
              <div class="flex items-center gap-3 text-sm text-muted-foreground flex-wrap justify-end">
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">🔍</span>
                    <input
                      v-model="editorSearch"
                      type="text"
                      placeholder="Buscar por nombre o SKU"
                      class="pl-7 pr-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-56"
                    />
                  </div>
                  <select
                    v-model="editorCategoryFilter"
                    class="py-1.5 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Todas las categorías</option>
                    <option v-for="c in editorCategories" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <span>Seleccionados: {{ featuredIds.length }}/8</span>
                <button class="h-8 w-8 grid place-items-center rounded-md hover:bg-secondary/40" @click="isEditorOpen = false">✕</button>
              </div>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1">
                <label v-for="p in filteredEditorProducts" :key="p.id"
                  :class="['flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors', isChecked(p.id) ? 'bg-secondary/30 border-primary' : 'border-border hover:bg-secondary/40']">
                  <input type="checkbox" class="rounded border-border text-primary focus:ring-primary"
                    :checked="isChecked(p.id)" :disabled="!isChecked(p.id) && maxReached" @change="toggleFeatured(p.id)" />
                  <span class="text-sm text-foreground truncate">{{ p.name }}</span>
                </label>
              </div>
              <p class="text-xs text-muted-foreground">Elige hasta 8 productos. Si seleccionas 1 a 3, se mostrará un carrusel;
                si seleccionas 4 a 8, se mostrarán tarjetas.</p>
              <div class="flex justify-end gap-2 pt-2">
                <button class="px-4 py-2 rounded-md border border-border hover:bg-secondary/40" @click="isEditorOpen = false">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista: Único (1) -->
      <div v-if="showSingle" class="">
        <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div class="grid md:grid-cols-12 md:gap-6">
            <div class="relative md:col-span-5">
              <router-link :to="{ name: 'producto', params: { id: featuredProducts[0].id } }" class="w-full bg-muted flex items-center justify-center p-3 rounded-lg border border-border"
                style="aspect-ratio: 16/9;">
                <img :src="featuredProducts[0].image" :alt="featuredProducts[0].name"
                  class="max-h-full max-w-full object-contain" loading="lazy" />
              </router-link>
              <div
                v-if="featuredProducts[0].discountPct"
                class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                -{{ featuredProducts[0].discountPct }}%
              </div>
              <div v-if="featuredProducts[0].offerName" class="absolute bottom-3 left-3 right-3">
                <div class="backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold text-center shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                  {{ featuredProducts[0].offerName }}
                </div>
              </div>
            </div>
            <div class="md:col-span-7 p-6 md:p-8 space-y-4 flex flex-col justify-center">
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{{
                  featuredProducts[0].category }}</p>
                <h3 class="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                  <router-link :to="{ name: 'producto', params: { id: featuredProducts[0].id } }" class="hover:underline">
                    {{ featuredProducts[0].name }}
                  </router-link>
                </h3>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <svg v-for="star in 5" :key="star" class="h-4 w-4 transition-colors"
                    :class="star <= Math.floor(featuredProducts[0].rating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'"
                    viewBox="0 0 24 24">
                    <path
                      d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.785 1.401 8.168L12 18.896l-7.335 3.868 1.401-8.168L.132 9.211l8.2-1.193L12 .587z" />
                  </svg>
                  <span class="text-sm font-semibold text-foreground">{{ featuredProducts[0].rating }}</span>
                </div>
                <span class="text-xs text-muted-foreground">({{ featuredProducts[0].reviews }})</span>
              </div>
              <div
                class="pt-3 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p class="text-2xl md:text-3xl font-bold text-foreground flex items-baseline gap-3">
                  <span :class="featuredProducts[0].offerPrice ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">${{ Number((featuredProducts[0].offerPrice ?? featuredProducts[0].originalPrice) || 0).toFixed(2) }}</span>
                  <span v-if="featuredProducts[0].offerPrice" class="text-lg line-through text-muted-foreground">${{ Number(featuredProducts[0].originalPrice || 0).toFixed(2) }}</span>
                </p>
                <button
                  :disabled="!canAdd(featuredProducts[0])"
                  class="w-full md:w-auto px-6 py-2 rounded-md bg-primary hover:opacity-90 text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="canAdd(featuredProducts[0]) && emit('add-to-cart', featuredProducts[0])">
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista: Carrusel (2-3) -->
      <div v-if="showCarousel" class="relative">
        <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-hidden">
            <div class="flex transition-transform duration-500"
              :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
              <div v-for="(p, idx) in featuredProducts" :key="p.id" class="w-full flex-shrink-0">
                <div class="grid md:grid-cols-12 md:gap-6">
                  <!-- Imagen del producto -->
                  <div class="relative md:col-span-5">
                    <router-link :to="{ name: 'producto', params: { id: p.id } }" class="w-full bg-muted flex items-center justify-center p-3 rounded-lg border border-border"
                      style="aspect-ratio: 16/9;">
                      <img :src="p.image" :alt="p.name" class="max-h-full max-w-full object-contain" loading="lazy" />
                    </router-link>
                    <!-- Badges oferta -->
                    <div
                      v-if="p.discountPct"
                      class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                      -{{ p.discountPct }}%
                    </div>
                    <div v-if="p.offerName" class="absolute bottom-3 left-3 right-3">
                      <div class="backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold text-center shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                        {{ p.offerName }}
                      </div>
                    </div>
                  </div>

                  <!-- Información del producto -->
                  <div class="md:col-span-7 p-6 md:p-8 space-y-4 flex flex-col justify-center">
                    <div class="space-y-1">
                      <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {{ p.category }}
                      </p>
                      <h3 class="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                        <router-link :to="{ name: 'producto', params: { id: p.id } }" class="hover:underline">
                          {{ p.name }}
                        </router-link>
                      </h3>
                    </div>

                    <!-- Rating -->
                    <div class="flex items-center gap-2">
                      <div class="flex items-center gap-1 text-primary">
                        <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path
                            d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.785 1.401 8.168L12 18.896l-7.335 3.868 1.401-8.168L.132 9.211l8.2-1.193L12 .587z" />
                        </svg>
                        <span class="text-sm font-semibold text-foreground">{{ p.rating }}</span>
                      </div>
                      <span class="text-xs text-muted-foreground">({{ p.reviews }})</span>
                    </div>

                    <!-- Precio y botón -->
                    <div
                      class="pt-3 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p class="text-2xl md:text-3xl font-bold text-foreground flex items-baseline gap-3">
                        <span :class="p.offerPrice ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">${{ Number((p.offerPrice ?? p.originalPrice) || 0).toFixed(2) }}</span>
                        <span v-if="p.offerPrice" class="text-lg line-through text-muted-foreground">${{ Number(p.originalPrice || 0).toFixed(2) }}</span>
                      </p>
                      <button
                        :disabled="!canAdd(p)"
                        class="w-full md:w-auto px-6 rounded-md bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="canAdd(p) && emit('add-to-cart', p)">
                        Agregar al carrito
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de navegación -->
        <button @click="prevSlide"
          class="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur text-foreground hover:bg-background rounded-full h-9 w-9 grid place-items-center border border-border shadow-sm"
          aria-label="Producto anterior">
          ‹
        </button>

        <button @click="nextSlide"
          class="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur text-foreground hover:bg-background rounded-full h-9 w-9 grid place-items-center border border-border shadow-sm"
          aria-label="Producto siguiente">
          ›
        </button>

        <!-- Indicadores -->
        <div class="mt-3 flex justify-center gap-2">
          <button v-for="(p, i) in featuredProducts" :key="p.id" class="h-2 w-2 rounded-full border"
            :class="i === currentSlide ? 'bg-primary border-primary' : 'bg-muted-foreground/30 border-border'"
            @click="currentSlide = i" :aria-label="`Ir a producto ${i + 1}`" />
        </div>
      </div>

      <!-- Vista: Grid (4-8) -->
      <div v-if="showGrid" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="p in featuredProducts"
          :key="p.id"
          class="group flex flex-col overflow-hidden rounded-lg border border-border bg-card/95 backdrop-blur shadow-sm transition hover:border-primary hover:-translate-y-0.5 hover:shadow-lg"
        >
          <router-link :to="{ name: 'producto', params: { id: p.id } }" class="relative h-48 overflow-hidden bg-muted block">
            <img :src="p.image" :alt="p.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            <span
              v-if="p.category"
              class="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              {{ p.category }}
            </span>
            <span
              v-if="p.discountPct"
              class="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white"
            >
              -{{ p.discountPct }}%
            </span>
            <div v-if="p.offerName" class="absolute left-3 right-3 bottom-3">
              <div class="backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-semibold text-center shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                {{ p.offerName }}
              </div>
            </div>
          </router-link>

          <div class="flex flex-1 flex-col p-4 gap-3">
            <div class="space-y-1">
              <router-link :to="{ name: 'producto', params: { id: p.id } }" class="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{{ p.name }}</router-link>
            </div>

            <div class="mt-auto flex items-center justify-between">
              <div class="space-y-0.5">
                <p class="text-lg font-bold text-foreground flex items-baseline gap-2">
                  <span :class="p.offerPrice ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">${{ Number((p.offerPrice ?? p.originalPrice) || 0).toFixed(2) }}</span>
                  <span v-if="p.offerPrice" class="text-xs line-through text-muted-foreground">${{ Number(p.originalPrice || 0).toFixed(2) }}</span>
                </p>
              </div>
              <button
                :disabled="!canAdd(p)"
                class="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition transform hover:-translate-y-0.5 hover:shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="canAdd(p) && emit('add-to-cart', p)"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
