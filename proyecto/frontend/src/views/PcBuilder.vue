<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()

const categorias = ref([])
const productos = ref([])

const loading = ref(false)
const error = ref('')

const activeCategoryId = ref(null)
const selectedComponents = ref({}) // { [idCategoria]: producto }
const draggedProduct = ref(null)
const dragSource = ref(null) // 'lista' | 'resumen' | null
const isDragOverResumen = ref(false)

const BUILDER_PERSIST_KEY = 'pc_builder_selection'

const cartCount = ref(0)
const addingToCart = ref(false)
const addMessage = ref('')
const addMessageType = ref('') // success | error

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

function handleDragStart(producto, source) {
  draggedProduct.value = producto
  dragSource.value = source
}

function handleDropOnResumen() {
  if (!draggedProduct.value) return
  if (dragSource.value === 'resumen') {
    quitarComponente(draggedProduct.value.idCategoria)
  } else {
    toggleSelect(draggedProduct.value)
  }
  draggedProduct.value = null
  dragSource.value = null
  isDragOverResumen.value = false
}

function handleDragOverResumen() {
  isDragOverResumen.value = true
}

function handleDragLeaveResumen() {
  isDragOverResumen.value = false
}

function saveBuilderSelection() {
  try {
    const ids = Object.values(selectedComponents.value).map(p => p.idProducto)
    localStorage.setItem(BUILDER_PERSIST_KEY, JSON.stringify(ids))
  } catch {}
}

function restoreBuilderSelection() {
  try {
    const raw = localStorage.getItem(BUILDER_PERSIST_KEY)
    if (!raw) return
    const ids = JSON.parse(raw)
    const map = {}
    for (const id of ids) {
      const p = productos.value.find(pr => pr.idProducto === id)
      if (p) {
        map[p.idCategoria] = p
      }
    }
    selectedComponents.value = map
  } catch {}
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [resCats, resProds] = await Promise.all([
      fetch('http://localhost:3000/api/categorias'),
      fetch('http://localhost:3000/api/productos')
    ])

    if (!resCats.ok) throw new Error('No se pudieron cargar las categorías')
    if (!resProds.ok) throw new Error('No se pudieron cargar los productos')

    const dataCats = await resCats.json()
    const dataProds = await resProds.json()

    categorias.value = dataCats || []
    productos.value = dataProds || []

    if (categorias.value.length > 0) {
      activeCategoryId.value = categorias.value[0].idCategoria
    }
  } catch (e) {
    error.value = e.message || 'Error al cargar datos de armado'
  } finally {
    loading.value = false
  }
}

const productosPorCategoria = computed(() => {
  const map = {}
  for (const c of categorias.value) {
    map[c.idCategoria] = productos.value.filter(p => Number(p.idCategoria) === Number(c.idCategoria))
  }
  return map
})

const totalSeleccionado = computed(() => {
  return Object.values(selectedComponents.value).reduce((sum, p) => {
    return sum + Number((p.precioOferta ?? p.precioProducto) || 0)
  }, 0)
})

const componentesSeleccionadosLista = computed(() => {
  const list = []
  for (const c of categorias.value) {
    const p = selectedComponents.value[c.idCategoria]
    if (p) {
      list.push({ categoria: c.nombreCategoria, producto: p })
    }
  }
  return list
})

function quitarComponente(idCategoria) {
  const copy = { ...selectedComponents.value }
  delete copy[idCategoria]
  selectedComponents.value = copy
  saveBuilderSelection()
}

function limpiarSeleccion() {
  selectedComponents.value = {}
  saveBuilderSelection()
}

function toggleSelect(producto) {
  const idCat = producto.idCategoria
  const current = selectedComponents.value[idCat]
  if (current && current.idProducto === producto.idProducto) {
    const copy = { ...selectedComponents.value }
    delete copy[idCat]
    selectedComponents.value = copy
  } else {
    selectedComponents.value = {
      ...selectedComponents.value,
      [idCat]: producto
    }
  }
  saveBuilderSelection()
}

async function initCartCount() {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'

  if (uid) {
    try {
      const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
      if (res.ok) {
        const data = await res.json()
        cartCount.value = (data.items || []).length
      }
    } catch {
      cartCount.value = 0
    }
  } else {
    try {
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []
      cartCount.value = items.length
    } catch {
      cartCount.value = 0
    }
  }
}

async function agregarBuildAlCarrito() {
  addMessage.value = ''
  addMessageType.value = ''

  const seleccion = Object.values(selectedComponents.value)
  if (seleccion.length === 0) {
    addMessage.value = 'Selecciona al menos un componente para agregar al carrito.'
    addMessageType.value = 'error'
    return
  }

  addingToCart.value = true

  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'

  try {
    if (uid) {
      // Usuario logueado: agregar cada componente en backend
      for (const p of seleccion) {
        await fetch('http://localhost:3000/api/carrito/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuario: uid, idProducto: p.idProducto, cantidad: 1 })
        })
      }

      const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
      const data = res.ok ? await res.json() : { items: [] }
      cartCount.value = (data.items || []).length
    } else {
      // Invitado: almacenar en localStorage
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []

      for (const p of seleccion) {
        const card = {
          id: p.idProducto,
          name: p.nombreProducto,
          price: `$${Number(p.precioProducto || 0).toFixed(2)}`,
          image: p.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'
        }
        items.push(card)
      }

      localStorage.setItem(key, JSON.stringify(items))
      cartCount.value = items.length
    }

    addMessage.value = 'Tu selección se agregó al carrito. Puedes revisarla antes de comprar.'
    addMessageType.value = 'success'
  } catch {
    addMessage.value = 'No se pudo agregar la build al carrito. Intenta nuevamente.'
    addMessageType.value = 'error'
  } finally {
    addingToCart.value = false
  }
}

function irAlCarrito() {
  router.push({ name: 'carrito' })
}

onMounted(async () => {
  await Promise.all([loadData(), initCartCount()])
  restoreBuilderSelection()
})
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col gap-6 md:gap-8">
      <section class="space-y-3">
        <p class="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-primary">
          <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">★</span>
          Arma tu PC
        </p>
        <h1 class="text-2xl md:text-3xl font-bold">Diseña tu propio equipo paso a paso</h1>
        <p class="text-sm md:text-base text-muted-foreground max-w-2xl">
          Elige un componente por categoría y mira el precio total en tiempo real. Al finalizar, podrás enviar toda tu
          selección al carrito para revisarla antes de comprar.
        </p>
      </section>

      <section v-if="error" class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </section>

      <section v-else class="flex flex-col lg:flex-row gap-6 md:gap-8">
        <!-- Columna izquierda: categorías y productos -->
        <div class="flex-1 space-y-4">
          <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory touch-pan-x">
            <button
              v-for="cat in categorias"
              :key="cat.idCategoria"
              class="whitespace-nowrap rounded-full border px-3.5 py-2 text-sm md:text-xs font-medium transition-colors flex items-center gap-1 shadow-sm flex-shrink-0 snap-start"
              :class="Number(activeCategoryId) === Number(cat.idCategoria)
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-background text-foreground border-border hover:bg-secondary/70'"
              @click="activeCategoryId = cat.idCategoria"
              :aria-pressed="Number(activeCategoryId) === Number(cat.idCategoria)"
            >
              {{ cat.nombreCategoria }}
            </button>
          </div>

          <div v-if="loading" class="py-10 text-center text-muted-foreground text-sm">
            Cargando componentes...
          </div>

          <div v-else>
            <p class="text-xs text-muted-foreground mb-2">
              Selecciona uno de los componentes de la categoría actual. Puedes cambiarlo en cualquier momento.
            </p>

            <div v-if="!activeCategoryId || (productosPorCategoria[activeCategoryId] || []).length === 0" class="py-8 text-center text-xs text-muted-foreground">
              No hay productos disponibles para esta categoría.
            </div>

            <div
              v-else
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <div
                v-for="p in productosPorCategoria[activeCategoryId]"
                :key="p.idProducto"
                class="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary hover:-translate-y-0.5 hover:shadow-lg cursor-move"
                draggable="true"
                @dragstart="handleDragStart(p, 'lista')"
              >
                <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="relative h-36 overflow-hidden bg-muted block">
                  <img
                    :src="p.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'"
                    :alt="p.nombreProducto"
                    class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span
                    v-if="p.porcentajeDescuento"
                    class="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white"
                  >
                    -{{ p.porcentajeDescuento }}%
                  </span>
                  <div v-if="p.nombreOferta" class="absolute left-2 right-2 bottom-2">
                    <div class="backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-center shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                      {{ p.nombreOferta }}
                    </div>
                  </div>
                </router-link>

                <div class="flex flex-1 flex-col p-3 gap-2">
                  <div class="space-y-1">
                    <p class="text-[11px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      SKU: {{ p.skuProducto }}
                    </p>
                    <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{{ p.nombreProducto }}</router-link>
                    <p class="line-clamp-2 text-[11px] text-muted-foreground">
                      {{ p.descripcionProducto || 'Componente para tu próxima build.' }}
                    </p>
                  </div>

                  <div class="mt-auto flex items-center justify-between gap-2">
                    <div>
                      <p class="text-sm font-bold text-foreground flex items-baseline gap-1.5">
                        <span :class="p.precioOferta ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">${{ Number((p.precioOferta ?? p.precioProducto) || 0).toFixed(2) }}</span>
                        <span v-if="p.precioOferta" class="text-[11px] line-through text-muted-foreground">${{ Number(p.precioProducto || 0).toFixed(2) }}</span>
                      </p>
                    </div>

                    <button
                      class="rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors shadow-sm"
                      :class="selectedComponents[p.idCategoria] && selectedComponents[p.idCategoria].idProducto === p.idProducto
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-primary/40 text-primary hover:bg-primary/10 bg-background'"
                      @click="toggleSelect(p)"
                    >
                      {{ selectedComponents[p.idCategoria] && selectedComponents[p.idCategoria].idProducto === p.idProducto ? 'Seleccionado' : 'Seleccionar' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna derecha: resumen -->
        <aside class="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
          <div
            class="rounded-2xl border bg-gradient-to-b from-card to-background p-4 space-y-3 shadow-sm"
            :class="isDragOverResumen ? 'border-primary/70 bg-background/90' : 'border-border'"
            @dragover.prevent="handleDragOverResumen"
            @dragleave.prevent="handleDragLeaveResumen"
            @drop.prevent="handleDropOnResumen"
          >
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px]">◎</span>
              Resumen de tu build
            </h2>
            <p class="text-xs text-muted-foreground">
              Revisa los componentes seleccionados y el precio estimado. Podrás ajustar cantidades y detalles en el
              carrito antes de pagar.
            </p>

            <div class="max-h-64 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/60 bg-background/80">
              <div
                v-if="componentesSeleccionadosLista.length === 0"
                class="p-3 text-xs text-muted-foreground text-center"
              >
                Todavía no has seleccionado componentes. Empieza eligiendo una categoría.
              </div>
              <div
                v-for="item in componentesSeleccionadosLista"
                :key="item.categoria + '-' + item.producto.idProducto"
                class="p-3 flex items-start justify-between gap-3 cursor-move"
                draggable="true"
                @dragstart="handleDragStart(item.producto, 'resumen')"
              >
                <div class="space-y-0.5">
                  <p class="text-[11px] font-medium text-primary">{{ item.categoria }}</p>
                  <p class="text-xs font-semibold line-clamp-2">{{ item.producto.nombreProducto }}</p>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <p class="text-xs font-semibold flex items-baseline gap-1.5">
                    <span :class="item.producto.precioOferta ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">${{ Number((item.producto.precioOferta ?? item.producto.precioProducto) || 0).toFixed(2) }}</span>
                    <span v-if="item.producto.precioOferta" class="text-[10px] line-through text-muted-foreground">${{ Number(item.producto.precioProducto || 0).toFixed(2) }}</span>
                  </p>
                  <button
                    class="text-[10px] text-red-500 hover:text-red-400"
                    draggable="false"
                    @click.stop="quitarComponente(item.producto.idCategoria)"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-xs text-muted-foreground">Total estimado</span>
              <span class="text-lg font-bold">
                ${{ totalSeleccionado.toFixed(2) }}
              </span>
            </div>

            <div class="space-y-2 pt-1">
              <button
                v-if="componentesSeleccionadosLista.length > 0"
                class="w-full rounded-md border border-border px-4 py-2 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
                @click="limpiarSeleccion"
              >
                Limpiar selección
              </button>

              <button
                class="w-full rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="addingToCart || componentesSeleccionadosLista.length === 0"
                @click="agregarBuildAlCarrito"
              >
                {{ addingToCart ? 'Agregando...' : 'Agregar build al carrito' }}
              </button>

              <button
                class="w-full rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                @click="irAlCarrito"
              >
                Ir al carrito
              </button>

              <p
                v-if="addMessage"
                class="text-[11px]"
                :class="addMessageType === 'success' ? 'text-green-500' : 'text-red-500'"
              >
                {{ addMessage }}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
</style>
