<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import matter from 'gray-matter'
import { marked } from 'marked'
import { Buffer } from 'buffer'
;(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const projectFiles = import.meta.glob('../projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const imageFiles = import.meta.glob('../projects/images/*', { eager: true, import: 'default' })

// fallback svg image
const getFallbackSvg = () => {
  const noImageText = encodeURIComponent(t('projects.noImage'))
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid meet'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%237fb7ff'/><stop offset='1' stop-color='%238fb8d9'/></linearGradient></defs><rect width='100%' height='100%' rx='18' fill='url(%23g)'/><g transform='translate(120,100)' fill='none' stroke='%23ffffff' stroke-width='12' stroke-linecap='round' stroke-linejoin='round'><rect x='40' y='30' width='520' height='360' rx='20' opacity='0.18' fill='none' stroke='%23ffffff'/><circle cx='300' cy='210' r='70' opacity='0.2' fill='none' stroke='%23ffffff'/><path d='M80 80 L140 80 L170 40 L200 80 L260 80' opacity='0.12' stroke='%23ffffff'/></g><text x='50%' y='92%' font-family='system-ui, -apple-system, "Segoe UI", Roboto' font-size='18' fill='rgba(255,255,255,0.9)' text-anchor='middle'>${noImageText}</text></svg>`
}

type Project = {
  id: string
  title: string
  slug: string
  thumbnail: string
  text: string
  uploadDate: string
}

const filenameFromPath = (path: string) => path.split('/').pop()!

const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

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

    const title = meta.title ?? meta.name ?? 'Untitled'
    return {
      id: filenameFromPath(filePath),
      title: title,
      slug: createSlug(title),
      thumbnail: thumbnailUrl,
      text: html,
      uploadDate: meta.uploadDate ?? meta.date ?? '',
    } as Project
  }),
)

const selectedProject = ref<Project | null>(null)
const fullscreenImage = ref<string | null>(null)

// Zoom and pan state
const scale = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const lastTouchDistance = ref(0)

// Touch state for mobile pan and zoom
const touchStartPos = ref({ x: 0, y: 0 })
const isTouchPanning = ref(false)
const initialTouchDistance = ref(0)

onMounted(() => {
  const slug = route.params.slug as string
  if (slug) {
    const project = projects.value.find((p) => p.slug === slug)
    if (project) {
      selectedProject.value = project
    } else {
      // Project not found, redirect to projects page
      router.push({ name: 'projects' })
    }
  }
})

function goBack() {
  router.push({ name: 'projects' })
}

function openFullscreenImage(src: string) {
  fullscreenImage.value = src
}

function closeFullscreenImage() {
  fullscreenImage.value = null
  // Reset zoom state
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  cursor: isDragging.value ? 'grabbing' : 'grab',
}))

const imageContainerStyle = computed(() => ({
  overflow: 'hidden',
}))

// Zoom controls
function zoomIn() {
  if (scale.value < 3) {
    scale.value = Math.min(scale.value * 1.2, 3)
  }
}

function zoomOut() {
  if (scale.value > 0.5) {
    scale.value = Math.max(scale.value / 1.2, 0.5)
  }
}

function resetZoom() {
  scale.value = 1
  position.value = { x: 0, y: 0 }
}

// Drag functionality
function startDrag(e: MouseEvent) {
  if (e.button === 0) {
    // Left mouse button only
    isDragging.value = true
    dragStart.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y }
  }
}

function drag(e: MouseEvent) {
  if (isDragging.value) {
    position.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
    }
  }
}

function endDrag() {
  isDragging.value = false
}

// Touch functionality
function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    // Initialize single-finger pan
    touchStartPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    isDragging.value = true
    isTouchPanning.value = true
  } else if (e.touches.length === 2) {
    // Initialize two-finger zoom
    initialTouchDistance.value = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
    lastTouchDistance.value = initialTouchDistance.value
    isTouchPanning.value = false
  }
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()

  if (e.touches.length === 1 && isTouchPanning.value && isDragging.value) {
    // Handle single-finger pan
    const deltaX = e.touches[0].clientX - touchStartPos.value.x
    const deltaY = e.touches[0].clientY - touchStartPos.value.y

    position.value = {
      x: position.value.x + deltaX,
      y: position.value.y + deltaY,
    }

    touchStartPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  } else if (e.touches.length === 2) {
    // Handle two-finger zoom
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )

    const distanceDiff = distance - lastTouchDistance.value
    if (Math.abs(distanceDiff) > 10) {
      const newScale = scale.value * (distanceDiff > 0 ? 1.05 : 0.95)
      scale.value = Math.max(0.5, Math.min(3, newScale))
      lastTouchDistance.value = distance
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    isDragging.value = false
    isTouchPanning.value = false
  }
  lastTouchDistance.value = 0
  initialTouchDistance.value = 0
}

function handleZoom(e: WheelEvent) {
  if (e.deltaY < 0) {
    zoomIn()
  } else if (e.deltaY > 0) {
    zoomOut()
  }
}
</script>

<template>
  <section class="project-detail">
    <div v-if="selectedProject" class="container">
      <button class="back-btn" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {{ t('projects.back') }}
      </button>

      <article class="project-content">
        <h1>{{ selectedProject.title }}</h1>

        <p class="date">{{ t('projects.uploaded') }} {{ selectedProject.uploadDate }}</p>

        <img
          v-if="selectedProject.thumbnail && selectedProject.thumbnail !== getFallbackSvg()"
          class="project-img"
          :src="selectedProject.thumbnail"
          :alt="selectedProject.title"
          @click="openFullscreenImage(selectedProject.thumbnail)"
        />

        <div class="text" v-html="selectedProject.text"></div>
      </article>

      <div
        v-if="fullscreenImage"
        class="fullscreen-viewer"
        @click.self="closeFullscreenImage"
        @wheel.prevent="handleZoom"
        @touchstart="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <button class="fs-close-btn" @click="closeFullscreenImage">✕</button>
        <div class="zoom-controls">
          <button @click="zoomOut" class="zoom-btn" :disabled="scale < 0.6">−</button>
          <button @click="resetZoom" class="zoom-btn reset" :disabled="scale === 1">
            {{ t('projects.reset') }}
          </button>
          <button @click="zoomIn" class="zoom-btn" :disabled="scale >= 3">+</button>
        </div>
        <div
          class="fs-img-container"
          :style="imageContainerStyle"
          @mousedown="startDrag"
          @mousemove="drag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @touchstart="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend="handleTouchEnd"
          style="touch-action: none"
        >
          <img
            :src="fullscreenImage"
            class="fs-img"
            :style="imageStyle"
            :alt="t('projects.uploaded')"
            draggable="false"
          />
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>{{ t('projects.notFound') }}</h2>
      <button class="back-btn" @click="goBack">
        {{ t('projects.back') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.project-detail {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding-top: 40px; /* Less than header height - button will be in overlap zone */
  padding-left: 2rem;
  padding-right: 2rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding-top: 100px; /* Additional spacing to push content below header */
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border, #ddd);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s var(--ease-smooth);
  text-decoration: none;
  margin-bottom: 1rem; /* Closer to content */
  position: relative;
}

.back-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.project-content {
  background: var(--color-background);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  padding: 2.5rem;
  border: 1px solid var(--color-border);
}

.project-content h1 {
  font-size: 2.5rem;
  line-height: 1.2;
  margin: 0 0 1rem 0;
  color: var(--color-heading);
}

.date {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #666);
  margin-bottom: 2rem;
}

.project-img {
  width: auto;
  max-width: 100%;
  max-height: 70vh;
  display: block;
  margin: 2rem 0;
  border-radius: 8px;
  object-fit: contain;
}

.text {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--color-text);
}

.text :deep(h2) {
  font-size: 1.8rem;
  margin: 2rem 0 1rem 0;
  color: var(--color-heading);
}

.text :deep(h3) {
  font-size: 1.4rem;
  margin: 1.5rem 0 0.75rem 0;
  color: var(--color-heading);
}

.text :deep(p) {
  margin: 1rem 0;
}

.text :deep(ul),
.text :deep(ol) {
  margin: 1rem 0;
  padding-left: 2rem;
}

.text :deep(li) {
  margin: 0.5rem 0;
}

.text :deep(a) {
  color: var(--accent-color);
  text-decoration: none;
}

.text :deep(a:hover) {
  text-decoration: underline;
}

.not-found {
  text-align: center;
  max-width: 600px;
  margin: 4rem auto;
}

.not-found h2 {
  font-size: 2rem;
  color: var(--color-text);
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .project-detail {
    padding-top: 20px; /* Less than mobile header height */
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
  }

  .container {
    padding-top: 50px; /* Additional spacing for mobile */
  }

  .project-content {
    padding: 1.5rem;
  }

  .project-content h1 {
    font-size: 2rem;
  }

  .text {
    font-size: 1rem;
  }
}

.fullscreen-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9); /* Dark, slightly transparent background */
  z-index: 3000; /* Ensure it's above everything, including the header */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer; /* Suggests clicking background closes it */
}

.fs-img-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.fs-img {
  max-width: 90vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  display: block;
  border-radius: 8px;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.zoom-controls {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  z-index: 2005;
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 2rem;
  padding: 0.5rem;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #333;
  transition: all 0.2s var(--ease-smooth);
}

.zoom-btn:hover:not(:disabled),
.zoom-btn:active:not(:disabled) {
  background: var(--accent-color);
  color: white;
  transform: scale(1.1);
  box-shadow: var(--shadow-lg);
}

.zoom-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.zoom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.zoom-btn.reset {
  font-size: 0.9rem;
}

.fs-close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2005;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #333;
  transform: none;
  transition: all 0.2s var(--ease-smooth);
  touch-action: manipulation;
}

.fs-close-btn:hover {
  opacity: 1;
}

.fs-close-btn:hover,
.fs-close-btn:active {
  background: var(--accent-color);
  color: white;
  transform: scale(1.1);
  box-shadow: var(--shadow-lg);
}

.fs-close-btn:active {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .zoom-controls {
    bottom: 1.5rem;
    right: 1rem;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .zoom-btn {
    width: 44px;
    height: 44px;
    font-size: 1rem;
    touch-action: manipulation;
  }

  .fs-close-btn {
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    font-size: 1rem;
    touch-action: manipulation;
  }
}
</style>
