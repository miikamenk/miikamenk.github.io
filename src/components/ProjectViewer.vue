<script setup lang="ts">
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import { ref, computed } from 'vue'
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
      // CHANGE: Don't default to fallbackSvg here, leave it empty if missing
      thumbnail: thumbnailUrl,
      text: html,
      uploadDate: meta.uploadDate ?? meta.date ?? '',
    } as Project
  }),
)

const sortOrder = ref<'newest' | 'oldest'>('newest')

const sortedProjects = computed(() => {
  return [...projects.value].sort((a, b) => {
    const dateA = new Date(a.uploadDate).getTime() || 0
    const dateB = new Date(b.uploadDate).getTime() || 0
    return sortOrder.value === 'newest' ? dateB - dateA : dateA - dateB
  })
})
const selectedProject = ref<Project | null>(null)
const fullscreenImage = ref<string | null>(null)

function openProject(project: Project, evt?: MouseEvent) {
  if (!project) return
  const cardEl =
    (evt?.currentTarget as Element | null) ??
    document.querySelector(`[data-project-card="${project.id}"]`)

  const thumbEl = cardEl?.querySelector('img') ?? null
  const titleEl = cardEl?.querySelector('h3') ?? null

  // 1. Tag the specific elements
  setViewName(thumbEl, `thumb-${project.id}`)
  setViewName(titleEl, `title-${project.id}`)

  // 2. Tag the Card Background to morph into the Modal Background
  setViewName(cardEl, `card-bg-${project.id}`)

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

  const gridImg = document.querySelector(`[data-project-card="${project.id}"] img`)
  const gridTitle = document.querySelector(`[data-project-card="${project.id}"] h3`)

  setViewName(gridImg, `thumb-${project.id}`)
  setViewName(gridTitle, `title-${project.id}`)

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      selectedProject.value = null
    })
  } else {
    selectedProject.value = null
  }

  // Cleanup styles after transition
  setTimeout(() => {
    setViewName(gridImg, null)
    setViewName(gridTitle, null)
  }, 300)
}

function openFullscreenImage(src: string) {
  fullscreenImage.value = src
}

function closeFullscreenImage() {
  fullscreenImage.value = null
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
    <div class="projects-header">
      <button class="sort-btn" @click="sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest'">
        <span>{{ sortOrder === 'newest' ? 'Newest' : 'Oldest' }}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ rotated: sortOrder === 'oldest' }"
          class="icon-arrow"
        >
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div class="grid">
      <div
        v-for="(project, i) in sortedProjects"
        :key="project.id"
        class="project-card"
        @click="(e) => openProject(project, e)"
        :data-project-card="project.id"
      >
        <img
          :src="project.thumbnail || fallbackSvg"
          :alt="project.title"
          @error="(e) => ((e.target as HTMLImageElement).src = fallbackSvg)"
        />
        <h3>{{ project.title }}</h3>
      </div>
    </div>

    <div v-if="selectedProject" class="modal">
      <button
        class="close-btn"
        v-if="!fullscreenImage"
        @click="closeProject"
        style="view-transition-name: close-button"
      >
        ✕
      </button>

      <div class="modal-content" :style="{ viewTransitionName: `card-bg-${selectedProject!.id}` }">
        <h2 :style="{ viewTransitionName: `title-${selectedProject!.id}` }">
          {{ selectedProject!.title }}
        </h2>

        <p class="date">Uploaded: {{ selectedProject!.uploadDate }}</p>

        <img
          v-if="selectedProject!.thumbnail && selectedProject!.thumbnail !== fallbackSvg"
          class="modal-img"
          :src="selectedProject!.thumbnail"
          :style="{ viewTransitionName: `thumb-${selectedProject!.id}` }"
          @click="openFullscreenImage(selectedProject!.thumbnail)"
        />

        <p class="text" v-html="selectedProject!.text"></p>
      </div>

      <div v-if="fullscreenImage" class="fullscreen-viewer" @click.self="closeFullscreenImage">
        <button class="fs-close-btn" @click="closeFullscreenImage">✕</button>
        <img :src="fullscreenImage" class="fs-img" alt="Fullscreen Project Image" />
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

.sort-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border, #ddd);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s;
}

.projects-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0;
  text-align: left;
}

.grid {
  display: grid;
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

@media (min-width: 769px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border, #ddd);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s;
}

.sort-btn:hover {
  background: var(--color-border, #ccc);
}

.icon-arrow {
  transition: transform 0.3s ease;
}

.rotated {
  transform: rotate(180deg);
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
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.project-card h3 {
  padding: 0.75rem;
  font-size: 1.2rem;
  width: fit-content;
  margin: 0 auto;
  text-align: center;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow-y: auto;
  padding: 2rem 1rem;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
}

.modal-content {
  background: var(--color-background);
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  position: relative;
}

.modal-content h2 {
  font-size: 2rem;
  line-height: 1.2;
  margin: 0 0 1rem 0;
  width: fit-content;
}

.modal-img {
  width: auto;
  max-width: 100%;
  max-height: 70vh;
  display: block;
  margin: 1.5rem 0;
  border-radius: 8px;
  object-fit: contain;
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

.close-btn {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2005;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #333;
  transform: none;
}
</style>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s; /* Smooth speed */
}

::view-transition-group(*),
::view-transition-old(*),
::view-transition-new(*) {
  mix-blend-mode: normal;
}

h2,
h3 {
  width: fit-content;
}

.fullscreen-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9); /* Dark, slightly transparent background */
  z-index: 1000; /* Ensure it's above everything, including the project modal */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer; /* Suggests clicking background closes it */
}

.fs-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain; /* Ensures the image fits within bounds without cropping */
  transition: transform 0.3s ease;
}

.fs-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  z-index: 1001; /* Above the image */
  padding: 10px;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.fs-close-btn:hover {
  opacity: 1;
}
</style>
