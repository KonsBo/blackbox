import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';

let scene, camera, renderer;

// Βίντεο files - Βάλε τα δικά σου 4 βίντεο
let videoFiles = [
    'assets/video_1.webm',
    'assets/video_2.webm', 
    'assets/video_3.webm',
    'assets/video_4.webm'
];

let videoElements = [];
let videoTextures = [];
let panels = [];

let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let previousMouseX = 0;
let previousMouseY = 0;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Φώτα
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    createVideoRoom();
    initMouseControls();

    window.addEventListener('resize', onWindowResize, false);

    const startBtn = document.getElementById('startButton');
    startBtn.addEventListener('click', startVideos);
}

function createVideoRoom() {
    const roomSize = 10;
    const wallHeight = 6;
    
    for (let i = 0; i < videoFiles.length; i++) {
        createVideoWall(i, roomSize, wallHeight);
    }
    
    createFloorAndCeiling(roomSize);
}

function createVideoWall(index, roomSize, wallHeight) {
    const vid = document.createElement('video');
    vid.src = videoFiles[index];
    vid.loop = true;
    vid.muted = true; // Όλα muted αρχικά
    vid.playsInline = true;
    vid.crossOrigin = "anonymous";
    vid.style.display = "none";
    vid.preload = "auto";
    
    vid.addEventListener('loadeddata', () => {
        createWallMesh(index, vid, roomSize, wallHeight);
    });
    
    vid.addEventListener('error', (e) => {
        console.error(`Video ${index+1} error:`, vid.error);
    });
    
    document.body.appendChild(vid);
    videoElements.push(vid);

    vid.load();
}

function createWallMesh(index, videoElement, roomSize, wallHeight) {
    try {
        const tex = new THREE.VideoTexture(videoElement);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        
        if (videoElement.videoWidth && videoElement.videoHeight) {
            const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
            const planeAspect = roomSize / wallHeight;
            
            console.log(`Video ${index+1}: ${videoElement.videoWidth}x${videoElement.videoHeight} (aspect: ${videoAspect.toFixed(2)})`);
            
            if (videoAspect > planeAspect) {
                const scale = (planeAspect / videoAspect) * 0.95;
                tex.repeat.set(scale, 1.0);
                tex.offset.set((1 - scale) / 2, 0);
            } else {
                const scale = (videoAspect / planeAspect) * 0.95;
                tex.repeat.set(1.0, scale);
                tex.offset.set(0, (1 - scale) / 2);
            }
            
            // REVERSE για βίντεο 1 και 3 (index 0 και 2)
            if (index === 0 || index === 2) {
                tex.repeat.x = -tex.repeat.x;    // Reverse οριζόντια
                tex.offset.x = 1 - tex.offset.x; // Διόρθωση offset
            }
            
        } else {
            tex.repeat.set(0.85, 0.85);
            tex.offset.set(0.075, 0.075);
            
            // REVERSE για βίντεο 1 και 3 (index 0 και 2)
            if (index === 0 || index === 2) {
                tex.repeat.x = -tex.repeat.x;
                tex.offset.x = 1 - tex.offset.x;
            }
        }
        
        videoTextures.push(tex);

        const videoWidth = roomSize;
        const videoHeight = wallHeight;

        const geometry = new THREE.PlaneGeometry(videoWidth, videoHeight);
        const material = new THREE.MeshBasicMaterial({ 
            map: tex, 
            side: THREE.DoubleSide 
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        let position = new THREE.Vector3();
        let rotation = new THREE.Euler();
        
        switch(index) {
            case 0:
                position.set(0, 0, -roomSize/2);
                rotation.set(0, 0, 0);
                break;
            case 1:
                position.set(roomSize/2, 0, 0);
                rotation.set(0, -Math.PI / 2, 0);
                break;
            case 2:
                position.set(0, 0, roomSize/2);
                rotation.set(0, Math.PI, 0);
                break;
            case 3:
                position.set(-roomSize/2, 0, 0);
                rotation.set(0, Math.PI / 2, 0);
                break;
        }
        
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        scene.add(mesh);
        panels.push(mesh);
        
        console.log(`Τοίχος ${index+1} δημιουργήθηκε ${(index === 0 || index === 2) ? 'REVERSED' : 'normal'}`);
        
    } catch (error) {
        console.error('Error creating wall:', error);
    }
}
function createFloorAndCeiling(roomSize) {
    // Ταπαίτημα
    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x111111,
        side: THREE.DoubleSide 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    scene.add(floor);

    // Οροφή
    const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x111111,
        side: THREE.DoubleSide 
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    scene.add(ceiling);
}

function startVideos() {
    console.log("Starting all videos...");
    let startedCount = 0;
    
    for(let i = 0; i < videoElements.length; i++){
        const vid = videoElements[i];
        
        // ΜΟΝΟ το πρώτο βίντεο ακούγεται, τα υπόλοιπα muted
        if (i === 0) {
            vid.muted = false;  // Μόνο το πρώτο ακούγεται
        } else {
            vid.muted = true;   // Τα υπόλοιπα είναι σιωπηλά
        }
        
        vid.play().then(() => {
            startedCount++;
            console.log(`Βίντεο ${i+1} started (${startedCount}/${videoElements.length})`);
            
            if (startedCount === videoElements.length) {
                document.getElementById('startButton').style.display = 'none';
                console.log("Όλα τα βίντεο παίζουν! Μόνο το Video 1 ακούγεται.");
            }
        }).catch(e => {
            console.log('Play error:', e);
        });
    }
}

function initMouseControls() {
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Αριστερό κλικ μόνο
            isMouseDown = true;
            previousMouseX = e.clientX;
            previousMouseY = e.clientY;
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isMouseDown = false;
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;
        
        mouseX += deltaX * 0.005;
        mouseY += deltaY * 0.005;
        
        // Περιορισμός της κάθετης κίνησης
        mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
        
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
    });

    // Απενεργοποίηση του context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Ενημέρωση της περιστροφής της κάμερας
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
    
    renderer.render(scene, camera);
}

animate();