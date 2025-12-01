<script setup>
import { ref, onMounted, computed } from 'vue'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const productos = ref([])
const categorias = ref([])
const proveedores = ref([])

const loading = ref(false)
const error = ref('')

const search = ref('')
const selectedCategory = ref('')
const minPrice = ref('')
const maxPrice = ref('')
const sortBy = ref('relevance')

const cartCount = ref(0)
const lastAddedProduct = ref(null)
const showCartAlert = ref(false)

// Rol / permisos
const usuario = ref(null)
const isStaff = ref(false)

// Modal de producto (CRUD para staff)
const showProductModal = ref(false)
const editingProduct = ref(null)
const productForm = ref({
  idCategoria: '',
  idProveedor: '',
  nombreProducto: '',
  descripcionProducto: '',
  precioProducto: '',
  stockProducto: '',
  garantiaMeses: '',
  skuProducto: '',
  imgProducto: ''
})

function getUserId() {
  try {
    const raw = localStorage.getItem('usuario')
    if (!raw) return null
    const u = JSON.parse(raw)
    usuario.value = u
    const rol = (u?.nombreRol || '').toUpperCase()
    isStaff.value = rol === 'ADMIN' || rol === 'ADMINISTRADOR' || rol === 'EMPLEADO'
    return u?.idUsuario || null
  } catch {
    usuario.value = null
    isStaff.value = false
    return null
  }
}

async function loadProductos() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('http://localhost:3000/api/productos')
    if (!res.ok) throw new Error('No se pudieron cargar los productos')
    const data = await res.json()
    productos.value = data || []
  } catch (e) {
    error.value = e.message || 'Error al cargar productos'
  } finally {
    loading.value = false
  }
}

async function loadCategorias() {
  try {
    const res = await fetch('http://localhost:3000/api/categorias')
    if (!res.ok) return
    const data = await res.json()
    categorias.value = data || []
  } catch {}
}

async function loadProveedores() {
  try {
    const res = await fetch('http://localhost:3000/api/proveedores')
    if (!res.ok) return
    const data = await res.json()
    proveedores.value = data || []
  } catch {}
}

const filteredProductos = computed(() => {
  let list = [...productos.value]

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(p =>
      (p.nombreProducto || '').toLowerCase().includes(q) ||
      (p.descripcionProducto || '').toLowerCase().includes(q) ||
      (p.skuProducto || '').toLowerCase().includes(q)
    )
  }

  if (selectedCategory.value) {
    const idCat = parseInt(selectedCategory.value)
    list = list.filter(p => Number(p.idCategoria) === idCat)
  }

  const min = parseFloat(minPrice.value)
  const max = parseFloat(maxPrice.value)

  if (!isNaN(min)) {
    list = list.filter(p => Number(p.precioProducto) >= min)
  }
  if (!isNaN(max)) {
    list = list.filter(p => Number(p.precioProducto) <= max)
  }

  if (sortBy.value === 'price_asc') {
    list.sort((a, b) => Number(a.precioProducto) - Number(b.precioProducto))
  } else if (sortBy.value === 'price_desc') {
    list.sort((a, b) => Number(b.precioProducto) - Number(a.precioProducto))
  } else if (sortBy.value === 'name_asc') {
    list.sort((a, b) => (a.nombreProducto || '').localeCompare(b.nombreProducto || ''))
  }

  return list
})

const totalProductos = computed(() => filteredProductos.value.length)

const handleAddToCart = (product) => {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'

  if (uid) {
    fetch('http://localhost:3000/api/carrito/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: uid, idProducto: product.idProducto, cantidad: 1 })
    })
      .then(() => fetch(`http://localhost:3000/api/carrito/${uid}`))
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(data => {
        cartCount.value = (data.items || []).length
      })
      .catch(() => {
        cartCount.value++
      })
  } else {
    try {
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []
      const card = {
        id: product.idProducto,
        name: product.nombreProducto,
        price: `$${Number((product.precioOferta != null ? product.precioOferta : product.precioProducto) || 0).toFixed(2)}`,
        image: product.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'
      }
      items.push(card)
      localStorage.setItem(key, JSON.stringify(items))
      cartCount.value = items.length
    } catch {
      cartCount.value++
    }
  }

  lastAddedProduct.value = {
    name: product.nombreProducto
  }
  showCartAlert.value = true
  setTimeout(() => {
    showCartAlert.value = false
  }, 2000)
}

const resetProductForm = () => {
  productForm.value = {
    idCategoria: '',
    idProveedor: '',
    nombreProducto: '',
    descripcionProducto: '',
    precioProducto: '',
    stockProducto: '',
    garantiaMeses: '',
    skuProducto: '',
    imgProducto: ''
  }
}

const abrirProductModal = (producto = null) => {
  editingProduct.value = producto
  if (producto) {
    productForm.value = {
      idCategoria: producto.idCategoria,
      idProveedor: producto.idProveedor,
      nombreProducto: producto.nombreProducto,
      descripcionProducto: producto.descripcionProducto || '',
      precioProducto: producto.precioProducto,
      stockProducto: producto.stockProducto,
      garantiaMeses: producto.garantiaMeses || '',
      skuProducto: producto.skuProducto,
      imgProducto: producto.imgProducto || ''
    }
  } else {
    resetProductForm()
  }
  error.value = ''
  showProductModal.value = true
}

const guardarProducto = async () => {
  error.value = ''
  loading.value = true

  try {
    const url = editingProduct.value
      ? `http://localhost:3000/api/productos/${editingProduct.value.idProducto}`
      : 'http://localhost:3000/api/productos'

    const method = editingProduct.value ? 'PUT' : 'POST'

    const data = {
      ...productForm.value,
      idCategoria: parseInt(productForm.value.idCategoria),
      idProveedor: parseInt(productForm.value.idProveedor),
      precioProducto: parseFloat(productForm.value.precioProducto),
      stockProducto: parseInt(productForm.value.stockProducto),
      garantiaMeses: parseInt(productForm.value.garantiaMeses) || 0,
      imgProducto: productForm.value.imgProducto || null
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo guardar el producto')
    }

    await loadProductos()
    showProductModal.value = false
  } catch (e) {
    error.value = e.message || 'Error al guardar producto'
  } finally {
    loading.value = false
  }
}

const eliminarProducto = async (idProducto) => {
  if (!confirm('¿Estás seguro de DESACTIVAR este producto?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/productos/${idProducto}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result.error || 'No se pudo desactivar el producto')
    }

    await loadProductos()
  } catch (e) {
    error.value = e.message || 'Error al desactivar producto'
  }
}

const eliminarProductoDefinitivo = async (idProducto) => {
  if (!confirm('Esta acción ELIMINARÁ definitivamente el producto. ¿Continuar?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/productos/${idProducto}/hard`, {
      method: 'DELETE'
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo eliminar el producto definitivamente')
    }

    await loadProductos()
  } catch (e) {
    error.value = e.message || 'Error al eliminar producto definitivamente'
  }
}

onMounted(async () => {
  const uid = getUserId()
  const key = uid ? `cart_${uid}` : 'cart'

  if (uid) {
    try {
      const res = await fetch(`http://localhost:3000/api/carrito/${uid}`)
      if (res.ok) {
        const data = await res.json()
        cartCount.value = (data.items || []).length
      }
    } catch {}
  } else {
    try {
      const raw = localStorage.getItem(key)
      const items = raw ? JSON.parse(raw) : []
      cartCount.value = items.length
    } catch {
      cartCount.value = 0
    }
  }

  await Promise.all([loadProductos(), loadCategorias(), loadProveedores()])
})
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div class="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div class="space-y-1">
          <p class="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-primary">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">◎</span>
            Catálogo
          </p>
          <h1 class="text-2xl sm:text-3xl font-bold">Encuentra el hardware ideal para tu PC</h1>
          <p class="text-xs sm:text-sm text-muted-foreground">Filtra por categoría, precio o nombre y arma tu próxima build.</p>
          <p class="text-xs text-muted-foreground mt-1">{{ totalProductos }} producto(s) encontrado(s)</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4 w-full md:w-auto">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Buscar</label>
            <input
              v-model="search"
              type="text"
              placeholder="Nombre, descripción o SKU"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Categoría</label>
            <select
              v-model="selectedCategory"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas</option>
              <option v-for="c in categorias" :key="c.idCategoria" :value="c.idCategoria">
                {{ c.nombreCategoria }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Precio mín.</label>
            <input
              v-model="minPrice"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Precio máx.</label>
            <input
              v-model="maxPrice"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Ordenar por:</span>
            <select
              v-model="sortBy"
              class="rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="name_asc">Nombre A-Z</option>
            </select>
          </div>

          <button
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            @click="search = ''; selectedCategory = ''; minPrice = ''; maxPrice = ''; sortBy = 'relevance'"
          >
            <span>Limpiar filtros</span>
          </button>
        </div>

        <button
          v-if="isStaff"
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
          @click="abrirProductModal()"
        >
          <span class="text-base leading-none">＋</span>
          <span>Agregar producto</span>
        </button>
      </div>

      <div v-if="loading" class="py-12 text-center text-muted-foreground text-sm">
        <div class="inline-flex flex-col items-center gap-2">
          <span class="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span>Cargando productos...</span>
        </div>
      </div>
      <div v-else-if="error" class="py-4 text-sm text-red-500">{{ error }}</div>
      <div v-else>
        <div v-if="filteredProductos.length === 0" class="py-12 text-center text-muted-foreground text-sm">
          <p>No se encontraron productos con los filtros actuales.</p>
          <p class="mt-1 text-xs">Prueba limpiando filtros o eligiendo otra categoría.</p>
        </div>

        <div v-else class="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div
            v-for="p in filteredProductos"
            :key="p.idProducto"
            class="group flex flex-col overflow-hidden rounded-lg border border-border bg-card/95 backdrop-blur shadow-sm transition hover:border-primary hover:-translate-y-0.5 hover:shadow-lg"
          >
            <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="relative h-48 overflow-hidden bg-muted block">
              <img
                :src="p.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'"
                :alt="p.nombreProducto"
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span
                v-if="p.nombreCategoria"
                class="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                {{ p.nombreCategoria }}
              </span>
              <span
                v-if="p.porcentajeDescuento"
                class="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white"
              >
                -{{ p.porcentajeDescuento }}%
              </span>
              <div v-if="p.nombreOferta" class="absolute left-3 right-3 bottom-3">
                <div class="backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-semibold text-center shadow bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                  {{ p.nombreOferta }}
                </div>
              </div>
            </router-link>

            <div class="flex flex-1 flex-col p-4 gap-3">
              <div class="space-y-1">
                <p class="text-[11px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  SKU: {{ p.skuProducto }}
                </p>
                <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
                  {{ p.nombreProducto }}
                </router-link>
                <p class="line-clamp-2 text-xs text-muted-foreground">
                  {{ p.descripcionProducto || 'Componente de hardware para PC.' }}
                </p>
              </div>

              <div class="mt-auto flex items-center justify-between">
                <div class="space-y-0.5 min-w-0 flex-1">
                  <p class="text-lg font-bold text-foreground flex items-baseline gap-2 whitespace-nowrap">
                    <span :class="p.precioOferta ? 'text-blue-600 dark:text-red-600' : 'text-foreground'">
                      ${{ Number((p.precioOferta ?? p.precioProducto) || 0).toFixed(2) }}
                    </span>
                    <span v-if="p.precioOferta" class="text-xs line-through text-muted-foreground">
                      ${{ Number(p.precioProducto || 0).toFixed(2) }}
                    </span>
                  </p>
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    :class="Number(p.stockProducto || 0) > 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'"
                  >
                    <span>Stock:</span>
                    <span>{{ p.stockProducto ?? 0 }}</span>
                  </span>
                </div>

                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                  <button
                    class="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition transform hover:-translate-y-0.5 hover:shadow-md hover:bg-primary/90"
                    @click="handleAddToCart(p)"
                  >
                    Agregar al carrito
                  </button>

                  <div v-if="isStaff" class="flex gap-2">
                    <button
                      class="rounded-md border border-blue-500 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-500/10"
                      @click="abrirProductModal(p)"
                    >
                      Editar
                    </button>
                    <button
                      class="rounded-md border border-yellow-500 px-2 py-1 text-[11px] font-medium text-yellow-600 hover:bg-yellow-500/10"
                      @click="eliminarProducto(p.idProducto)"
                    >
                      Desactivar
                    </button>
                    <button
                      class="rounded-md border border-red-500 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-500/10"
                      @click="eliminarProductoDefinitivo(p.idProducto)"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Footer />

    <!-- Modal CRUD de producto (solo staff) -->
    <div
      v-if="isStaff && showProductModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showProductModal = false"
    >
      <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl border border-border text-foreground">
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 class="text-lg font-semibold">
            {{ editingProduct ? 'Editar producto' : 'Nuevo producto' }}
          </h2>
          <button class="text-2xl text-muted-foreground hover:text-foreground" @click="showProductModal = false">×</button>
        </div>

        <form @submit.prevent="guardarProducto" class="space-y-4 px-6 py-4">
          <div v-if="error" class="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {{ error }}
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium text-foreground">Nombre *</label>
              <input
                v-model="productForm.nombreProducto"
                required
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">SKU *</label>
              <input
                v-model="productForm.skuProducto"
                required
                :disabled="!!editingProduct"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">Categoría *</label>
              <select
                v-model="productForm.idCategoria"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                <option v-for="c in categorias" :key="c.idCategoria" :value="c.idCategoria">
                  {{ c.nombreCategoria }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">Proveedor *</label>
              <select
                v-model="productForm.idProveedor"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                <option v-for="pr in proveedores" :key="pr.idProveedor" :value="pr.idProveedor">
                  {{ pr.nombreEmpresa }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">Precio *</label>
              <input
                v-model="productForm.precioProducto"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">Stock *</label>
              <input
                v-model="productForm.stockProducto"
                type="number"
                min="0"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-foreground">Garantía (meses)</label>
              <input
                v-model="productForm.garantiaMeses"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium text-foreground">URL de imagen</label>
              <input
                v-model="productForm.imgProducto"
                placeholder="https://..."
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p class="mt-1 text-[11px] text-muted-foreground">Se usará como imagen principal del producto.</p>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium text-foreground">Descripción</label>
              <textarea
                v-model="productForm.descripcionProducto"
                rows="3"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              ></textarea>
            </div>
          </div>

          <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                class="rounded-lg bg-muted px-4 py-2 text-sm text-foreground hover:bg-secondary"
                @click="showProductModal = false"
              >
                Cancelar
              </button>
              <button
                v-if="editingProduct"
                type="button"
                class="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
                @click="eliminarProductoDefinitivo(editingProduct.idProducto)"
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showCartAlert && lastAddedProduct"
        class="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 rounded bg-primary px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm text-primary-foreground shadow-lg max-w-full sm:max-w-sm md:max-w-md mx-auto sm:mx-0"
      >
        {{ lastAddedProduct.name }} agregado al carrito
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
