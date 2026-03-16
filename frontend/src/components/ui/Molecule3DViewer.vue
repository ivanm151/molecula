<template>
  <div>
    <div class="viewer-wrapper">
      <div ref="viewerContainer" class="viewer-box"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";

const props = defineProps({
  smiles: String,
  renderTrigger: Number, // Incremented on "Render" button click
});

const viewerContainer = ref(null);
let viewer = null;
let RDKit = null;

// Load RDKit.js dynamically if needed
async function loadRDKit() {
  if (window.initRDKitModule) {
    RDKit = await window.initRDKitModule();
  } else {
    console.error("RDKit.js not found!");
  }
}

async function render3D() {
  if (!RDKit || !viewerContainer.value || !props.smiles) return;

  const mol = RDKit.get_mol(props.smiles);
  if (!mol) {
    console.error("RDKit: failed to parse SMILES");
    return;
  }

  // Generate proper 3D coordinates / fallbacks
  mol.add_hs();

  // Helper: fetch 3D SDF from PubChem (fallback)
  async function fetchPubChemSDF(smiles) {
    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      return text && text.trim().length ? text : null;
    } catch (e) {
      console.warn("PubChem fetch failed", e);
      return null;
    }
  }

  // Try RDKit embedding APIs first
  let embeddedLocally = false;
  if (typeof mol.EmbedMolecule === "function") {
    try {
      mol.EmbedMolecule();
      embeddedLocally = true;
    } catch (e) {
      console.warn("mol.EmbedMolecule failed", e);
    }
  } else if (RDKit && typeof RDKit.EmbedMolecule === "function") {
    try {
      RDKit.EmbedMolecule(mol);
      embeddedLocally = true;
    } catch (e) {
      console.warn("RDKit.EmbedMolecule failed", e);
    }
  }

  // If local embedding succeeded, optionally optimize
  if (embeddedLocally) {
    if (RDKit && typeof RDKit.UFFOptimizeMolecule === "function") {
      try {
        RDKit.UFFOptimizeMolecule(mol, 200);
      } catch (e) {
        // ignore
      }
    }
  } else {
    console.warn(
      "RDKit: no EmbedMolecule available in this build (or embedding failed)"
    );
    // try remote fallback
    const sdfFromPubChem = await fetchPubChemSDF(props.smiles);
    if (sdfFromPubChem) {
      if (!viewer) {
        viewer = new window.$3Dmol.GLViewer(viewerContainer.value, {
          backgroundColor: "white",
        });
      }
      viewer.clear();
      viewer.addModel(sdfFromPubChem, "sdf");
      viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.23 } });
      viewer.zoomTo();
      viewer.render();
      viewer.zoom(1.0, 1000);
      mol.delete();
      return;
    } else {
      console.error(
        "No embedding available and PubChem fallback failed — cannot generate 3D coordinates"
      );
      mol.delete();
      return;
    }
  }

  // If we get here, local embedding produced an SDF:
  const sdf = mol.get_molblock();

  if (!viewer) {
    viewer = new window.$3Dmol.GLViewer(viewerContainer.value, {
      backgroundColor: "white",
    });
  }
  viewer.clear();
  viewer.addModel(sdf, "sdf");
  viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.23 } });
  viewer.zoomTo();
  viewer.render();
  viewer.zoom(1.0, 1000);

  mol.delete();
}

// Watch for render trigger
watch(
  () => props.renderTrigger,
  () => {
    render3D();
  }
);

onMounted(async () => {
  await loadRDKit();
});
</script>

<style scoped lang="scss">
@use '../../assets/styles/components/ui/molecule3dviewer';
</style>