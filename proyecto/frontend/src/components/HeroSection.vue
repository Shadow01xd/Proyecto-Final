<script setup>
import heroImg from "@/assets/Img/TopGama.png";
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="relative overflow-hidden bg-background animate-fade-in-up-soft">
    <!-- Capa base de degradado -->
    <div
      class="pointer-events-none absolute inset-0 opacity-80 dark:opacity-100"
    >
      <div
        class="h-full w-full bg-gradient-to-br from-sky-50 via-sky-100 to-indigo-200 dark:from-[#050816] dark:via-[#0b1220] dark:to-[#020617]"
      ></div>
    </div>

    <!-- Capa de estrellas suaves -->
    <div class="pointer-events-none absolute inset-0 hero-stars" aria-hidden="true"></div>

    <!-- Capa de destellos / orbes -->
    <div class="pointer-events-none absolute inset-0 hero-orbs" aria-hidden="true">
      <div class="hero-orb hero-orb-1"></div>
      <div class="hero-orb hero-orb-2"></div>
      <div class="hero-orb hero-orb-3"></div>
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
            <RouterLink
              to="/hardware"
              class="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 font-semibold px-6 py-3"
            >
              Explorar Productos
            </RouterLink>
            <RouterLink
              to="/builder"
              class="inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-800 hover:bg-slate-100
                     dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-800 font-semibold px-6 py-3 transition-colors"
            >
              Ver Especificaciones
            </RouterLink>
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

<style scoped>
.hero-stars {
  background-image:
    radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.4) 0, transparent 35%),
    radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.35) 0, transparent 40%),
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.25) 0, transparent 35%),
    radial-gradient(circle at 70% 75%, rgba(255, 255, 255, 0.3) 0, transparent 45%);
  opacity: 0.35;
  mix-blend-mode: screen;
  animation: hero-stars-move 18s linear infinite alternate;
}

.hero-orbs {
  overflow: hidden;
}

.hero-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(26px);
  mix-blend-mode: screen;
  opacity: 0.45;
}

.hero-orb-1 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle at 30% 30%, rgba(129, 140, 248, 0.95), transparent 60%);
  top: -80px;
  left: -40px;
  animation: hero-orb-float-1 16s ease-in-out infinite alternate;
}

.hero-orb-2 {
  width: 260px;
  height: 260px;
  background: radial-gradient(circle at 70% 30%, rgba(239, 68, 68, 0.9), transparent 65%);
  top: 30%;
  right: -80px;
  animation: hero-orb-float-2 20s ease-in-out infinite alternate;
}

.hero-orb-3 {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.9), transparent 65%);
  bottom: -60px;
  left: 35%;
  animation: hero-orb-float-3 22s ease-in-out infinite alternate;
}

@keyframes hero-stars-move {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-12px, -18px, 0) scale(1.03);
  }
}

@keyframes hero-orb-float-1 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(20px, 16px, 0) scale(1.08);
  }
}

@keyframes hero-orb-float-2 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-24px, -12px, 0) scale(1.06);
  }
}

@keyframes hero-orb-float-3 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(8px, -18px, 0) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-stars,
  .hero-orb,
  .hero-orbs {
    animation: none !important;
    transform: none !important;
  }
}
</style>
