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

## JSON Format (with `position` + `rotation`)

```json
{
  "primitives": [
    {
      "type": "box",
      "position": [0, 0, 0],
      "size": [2, 1, 1],
      "rotation": [0, 45, 0],
      "color": [1, 0, 0]
    }
  ]
}