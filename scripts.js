// script.js
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
    controls = new THREE.OrbitControls(camera, renderer.domElement);
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
                loadGeometry(data);
                currentData = data;
                downloadBtn.disabled = false;
                downloadBtn.textContent = 'Download .glb';
            } catch (err) {
                alert('Invalid JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    downloadBtn.addEventListener('click', exportGLB);
}

// =============== GEOMETRY LOADER ===============
function loadGeometry(data) {
    root.clear();

    if (!data.primitives || !Array.isArray(data.primitives)) {
        console.warn("No 'primitives' array found");
        return;
    }

    const meshes = [];

    data.primitives.forEach(prim => {
        const color = new THREE.Color(...(prim.color || [1, 1, 1]));
        let obj;

        switch (prim.type) {
            case 'point':
                const pointGeo = new THREE.SphereGeometry(0.08, 16, 16);
                obj = new THREE.Mesh(pointGeo, new THREE.MeshBasicMaterial({ color }));
                obj.position.fromArray(prim.position);
                break;

            case 'line':
            case 'polyline':
                const points = (prim.points || []).map(p => new THREE.Vector3(...p));
                if (points.length < 2) break;
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                obj = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color }));
                break;

            case 'circle':
                const center = new THREE.Vector3(...(prim.center || [0, 0, 0]));
                const radius = prim.radius || 1;
                const normal = new THREE.Vector3(...(prim.normal || [0, 1, 0])).normalize();
                const curve = new THREE.EllipseCurve(
                    center.x, center.y, radius, radius, 0, Math.PI * 2, false
                );
                const circlePoints = curve.getPoints(64);
                const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
                obj = new THREE.Line(circleGeo, new THREE.LineBasicMaterial({ color }));
                // Rotate to normal
                const temp = new THREE.Vector3();
                temp.crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
                if (temp.length() > 0.01) {
                    const axis = temp;
                    const angle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
                    objs = new THREE.Object3D();
                    objs.quaternion.setFromAxisAngle(axis, angle);
                    objs.add(obj);
                    obj = objs;
                }
                obj.position.copy(center);
                break;

            case 'box':
                const size = prim.size || [1, 1, 1];
                const boxGeo = new THREE.BoxGeometry(...size);
                obj = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
                if (prim.center) obj.position.fromArray(prim.center);
                break;

            case 'sphere':
                const sphereGeo = new THREE.SphereGeometry(prim.radius || 1, 32, 32);
                obj = new THREE.Mesh(sphereGeo, new THREE.MeshLambertMaterial({ color }));
                if (prim.center) obj.position.fromArray(prim.center);
                break;

            case 'pyramid':
                const apex = new THREE.Vector3(...(prim.apex || [0, 2, 0]));
                const baseCenter = new THREE.Vector3(...(prim.baseCenter || [0, 0, 0]));
                const baseRadius = prim.baseRadius || 1;
                const height = apex.distanceTo(baseCenter);
                const pyrGeo = new THREE.ConeGeometry(baseRadius, height, 4);
                obj = new THREE.Mesh(pyrGeo, new THREE.MeshLambertMaterial({ color }));
                obj.position.lerpVectors(apex, baseCenter, 0.5);
                obj.lookAt(apex);
                obj.rotateX(Math.PI / 2);
                break;

            default:
                console.warn('Unknown primitive:', prim.type);
                return;
        }

        if (obj) {
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
    }
}

// =============== GLB EXPORT ===============
function exportGLB() {
    if (!currentData) return;

    const exporter = new THREE.GLTFExporter();
    const link = document.createElement('a');
    document.body.appendChild(link);

    exporter.parse(
        root,
        (glb) => {
            const blob = new Blob([glb], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'model.glb';
            link.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(link);
        },
        (error) => {
            console.error('Export failed:', error);
            alert('Export failed. Check console.');
        },
        { binary: true, embedImages: true }
    );
}