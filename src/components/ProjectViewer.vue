<script setup lang="ts">
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import { ref } from 'vue'
import matter from 'gray-matter'
import { marked } from 'marked'

const projectFiles = import.meta.glob('../projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const imageFiles = import.meta.glob('../projects/images/*', { eager: true, import: 'default' })

// fallback svg image
const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid meet'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%237fb7ff'/><stop offset='1' stop-color='%238fb8d9'/></linearGradient></defs><rect width='100%' height='100%' rx='18' fill='url(%23g)'/><g transform='translate(120,100)' fill='none' stroke='%23ffffff' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'><rect x='40' y='30' width='520' height='360' rx='20' opacity='0.18' fill='none' stroke='%23ffffff'/><circle cx='300' cy='210' r='70' opacity='0.2' fill='none' stroke='%23ffffff'/><path d='M80 80 L140 80 L170 40 L200 80 L260 80' opacity='0.12' stroke='%23ffffff'/></g><text x='50%' y='92%' font-family='system-ui, -apple-system, "Segoe UI", Roboto' font-size='18' fill='rgba(255,255,255,0.9)' text-anchor='middle'>No image available</text></svg>`

type Project = {
  id: string
  title: string
  thumbnail: string
  text: string
  uploadDate: string
}

const filenameFromPath = (path: string) => path.split('/').pop()!

const projects = ref<Project[]>(
  Object.entries(projectFiles).map(([filePath, moduleExport]) => {
    const raw = moduleExport as unknown as string

    const parsed = matter(raw)
    const meta = parsed.data || {}
    const markdown = parsed.content || ''
    const html = marked(markdown)

    let thumbnailUrl = meta.thumbnail ?? ''
    if (thumbnailUrl) {
      const wantedName = (thumbnailUrl as string).split('/').pop()!
      for (const [imgPath, imgModule] of Object.entries(imageFiles)) {
        if (filenameFromPath(imgPath) === wantedName) {
          thumbnailUrl = imgModule as unknown as string
          break
        }
      }
    }

    return {
      id: filenameFromPath(filePath),
      title: meta.title ?? meta.name ?? 'Untitled',
      thumbnail: thumbnailUrl || fallbackSvg,
      text: html,
      uploadDate: meta.uploadDate ?? meta.date ?? '',
    } as Project
  }),
)

const selectedProject = ref<Project | null>(null)

function openProject(project: Project, evt?: MouseEvent) {
  if (!project) return
  const cardEl =
    (evt?.currentTarget as Element | null) ??
    document.querySelector(`[data-project-card="${project.id}"]`)
  const thumbEl = cardEl?.querySelector('img') ?? null

  const vtName = `thumb-${project.id}`
  setViewName(thumbEl, vtName)

  const doUpdate = () => {
    selectedProject.value = project
  }

  if (document.startViewTransition) {
    document.startViewTransition(() => doUpdate())
  } else {
    doUpdate()
  }
}

function closeProject() {
  const project = selectedProject.value
  if (!project) return

  const modalImg = document.querySelector(`.modal-img[data-project-id="${project.id}"]`)
  const gridImg = document.querySelector(`[data-project-card="${project.id}"] img`)
  const vtName = `thumb-${project.id}`
  setViewName(modalImg, vtName)
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      selectedProject.value = null
    })
  } else {
    selectedProject.value = null
  }
  setTimeout(() => {
    setViewName(modalImg, null)
    setViewName(gridImg, null)
  }, 300)
}

function setViewName(el: Element | null, name: string | null) {
  if (!el) return
  const style = (el as HTMLElement).style
  if (name === null) style.removeProperty('view-transition-name')
  else style.setProperty('view-transition-name', name)
}
</script>

<template>
  <section class="projects">
    <h2 class="section-title">Projects</h2>
    <div class="grid">
      <div
        v-for="(project, i) in projects"
        :key="i"
        class="project-card"
        @click="(e) => openProject(project, e)"
        :data-project-card="project.id"
      >
        <img
          :src="project.thumbnail"
          :alt="project.title"
          @error="(e) => ((e.target as HTMLImageElement).src = fallbackSvg)"
        />
        <h3>{{ project.title }}</h3>
      </div>
    </div>

    <div v-if="selectedProject" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="closeProject">✕</button>
        <h2>{{ selectedProject!.title }}</h2>
        <p class="date">Uploaded: {{ selectedProject!.uploadDate }}</p>
        <img
          class="modal-img"
          :src="selectedProject!.thumbnail"
          :data-project-id="selectedProject!.id"
          @error="(e) => ((e.target as HTMLImageElement).src = fallbackSvg)"
        />
        <p class="text" v-html="selectedProject!.text"></p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-align: center;
}

.grid {
  display: grid;
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.project-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-background-soft);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.project-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.project-card h3 {
  padding: 0.75rem;
  text-align: center;
  font-size: 1.2rem;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--color-background);
  padding: 2rem;
  border-radius: 12px;
  max-width: 700px;
  width: 90%;
  position: relative;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}

.modal-img {
  width: 100%;
  height: auto;
  margin: 1rem 0;
  border-radius: 8px;
}

.date {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #666);
  margin-bottom: 1rem;
}

.text {
  font-size: 1rem;
  line-height: 1.5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (min-width: 769px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
.title-stack {
  position: relative;
}

.title-normal,
.title-fancy {
  position: absolute;
  left: 0;
  top: 0;
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.modal .title-normal {
  opacity: 0;
  transform: translateY(-4px);
}

.modal .title-fancy {
  opacity: 1;
  transform: translateY(0);
}
</style>
