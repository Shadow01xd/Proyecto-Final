<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const productos = ref([])
const loading = ref(false)
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

function getUsuario() {
  try {
    const raw = localStorage.getItem('usuario')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const usuario = ref(getUsuario())
const isStaff = ref(false)
const allProducts = ref([])
const nonOffer = ref([])
const showAddModal = ref(false)
const addForm = ref({ ids: [], tipo: 'precio', porcentajeDescuento: '', precioOferta: '', nombreOferta: '' })
const notifyLoading = ref(false)

const selectedForPreview = computed(() => {
  const set = new Set((addForm.value.ids || []).map(x => String(x)))
  return nonOffer.value.filter(p => set.has(String(p.idProducto)))
})

function calcNewPrice(p) {
  if (addForm.value.tipo === 'porcentaje') {
    const pct = Number(addForm.value.porcentajeDescuento)
    if (!pct || isNaN(pct)) return null
    const base = Number(p.precioProducto)
    const newP = Number((base * (1 - pct / 100)).toFixed(2))
    return newP
  } else {
    const po = Number(addForm.value.precioOferta)
    if (!po || isNaN(po) || po <= 0) return null
    return Number(po.toFixed(2))
  }
}

onMounted(async () => {
  const u = getUsuario()
  usuario.value = u
  const idRol = u?.idRol || u?.rol?.idRol || u?.rolId
  isStaff.value = idRol === 1 || idRol === 2
  await cargarOfertas()
  await cargarNoOfertas()
  await loadCartCount()
})

async function cargarOfertas() {
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch('http://localhost:3000/api/productos/ofertas')
    const text = await resp.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    if (!resp.ok) {
      error.value = (data && (data.error || data.message)) || 'No se pudieron cargar ofertas'
      productos.value = []
      return
    }
    productos.value = Array.isArray(data?.productos)
      ? data.productos
      : (Array.isArray(data) ? data : [])
  } catch (e) {
    error.value = 'No se pudo contactar con el servidor de ofertas'
    productos.value = []
  } finally {
    loading.value = false
  }
}

async function cargarNoOfertas() {
  try {
    const resp = await fetch('http://localhost:3000/api/productos')
    const text = await resp.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    if (!resp.ok) return
    allProducts.value = Array.isArray(data) ? data : []
    nonOffer.value = allProducts.value.filter(p => !p.esOferta)
  } catch {}
}

const edit = ref({})

function bindEdit(p) {
  if (!edit.value[p.idProducto]) {
    edit.value[p.idProducto] = {
      porcentajeDescuento: p.porcentajeDescuento ?? '',
      precioOferta: p.precioOferta ?? '',
      nombreOferta: p.nombreOferta ?? ''
    }
  }
  return edit.value[p.idProducto]
}

async function aplicarOferta(p) {
  const vals = bindEdit(p)
  const payload = {}
  if (vals.porcentajeDescuento !== '' && vals.porcentajeDescuento != null)
    payload.porcentajeDescuento = Number(vals.porcentajeDescuento)
  if (vals.precioOferta !== '' && vals.precioOferta != null)
    payload.precioOferta = Number(vals.precioOferta)
  if (vals.nombreOferta && vals.nombreOferta.trim())
    payload.nombreOferta = vals.nombreOferta.trim()
  const u = getUsuario()
  if (u?.idUsuario) payload.idUsuario = u.idUsuario
  if (Object.keys(payload).length === 0) {
    alert('Ingresa porcentaje o precio de oferta')
    return
  }
  try {
    const resp = await fetch(`http://localhost:3000/api/productos/${p.idProducto}/oferta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || 'No se pudo actualizar la oferta')
    await cargarOfertas()
    await cargarNoOfertas()
  } catch (e) {
    alert(e.message || 'Error al actualizar oferta')
  }
}

async function quitarOferta(p) {
  if (!confirm('¿Estás seguro de quitar esta oferta?')) return
  try {
    const u = getUsuario()
    const resp = await fetch(`http://localhost:3000/api/productos/${p.idProducto}/oferta/remove`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: u?.idUsuario })
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || 'No se pudo quitar la oferta')
    await cargarOfertas()
    await cargarNoOfertas()
  } catch (e) {
    alert(e.message || 'Error al quitar oferta')
  }
}

async function agregarOfertaNueva() {
  const { ids, tipo, porcentajeDescuento, precioOferta, nombreOferta } = addForm.value
  if (!ids || ids.length === 0) { alert('Selecciona al menos un producto'); return }
  const payload = {}
  if (tipo === 'precio') {
    if (precioOferta === '' || precioOferta == null || Number(precioOferta) <= 0) {
      alert('Ingresa el Precio Oferta (mayor que 0)')
      return
    }
    payload.precioOferta = Number(precioOferta)
  } else if (tipo === 'porcentaje') {
    if (porcentajeDescuento === '' || porcentajeDescuento == null) {
      alert('Ingresa el % de descuento (1 a 99)')
      return
    }
    const pct = Number(porcentajeDescuento)
    if (isNaN(pct) || pct < 1 || pct > 99) {
      alert('El % de descuento debe estar entre 1 y 99')
      return
    }
    payload.porcentajeDescuento = pct
  }
  if (nombreOferta && nombreOferta.trim()) {
    payload.nombreOferta = nombreOferta.trim()
  }
  const u = getUsuario()
  if (u?.idUsuario) payload.idUsuario = u.idUsuario
  try {
    await Promise.all(ids.map(async (pidRaw) => {
      const pid = String(pidRaw)
      const resp = await fetch(`http://localhost:3000/api/productos/${pid}/oferta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.error || 'No se pudo agregar la oferta')
    }))
    addForm.value = { ids: [], tipo: 'precio', porcentajeDescuento: '', precioOferta: '', nombreOferta: '' }
    showAddModal.value = false
    await cargarOfertas()
    await cargarNoOfertas()
  } catch (e) {
    alert(e.message || 'Error al agregar oferta')
  }
}

async function notifyUsuarios() {
  if (notifyLoading.value) return
  try {
    notifyLoading.value = true
    const nombreOferta = (addForm.value.nombreOferta || '').trim()
    const resp = await fetch('http://localhost:3000/api/newsletter/notify-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreOferta })
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data?.error || 'No se pudieron enviar las notificaciones')
    alert('Oferta notificada')
  } catch (e) {
    alert(e.message || 'Error al notificar a los suscriptores')
  } finally {
    notifyLoading.value = false
  }
}
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />
    
    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <!-- Hero Section -->
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Ofertas Especiales
            </h1>
            <p class="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Aprovecha los mejores descuentos en productos seleccionados</p>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <button 
              v-if="isStaff"
              @click="showAddModal = true"
              class="items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Oferta
            </button>
            <button
              v-if="isStaff"
              @click="notifyUsuarios"
              :disabled="notifyLoading"
              class="items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
              </svg>
              {{ notifyLoading ? 'Notificando…' : 'Notificar Usuarios' }}
            </button>
          </div>
        </div>
        
        <!-- Mobile Actions -->
        <div class="sm:hidden grid grid-cols-1 gap-2">
          <button 
            v-if="isStaff"
            @click="showAddModal = true"
            class="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-lg">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Oferta
          </button>
          <button 
            v-if="isStaff"
            @click="notifyUsuarios"
            :disabled="notifyLoading"
            class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium shadow-lg">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
            </svg>
            {{ notifyLoading ? 'Notificando…' : 'Notificar Usuarios' }}
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error && productos.length > 0" class="mb-6 bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-destructive mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <p class="text-destructive-foreground">{{ error }}</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        <p class="mt-4 text-muted-foreground font-medium">Cargando ofertas...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && productos.length === 0" class="text-center py-20">
        <div class="inline-block p-6 bg-muted rounded-full mb-4">
          <svg class="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-foreground mb-2">No hay ofertas disponibles</h3>
        <p class="text-muted-foreground">Vuelve pronto para descubrir nuevas promociones</p>
      </div>

      <!-- Products Grid -->
      <div v-if="!loading && productos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        <div v-for="p in productos" :key="p.idProducto" 
          class="group bg-card rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-border">
          
          <!-- Image Container -->
          <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="relative overflow-hidden bg-muted aspect-square block">
            <img 
              :src="p.imgProducto || 'https://via.placeholder.com/400x400?text=Producto'" 
              :alt="p.nombreProducto"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div v-if="p.porcentajeDescuento" 
              class="absolute top-3 right-3 px-3 py-1.5 rounded-full font-bold text-sm shadow-lg bg-blue-600 text-white dark:bg-red-600 dark:text-white">
              -{{ p.porcentajeDescuento }}%
            </div>
            <div class="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-card-foreground border border-border">
              {{ p.nombreCategoria }}
            </div>
            <div v-if="p.nombreOferta" class="absolute bottom-3 left-3 right-3">
              <div class="backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold text-center shadow-lg bg-blue-600 text-white dark:bg-red-600 dark:text-white">
                {{ p.nombreOferta }}
              </div>
            </div>
          </router-link>

          <!-- Content -->
          <div class="p-5">
            <h3 class="font-semibold text-card-foreground text-lg leading-tight mb-2 line-clamp-2 min-h-[3.5rem]">
              <router-link :to="{ name: 'producto', params: { id: p.idProducto } }" class="hover:underline">
                {{ p.nombreProducto }}
              </router-link>
            </h3>
            <p class="text-xs text-muted-foreground mb-3">SKU: {{ p.skuProducto }}</p>

            <!-- Price -->
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-2xl font-bold text-primary">
                ${{ Number(p.precioOferta ?? p.precioProducto).toFixed(2) }}
              </span>
              <span v-if="p.precioOferta" class="text-sm line-through text-muted-foreground">
                ${{ Number(p.precioProducto).toFixed(2) }}
              </span>
            </div>

            <!-- Staff Controls -->
            <div v-if="isStaff" class="mt-4 pt-4 border-t border-border space-y-3">
              <div class="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestión
              </div>
              
              <div>
                <label class="block text-xs text-muted-foreground mb-1">Nombre de oferta</label>
                <input 
                  type="text" 
                  v-model="bindEdit(p).nombreOferta" 
                  class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-ring focus:border-transparent" 
                  placeholder="Ej: Black Friday"
                />
              </div>
              
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">% Descuento</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="99" 
                    step="1" 
                    v-model="bindEdit(p).porcentajeDescuento" 
                    class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-ring focus:border-transparent" 
                    placeholder="10"
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Precio</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    v-model="bindEdit(p).precioOferta" 
                    class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-ring focus:border-transparent" 
                    placeholder="99.99"
                  />
                </div>
              </div>
              
              <div class="flex gap-2">
                <button 
                  @click="aplicarOferta(p)"
                  class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium transition-all">
                  Aplicar
                </button>
                <button 
                  @click="quitarOferta(p)"
                  class="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-lg text-sm font-medium transition-all">
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Offer Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="showAddModal = false">
      <div class="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border">
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 class="text-2xl font-bold text-card-foreground">Agregar Productos a Ofertas</h2>
          <button @click="showAddModal = false" class="text-muted-foreground hover:text-foreground transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Nombre de la Oferta -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Nombre de la Oferta (Opcional)</label>
            <input 
              type="text"
              v-model="addForm.nombreOferta" 
              class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground" 
              placeholder="Ej: Black Friday, Navidad, Cyber Monday..."
            />
            <p class="text-xs text-muted-foreground mt-1">Este nombre aparecerá en la tarjeta del producto</p>
          </div>

          <!-- Product Selection -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Seleccionar Productos</label>
            <select 
              v-model="addForm.ids" 
              multiple 
              class="w-full rounded-lg border border-input bg-background px-3 py-2 min-h-[180px] focus:ring-2 focus:ring-ring focus:border-transparent text-foreground">
              <option v-for="p in nonOffer" :key="p.idProducto" :value="String(p.idProducto)" class="py-2">
                {{ p.nombreProducto }} ({{ p.skuProducto }}) - ${{ Number(p.precioProducto).toFixed(2) }}
              </option>
            </select>
            <p class="text-xs text-muted-foreground mt-1">Mantén presionado Ctrl/Cmd para seleccionar varios productos</p>
          </div>

          <!-- Offer Type -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">Tipo de Oferta</label>
              <select 
                v-model="addForm.tipo" 
                class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent text-foreground">
                <option value="precio">Por Precio</option>
                <option value="porcentaje">Por Porcentaje</option>
              </select>
            </div>

            <div v-if="addForm.tipo === 'porcentaje'">
              <label class="block text-sm font-medium text-foreground mb-2">% Descuento</label>
              <input 
                type="number" 
                min="1" 
                max="99" 
                step="1" 
                v-model="addForm.porcentajeDescuento" 
                class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground" 
                placeholder="Ej: 25"
              />
            </div>

            <div v-else>
              <label class="block text-sm font-medium text-foreground mb-2">Precio de Oferta</label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                v-model="addForm.precioOferta" 
                class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground" 
                placeholder="Ej: 99.99"
              />
            </div>
          </div>

          <!-- Preview -->
          <div v-if="selectedForPreview.length" class="bg-muted rounded-xl p-4">
            <h3 class="font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Vista Previa ({{ selectedForPreview.length }} producto{{ selectedForPreview.length > 1 ? 's' : '' }})
            </h3>
            <div class="space-y-2 max-h-60 overflow-y-auto">
              <div v-for="p in selectedForPreview" :key="'prev-'+p.idProducto" 
                class="bg-card rounded-lg p-3 flex items-center justify-between gap-3 shadow-sm border border-border">
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-card-foreground truncate">{{ p.nombreProducto }}</p>
                  <p class="text-xs text-muted-foreground">{{ p.skuProducto }}</p>
                </div>
                <div class="flex items-baseline gap-2 whitespace-nowrap">
                  <span class="text-sm text-muted-foreground line-through">${{ Number(p.precioProducto).toFixed(2) }}</span>
                  <span class="text-lg font-bold text-primary" v-if="calcNewPrice(p) !== null">
                    ${{ calcNewPrice(p).toFixed(2) }}
                  </span>
                  <span v-else class="text-sm text-muted-foreground">—</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              @click="agregarOfertaNueva"
              class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all">
              Agregar Oferta
            </button>
            <button 
              @click="showAddModal = false"
              class="px-6 py-3 rounded-lg font-medium border border-border hover:bg-secondary transition-all text-foreground">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>