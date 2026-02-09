<script setup>
import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'

const MESSAGE = `<div class="card">

# Hi, I'm miikamenk

### Full-Stack Software Developer | Based in Finland

<br/>

I specialize in building applications with a passion for bleeding-edge tooling, Linux, and Vim.

<br/>

Outside of software, I'm an avid maker and enthusiast of custom electronics. My personal projects frequently involve:

* **Hardware Design:** Custom mechanical keyboards and audio gear.
* **Open Source:** Designing useful programs and tackling fun engineering challenges.
* **Tooling:** Deep expertise in Linux, Vim, and development workflow optimization.

<br/>

Try out this interactive Vim terminal I built and explore the rest of my site!

<div class="social-buttons">
  <a href="https://github.com/miikamenk" target="_blank" aria-label="GitHub">
    <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg" alt="GitHub"/>
  </a>
  <a href="https://www.linkedin.com/in/miika-ritokangas/" target="_blank" aria-label="LinkedIn">
    <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="LinkedIn"/>
  </a>
  <a href="mailto:miikamenk@duck.com" target="_blank" aria-label="Email">
    <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg" alt="Email"/>
  </a>
</div>
</div>

<style>
.card {
  background: var(--color-background-soft);
  padding: 2rem 3rem;
  border-radius: 1rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  animation: fadeInUp 0.6s ease;
}

.social-buttons {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.social-buttons a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.social-buttons a:hover {
  background-color: var(--color-border-hover);
}

.social-buttons a img {
  width: 32px;
  height: 32px;
  filter: brightness(0.2) invert(0.7);
  transition: all 0.2s ease;
}

.social-buttons a:hover img {
  filter: brightness(1) invert(0);
  transform: scale(1.1);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
`
const TYPE_DELAY = 40 // ms/char
const PLACEHOLDER_LINES = 0 // leading tildes like Vim

// state controls
const text = ref(MESSAGE) // visible buffer
const buffer = ref(null)
const cursor = ref(0) // index in text
const typingDone = ref(true)
const insertMode = ref(false)

const pendingOp = ref(null) // 'd' | null
let opBuffer = '' // e.g. 'i' for 'diw'
let desiredCol = null // preferred column when moving vertically
let timer = null

// derived
const beforeText = computed(() => text.value.slice(0, cursor.value))
const afterText = computed(() => text.value.slice(cursor.value))

const lineCol = computed(() => {
  const { line, col } = getLineCol(cursor.value)
  // Vim shows 1-based
  return { line: line + 1, col: col + 1 }
})

const statusText = computed(() => {
  if (insertMode.value) return '-- INSERT --'
  if (pendingOp.value === 'd') return 'd …'
  return 'NORMAL'
})

// typing animation bullshit
function startTyping() {
  let i = 0
  timer = setInterval(() => {
    if (i >= MESSAGE.length) return stopTyping(true)
    insertChars(MESSAGE[i++])
    moveCursorTo(text.value.length)
  }, TYPE_DELAY)
}

function stopTyping(done = false) {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (done) typingDone.value = true
}

function skipTyping() {
  if (typingDone.value) return
  text.value = MESSAGE
  typingDone.value = true
  stopTyping()
  moveCursorTo(text.value.length)
}

// text geometry for navigation
function getLineStart(idx) {
  return text.value.lastIndexOf('\n', Math.max(0, idx - 1)) + 1
}

function getLineEnd(idx) {
  const pos = text.value.indexOf('\n', idx)
  return pos === -1 ? text.value.length : pos
}

function getLineCol(idx) {
  const start = getLineStart(idx)
  const line = (text.value.slice(0, idx).match(/\n/g) || []).length
  const col = idx - start
  return { line, col }
}

function updateDesiredColFromCursor() {
  desiredCol = getLineCol(cursor.value).col
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function moveCursorTo(idx) {
  cursor.value = clamp(idx, 0, text.value.length)
  updateDesiredColFromCursor()
}

// navigation
function moveLeft() {
  if (cursor.value > 0) moveCursorTo(cursor.value - 1)
}
function moveRight() {
  if (cursor.value < text.value.length) moveCursorTo(cursor.value + 1)
}

function moveUp() {
  const start = getLineStart(cursor.value)
  if (start === 0) return
  const prevEnd = start - 1
  const prevStart = text.value.lastIndexOf('\n', prevEnd - 1) + 1
  const prevLen = prevEnd - prevStart
  const col = desiredCol ?? getLineCol(cursor.value).col
  moveCursorTo(prevStart + Math.min(col, prevLen))
}

function moveDown() {
  const end = getLineEnd(cursor.value)
  if (end === text.value.length) return
  const nextStart = end + 1
  const nextEnd = getLineEnd(nextStart)
  const nextLen = nextEnd - nextStart
  const col = desiredCol ?? getLineCol(cursor.value).col
  moveCursorTo(nextStart + Math.min(col, nextLen))
}

function ensureCursorVisible(padding = 8) {
  const container = buffer.value
  if (!container) return
  const cursorEl = container.querySelector('.cursor')
  if (!cursorEl) return

  // position of cursor relative to the container
  const curTop = cursorEl.offsetTop
  const curBottom = curTop + cursorEl.offsetHeight

  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (curTop < viewTop + padding) {
    container.scrollTop = Math.max(0, curTop - padding)
  } else if (curBottom > viewBottom - padding) {
    container.scrollTop = curBottom - container.clientHeight + padding
  }
}

// editing primitives
function setText(sliceStart, sliceEnd, insert = '') {
  text.value = text.value.slice(0, sliceStart) + insert + text.value.slice(sliceEnd)
}

function insertChars(ch) {
  setText(cursor.value, cursor.value, ch)
  moveCursorTo(cursor.value + ch.length)
}

function backspaceChar() {
  if (cursor.value === 0) return // nothing to delete
  setText(cursor.value - 1, cursor.value) // remove the character before the cursor
  moveCursorTo(cursor.value - 1) // move cursor left to reflect deletion
}

function deleteCharUnderCursor() {
  if (cursor.value >= text.value.length) return
  setText(cursor.value, cursor.value + 1)
  moveCursorTo(cursor.value) // clamp handled in moveCursorTo
}

function deleteCurrentLine() {
  const start = getLineStart(cursor.value)
  const end = getLineEnd(cursor.value)
  const cutTo = end < text.value.length ? end + 1 : end // include newline if not last line
  setText(start, cutTo)
  moveCursorTo(Math.min(start, text.value.length))
}

// word utils
const isWordChar = (c) => /[A-Za-z0-9_]/.test(c)

function deleteInnerWord() {
  const t = text.value
  if (!t.length) return

  let i = cursor.value
  // If on whitespace, prefer word to the right; else use word under/left
  if (!isWordChar(t[i]) && i > 0 && isWordChar(t[i - 1])) i--

  // Find a word around i (skip to next word if on whitespace)
  if (!isWordChar(t[i])) {
    let k = i
    while (k < t.length && !isWordChar(t[k])) k++
    if (k >= t.length || !isWordChar(t[k])) return
    i = k
  }

  let left = i
  let right = i
  while (left > 0 && isWordChar(t[left - 1])) left--
  while (right < t.length && isWordChar(t[right])) right++

  setText(left, right)
  moveCursorTo(left)
}

// operator pending for exampel diw ddg
function enterOp(op) {
  pendingOp.value = op
  opBuffer = ''
}

function handlePendingOp(key) {
  if (pendingOp.value !== 'd') return false

  // dd
  if (key === 'd') {
    deleteCurrentLine()
    pendingOp.value = null
    opBuffer = ''
    return true
  }

  // diw
  if (key === 'i' && opBuffer === '') {
    opBuffer = 'i'
    return true
  }
  if (key === 'w' && opBuffer === 'i') {
    deleteInnerWord()
    pendingOp.value = null
    opBuffer = ''
    return true
  }

  // Unknown sequence → cancel
  pendingOp.value = null
  opBuffer = ''
  return true
}

// vim moodes
function enterInsertHere() {
  insertMode.value = true
  typingDone.value = true
  stopTyping()
}

function toLineStartInsert() {
  moveCursorTo(getLineStart(cursor.value))
  enterInsertHere()
}

function appendInsert() {
  if (cursor.value < text.value.length) moveCursorTo(cursor.value + 1)
  enterInsertHere()
}

// handling keys
function prevent(e, fn) {
  fn()
  e.preventDefault()
}

function onKeydown(e) {
  // Skip typing for any editing/nav (except space/enter which already skip below)
  if (!typingDone.value && ![' ', 'Enter'].includes(e.key)) skipTyping()

  // Insert mode
  if (insertMode.value) {
    const key = e.key
    if (key === 'Escape') return prevent(e, () => (insertMode.value = false))
    if (key === 'Backspace') return prevent(e, backspaceChar)
    if (key === 'Enter') return prevent(e, () => insertChars('\n'))
    if (key === 'Tab') return prevent(e, () => insertChars('  '))
    if (key === 'ArrowLeft') return prevent(e, moveLeft)
    if (key === 'ArrowRight') return prevent(e, moveRight)
    if (key === 'ArrowUp') return prevent(e, moveUp)
    if (key === 'ArrowDown') return prevent(e, moveDown)
    if (key.length === 1 && !e.ctrlKey && !e.metaKey) return prevent(e, () => insertChars(key))
    return
  }

  // Normal mode
  if (pendingOp.value) {
    if (handlePendingOp(e.key)) return e.preventDefault()
  }

  const key = e.key

  // Mode switches
  if (key === 'i') return prevent(e, enterInsertHere)
  if (key === 'I') return prevent(e, toLineStartInsert)
  if (key === 'a') return prevent(e, appendInsert)

  // Movement
  if (key === 'h' || key === 'ArrowLeft') return prevent(e, moveLeft)
  if (key === 'l' || key === 'ArrowRight') return prevent(e, moveRight)
  if (key === 'k' || key === 'ArrowUp') return prevent(e, moveUp)
  if (key === 'j' || key === 'ArrowDown') return prevent(e, moveDown)

  // Editing
  if (key === 'x') return prevent(e, deleteCharUnderCursor)
  if (key === 'd') return prevent(e, () => enterOp('d'))

  // Finish typing on space/enter
  if (!typingDone.value && (key === ' ' || key === 'Enter')) {
    return prevent(e, skipTyping)
  }
}

function getText() {
  return text.value
}
defineExpose({ getText })

watch(cursor, () => {
  nextTick(ensureCursorVisible)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // startTyping() -- did not age well with the rendering view
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopTyping()
})
</script>

<template>
  <section class="vim-wrap">
    <div class="vim-window">
      <div class="vim-title">— VIM —</div>

      <div class="vim-buffer" ref="buffer" aria-live="polite" aria-atomic="true">
        <pre class="vim-line" v-for="n in PLACEHOLDER_LINES" :key="n">~</pre>
        <pre class="vim-text">
<span>{{ beforeText }}</span><span class="cursor" :class="{ off: !insertMode && typingDone }">█</span><span>{{ afterText }}</span>
        </pre>
      </div>

      <div class="vim-status">
        <span>"Home" [No Name]</span>
        <span class="mode" :class="{ insert: insertMode }">{{ statusText }}</span>
        <span class="pos">{{ lineCol.line }},{{ lineCol.col }}</span>
      </div>
    </div>

    <div class="hint">
      <div class="hint-controls">
        <p>
          Movement: <kbd>h</kbd><kbd>j</kbd><kbd>k</kbd><kbd>l</kbd> | <kbd>d d</kbd> (delete line)
          | <kbd>d i w</kbd> (delete inner word) | <kbd>x</kbd> (delete char)
        </p>
        <p>
          Edit: <kbd>i</kbd>/<kbd>I</kbd> (insert / start of line) | <kbd>a</kbd> (append) |
          <kbd>Esc</kbd> to exit insert | <kbd>Backspace</kbd> deletes | <kbd>Enter</kbd> new line.
        </p>
      </div>
      <router-link to="/projects" class="btn">View Projects</router-link>
    </div>
  </section>
</template>

<style scoped>
/* style was made mostly by chatgpt */
.vim-wrap {
  display: grid;
  width: 100%;
  gap: 0.75rem;
  place-items: center;
}
.vim-window {
  width: 100%;
  height: 50vh;
  min-height: 250px;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  background: #000;
  border: 1px solid #1f2937;
}

@media (min-width: 768px) {
  .vim-window {
    height: 60vh;
    min-height: 300px;
  }
}
.vim-title {
  background: #0b0b0b;
  color: #9ca3af;
  font:
    500 12px ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace;
  padding: 0.5rem 0.75rem;
  letter-spacing: 0.08em;
  border-bottom: 1px solid #1f2937;
}
.vim-buffer {
  padding: 1rem 0.75rem 1.25rem;
  min-height: 220px;
  height: calc(100% - 60px);

  color: #a7f3d0;
  background: #000;
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.vim-buffer::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}
.vim-line,
.vim-text {
  margin: 0;
  white-space: pre-wrap;
  font:
    16px/1.6 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace;
}
.vim-line {
  color: #374151;
}
.vim-text {
  color: #d1fae5;
}
.cursor {
  display: inline-block;
  width: 0.6ch;
  animation: blink 1s steps(1) infinite;
}
.cursor.off {
  animation: none;
  opacity: 0.6;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.vim-status {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0.75rem;
  color: #e5e7eb;
  background: #111827;
  font:
    12px ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace;
  border-top: 1px solid #1f2937;
}
.vim-status .mode.insert {
  color: #10b981;
}
.vim-status .pos {
  color: #9ca3af;
}
.hint .btn {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 0.75rem;
  background: var(--color-background-soft);
  color: var(--color-text);
  text-decoration: none;
  border: 1px solid var(--color-border);
}
.hint .btn:hover {
  filter: brightness(1.1);
  border: 1px solid var(--color-border-hover);
}
kbd {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  margin: 0 2px;
  font-family: inherit;
  font-size: 0.9em;
  font-weight: bold;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  color: var(--color-text);
}

.hint {
  text-align: center;
  padding: 1rem;
  background: var(--color-background-soft, #111);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  width: 100%;
  /* CRITICAL: Removed margin-top/bottom if any, relying on vim-wrap gap */
}

.hint-controls p {
  line-height: 1.8;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

@media (prefers-color-scheme: light) {
  .vim-window {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }
}
</style>
