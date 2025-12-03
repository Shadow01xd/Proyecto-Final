<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const error = ref('')
const success = ref('')

const cardNumber = ref('')
const expMonth = ref('')
const expYear = ref('')
const cvv = ref('')

const amount = ref(0)
const currency = ref('USD')
const orderId = ref('SIN-ID')
const saveMethod = ref(false)

const savedMethods = ref([])
const selectedMethodId = ref(null)
const summaryItems = ref([])

const paymentMethods = ref([])

const numberRef = ref(null)
const monthRef = ref(null)
const yearRef = ref(null)
const cvvRef = ref(null)

// Dirección de envío
const address = ref('')
const editingAddress = ref(false)
const addressInput = ref('')
const savingAddress = ref(false)

function startEditAddress() {
  addressInput.value = address.value || ''
  editingAddress.value = true
}

// Modo de pago actual, derivado del método seleccionado: 'povy' | 'sim'
const paymentMode = ref('povy')

function cancelEditAddress() {
  editingAddress.value = false
  addressInput.value = address.value || ''
}

function selectPaymentMethod(method) {
  if (!method) return
  const nombre = String(method.nombreMetodo || '').toLowerCase()
  paymentMode.value = nombre.includes('simul') ? 'sim' : 'povy'
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

function computeFromWindow() {
  try {
    const p = window.pedidoActual || {}
    amount.value = Number(p.total || 0)
    currency.value = p.moneda || 'USD'
    orderId.value = p.id || 'SIN-ID'
  } catch { }
}

onMounted(() => {
  // permitir que llegue por query o por window.pedidoActual
  const qAmount = Number(route.query.amount || 0)
  const qCurrency = route.query.currency || ''
  const qId = route.query.id || ''
  if (qAmount > 0) amount.value = qAmount
  if (qCurrency) currency.value = qCurrency
  if (qId) orderId.value = qId
  if (!amount.value) computeFromWindow()

  // cargar métodos guardados del usuario
  const uid = getUserId()
  if (uid) {
    // pedir backend únicamente
    fetch(`http://localhost:3000/api/payments/methods/user/${uid}`)
      .then(r => r.json())
      .then(d => {
        const backend = Array.isArray(d.methods) ? d.methods : []
        savedMethods.value = backend
      })
      .catch(() => {
        // si falla backend, no mostrar nada
        savedMethods.value = []
      })

    // cargar items del carrito para mostrar resumen real
    fetch(`http://localhost:3000/api/carrito/${uid}`)
      .then(r => r.json())
      .then(d => {
        const items = Array.isArray(d.items) ? d.items : []
        summaryItems.value = items
        // recalcular total mostrado en base a los items
        const tot = items.reduce((a, it) => a + (Number(it.cantidad) * Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario)), 0)
        if (tot > 0) amount.value = Number(tot.toFixed(2))
      })
      .catch(() => { })
  }

  // Cargar métodos de pago disponibles desde la BD
  fetch('http://localhost:3000/api/payments/methods')
    .then(r => r.json())
    .then(d => {
      const methods = Array.isArray(d.methods) ? d.methods : []
      paymentMethods.value = methods
      if (methods.length) {
        // Seleccionar el primer método por defecto y ajustar modo
        selectPaymentMethod(methods[0])
      }
    })
    .catch(() => {
      paymentMethods.value = []
    })

  // cargar dirección desde el usuario en localStorage
  try {
    const raw = localStorage.getItem('usuario')
    if (raw) {
      const u = JSON.parse(raw)
      if (u && u.direccionUsuario) address.value = String(u.direccionUsuario)
    }
  } catch {}
})

async function pagar() {
  error.value = ''
  success.value = ''

  // validar dirección
  if (!address.value || !String(address.value).trim()) {
    error.value = 'Agrega una dirección de envío antes de pagar.'
    return
  }

  if (!amount.value || amount.value <= 0) {
    error.value = 'No hay monto válido para cobrar.'
    return
  }

  const usingSaved = !!selectedMethodId.value
  if (!usingSaved) {
    if (!cardNumber.value || !expMonth.value || !expYear.value || !cvv.value) {
      error.value = 'Completa los datos de la tarjeta.'
      return
    }
  }

  loading.value = true
  try {
    const idUsuario = getUserId()
    if (!idUsuario) {
      error.value = 'Debes iniciar sesión para completar la compra.'
      return
    }

    // SIMULADO: aprobar sin contactar backend
    if (paymentMode.value === 'sim') {

      if (usingSaved) {
        const chosen = (savedMethods.value || []).find(m => m.idMetodoPagoUsuario === selectedMethodId.value)
        if (chosen && !chosen.sim) {
          error.value = 'En modo simulado solo puedes usar tarjetas simuladas.'
          return
        }
        if (chosen) {
          const m = chosen.mesExpiracion
          const y = chosen.anioExpiracion
          if (isExpired(m, y)) {
            error.value = 'La tarjeta seleccionada está vencida.'
            return
          }
        }
      }

      // Si se seleccionó una tarjeta guardada, permitir cualquiera (simulada o real)
      // Para ingreso manual, validar siempre; si además desea guardar, persistir local y backend como simulado
      if (!usingSaved) {
        const num = String(cardNumber.value || '').replace(/\D+/g, '')
        const cv = String(cvv.value || '').replace(/\D+/g, '')
        const m = expMonth.value
        const y = expYear.value
        if (num.length < 13 || num.length > 19) {
          error.value = 'Número de tarjeta inválido.'
          return
        }
        if (cv.length !== 3) {
          error.value = 'CVV inválido.'
          return
        }
        if (isExpired(m, y)) {
          error.value = 'La tarjeta está vencida.'
          return
        }
      }

      // Si además desea guardar el método, persistir local y backend como simulado
      if (saveMethod.value && !usingSaved) {
        const last4 = String(cardNumber.value || '').replace(/\D+/g, '').slice(-4)
        const baseSim = {
          aliasTarjeta: 'Simulada',
          nombreMetodo: 'Simulada',
          ultimos4: last4 || '0000',
          mesExpiracion: expMonth.value,
          anioExpiracion: expYear.value,
          sim: true
        }
        // Guardar únicamente en la base de datos
        try {
          const resp = await fetch('http://localhost:3000/api/payments/methods/sim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idUsuario,
              cardNumber: String(cardNumber.value || '').replace(/\s+/g, ''),
              expMonth: expMonth.value,
              expYear: expYear.value,
              cvv: cvv.value,
              aliasTarjeta: 'Simulada',
              titularTarjeta: 'Usuario'
            })
          })
          const data = await resp.json().catch(() => ({}))
          if (resp.ok && data && data.idMetodoPagoUsuario) {
            const dbSim = { idMetodoPagoUsuario: data.idMetodoPagoUsuario, ...baseSim }
            savedMethods.value = [...savedMethods.value, dbSim]
          } else {
            error.value = data.error || 'No se pudo guardar el método simulado'
            return
          }
        } catch {
          error.value = 'No se pudo contactar al backend para guardar el método'
          return
        }
      }

      // Registrar la compra simulada en el backend (Ordenes, Pagos, DetalleOrden)
      let simData
      try {
        const respSim = await fetch('http://localhost:3000/api/payments/checkout-sim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idUsuario,
            currency: currency.value,
            direccionEnvio: address.value
          })
        })
        simData = await respSim.json().catch(() => ({}))
        if (!respSim.ok || simData.status !== 'approved') {
          error.value = simData.error || 'No se pudo registrar la compra simulada'
          return
        }
      } catch {
        error.value = 'No se pudo contactar al backend para registrar la compra simulada'
        return
      }

      success.value = 'Pago aprobado (modo simulado). Orden #' + (simData && simData.idOrden ? simData.idOrden : 'SIM')
      setTimeout(() => router.push('/my-orders'), 700)
      return
    }

    // Llamar a nuestro backend para ejecutar el checkout completo (Povy)
    // Nota: si por error se eligió una tarjeta simulada en modo Povy, bloquear
    if (usingSaved) {
      const chosen = (savedMethods.value || []).find(m => m.idMetodoPagoUsuario === selectedMethodId.value)
      if (chosen && chosen.sim) {
        error.value = 'Selecciona una tarjeta Povy para este modo de pago.'
        return
      }
    }
    const resp = await fetch('http://localhost:3000/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usingSaved ? {
        idUsuario,
        savedMethodId: selectedMethodId.value,
        currency: currency.value,
        direccionEnvio: address.value
      } : {
        idUsuario,
        cardNumber: cardNumber.value,
        expMonth: expMonth.value,
        expYear: expYear.value,
        cvv: cvv.value,
        saveMethod: !!saveMethod.value,
        currency: currency.value,
        direccionEnvio: address.value
      })
    })

    const data = await resp.json()

    if (resp.ok && data.status === 'approved') {
      // Limpiar carrito tras pago real aprobado (backend ya limpia DB, pero forzamos estado local)
      try {
        const uid = getUserId()
        if (uid) {
          await fetch(`http://localhost:3000/api/carrito/clear/${uid}`, { method: 'DELETE' })
        } else {
          localStorage.setItem('cart', JSON.stringify([]))
        }
      } catch {}

      success.value = 'Pago aprobado. Orden #' + data.idOrden
      // redirigir al historial de pedidos
      setTimeout(() => router.push('/my-orders'), 700)
    } else {
      // Si el backend ya cobró en Povy pero falló al guardar, permitirá finalizar sin re-cobrar
      if (data && data.canFinalize && data.referencia) {
        const fin = await fetch('http://localhost:3000/api/payments/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuario, referencia: data.referencia, currency: currency.value })
        })
        const finData = await fin.json()
        if (fin.ok && finData.status === 'approved') {
          // Limpiar carrito tras finalizar
          try {
            const uid = getUserId()
            if (uid) {
              await fetch(`http://localhost:3000/api/carrito/clear/${uid}`, { method: 'DELETE' })
            } else {
              localStorage.setItem('cart', JSON.stringify([]))
            }
          } catch {}

          success.value = 'Pago aprobado. Orden #' + finData.idOrden
          setTimeout(() => router.push('/my-orders'), 700)
        } else {
          error.value = finData.error || 'Pago aprobado, pero no se pudo registrar la compra'
        }
      } else {
        error.value = data.error || data.message || 'No se pudo completar el checkout'
      }
    }
  } catch (e) {
    error.value = 'No se pudo contactar con el servicio de pago'
  } finally {
    loading.value = false
  }
}

// =======================
// Autoformato y autoavance
// =======================
function onCardNumberInput(e) {
  let v = String(e.target.value || '')
  v = v.replace(/\D+/g, '').slice(0, 16)
  const parts = v.match(/.{1,4}/g) || []
  const formatted = parts.join(' ')
  cardNumber.value = formatted
  if (v.length === 16) {
    monthRef.value && monthRef.value.focus()
  }
}

function onMonthInput(e) {
  let v = String(e.target.value || '').replace(/\D+/g, '').slice(0, 2)
  // autocorrección básica 00->01, >12 -> 12
  if (v.length === 2) {
    const n = Math.max(1, Math.min(12, Number(v) || 1))
    v = String(n).padStart(2, '0')
  }
  expMonth.value = v
  if (v.length === 2) yearRef.value && yearRef.value.focus()
}

function onYearInput(e) {
  let v = String(e.target.value || '').replace(/\D+/g, '').slice(0, 2)
  expYear.value = v
  if (v.length === 2) cvvRef.value && cvvRef.value.focus()
}

function onCvvInput(e) {
  let v = String(e.target.value || '').replace(/\D+/g, '').slice(0, 3)
  cvv.value = v
}

function toInt(v) {
  return Number(String(v || '').replace(/\D+/g, ''))
}
function normalizeYear(y) {
  const s = String(y || '')
  const n = toInt(s)
  return s.length <= 2 ? 2000 + (n % 100) : n
}
function isExpired(m, y) {
  const mm = toInt(m)
  const yyyy = normalizeYear(y)
  if (mm < 1 || mm > 12 || !yyyy) return true
  const now = new Date()
  const ym = yyyy * 100 + mm
  const nowYm = now.getFullYear() * 100 + (now.getMonth() + 1)
  return ym < nowYm
}

// =======================
// Toggle tarjeta guardada
// =======================
function toggleSaved(id, m) {
  if (selectedMethodId.value === id) {
    // deseleccionar
    selectedMethodId.value = null
    return
  }
  selectedMethodId.value = id
  // No prefill: limpiar campos para no mostrar datos en el formulario
  cardNumber.value = ''
  expMonth.value = ''
  expYear.value = ''
  cvv.value = ''
}
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header />
    <main class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div class="mb-4 sm:mb-6">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Finalizar compra</h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1">Revisa tu pedido, confirma tu dirección y paga con seguridad.</p>
      </div>
      
      <!-- Layout: Resumen + Pago -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-10 items-start">
        <!-- Resumen (derecha) -->
        <section class="lg:col-span-6 order-3 lg:order-2 lg:sticky lg:top-6">
          <div class="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <div class="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Resumen</div>
              <div class="text-xs text-muted-foreground">{{ summaryItems.length }} artículo(s)</div>
            </div>
            <div v-if="!summaryItems.length" class="text-sm text-muted-foreground">
              No hay productos en el carrito.
            </div>
            <ul v-else class="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
              <li v-for="it in summaryItems" :key="it.idCarritoItem" class="flex items-start gap-3">
                <img 
                  :src="it.imgProducto || 'https://via.placeholder.com/56x56?text=IMG'"
                  class="w-20 h-20 object-cover rounded" 
                />
                <div class="flex-1">
                  <div class="font-medium leading-tight">{{ it.nombreProducto }}</div>
                  <div class="text-xs text-muted-foreground">SKU: {{ it.skuProducto }}</div>
                  <div class="text-xs text-muted-foreground" v-if="it.nombreCategoria">
                    Categoria: {{ it.nombreCategoria }}
                  </div>
                  <div class="text-sm mt-1">
                    x{{ it.cantidad }} · ${{ Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario).toFixed(2) }}
                  </div>
                  <div class="text-sm font-semibold">
                    Subtotal: ${{ (Number(it.cantidad) * Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario)).toFixed(2) }}
                  </div>
                </div>
              </li>
            </ul>
            <div class="border-t border-border mt-4 pt-3 flex items-baseline justify-between">
              <span class="text-sm text-muted-foreground">Total</span>
              <span class="text-xl font-extrabold tracking-tight">{{ currency }} ${{ Number(amount).toFixed(2) }}</span>
            </div>
          </div>
        </section>

        <!-- Columna izquierda: Dirección + Pago apilados -->
        <section class="lg:col-span-6 order-1 lg:order-1">
          <!-- Dirección -->
          <div class="rounded-2xl border border-border bg-card/95 p-5 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <div class="font-semibold text-base">Dirección de envío</div>
              <button 
                v-if="!editingAddress" 
                class="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary"
                @click="startEditAddress"
              >
                {{ address ? 'Editar' : 'Agregar' }} dirección
              </button>
            </div>
            <div v-if="!editingAddress">
              <p v-if="address" class="text-sm whitespace-pre-wrap leading-relaxed">{{ address }}</p>
              <p v-else class="text-sm text-muted-foreground">
                No hay dirección guardada. Agrega una para continuar.
              </p>
            </div>
            <div v-else class="space-y-2">
              <label class="block text-xs text-muted-foreground">Dirección completa</label>
              <textarea 
                v-model="addressInput" 
                rows="3"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500"
                placeholder="Calle, número, colonia, ciudad, estado, CP"
              ></textarea>
              <div class="flex gap-2 justify-end">
                <button class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary" @click="cancelEditAddress">Cancelar</button>
                <button class="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90" @click="saveAddressLocal">Guardar</button>
              </div>
            </div>
          </div>

          <!-- Pago: métodos guardados y formulario -->
          <div class="space-y-6 mt-6">
            <!-- Selector de modo de pago -->
            <div class="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div class="font-semibold text-base">Modo de pago</div>
              </div>
              <div v-if="paymentMethods.length" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  v-for="m in paymentMethods"
                  :key="m.idMetodoPago"
                  type="button"
                  :class="[
                    'rounded-md border px-3 py-2 text-sm font-medium text-left',
                    (paymentMode === 'sim' && String(m.nombreMetodo || '').toLowerCase().includes('simul')) ||
                    (paymentMode === 'povy' && !String(m.nombreMetodo || '').toLowerCase().includes('simul'))
                      ? 'ring-2 ring-blue-500 dark:ring-red-500 bg-blue-200/50 dark:bg-red-500/10'
                      : 'hover:bg-secondary'
                  ]"
                  @click="selectPaymentMethod(m)"
                >
                  {{ m.nombreMetodo }}
                  <div v-if="m.descripcionMetodo" class="text-xs text-muted-foreground mt-0.5">
                    {{ m.descripcionMetodo }}
                  </div>
                </button>
              </div>
              <div v-else class="mt-3 text-xs text-muted-foreground">
                No hay métodos de pago configurados en el sistema.
              </div>
              <p class="mt-2 text-xs text-muted-foreground">
                En modo <strong>Simulado</strong> puedes usar cualquier tarjeta de prueba y aprobará sin cargos reales.
              </p>
            </div>

            <!-- Guardadas -->
            <div v-if="savedMethods.length" class="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
              <div class="font-semibold mb-3 text-base">Tus tarjetas guardadas</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  v-for="m in savedMethods" 
                  :key="m.idMetodoPagoUsuario"
                  @click="((paymentMode==='povy' && m.sim) || (paymentMode==='sim' && !m.sim)) ? null : toggleSaved(m.idMetodoPagoUsuario, m)"
                  :class="[
                    'border rounded-md p-3 flex items-center gap-3 select-none transition-colors',
                    selectedMethodId === m.idMetodoPagoUsuario
                      ? 'ring-2 ring-blue-500 bg-blue-200/80 dark:ring-2 dark:ring-red-500 dark:bg-red-500/10'
                      : 'hover:bg-blue-200/60 dark:hover:bg-red-500/15',
                    ((paymentMode==='povy' && m.sim) || (paymentMode==='sim' && !m.sim)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  ]"
                >
                  <div>
                    <div class="font-medium">{{ m.aliasTarjeta || m.nombreMetodo }}</div>
                    <div class="text-sm text-muted-foreground">**** **** **** {{ m.ultimos4 }}</div>
                    <div class="text-xs text-muted-foreground">
                      Expira: {{ m.mesExpiracion }}/{{ String(m.anioExpiracion).slice(-2) }}
                    </div>
                  </div>
                  <span v-if="m.sim" class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">Simulado</span>
                </div>
              </div>
              <p class="text-xs text-muted-foreground mt-2">
                Selecciona para pagar 1‑clic; pulsa de nuevo para deseleccionar.
              </p>
            </div>

            <!-- Formulario tarjeta -->
            <div class="rounded-2xl border border-border bg-card/95 p-5 shadow-sm space-y-4">
              <div>
                <label class="block text-sm mb-1">Número de tarjeta</label>
                <input 
                  ref="numberRef" 
                  :maxlength="19" 
                  @input="onCardNumberInput" 
                  v-model="cardNumber"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500"
                  placeholder="XXXX XXXX XXXX XXXX" 
                  :disabled="selectedMethodId !== null" 
                />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm mb-1">Mes (MM)</label>
                  <input 
                    ref="monthRef" 
                    :maxlength="2" 
                    @input="onMonthInput" 
                    v-model="expMonth"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500"
                    placeholder="12" 
                    :disabled="selectedMethodId !== null" 
                  />
                </div>
                <div>
                  <label class="block text-sm mb-1">Año (YY)</label>
                  <input 
                    ref="yearRef" 
                    :maxlength="2" 
                    @input="onYearInput" 
                    v-model="expYear"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500"
                    placeholder="28" 
                    :disabled="selectedMethodId !== null" 
                  />
                </div>
                <div>
                  <label class="block text-sm mb-1">CVV</label>
                  <input 
                    ref="cvvRef" 
                    :maxlength="3" 
                    @input="onCvvInput" 
                    v-model="cvv"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500"
                    placeholder="123" 
                    :disabled="selectedMethodId !== null" 
                  />
                </div>
              </div>
              <label 
                class="flex items-center gap-2 text-sm mt-1"
                :class="{ 'opacity-50 pointer-events-none': selectedMethodId !== null }"
              >
                <input type="checkbox" v-model="saveMethod" :disabled="selectedMethodId !== null" />
                Guardar este método de pago para futuras compras
              </label>
            </div>

            <!-- Mensajes y acciones -->
            <div v-if="error" class="rounded-md border border-red-500/50 bg-red-500/10 text-red-500 px-3 py-2 text-sm">{{ error }}</div>
            <div v-if="success" class="rounded-md border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 px-3 py-2 text-sm">{{ success }}</div>

            <div class="flex justify-end gap-3">
              <button class="rounded-md border border-border px-4 py-2 hover:bg-secondary" @click="() => router.back()">
                Cancelar
              </button>
              <button 
                :disabled="loading" 
                class="rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                @click="pagar"
              >
                {{ loading ? 'Procesando...' : 'Pagar ahora' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
</template>

<style scoped></style>