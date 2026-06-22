// --- CONFIGURACIÓN BASE DE THREE.JS ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02060d);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Iluminación tecnológica
const topLight = new THREE.DirectionalLight(0x00f3ff, 1.5);
topLight.position.set(5, 10, 7);
scene.add(topLight);

const ambientLight = new THREE.AmbientLight(0x0a192f, 2);
scene.add(ambientLight);

// --- MATEMÁTICAS PARA FORMAS PERSONALIZADAS ---
// Paraboloide: z = x^2 + y^2
function createParaboloidGeometry() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uSegments = 30, vSegments = 30;

    for (let i = 0; i <= uSegments; i++) {
        let u = (i / uSegments) * 2 - 1; // de -1 a 1
        for (let j = 0; j <= vSegments; j++) {
            let v = (j / vSegments) * 2 - 1; // de -1 a 1
            let x = u;
            let y = v;
            let z = (x*x + y*y) * 0.5; // Ecuación matemática
            vertices.push(x, z, y); // Intercambio z por y para que apunte hacia arriba
        }
    }

    for (let i = 0; i < uSegments; i++) {
        for (let j = 0; j < vSegments; j++) {
            let a = i * (vSegments + 1) + j;
            let b = i * (vSegments + 1) + j + 1;
            let c = (i + 1) * (vSegments + 1) + j;
            let d = (i + 1) * (vSegments + 1) + j + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// Catenaroide: Rotación de una catenaria (forma de cadena colgante)
function createCatenoidGeometry() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uSegments = 40, vSegments = 40;

    for (let i = 0; i <= uSegments; i++) {
        let u = (i / uSegments) * 2 - 1; // altura de -1 a 1
        let c = 0.6; // constante de curvatura
        let r = c * Math.cosh(u / c); // Radio de la sección según el coseno hiperbólico
        
        for (let j = 0; j <= vSegments; j++) {
            let theta = (j / vSegments) * Math.PI * 2;
            let x = r * Math.cos(theta);
            let y = u;
            let z = r * Math.sin(theta);
            vertices.push(x, y, z);
        }
    }

    for (let i = 0; i < uSegments; i++) {
        for (let j = 0; j < vSegments; j++) {
            let a = i * (vSegments + 1) + j;
            let b = i * (vSegments + 1) + j + 1;
            let c = (i + 1) * (vSegments + 1) + j;
            let d = (i + 1) * (vSegments + 1) + j + 1;
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// --- REPERTORIO DE GEOMETRÍAS ---
const geometries = {
    cube: new THREE.BoxGeometry(1.5, 1.5, 1.5, 15, 15, 15), // Segmentado para que se deforme fluido
    torus: new THREE.TorusGeometry(1, 0.3, 16, 100),
    paraboloid: createParaboloidGeometry(),
    catenoid: createCatenoidGeometry()
};

// Material futurista semitransparente con brillo
const material = new THREE.MeshPhongMaterial({
    color: 0x00f3ff,
    wireframe: false,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    shininess: 100
});

let currentMesh = new THREE.Mesh(geometries.cube, material);
scene.add(currentMesh);

// Guardamos los vértices originales para calcular la "deformación de inflación"
let originalPositions = currentMesh.geometry.attributes.position.clone();

// --- LÓGICA DE INTERFAZ Y SIMULACIÓN ---
const shapeSelector = document.getElementById('shape-selector');
const sliderPresion = document.getElementById('slider-presion');
const sliderResistencia = document.getElementById('slider-resistencia');
const checkWireframe = document.getElementById('check-wireframe');

function updateGeometry() {
    scene.remove(currentMesh);
    const selectedShape = shapeSelector.value;
    currentMesh = new THREE.Mesh(geometries[selectedShape], material);
    scene.add(currentMesh);
    originalPositions = currentMesh.geometry.attributes.position.clone();
    aplicarSimulacion();
}

function aplicarSimulacion() {
    const presion = parseFloat(sliderPresion.value);
    const resistencia = parseFloat(sliderResistencia.value);
    
    // Actualizar textos numéricos en el HUD
    document.getElementById('val-presion').innerText = presion.toFixed(1);
    document.getElementById('val-resistencia').innerText = resistencia;

    const positionAttribute = currentMesh.geometry.attributes.position;
    const normalAttribute = currentMesh.geometry.attributes.normal;

    // Efecto inflable básico: desplazar vértices a lo largo de sus normales según la presión y resistencia
    // Fórmula simple de deformación: NuevaPos = PosOriginal + (Normal * Presión / Resistencia) * Factor
    const factorDeformacion = (presion / resistencia) * 8; 

    for (let i = 0; i < positionAttribute.count; i++) {
        let x = originalPositions.getX(i);
        let y = originalPositions.getY(i);
        let z = originalPositions.getZ(i);

        let nx = normalAttribute.getX(i);
        let ny = normalAttribute.getY(i);
        let nz = normalAttribute.getZ(i);

        positionAttribute.setXYZ(
            i,
            x + nx * factorDeformacion,
            y + ny * factorDeformacion,
            z + nz * factorDeformacion
        );
    }
    positionAttribute.needsUpdate = true;
}

// Event Listeners
shapeSelector.addEventListener('change', updateGeometry);
sliderPresion.addEventListener('input', aplicarSimulacion);
sliderResistencia.addEventListener('input', aplicarSimulacion);
checkWireframe.addEventListener('change', (e) => {
    material.wireframe = e.target.checked;
});

// Auto-ajuste de pantalla
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- BUCLE DE ANIMACIÓN (LOOP) ---
function animate() {
    requestAnimationFrame(animate);
    
    // Rotación sutil automática para el look de "exhibición de laboratorio"
    currentMesh.rotation.y += 0.005;
    
    controls.update();
    renderer.render(scene, camera);
}

// Iniciar
aplicarSimulacion();
animate();
