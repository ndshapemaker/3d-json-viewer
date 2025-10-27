# 3D JSON Viewer

**Free, open-source 3D geometry viewer** that reads primitive shapes from a JSON file and lets you **export to `.glb`**.

Live demo: [https://your-username.github.io/3d-json-viewer](https://your-username.github.io/3d-json-viewer)

---

## Features

- Supports: `point`, `line`, `polyline`, `circle`, `box`, `sphere`, `pyramid`
- Full color support
- Responsive design (mobile-friendly)
- Export to **GLB** (binary GLTF)
- **No backend, no cost** – runs entirely in browser
- Hosted on **GitHub Pages**

---

## How to Use

1. Click **"Choose File"** and upload a `.json` file
2. View and rotate the model
3. Click **"Download .glb"** to export

---

## JSON Format

```json
{
  "primitives": [
    { "type": "box", "center": [0,0,0], "size": [2,2,2], "color": [1,0,0] },
    { "type": "sphere", "center": [3,0,0], "radius": 1, "color": [0,1,0] }
  ]
}