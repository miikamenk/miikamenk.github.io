<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import VimEmulator from '../components/VimEmulator.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const vimRef = ref<InstanceType<typeof VimEmulator> | null>(null)
const renderedHtml = ref<string | null>(null)
const showKeyboardWarning = ref(false)

async function onRender() {
  // Get the raw content (Markdown + embedded <style>) from the child
  const rawContent = vimRef.value?.getText?.() ?? ''

  // Convert Markdown to raw HTML using marked.
  const rawHtml = await marked(rawContent)

  // Sanitize the HTML using DOMPurify.
  renderedHtml.value = DOMPurify.sanitize(rawHtml)
}

// Auto-render on mount
onMounted(() => {
  onRender()
})

// Mobile detection using user agent
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Go back to emulator view
function onEdit() {
  renderedHtml.value = null

  // Show keyboard warning on mobile
  if (isMobileDevice()) {
    showKeyboardWarning.value = true
    setTimeout(() => {
      showKeyboardWarning.value = false
    }, 4000)
  }
}
</script>

<template>
  <div class="home">
    <div class="terminal-wrapper">
      <!-- Mobile keyboard warning -->
      <div v-if="showKeyboardWarning" class="keyboard-warning" role="alert" aria-live="polite">
        <span>{{ t('vimEmulator.keyboardWarning') }}</span>
        <button
          @click="showKeyboardWarning = false"
          class="close-warning"
          aria-label="Close warning"
        >
          ×
        </button>
      </div>

      <div class="vim-controls">
        <button
          class="render-btn"
          :class="{ jump: !renderedHtml }"
          @click="onRender"
          v-if="!renderedHtml"
        >
          {{ t('home.render') }}
        </button>
        <button class="render-btn" @click="onEdit" v-else>{{ t('home.edit') }}</button>
      </div>

      <VimEmulator v-show="!renderedHtml" ref="vimRef" />
      <div
        v-show="renderedHtml"
        class="rendered-terminal"
        aria-live="polite"
        v-html="renderedHtml"
      ></div>
    </div>
  </div>
</template>

<style>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
  padding-left: 1rem;
  padding-right: 1rem;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .home {
    padding-top: calc(130px + 2.5em);
    padding-left: 0;
    padding-right: 0;
  }
}
.rendered-terminal {
  color: var(--color-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

.rendered-terminal strong {
  font-weight: bold !important;
}

.terminal-wrapper {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 1200px;
}

.vim-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  width: 100%;
  max-width: 1200px;
  pointer-events: auto;
}

@media (min-width: 768px) {
  .vim-controls {
    gap: 1rem;
    padding-right: 0.75rem;
  }
}

.vim-controls .render-btn {
  pointer-events: auto;
}

@keyframes jump {
  0%,
  100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-6px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-3px);
  }
}

.render-btn {
  pointer-events: auto;
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.6rem 1rem;
  border-radius: 0.6rem;
  font:
    13px ui-monospace,
    monospace;
  box-shadow: 0 4px 112px rgba(2, 6, 23, 0.3);
  cursor: pointer;
  transition:
    transform 160ms ease,
    filter 160ms ease,
    opacity 160ms;
  opacity: 1;
  min-height: 44px;
  min-width: 80px;
}
.render-btn.jump {
  animation: jump 1s infinite;
}

.render-btn:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  transform: scale(1.02);
  border: 1px solid var(--color-border-hover);
}
.render-btn:active {
  transform: translateY(-1px) scale(0.995);
}

.keyboard-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  animation: slideInDown 0.3s ease-out;
  position: relative;
  z-index: 40;
}

.close-warning {
  background: none;
  border: none;
  color: #92400e;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  margin-left: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-warning:hover {
  opacity: 1;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-color-scheme: dark) {
  .keyboard-warning {
    background: #451a03;
    color: #fef3c7;
    border-color: #d97706;
  }

  .close-warning {
    color: #fef3c7;
  }
}
</style>
