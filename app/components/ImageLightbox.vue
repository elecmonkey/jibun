<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  images: string[]
  startIndex: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:startIndex', value: number): void
}>()

const activeIndex = ref(0)

watch(
  () => props.startIndex,
  (value) => {
    activeIndex.value = value
  },
  { immediate: true },
)

watch(activeIndex, (value) => {
  emit('update:startIndex', value)
})

const close = () => emit('update:modelValue', false)

const prev = () => {
  if (!props.images.length) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

const next = () => {
  if (!props.images.length) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    scrim
    content-class="image-lightbox-dialog"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <div class="image-lightbox-shell">
      <v-btn icon variant="text" class="image-lightbox-close" @click="close">
        <v-icon icon="mdi-close" />
      </v-btn>

      <div class="image-lightbox-main">
        <v-btn icon variant="text" class="image-lightbox-nav image-lightbox-prev" @click="prev">
          <v-icon icon="mdi-chevron-left" />
        </v-btn>

        <v-window v-model="activeIndex" class="image-lightbox-window">
          <v-window-item v-for="(image, idx) in images" :key="image" :value="idx">
            <div class="image-lightbox-frame">
              <v-img :src="image" max-height="70vh" contain />
            </div>
          </v-window-item>
        </v-window>

        <v-btn icon variant="text" class="image-lightbox-nav image-lightbox-next" @click="next">
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>

      <div class="image-lightbox-thumbs">
        <div
          v-for="(image, idx) in images"
          :key="image"
          class="image-lightbox-thumb"
          :class="{ 'is-active': idx === activeIndex }"
          @click="activeIndex = idx"
        >
          <v-img :src="image" aspect-ratio="1" cover />
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.image-lightbox-shell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 24px 18px 30px;
  background: transparent;
}

.image-lightbox-main {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-lightbox-window {
  width: min(960px, 92vw);
}

.image-lightbox-frame {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.image-lightbox-prev {
  left: 4px;
}

.image-lightbox-next {
  right: 4px;
}

.image-lightbox-thumbs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.image-lightbox-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  cursor: pointer;
  background: rgba(var(--v-theme-surface), 0.6);
}

.image-lightbox-thumb.is-active {
  border-color: rgb(var(--v-theme-primary));
}

.image-lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
