<script setup>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { RouterLink } from 'vue-router'
import imgKG from '@/assets/Img/img_KG.jpeg'
import imgMG from '@/assets/Img/imgMG.jpg'
const team = [
  {
    name: 'Miguel Ángel Hernández',
    role: 'Fundador & CEO',
    bio: 'Apasionado por el hardware de alto rendimiento y la experiencia de usuario.',
    photo: imgMG
  },
  {
    name: 'Fabian Herrera',
    role: 'Atención al Cliente',
    bio: 'Garantiza que cada cliente reciba soporte cercano, claro y honesto.',
    photo: 'https://static.toiimg.com/thumb/msid-125216702,imgsize-864802,width-400,resizemode-4/michael-willis-heard-cause-of-death-how-did-the-tiktok-star-yes-king-die.jpg'
  },
  {
    name: 'Kenneth Granados',
    role: 'Especialista en Ensamblaje',
    bio: 'Diseña y ensambla equipos optimizados para gaming y productividad.',
    photo: imgKG
  }
]

const faqs = [
  {
    question: '¿Puedo armar una PC personalizada con ustedes?',
    answer:
      'Sí. Puedes escribirnos con tu presupuesto y tipo de uso (gaming, edición, oficina) y te proponemos una configuración equilibrada.'
  },
  {
    question: '¿Ofrecen garantía en los componentes?',
    answer:
      'Respetamos siempre la garantía oficial de cada fabricante y te apoyamos con el proceso en caso de falla.'
  },
  {
    question: '¿Hacen envíos a todo el país?',
    answer:
      'Podemos cotizar envíos a la mayoría de estados/ciudades. Escríbenos con tu ubicación para confirmarlo.'
  }
]
</script>

<template>
  <div class="bg-background text-foreground min-h-screen flex flex-col">
    <Header />

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-12 lg:space-y-16 relative">
      <!-- Hero / Introducción -->
      <section class="grid gap-10 md:grid-cols-2 md:items-center">
        <div class="space-y-5">
          <p class="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-primary">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">◎</span>
            Sobre nosotros
          </p>
          <h1 class="text-2xl md:text-4xl font-bold leading-tight">
            Construimos experiencias,
            <span class="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">no solo PCs.</span>
          </h1>
          <p class="text-sm md:text-base text-muted-foreground">
            Somos una tienda especializada en hardware y soluciones para PC. Creemos en la transparencia,
            la asesoría honesta y la pasión por la tecnología. Cada componente que ofrecemos ha sido
            cuidadosamente seleccionado para ofrecer el mejor equilibrio entre rendimiento y confiabilidad.
          </p>
        </div>
        <div class="relative h-60 md:h-72 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-background to-background">
          <img
            src="https://www.cnet.com/a/img/resize/bcbacc4ad119e6f901ff4b7865f1b164f317be5b/hub/2019/11/23/4e21a4ae-cab6-4ea5-ace9-c3d8603ff017/all-parts.jpg?auto=webp&width=1200"
            alt="Tienda de hardware"
            class="w-full h-full object-cover opacity-80"
          />
          <div class="absolute inset-0 bg-gradient-to-tr from-background/80 via-transparent to-primary/40 mix-blend-multiply"></div>
          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span class="inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1 border border-border/80">
              Componentes probados · Ensambles reales
            </span>
            <span class="hidden sm:inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1 border border-border/80">
              +300 builds armadas
            </span>
          </div>
        </div>
      </section>

      <!-- Historia / Qué hacemos -->
      <section class="grid gap-10 md:grid-cols-[3fr,2fr] md:items-start border-t border-border/60 pt-10">
        <div class="space-y-4">
          <h2 class="text-xl sm:text-2xl font-semibold">Nuestra historia</h2>
          <p class="text-sm md:text-base text-muted-foreground">
            Nacimos como un pequeño proyecto entre amigos entusiastas del hardware que armaban PCs para conocidos.
            Con el tiempo fuimos creciendo, sumando experiencia y proveedores, hasta convertirnos en una tienda
            especializada que combina asesoría personalizada con componentes de marcas confiables.
          </p>
          <p class="text-sm md:text-base text-muted-foreground">
            Hoy nuestro objetivo es que cada persona tenga acceso a una PC bien pensada, sin pagar de más y sin
            perderse entre fichas técnicas complicadas. Preferimos ser claros y honestos antes que venderte algo que
            no necesitas.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-1 shadow-sm">
            <p class="text-2xl font-bold">+5 años</p>
            <p class="text-xs text-muted-foreground">Ensamblando y recomendando hardware para todo tipo de usuarios.</p>
          </div>
          <div class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-1 shadow-sm">
            <p class="text-2xl font-bold">+300 builds</p>
            <p class="text-xs text-muted-foreground">Equipos armados para gaming, streaming, diseño y trabajo remoto.</p>
          </div>
          <div class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-1 shadow-sm">
            <p class="text-2xl font-bold">Soporte 1:1</p>
            <p class="text-xs text-muted-foreground">Te acompañamos desde la cotización hasta la configuración inicial.</p>
          </div>
          <div class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-1 shadow-sm">
            <p class="text-2xl font-bold">Marcas top</p>
            <p class="text-xs text-muted-foreground">Trabajamos con fabricantes reconocidos y distribuidores oficiales.</p>
          </div>
        </div>
      </section>

      <!-- Valores -->
      <section class="space-y-6 border-t border-border/60 pt-10">
        <h2 class="text-xl sm:text-2xl font-semibold">Nuestros valores</h2>
        <div class="grid gap-5 md:grid-cols-3">
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Transparencia</h3>
            <p class="text-xs text-muted-foreground">
              Hablamos claro sobre el rendimiento real de cada componente, sin promesas exageradas ni letra pequeña.
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Soporte cercano</h3>
            <p class="text-xs text-muted-foreground">
              Te ayudamos a elegir la mejor opción según tu presupuesto y necesidades, no solo lo más caro.
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Pasión por el hardware</h3>
            <p class="text-xs text-muted-foreground">
              Probamos, medimos y comparamos para ofrecerte siempre configuraciones actualizadas y equilibradas.
            </p>
          </article>
        </div>
      </section>

      <!-- Equipo -->
      <section class="space-y-6 border-t border-border/60 pt-10">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-xl sm:text-2xl font-semibold">Conoce al equipo</h2>
          <p class="text-xs text-muted-foreground hidden sm:block">
            Personas reales detrás de cada recomendación y cada ensamble.
          </p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="member in team"
            :key="member.name"
            class="rounded-xl border border-border bg-card/95 backdrop-blur overflow-hidden flex flex-col items-center text-center shadow-sm hover:shadow-lg transition hover:-translate-y-0.5"
          >
            <div class="p-6 flex flex-col items-center gap-3 w-full">
              <img :src="member.photo" :alt="member.name" class="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border border-border shadow-sm" />
              <div class="space-y-0.5">
                <h3 class="text-sm font-semibold">{{ member.name }}</h3>
                <p class="text-xs text-primary font-medium">{{ member.role }}</p>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ member.bio }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <!-- Servicios / Qué ofrecemos -->
      <section class="space-y-6 border-t border-border/60 pt-10">
        <h2 class="text-xl sm:text-2xl font-semibold">¿Qué podemos hacer por ti?</h2>
        <div class="grid gap-5 md:grid-cols-3">
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Asesoría para tu build</h3>
            <p class="text-xs text-muted-foreground">
              Te ayudamos a elegir CPU, GPU, RAM, almacenamiento y fuente ideales según tu presupuesto y tipo de uso.
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Ensamblaje y pruebas</h3>
            <p class="text-xs text-muted-foreground">
              Probamos tu equipo con estrés tests básicos para asegurarnos de que todo funcione estable desde el día uno.
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card/90 backdrop-blur p-4 space-y-2 shadow-sm">
            <h3 class="text-sm font-semibold">Actualizaciones y mejoras</h3>
            <p class="text-xs text-muted-foreground">
              Si ya tienes PC, podemos recomendar upgrades puntuales para alargar su vida útil sin cambiar todo.
            </p>
          </article>
        </div>
      </section>

      <!-- FAQ corto -->
      <section class="space-y-6 border-t border-border/60 pt-10">
        <h2 class="text-xl sm:text-2xl font-semibold">Preguntas frecuentes</h2>
        <div class="space-y-3">
          <details
            v-for="item in faqs"
            :key="item.question"
            class="group rounded-xl border border-border bg-card/90 backdrop-blur p-4 shadow-sm transition hover:border-primary/70 hover:shadow-md"
          >
            <summary class="flex cursor-pointer list-none items-center justify-between gap-2">
              <span class="text-sm font-medium group-open:text-primary">{{ item.question }}</span>
              <span class="text-xs text-muted-foreground group-open:hidden">Ver más</span>
              <span class="text-xs text-muted-foreground hidden group-open:inline">Ver menos</span>
            </summary>
            <p class="mt-2 text-xs text-muted-foreground">
              {{ item.answer }}
            </p>
          </details>
        </div>
      </section>

      <!-- Sección de contacto corto -->
      <section class="rounded-2xl border border-border bg-card/95 backdrop-blur p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <h2 class="text-lg md:text-xl font-semibold">¿Tienes un proyecto en mente?</h2>
          <p class="text-xs md:text-sm text-muted-foreground mt-1">
            Escríbenos y te ayudamos a armar tu próxima build para gaming, trabajo creativo o productividad.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <a
            href="mailto:contacto@novatech.com?subject=Consulta%20PC%20personalizada&body=Hola%20NovaTech%2C%20quiero%20cotizar%20una%20PC%20para..."
            class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Escríbenos
          </a>
          <RouterLink
            to="/hardware"
            class="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Ver catálogo
          </RouterLink>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
</style>
