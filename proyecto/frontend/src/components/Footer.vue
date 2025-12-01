<script setup>
import { ref } from 'vue'
import ContactModal from '@/components/ContactModal.vue'
import SupportModal from '@/components/SupportModal.vue'

const showContact = ref(false)
const showSupport = ref(false)
</script>

<template>
  <footer class="w-full border-t border-border bg-background">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid md:grid-cols-4 gap-12 mb-8">
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-foreground">NovaTech</h3>
          <p class="text-muted-foreground text-sm">Tu tienda de confianza para hardware de PC de última generación</p>
        </div>

        <div class="space-y-3">
          <h4 class="font-semibold text-foreground">Productos</h4>
          <ul class="space-y-2 text-sm">
            <li><RouterLink to="/hardware" class="text-muted-foreground hover:text-primary transition-colors">Catálogo</RouterLink></li>
            <li><RouterLink to="/builder" class="text-muted-foreground hover:text-primary transition-colors">Arma tu PC</RouterLink></li>
            <li><RouterLink to="/ofertas" class="text-muted-foreground hover:text-primary transition-colors">Ofertas</RouterLink></li>
          </ul>
        </div>

        <div class="space-y-3">
          <h4 class="font-semibold text-foreground">Compañía</h4>
          <ul class="space-y-2 text-sm">
            <li><RouterLink to="/about" class="text-muted-foreground hover:text-primary transition-colors">Sobre nosotros</RouterLink></li>
            <li><button type="button" class="text-left text-muted-foreground hover:text-primary transition-colors" @click="showContact = true">Contacto</button></li>
            <li><button type="button" class="text-left text-muted-foreground hover:text-primary transition-colors" @click="showSupport = true">Soporte</button></li>
          </ul>
        </div>

        <div class="space-y-3">
          <h4 class="font-semibold text-foreground">Síguenos</h4>
          <div class="flex gap-3">
            <a href="#" class="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary">Twitter</a>
            <a href="#" class="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary">Github</a>
            <a href="#" class="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary">LinkedIn</a>
          </div>
        </div>
      </div>

      <div class="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <p>&copy; 2025 NovaTech. Todos los derechos reservados.</p>
        <div class="flex gap-6">
          <a href="#" class="hover:text-primary transition-colors">Privacidad</a>
          <a href="#" class="hover:text-primary transition-colors">Términos</a>
          <a href="#" class="hover:text-primary transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
  
  <!-- Modales -->
  <ContactModal :open="showContact" @close="showContact = false" />
  <SupportModal :open="showSupport" @close="showSupport = false" />
</template>

<style scoped>
</style>
