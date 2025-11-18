<script setup>
import heroImg from "@/assets/Img/TopGama.png";
</script>

<template>
  <section class="relative overflow-hidden bg-background">
    <div
      class="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
    >
      <div
        class="h-full w-full bg-gradient-to-b from-white via-white to-white dark:from-[#0b1220] dark:via-[#0b1220] dark:to-[#0b1220]"
      ></div>
    </div>
    <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div class="space-y-6">
          <p
            class="text-primary font-semibold text-sm uppercase tracking-wider"
          >
            Potencia sin límites
          </p>
          <h2
            class="text-4xl md:text-5xl font-bold text-foreground leading-tight"
          >
            Hardware de alto rendimiento para tu PC
          </h2>
          <p class="text-lg text-muted-foreground leading-relaxed">
            Descubre componentes premium seleccionados para gaming,
            productividad y streaming profesional.
          </p>
          <div class="flex gap-4 flex-wrap pt-2">
            <a
              class="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 font-semibold px-6 py-3"
              href="#"
              >Explorar Productos</a
            >
            <a
              class="inline-flex items-center justify-center rounded-md border border-border hover:bg-secondary text-foreground font-semibold px-6 py-3"
              href="#"
              >Ver Especificaciones</a
            >
          </div>
        </div>
        <div class="hidden md:block">
          <div
            class="h-80 w-full rounded-xl border border-border overflow-hidden"
          >
            <img
              :src="heroImg"
              alt="Hardware de alto rendimiento"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
