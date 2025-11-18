<script setup>
import imgGPU from '@/assets/Img/rtx5090.png'
import imgCPU from '@/assets/Img/Intel_i9.png'
import imgNVMe from '@/assets/Img/NVMe.png'
import imgRAM from '@/assets/Img/Ram.png'

const products = [
  { id: 1, name: 'GPU RTX 5090', category: 'Tarjeta Gráfica', price: '$2,499', rating: 4.9, reviews: 342, badge: 'Premium', image: imgGPU },
  { id: 2, name: 'CPU Intel i9-14900K', category: 'Procesador', price: '$699', rating: 4.8, reviews: 518, badge: 'Bestseller', image: imgCPU },
  { id: 3, name: 'SSD NVMe 4TB', category: 'Almacenamiento', price: '$399', rating: 4.7, reviews: 291, badge: 'Popular', image: imgNVMe },
  { id: 4, name: 'RAM DDR5 64GB', category: 'Memoria RAM', price: '$549', rating: 4.9, reviews: 187, badge: 'Premium', image: imgRAM },
]
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
                <button class="w-full rounded-md bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2">Ver Detalles</button>
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
