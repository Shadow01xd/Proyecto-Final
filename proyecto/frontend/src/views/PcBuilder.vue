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

// Wizard state
const currentStep = ref(0)
const steps = ref([
  { name: 'Procesador', categoryPattern: /proces/i, required: true },
  { name: 'Motherboard', categoryPattern: /mother/i, required: true },
  { name: 'RAM', categoryPattern: /ram|memoria/i, required: true },
  { name: 'Storage', categoryPattern: /almacen|storage|disco|ssd|hdd/i, required: true },
  { name: 'GPU', categoryPattern: /gr[aá]fica|gpu|video/i, required: true },
  { name: 'PSU', categoryPattern: /fuente|psu|poder/i, required: true },
  { name: 'Gabinete', categoryPattern: /gabinete|case|caja/i, required: true },
  { name: 'Periféricos', categoryPattern: /perif[eé]rico|teclado|mouse|rat[oó]n/i, required: false, multiSelect: true },
  { name: 'Monitor', categoryPattern: /monitor|pantalla/i, required: false, multiSelect: true }
])

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
    // Guardar todos los productos seleccionados (incluyendo multiSelect) como lista plana de IDs
    const ids = []
    for (const val of Object.values(selectedComponents.value)) {
      if (Array.isArray(val)) {
        for (const p of val) {
          if (p && p.idProducto != null) ids.push(p.idProducto)
        }
      } else if (val && val.idProducto != null) {
        ids.push(val.idProducto)
      }
    }
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
      if (!p) continue

      const idCat = p.idCategoria
      const step = steps.value.find(s =>
        s.categoryPattern.test(
          (categorias.value.find(c => c.idCategoria === idCat)?.nombreCategoria || '')
        )
      )
      const isMulti = step?.multiSelect

      if (isMulti) {
        const current = map[idCat]
        if (!current) {
          map[idCat] = [p]
        } else if (Array.isArray(current)) {
          if (!current.some(x => x.idProducto === p.idProducto)) {
            current.push(p)
          }
        }
      } else {
        // categorías de un solo producto: último seleccionado gana
        map[idCat] = p
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

    // Set active category based on current step
    updateActiveCategoryForStep()
  } catch (e) {
    error.value = e.message || 'Error al cargar datos de armado'
  } finally {
    loading.value = false
  }
}

// Wizard navigation
const currentStepData = computed(() => steps.value[currentStep.value])

const currentStepCategory = computed(() => {
  if (!currentStepData.value) return null
  return categorias.value.find(c => currentStepData.value.categoryPattern.test(c.nombreCategoria || ''))
})

const isStepComplete = computed(() => {
  const cat = currentStepCategory.value
  if (!cat) return false
  return !!selectedComponents.value[cat.idCategoria]
})

const canGoNext = computed(() => {
  if (!currentStepData.value) return false
  // Can skip optional steps
  if (!currentStepData.value.required) return true
  // Must complete required steps
  return isStepComplete.value
})

const canGoPrevious = computed(() => currentStep.value > 0)

const isLastStep = computed(() => currentStep.value === steps.value.length - 1)

function updateActiveCategoryForStep() {
  const cat = currentStepCategory.value
  if (cat) {
    activeCategoryId.value = cat.idCategoria
  }
}

function goToNextStep() {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
    updateActiveCategoryForStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToPreviousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
    updateActiveCategoryForStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToStep(stepIndex) {
  if (stepIndex >= 0 && stepIndex < steps.value.length) {
    currentStep.value = stepIndex
    updateActiveCategoryForStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}


const productosPorCategoria = computed(() => {
  const map = {}
  for (const c of categorias.value) {
    map[c.idCategoria] = productos.value.filter(p => Number(p.idCategoria) === Number(c.idCategoria))
  }
  return map
})

const cpuCatId = computed(() => {
  const c = categorias.value.find(x => /proces/i.test(x.nombreCategoria || ''))
  return c ? c.idCategoria : 6
})

const motherboardCatId = computed(() => {
  const c = categorias.value.find(x => /mother/i.test(x.nombreCategoria || ''))
  return c ? c.idCategoria : 1
})

function isIntel(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  return t.includes('intel')
}

function isAMD(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  return t.includes('amd') || t.includes('ryzen') || t.includes('am4') || t.includes('am5')
}

function intelGen(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  if (t.includes('ultra')) return 'ultra' // Core Ultra
  if (t.includes('13th')) return '13th'
  if (t.includes('12th')) return '12th'
  return null
}

function amdSeries(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  // Ryzen 7000: 7600, 7800, etc. Ryzen 5000: 5600, 5800, etc.
  if (/(^|\s)7[0-9]{3}/.test(t) || t.includes('am5') || /ryzen\s*7\d{3}/.test(t)) return '7000'
  if (/(^|\s)5[0-9]{3}/.test(t) || t.includes('am4') || /ryzen\s*5\d{3}/.test(t)) return '5000'
  // Fallback por nombres específicos del backup
  if (t.includes('7600') || t.includes('7800')) return '7000'
  if (t.includes('5600') || t.includes('5800')) return '5000'
  return null
}

function mbIntelSeries(mb) {
  const t = `${mb?.nombreProducto || ''} ${mb?.descripcionProducto || ''}`.toLowerCase()
  if (t.includes('z890')) return 'ultra'
  if (t.includes('z790')) return '13th'
  if (t.includes('z690')) return '12th'
  return null
}

function mbAmdSeries(mb) {
  const t = `${mb?.nombreProducto || ''} ${mb?.descripcionProducto || ''}`.toLowerCase()
  if (t.includes('x670') || t.includes('x870') || t.includes('am5')) return '7000'
  if (t.includes('x570') || t.includes('b550') || t.includes('am4')) return '5000'
  return null
}

function amdMbCompatible(mb, series) {
  const t = `${mb?.nombreProducto || ''} ${mb?.descripcionProducto || ''}`.toLowerCase()
  // Excluir explícitamente placas Intel cuando buscamos AMD
  if (t.includes('intel') || t.includes('z690') || t.includes('z790') || t.includes('z890')) return false
  if (series === '7000') {
    return t.includes('am5') || t.includes('x670') || t.includes('x870')
  }
  if (series === '5000') {
    return t.includes('am4') || t.includes('x570') || t.includes('b550')
  }
  return false
}

const ramCatId = computed(() => {
  const c = categorias.value.find(x => /ram|memoria/i.test(x.nombreCategoria || ''))
  return c ? c.idCategoria : 3
})

function isDDR4(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  return t.includes('ddr4') && !t.includes('ddr5')
}

function isDDR5(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  return t.includes('ddr5')
}

function getMbRamType(mb) {
  const t = `${mb?.nombreProducto || ''} ${mb?.descripcionProducto || ''}`.toLowerCase()
  
  // AMD Logic
  if (t.includes('am4') || t.includes('b550') || t.includes('x570')) return 'DDR4'
  if (t.includes('am5') || t.includes('x670') || t.includes('x870') || t.includes('b650')) return 'DDR5'
  
  // Intel Logic
  if (t.includes('z890') || t.includes('ultra')) return 'DDR5'
  
  // Check explicit mention in name/desc
  if (t.includes('ddr5')) return 'DDR5'
  if (t.includes('ddr4')) return 'DDR4'
  
  // Default for modern Intel (Z690/Z790) if not specified: allow both or default to DDR5?
  // User asked to search in DB. If not found, we'll be permissive to avoid blocking.
  return 'BOTH' 
}

const productosPorCategoriaFiltrados = computed(() => {
  const map = {}
  const cpuSel = selectedComponents.value[cpuCatId.value]
  const mbSel = selectedComponents.value[motherboardCatId.value]
  
  for (const c of categorias.value) {
    const prods = productos.value.filter(p => Number(p.idCategoria) === Number(c.idCategoria))
    
    // Filter Motherboards based on CPU
    if (Number(c.idCategoria) === Number(motherboardCatId.value) && cpuSel) {
      if (isIntel(cpuSel)) {
        const gen = intelGen(cpuSel)
        map[c.idCategoria] = gen
          ? prods.filter(mb => {
              const t = `${mb?.nombreProducto || ''} ${mb?.descripcionProducto || ''}`.toLowerCase()
              const isIntelMb = t.includes('z690') || t.includes('z790') || t.includes('z890') || t.includes('intel')
              const isAMDToken = t.includes('am4') || t.includes('am5') || t.includes('x570') || t.includes('b550') || t.includes('x670') || t.includes('x870') || t.includes('amd')
              return isIntelMb && !isAMDToken && mbIntelSeries(mb) === gen
            })
          : prods
      } else if (isAMD(cpuSel)) {
        const series = amdSeries(cpuSel)
        map[c.idCategoria] = series ? prods.filter(mb => amdMbCompatible(mb, series)) : prods
      } else {
        map[c.idCategoria] = prods
      }
    } 
    // Filter CPUs based on Motherboard
    else if (Number(c.idCategoria) === Number(cpuCatId.value) && mbSel) {
      const intelMb = mbIntelSeries(mbSel)
      const amdMb = mbAmdSeries(mbSel)
      if (intelMb) {
        map[c.idCategoria] = prods.filter(cpu => isIntel(cpu) && intelGen(cpu) === intelMb)
      } else if (amdMb) {
        map[c.idCategoria] = prods.filter(cpu => isAMD(cpu) && amdSeries(cpu) === amdMb)
      } else {
        map[c.idCategoria] = prods
      }
    }
    // Filter RAM based on Motherboard
    else if (Number(c.idCategoria) === Number(ramCatId.value) && mbSel) {
      const ramType = getMbRamType(mbSel)
      if (ramType === 'DDR4') {
        map[c.idCategoria] = prods.filter(r => isDDR4(r))
      } else if (ramType === 'DDR5') {
        map[c.idCategoria] = prods.filter(r => isDDR5(r))
      } else {
        map[c.idCategoria] = prods
      }
    }
    // Filter PSU based on GPU
    else if (Number(c.idCategoria) === Number(psuCatId.value)) {
      const gpuSel = selectedComponents.value[gpuCatId.value]
      if (gpuSel && isRTX5080(gpuSel)) {
        // Si es RTX 5080, filtrar fuentes < 750W (mostrar solo > 750W, ej 850W+)
        // El usuario dijo: "si elejimos una rtx 5080 no podemos elejir una psu de 750w"
        // Interpretación: Requiere > 750W.
        map[c.idCategoria] = prods.filter(psu => {
          const w = getPSUWattage(psu)
          return w > 750
        })
      } else {
        map[c.idCategoria] = prods
      }
    }
    else {
      map[c.idCategoria] = prods
    }
  }
  return map
})

const gpuCatId = computed(() => {
  const c = categorias.value.find(x => /gr[aá]fica|gpu|video/i.test(x.nombreCategoria || ''))
  return c ? c.idCategoria : 5
})

const psuCatId = computed(() => {
  const c = categorias.value.find(x => /fuente|psu|poder/i.test(x.nombreCategoria || ''))
  return c ? c.idCategoria : 4
})

function isRTX5080(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''}`.toLowerCase()
  return t.includes('5080')
}

function getPSUWattage(producto) {
  const t = `${producto?.nombreProducto || ''} ${producto?.descripcionProducto || ''} ${producto?.skuProducto || ''}`.toLowerCase()
  // Buscar patrones como "850w", "1000w", "750 w", o números en SKU como "MSI-MAG-850"
  
  // 1. Buscar explícitamente "XXXw" o "XXX w"
  const matchW = t.match(/(\d{3,4})\s*w/)
  if (matchW) {
    return parseInt(matchW[1], 10)
  }

  // 2. Si no encuentra "w", buscar números de 3 o 4 dígitos en el SKU que suelen indicar potencia (ej: 750, 850, 1000, 1200)
  // Evitar años (20xx) o modelos genéricos si es posible, pero en PSUs suelen ser la potencia.
  // Buscamos números aislados o precedidos por guiones/letras comunes en SKUs de fuentes.
  const sku = (producto?.skuProducto || '').toLowerCase()
  const matchSku = sku.match(/(?:^|[-_a-z])(\d{3,4})(?:$|[-_a-z])/)
  if (matchSku) {
    const val = parseInt(matchSku[1], 10)
    // Filtrar valores que no parecen potencias comunes (ej: < 300 o > 2000, aunque hay fuentes de 1600)
    if (val >= 300 && val <= 2000) {
      return val
    }
  }

  return 0
}

function ramInfo(mb) {
  const type = getMbRamType(mb)
  if (type === 'BOTH') return 'DDR4 o DDR5'
  return type
}

const totalSeleccionado = computed(() => {
  return Object.values(selectedComponents.value).reduce((sum, item) => {
    if (Array.isArray(item)) {
      return sum + item.reduce((s, p) => s + Number((p.precioOferta ?? p.precioProducto) || 0), 0)
    }
    return sum + Number((item.precioOferta ?? item.precioProducto) || 0)
  }, 0)
})

const componentesSeleccionadosLista = computed(() => {
  const list = []
  for (const c of categorias.value) {
    const item = selectedComponents.value[c.idCategoria]
    if (item) {
      if (Array.isArray(item)) {
        item.forEach(p => list.push({ categoria: c.nombreCategoria, producto: p }))
      } else {
        list.push({ categoria: c.nombreCategoria, producto: item })
      }
    }
  }
  return list
})

function quitarComponente(idCategoria, idProducto = null) {
  const copy = { ...selectedComponents.value }
  if (idProducto && Array.isArray(copy[idCategoria])) {
    copy[idCategoria] = copy[idCategoria].filter(p => p.idProducto !== idProducto)
    if (copy[idCategoria].length === 0) delete copy[idCategoria]
  } else {
    delete copy[idCategoria]
  }
  selectedComponents.value = copy
  saveBuilderSelection()
}

function limpiarSeleccion() {
  selectedComponents.value = {}
  saveBuilderSelection()
  // Reset wizard to first step and update active category
  currentStep.value = 0
  updateActiveCategoryForStep()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function isSelected(producto) {
  const idCat = producto.idCategoria
  const current = selectedComponents.value[idCat]
  if (!current) return false
  if (Array.isArray(current)) {
    return current.some(p => p.idProducto === producto.idProducto)
  }
  return current.idProducto === producto.idProducto
}

function toggleSelect(producto) {
  const idCat = producto.idCategoria
  const current = selectedComponents.value[idCat]
  const step = steps.value.find(s => s.categoryPattern.test(categorias.value.find(c => c.idCategoria === idCat)?.nombreCategoria || ''))
  const isMulti = step?.multiSelect

  if (isMulti) {
    const list = Array.isArray(current) ? [...current] : (current ? [current] : [])
    const idx = list.findIndex(p => p.idProducto === producto.idProducto)
    if (idx >= 0) {
      list.splice(idx, 1)
    } else {
      list.push(producto)
    }
    
    if (list.length > 0) {
      selectedComponents.value = { ...selectedComponents.value, [idCat]: list }
    } else {
      const copy = { ...selectedComponents.value }
      delete copy[idCat]
      selectedComponents.value = copy
    }
    // No auto-advance for multi-select
  } else {
    if (current && !Array.isArray(current) && current.idProducto === producto.idProducto) {
      const copy = { ...selectedComponents.value }
      delete copy[idCat]
      selectedComponents.value = copy
    } else {
      selectedComponents.value = {
        ...selectedComponents.value,
        [idCat]: producto
      }
      // Auto-advance to next step after selection
      setTimeout(() => {
        if (!isLastStep.value && canGoNext.value) {
          goToNextStep()
        }
      }, 300) 
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

  // Aplanar selección: puede haber categorías con múltiples productos (arrays)
  const seleccion = []
  for (const val of Object.values(selectedComponents.value)) {
    if (Array.isArray(val)) {
      seleccion.push(...val)
    } else if (val) {
      seleccion.push(val)
    }
  }

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

async function finalizarBuilder() {
  // Usa la misma lógica de agregar al carrito
  await agregarBuildAlCarrito()
  // Si se agregó correctamente, redirige al carrito
  if (addMessageType.value === 'success') {
    irAlCarrito()
  }
}

onMounted(async () => {
  await Promise.all([loadData(), initCartCount()])
  restoreBuilderSelection()
})
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex flex-col gap-6 md:gap-8">
      <section class="space-y-3">
        <p class="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-primary">
          <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">★</span>
          Arma tu PC
        </p>
        <h1 class="text-2xl md:text-3xl font-bold">Diseña tu propio equipo paso a paso</h1>
        <p class="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
          Sigue los pasos para armar tu PC. Selecciona un componente en cada categoría y avanza al siguiente paso.
          Los periféricos y monitores son opcionales.
        </p>
      </section>

      <section v-if="error" class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </section>

      <section v-else class="flex flex-col lg:flex-row gap-6 md:gap-8">
        <!-- Columna izquierda: wizard y productos -->
        <div class="flex-1 space-y-4">
          <!-- Wizard Step Indicator -->
          <div class="rounded-xl border border-border bg-gradient-to-b from-card to-background p-4 md:p-6 space-y-4 shadow-sm">
            <!-- Step title and counter -->
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg md:text-xl font-bold flex items-center gap-2">
                  <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {{ currentStep + 1 }}
                  </span>
                  {{ currentStepData?.name }}
                </h2>
                <p class="text-xs text-muted-foreground mt-1">
                  Paso {{ currentStep + 1 }} de {{ steps.length }}
                  <span v-if="!currentStepData?.required" class="text-primary font-medium">(Opcional)</span>
                </p>
              </div>
              <div v-if="isStepComplete" class="flex items-center gap-1.5 text-xs font-medium text-green-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Completado
              </div>
            </div>

            <!-- Progress bar -->
            <div class="space-y-2">
              <div class="flex items-center gap-1">
                <div
                  v-for="(step, idx) in steps"
                  :key="idx"
                  class="flex-1 h-1.5 rounded-full transition-all duration-300"
                  :class="idx < currentStep ? 'bg-primary' : idx === currentStep ? 'bg-primary/70' : 'bg-border'"
                ></div>
              </div>
              
              <!-- Step labels (clickable) - aligned to left of each bar -->
              <div class="hidden md:flex items-start gap-1">
                <button
                  v-for="(step, idx) in steps"
                  :key="idx"
                  class="flex-1 hover:text-primary transition-colors text-left text-[10px] text-muted-foreground truncate"
                  :class="idx === currentStep ? 'text-primary font-semibold' : ''"
                  @click="goToStep(idx)"
                  :title="step.name"
                >
                  {{ step.name }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="py-10 text-center text-muted-foreground text-sm">
            Cargando componentes...
          </div>

          <div v-else>
            <p class="text-xs text-muted-foreground mb-2">
              Selecciona uno de los componentes de la categoría actual. Puedes cambiarlo en cualquier momento.
            </p>

            <div v-if="!activeCategoryId || (productosPorCategoriaFiltrados[activeCategoryId] || []).length === 0" class="py-8 text-center text-xs text-muted-foreground">
              No hay productos disponibles para esta categoría.
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="p in productosPorCategoriaFiltrados[activeCategoryId]"
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
                    <p v-if="Number(p.idCategoria) === Number(motherboardCatId)" class="text-[11px] font-medium text-primary/80">
                      RAM: {{ ramInfo(p) }}
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
                      :class="isSelected(p)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-primary/40 text-primary hover:bg-primary/10 bg-background'"
                      @click="toggleSelect(p)"
                    >
                      {{ isSelected(p) ? 'Seleccionado' : 'Seleccionar' }}
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
                    @click.stop="quitarComponente(item.producto.idCategoria, item.producto.idProducto)"
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

          <!-- Navigation Buttons -->
          <div class="rounded-xl border border-border bg-gradient-to-b from-card to-background p-4 space-y-3 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <button
                class="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                :disabled="!canGoPrevious"
                @click="goToPreviousStep"
              >
                ← Anterior
              </button>

              <button
                v-if="!isLastStep"
                class="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                :disabled="!canGoNext"
                @click="goToNextStep"
              >
                Siguiente →
              </button>

              <button
                v-else
                class="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                @click="finalizarBuilder"
              >
                Finalizar
              </button>
            </div>
            
            <p v-if="!canGoNext && currentStepData?.required" class="text-xs text-center text-amber-500">
              Selecciona un componente para continuar
            </p>
          </div>
        </aside>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
</style>
