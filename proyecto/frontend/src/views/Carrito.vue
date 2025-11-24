<script setup>
import { ref, onMounted } from 'vue'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const cartItems = ref([])
const cartCount = ref(0)
let storageKey = 'cart'
const isLogged = ref(false)
const uidRef = ref(null)

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
          <div v-for="it in cartItems" :key="it.idCarritoItem" class="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
            <div class="flex items-center gap-4">
              <img :src="it.imgProducto || 'https://via.placeholder.com/80x80?text=IMG'" :alt="it.nombreProducto" class="w-16 h-16 object-cover rounded" />
              <div>
                <p class="font-semibold">{{ it.nombreProducto }}</p>
                <p class="text-sm text-muted-foreground">SKU: {{ it.skuProducto }}</p>
                <p class="text-sm text-muted-foreground">${{ Number(it.precioUnitario).toFixed(2) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Cant.</label>
                <input type="number" min="0" class="w-20 rounded border px-2 py-1" :value="it.cantidad"
                  @change="e => updateQty(it.idProducto, e.target.value)" />
              </div>
              <div class="w-28 text-right font-semibold">${{ (Number(it.cantidad) * Number(it.precioUnitario)).toFixed(2) }}</div>
              <button class="rounded bg-red-600 px-3 py-1 text-white" @click="removeItem(it.idProducto)">Eliminar</button>
            </div>
          </div>
        </template>

        <!-- Vista para invitado (localStorage) -->
        <template v-else>
          <div v-for="item in cartItems" :key="item.id" class="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
            <div class="flex items-center gap-4">
              <img :src="item.image" :alt="item.name" class="w-16 h-16 object-cover rounded" />
              <div>
                <p class="font-semibold">{{ item.name }}</p>
                <p class="text-sm text-muted-foreground">{{ item.price }}</p>
              </div>
            </div>
            <button class="text-sm text-red-500 hover:underline" @click="removeItem(item.id)">Eliminar</button>
          </div>
        </template>

        <div class="flex items-center justify-between border-t pt-4">
          <button class="rounded border px-3 py-2" @click="clearCart">Limpiar carrito</button>
          <div v-if="isLogged" class="text-xl font-semibold">
            Total: ${{ cartItems.reduce((a, it) => a + (Number(it.cantidad) * Number(it.precioUnitario)), 0).toFixed(2) }}
          </div>
        </div>

        <div class="flex justify-end">
          <button class="rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2">Proceder al pago</button>
        </div>
      </div>
    </main>
    <Footer />
  </div>
</template>

<style scoped>
</style>
