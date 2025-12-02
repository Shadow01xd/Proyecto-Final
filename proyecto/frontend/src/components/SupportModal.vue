<script setup>
const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100]">
      <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
      <div class="absolute inset-0 flex items-start justify-center mt-24 px-4">
        <div class="w-full max-w-lg rounded-2xl border border-border bg-card text-foreground shadow-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 class="text-lg font-semibold">Soporte</h3>
            <button class="p-1.5 rounded hover:bg-secondary" @click="emit('close')" aria-label="Cerrar">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3 text-sm">
            <p>¿Tienes un problema con tu pedido o producto? Estamos para ayudarte.</p>
            <div class="grid gap-3">
              <a href="mailto:novatech69xd@gmail.com" class="inline-flex items-center gap-2 text-primary hover:underline">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>
                novatech69xd@gmail.com
              </a>
              <a href="https://wa.me/5215555555555" target="_blank" class="inline-flex items-center gap-2 text-primary hover:underline">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12a9.5 9.5 0 0 1-13.4 8.7L3 21l.3-5.1A9.5 9.5 0 1 1 21.5 12z"/></svg>
                Chat de soporte
              </a>
              <a href="/my-orders" class="inline-flex items-center gap-2 text-primary hover:underline">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"/></svg>
                Ver mis pedidos
              </a>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-border text-right">
            <button class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary" @click="emit('close')">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
