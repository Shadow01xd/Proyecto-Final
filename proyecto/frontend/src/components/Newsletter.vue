<script setup>
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
    <div class="relative overflow-hidden rounded-2xl border border-border p-8 md:p-16 bg-gradient-to-r from-background via-background to-background dark:from-[#121829] dark:via-[#151a2c] dark:to-[#2b0a0a]">
      <div class="absolute inset-0 opacity-30 pointer-events-none">
        <div class="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      <div class="relative space-y-6 text-center md:text-left md:max-w-lg">
        <div class="flex items-center gap-2 justify-center md:justify-start">
          <span class="inline-block w-5 h-5 rounded-full bg-primary"></span>
          <span class="text-primary font-semibold text-sm uppercase tracking-wider">Newsletter</span>
        </div>

        <h2 class="text-3xl md:text-4xl font-bold text-foreground">Suscríbete a nuestras ofertas</h2>

        <p class="text-muted-foreground text-lg">Recibe actualizaciones de productos nuevos, ofertas exclusivas y consejos de expertos en hardware</p>

        <div class="flex gap-2 flex-col sm:flex-row">
          <input type="email" placeholder="tu@email.com" class="w-full rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button class="rounded-md bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-2.5">Suscribirse</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>
