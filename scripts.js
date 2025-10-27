// script.js — FIXED WITH MODERN IMPORTS (r167+)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/exporters/GLTFExporter.js';

let scene, camera, renderer, controls;
let root = new THREE.Group();
let currentData = null;

init();
animate();

function init() {
    const container = document.getElementById('viewer');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.add(root);

    // Camera
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    scene.add(new THREE.AmbientLight(0x666666));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Resize
    window.addEventListener('resize', onWindowResize);

    // UI
    setupUI();
}

function onWindowResize() {
    const container = document.getElementById('viewer');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function setupUI() {
    const fileInput = document.getElementById('fileInput');
    const downloadBtn = document.getElementById('downloadBtn');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                console.log('Loaded JSON:', data); // Debug: Check in console
                loadGeometry(data);
                currentData = data;
                downloadBtn.disabled = false;
                downloadBtn.textContent = 'Download .glb';
            } catch (err) {
                console.error('JSON Parse Error:', err); // Debug
                alert('Invalid JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    downloadBtn.addEventListener('click', exportGLB);
}

// =============== GEOMETRY LOADER (WITH POSITION + ROTATION) ===============
function loadGeometry(data) {
    root.clear();

    if (!data.primitives || !Array.isArray(data.primitives)) {
        console.warn("No 'primitives' array found");
        return;
    }

    const meshes = [];

    data.primitives.forEach((prim, index) => {
        const color = new THREE.Color(...(prim.color || [1, 1, 1]));
        const position = prim.position ? new THREE.Vector3(...prim.position) : new THREE.Vector3();
        const rotation = prim.rotation || [0, 0, 0];
        let obj;

        console.log(`Creating ${prim.type} #${index}`); // Debug

        switch (prim.type) {
            case 'point':
                obj = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color }));
                break;

            case 'line':
            case 'polyline':
                const pts = (prim.points || []).map(p => new THREE.Vector3(...p));
                if (pts.length < 2) {
                    console.warn('Not enough points for line');
                    return;
                }
                obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
                break;

            case 'circle':
                const center = position.clone();
                const radius = prim.radius || 1;
                const normal = new THREE.Vector3(...(prim.normal || [0, 1, 0])).normalize();
                // Create points in XY plane, then rotate to normal
                const circlePoints = [];
                for (let i = 0; i <= 64; i++) {
                    const angle = (i / 64) * Math.PI * 2;
                    circlePoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
                }
                obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePoints), new THREE.LineBasicMaterial({ color }));
                // Align to normal
                obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
                obj.position.copy(center);
                break;

            case 'box':
                obj = new THREE.Mesh(new THREE.BoxGeometry(...(prim.size || [1, 1, 1])), new THREE.MeshLambertMaterial({ color }));
                break;

            case 'sphere':
                obj = new THREE.Mesh(new THREE.SphereGeometry(prim.radius || 1, 32, 32), new THREE.MeshLambertMaterial({ color }));
                break;

            case 'pyramid':
                const apex = prim.apex ? new THREE.Vector3(...prim.apex) : position.clone().add(new THREE.Vector3(0, 2, 0));
                const baseCenter = position.clone();
                const baseRadius = prim.baseRadius || 1;
                const height = apex.distanceTo(baseCenter);
                obj = new THREE.Mesh(new THREE.ConeGeometry(baseRadius, height, 4), new THREE.MeshLambertMaterial({ color }));
                obj.position.lerpVectors(apex, baseCenter, 0.5);
                obj.lookAt(apex);
                obj.rotateX(Math.PI / 2);
                break;

            default:
                console.warn('Unknown primitive:', prim.type);
                return;
        }

        if (obj) {
            obj.position.copy(position);
            obj.rotation.set(
                THREE.MathUtils.degToRad(rotation[0]),
                THREE.MathUtils.degToRad(rotation[1]),
                THREE.MathUtils.degToRad(rotation[2])
            );
            root.add(obj);
            meshes.push(obj);
        }
    });

    // Auto-fit camera
    if (meshes.length > 0) {
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitDistance = maxDim * 2.5;
        camera.position.copy(center).add(new THREE.Vector3(fitDistance, fitDistance * 0.7, fitDistance));
        controls.target.copy(center);
        controls.update();
        console.log('Rendered', meshes.length, 'meshes'); // Debug
    } else {
        console.warn('No meshes created');
    }
}

// =============== GLB EXPORT (Fixed Callback) ===============
function exportGLB() {
    if (!currentData) return;
    console.log('Starting export...'); // Debug

    const exporter = new GLTFExporter();
    exporter.parse(
        root,
        function (result) {
            console.log('Export result:', result); // Debug
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'model.glb';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        function (error) {
            console.error('Export error:', error); // Debug
            alert('Export failed: ' + error);
        },
        { binary: true }
    );
}