<script setup>
import { ref, watch, onMounted } from "vue";

// Props
const props = defineProps({
  smiles: String,
  renderTrigger: Number, // increment to re-render
  loadingSrc: { type: String, default: '/loading.gif' }
});

// Refs
const viewerContainer = ref(null);
let RDKit = null;
let mol = null;

// Load RDKit.js
async function loadRDKit() {
  if (window.initRDKitModule) {
    RDKit = await window.initRDKitModule();
    console.log("RDKit loaded");
  } else {
    console.error("RDKit.js not found!");
  }
}

// Utility: ensure SVG scales properly
function ensureSvgFills(container) {
  const svg = container.querySelector && container.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
}

// Show loading indicator
function showLoading() {
  if (!viewerContainer.value) return;
  viewerContainer.value.innerHTML = `
    <div class="viewer-loading">
      <img src="${props.loadingSrc}" alt="loading" />
    </div>
  `;
}

// Show error message
function showError(text) {
  if (!viewerContainer.value) return;
  viewerContainer.value.innerHTML = `<div class="viewer-error">${text}</div>`;
}

// -------------------------
// Core 2D rendering function
// -------------------------
function render2D(atomColors = {}) {
  if (!viewerContainer.value) return;

  if (!props.smiles) {
    viewerContainer.value.innerHTML = "";
    return;
  }

  showLoading();

  if (!RDKit) {
    setTimeout(() => render2D(atomColors), 100);
    return;
  }

  // Cleanup previous molecule
  if (mol) mol.delete();

  mol = RDKit.get_mol(props.smiles);
  if (!mol) {
    showError("Invalid SMILES");
    return;
  }

  try {
    const rect = viewerContainer.value.getBoundingClientRect();
    const w = Math.max(100, Math.floor(rect.width));
    const h = Math.max(100, Math.floor(rect.height));

    // Generate base SVG
    let svg = mol.get_svg(w, h);

    // Apply atom coloring for heatmap if any
    if (atomColors && Object.keys(atomColors).length > 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");

      // First try to find explicit atom elements by id/class (e.g. id="atom-0" or class="atom-0")
      const atomMap = new Map();
      const all = doc.querySelectorAll('*');
      all.forEach((el) => {
        if (!el || !el.getAttribute) return;
        const id = el.getAttribute('id');
        const cls = el.getAttribute('class');
        const dataIdx = el.getAttribute('data-atom-index') || el.getAttribute('data-atom');
        let m = null;
        if (id) m = id.match(/(?:atom[_-]?)(\d+)/i);
        if (!m && cls) m = cls.match(/(?:atom[_-]?)(\d+)/i);
        if (!m && dataIdx && !isNaN(Number(dataIdx))) m = [null, dataIdx];
        if (m) {
          const idx = Number(m[1]);
          if (!Number.isNaN(idx)) atomMap.set(idx, el);
        }
      });

      // Apply colors using atomMap when possible
      if (atomMap.size > 0) {
        atomMap.forEach((el, idx) => {
          if (atomColors[idx] !== undefined) {
            // If element is a group, color its child paths/circles
            if (el.tagName.toLowerCase() === 'g') {
              el.querySelectorAll('path,circle,ellipse').forEach(child => {
                child.setAttribute('fill', atomColors[idx]);
                child.setAttribute('stroke', atomColors[idx]);
              });
            } else {
              el.setAttribute('fill', atomColors[idx]);
              el.setAttribute('stroke', atomColors[idx]);
            }
          }
        });
      } else {
        // Fallback: inject fill colors directly into <circle> elements in SVG (old behavior)
        const circles = doc.querySelectorAll('circle');
        circles.forEach((c, idx) => {
          if (atomColors[idx] !== undefined) c.setAttribute('fill', atomColors[idx]);
        });
      }

      const serializer = new XMLSerializer();
      svg = serializer.serializeToString(doc);
    }

    viewerContainer.value.innerHTML = svg;
    ensureSvgFills(viewerContainer.value);
  } catch (e) {
    console.error("RDKit render failed", e);
    showError("2D render failed");
  }
}

// -------------------------
// Heatmap backend
// -------------------------
// Convert atom SHAP value to color
function shapToColor(value) {
  if (value === undefined || value === null) return '#FAB216'; // no value
  // simple threshold: negative = low, positive = high
  return value < 0 ? '#D13C16' : '#B3C614';
}

// Highlight atoms according to SHAP values
function setAtomHeatmap(atomShap) {
  if (!atomShap || !mol) return;
  const colors = {};
  atomShap.forEach((val, idx) => {
    colors[idx] = shapToColor(val);
  });
  render2D(colors);
}

// Clear heatmap (restore normal molecule)
function clearAtomHeatmap() {
  render2D({}); // optional: could fill all atoms with #FAB216 if you want a "neutral" default
}

// -------------------------
// Expose backend to parent
// -------------------------
defineExpose({
  setAtomHeatmap,
  clearAtomHeatmap
});

// Watch for re-render triggers
watch(() => props.renderTrigger, () => render2D({}));

// On mounted
onMounted(async () => {
  await loadRDKit();
  setTimeout(() => render2D({}), 50);
  window.addEventListener("resize", () => render2D({}));
});
</script>

<template>
  <div class="viewer-box" ref="viewerContainer" style="width:100%;height:300px;">
    <!-- RDKit-rendered SVG will be injected here -->
  </div>
</template>

<style scoped lang="scss">
.viewer-loading,
.viewer-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-loading img {
  max-width: 48px;
  max-height: 48px;
  width: auto;
  height: auto;
  opacity: 0.95;
}

.viewer-error {
  background: rgba(0,0,0,0.55);
  color: #fff;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
}

.viewer-box > svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
