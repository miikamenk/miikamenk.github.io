<script setup lang="ts">
import { ref } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import VimEmulator from '../components/VimEmulator.vue'

const vimRef = ref<InstanceType<typeof VimEmulator> | null>(null)
const renderedHtml = ref<string | null>(null)

async function onRender() {
  // Get the raw content (Markdown + embedded <style>) from the child
  const rawContent = vimRef.value?.getText?.() ?? ''

  // Convert Markdown to raw HTML using marked.
  const rawHtml = marked(rawContent)

  // Sanitize the HTML using DOMPurify.
  renderedHtml.value = DOMPurify.sanitize(rawHtml)
}

// Go back to emulator view
function onEdit() {
  renderedHtml.value = null
}
</script>

<template>
  <div class="home">
    <div class="terminal-wrapper">
      <div class="vim-controls">
        <button
          class="render-btn"
          :class="{ jump: !renderedHtml }"
          @click="onRender"
          v-if="!renderedHtml"
        >
          Render
        </button>
        <button class="render-btn" @click="onEdit" v-else>Edit</button>
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
  /* Reduced padding-top, relying on flex center */
  align-items: center;
  justify-content: center;
  padding-top: calc(130px + 2.5em);
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
  position: absolute;
  top: -2.5rem;
  right: 0;
  left: unset;
  transform: none;
  padding-right: 0.75rem;
  width: auto;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  pointer-events: auto;
  z-index: 30;
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
  padding: 0.45rem 0.7rem;
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
</style>
