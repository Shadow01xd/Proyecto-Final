<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const cartItems = ref([])
const cartCount = ref(0)
let storageKey = 'cart'
const isLogged = ref(false)
const uidRef = ref(null)
const router = useRouter()

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

async function loadFromServer(idUsuario) {
  const res = await fetch(`http://localhost:3000/api/carrito/${idUsuario}`)
  if (!res.ok) throw new Error('No se pudo cargar carrito')
  const data = await res.json()
  cartItems.value = data.items || []
  cartCount.value = cartItems.value.length
}

const loadCart = async () => {
  const uid = getUserId()
  uidRef.value = uid
  isLogged.value = !!uid
  if (uid) {
    await loadFromServer(uid)
    return
  }
  storageKey = 'cart'
  try {
    const raw = localStorage.getItem(storageKey)
    cartItems.value = raw ? JSON.parse(raw) : []
  } catch {
    cartItems.value = []
  }
  cartCount.value = cartItems.value.length
}

const removeItem = async (id) => {
  if (isLogged.value && uidRef.value) {
    try {
      await fetch('http://localhost:3000/api/carrito/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario: uidRef.value, idProducto: id })
      })
      await loadFromServer(uidRef.value)
      return
    } catch {}
  }
  // invitado / fallback
  cartItems.value = cartItems.value.filter(i => i.id !== id)
  localStorage.setItem(storageKey, JSON.stringify(cartItems.value))
  cartCount.value = cartItems.value.length
}

const updateQty = async (idProducto, cantidad) => {
  if (!isLogged.value || !uidRef.value) return
  cantidad = Number(cantidad)
  if (cantidad < 0) return
  // si 0, elimina
  if (cantidad === 0) {
    return removeItem(idProducto)
  }
  await fetch('http://localhost:3000/api/carrito/item', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idUsuario: uidRef.value, idProducto, cantidad })
  })
  await loadFromServer(uidRef.value)
}

const clearCart = async () => {
  if (isLogged.value && uidRef.value) {
    await fetch(`http://localhost:3000/api/carrito/clear/${uidRef.value}`, { method: 'DELETE' })
    await loadFromServer(uidRef.value)
    return
  }
  cartItems.value = []
  localStorage.setItem(storageKey, JSON.stringify(cartItems.value))
  cartCount.value = 0
}

onMounted(loadCart)

const totalAmount = computed(() => {
  if (!cartItems.value || cartItems.value.length === 0) return 0
  // para logueado viene cantidad y precioUnitario
  if (isLogged.value) {
    return cartItems.value.reduce((a, it) => a + (Number(it.cantidad) * Number(it.precioUnitarioEfectivo ?? it.precioUnitario)), 0)
  }
  // invitado: asumir item.price es numérico
  return cartItems.value.reduce((a, it) => {
    // soportar formatos "$89.99", "89.99", o número
    const raw = it.price != null ? String(it.price) : '0'
    const num = Number(raw.replace(/[^0-9.-]/g, ''))
    return a + (isNaN(num) ? 0 : num)
  }, 0)
})

function proceedToPayment() {
  const amount = Number(totalAmount.value || 0)
  if (!amount || amount <= 0) return
  // bloquear compra si no está logueado
  if (!isLogged.value || !uidRef.value) {
    return
  }
  // mantener este objeto sincronizado para la página de pago
  window.pedidoActual = {
    total: amount,
    moneda: 'USD',
    id: isLogged.value && uidRef.value ? `CART-${uidRef.value}` : 'INVITADO'
  }
  router.push({ name: 'payment', query: { amount: amount.toFixed(2), currency: 'USD', id: window.pedidoActual.id } })
}
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header :cart-count="cartCount" />
    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold mb-6">Carrito</h1>

      <div v-if="cartItems.length === 0" class="text-muted-foreground">
        Tu carrito está vacío.
      </div>

      <div v-else class="space-y-4">
        <!-- Vista para logueado (datos desde backend) -->
        <template v-if="isLogged">
          <div v-for="it in cartItems" :key="it.idCarritoItem" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-border rounded-lg p-4 bg-card">
            <div class="flex items-start sm:items-center gap-4">
              <img :src="it.imgProducto || 'https://via.placeholder.com/80x80?text=IMG'" :alt="it.nombreProducto" class="w-16 h-16 object-cover rounded" />
              <div>
                <p class="font-semibold">{{ it.nombreProducto }}</p>
                <p class="text-sm text-muted-foreground">SKU: {{ it.skuProducto }}</p>
                <p class="text-sm text-muted-foreground">${{ Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario).toFixed(2) }}</p>
              </div>
            </div>
            <div class="flex items-center sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto flex-wrap">
              <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Cant.</label>
                <input type="number" min="0" class="w-16 sm:w-20 rounded border px-2 py-1" :value="it.cantidad"
                  @change="e => updateQty(it.idProducto, e.target.value)" />
              </div>
              <div class="text-right font-semibold sm:w-28">${{ (Number(it.cantidad) * Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario)).toFixed(2) }}</div>
              <button class="rounded bg-red-600 px-3 py-1 text-white whitespace-nowrap" @click="removeItem(it.idProducto)">Eliminar</button>
            </div>
          </div>
        </template>

        <!-- Vista para invitado (localStorage) -->
        <template v-else>
          <div v-for="item in cartItems" :key="item.id" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-border rounded-lg p-4 bg-card">
            <div class="flex items-start sm:items-center gap-4">
              <img :src="item.image" :alt="item.name" class="w-16 h-16 object-cover rounded" />
              <div>
                <p class="font-semibold">{{ item.name }}</p>
                <p class="text-sm text-muted-foreground">{{ item.price }}</p>
              </div>
            </div>
            <div class="flex justify-end w-full sm:w-auto">
              <button class="text-sm text-red-500 hover:underline" @click="removeItem(item.id)">Eliminar</button>
            </div>
          </div>
        </template>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
          <button class="rounded border px-3 py-2 w-full sm:w-auto" @click="clearCart">Limpiar carrito</button>
          <div class="text-xl font-semibold text-right sm:text-left">
            Total: ${{ Number(totalAmount).toFixed(2) }}
          </div>
        </div>

        <!-- Checkout button for logged-in users -->
        <div class="mt-4 flex justify-end" v-if="isLogged">
          <button class="w-full sm:w-auto rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2 hover:bg-primary/90" @click="proceedToPayment">
            Proceder al pago
          </button>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div v-if="!isLogged" class="w-full">
            <div class="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
              <div class="mt-0.5 text-primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm text-foreground font-medium">Completa tu compra</p>
                <p class="text-xs text-muted-foreground mt-1">Crea una cuenta o accede para guardar tu pedido y continuar con el pago de forma segura.</p>
                <div class="mt-3 flex gap-2">
                  <RouterLink to="/login" class="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Iniciar sesión</RouterLink>
                  <RouterLink to="/register" class="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary/40">Registrarse</RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
</template>

<style scoped>
</style>
