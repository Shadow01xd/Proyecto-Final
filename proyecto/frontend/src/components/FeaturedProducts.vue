<script setup>
import { defineEmits, ref, onMounted } from 'vue'

const emit = defineEmits(['add-to-cart'])

const products = ref([])

function toCard(p) {
  return {
    id: p.idProducto,
    name: p.nombreProducto,
    category: p.nombreCategoria,
    price: `$${Number(p.precioProducto || 0).toFixed(2)}`,
    rating: 4.8,
    reviews: 100,
    badge: 'Destacado',
    image: p.imgProducto || 'https://via.placeholder.com/400x300?text=Producto'
  }
}

async function loadProducts() {
  try {
    const res = await fetch('http://localhost:3000/api/productos')
    if (!res.ok) throw new Error('No se pudieron cargar productos')
    const data = await res.json()
    products.value = (data || []).map(toCard)
  } catch (e) {
    products.value = []
  }
}

onMounted(loadProducts)
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
    <div class="space-y-12">
      <div class="space-y-4">
        <h2 class="text-3xl md:text-4xl font-bold text-foreground">Productos Destacados</h2>
        <p class="text-lg text-muted-foreground">Los componentes más veloces y confiables del mercado</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="p in products" :key="p.id" class="group overflow-hidden rounded-lg bg-card border border-border hover:border-primary transition-all duration-300">
          <div class="p-0">
            <!-- Placeholder visual sin imagen -->
            <div class="relative overflow-hidden h-48">
              <img :src="p.image" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
              <div class="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">{{ p.badge }}</div>
            </div>
            <div class="p-4 space-y-4">
              <div class="space-y-1">
                <p class="text-xs text-black-foreground uppercase tracking-wider font-semibold">{{ p.category }}</p>
                <h3 class="font-bold text-foreground leading-tight">{{ p.name }}</h3>
              </div>

              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1 text-primary">
                  <!-- star icon -->
                  <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.785 1.401 8.168L12 18.896l-7.335 3.868 1.401-8.168L.132 9.211l8.2-1.193L12 .587z"/></svg>
                  <span class="text-sm font-semibold text-foreground">{{ p.rating }}</span>
                </div>
                <span class="text-xs text-muted-foreground">({{ p.reviews }})</span>
              </div>

              <div class="space-y-3 pt-2 border-t border-border">
                <p class="text-2xl font-bold text-White">{{ p.price }}</p>
                <button
                  class="w-full rounded-md bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2"
                  @click="emit('add-to-cart', p)"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>
