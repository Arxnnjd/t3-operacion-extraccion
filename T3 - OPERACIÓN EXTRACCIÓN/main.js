let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// estadisticas del jugador y armas
let saludJugador = 100;
let currentWeapon = 1;
const weapons = {
    1: { ammo: 12, mesh: null, name: "Pistola tactica" },
    2: { ammo: 6, mesh: null, name: "Rifle pesado" }
};
let muzzleFlash;
let muzzleLight;

// sistema de sonido
let soundPistola, soundEscopeta, soundZombi, soundAmbiente;

// las entidades del juego
let zombies = [];
let coleccionables = []; // cajas munición
let curaciones = [];     // botiqui
let zonaExtraccionMesh;
let juegoTerminado = false;

const loader = new THREE.GLTFLoader();

init();
animate();

// generador de texturas retro procedurales
function crearTexturaRetro(tipo) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (tipo === 'pared') {
        ctx.fillStyle = '#5c5b22';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#8b8828';
        ctx.fillRect(0, 26, 64, 12);
        ctx.fillStyle = '#24230c';
        for (let y = 0; y < 64; y += 8) {
            ctx.fillRect(0, y, 64, 2);
        }
    } else if (tipo === 'suelo') {
        ctx.fillStyle = '#3d5245';
        ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 400; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#2c3d32' : '#4f6959';
            ctx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 2, 2);
        }
    } else if (tipo === 'techo') {
        ctx.fillStyle = '#36381e';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#1b1c0e';
        ctx.fillRect(0, 0, 64, 6);
        ctx.fillRect(0, 32, 64, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a12);
    scene.fog = new THREE.FogExp2(0x141a12, 0.02);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, document.body);
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => {
        if (!juegoTerminado) {
            controls.lock();
            if (soundAmbiente && !soundAmbiente.isPlaying) {
                soundAmbiente.play();
            }
        }
    });

    controls.addEventListener('unlock', () => {
        if (!juegoTerminado) instructions.style.display = 'flex';
    });

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('click', disparar);

    const ambientLight = new THREE.AmbientLight(0xdde8cc, 0.65);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xccffaa, 0.9, 30);
    pointLight1.position.set(0, 4.5, -5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xccffaa, 0.9, 35);
    pointLight2.position.set(0, 4.5, -45);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xccffaa, 0.9, 40);
    pointLight3.position.set(0, 4.5, -90);
    scene.add(pointLight3);

    configurarSonidos();
    crearEscenarioBunker();
    cargarArmas();
    cargarZombis();
    cargarColeccionables();
    cargarCuraciones();
    crearZonaExtraccion();

    window.addEventListener('resize', onWindowResize);
}

function configurarSonidos() {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();

    soundAmbiente = new THREE.Audio(listener);
    audioLoader.load('sonidos/sonidoambiental.mp3', (buffer) => {
        soundAmbiente.setBuffer(buffer);
        soundAmbiente.setLoop(true);
        soundAmbiente.setVolume(0.4);
    });

    soundPistola = new THREE.Audio(listener);
    audioLoader.load('sonidos/pistolasonido.mp3', (buffer) => {
        soundPistola.setBuffer(buffer);
        soundPistola.setVolume(0.6);
    });

    soundEscopeta = new THREE.Audio(listener);
    audioLoader.load('sonidos/escopetasondo.mp3', (buffer) => {
        soundEscopeta.setBuffer(buffer);
        soundEscopeta.setVolume(0.7);
    });
}

function crearEscenarioBunker() {
    const texSuelo = crearTexturaRetro('suelo');
    texSuelo.repeat.set(25, 35);
    const texPared = crearTexturaRetro('pared');
    texPared.repeat.set(12, 2);
    const texTecho = crearTexturaRetro('techo');
    texTecho.repeat.set(25, 30);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 180),
        new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -55;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 180),
        new THREE.MeshStandardMaterial({ map: texTecho })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, -55);
    scene.add(ceiling);

    const vigaMat = new THREE.MeshStandardMaterial({ color: 0x26291a });
    for (let z = 10; z >= -120; z -= 10) {
        const viga = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 0.8), vigaMat);
        viga.position.set(0, 5.7, z);
        scene.add(viga);
    }

    const wallMat = new THREE.MeshStandardMaterial({ map: texPared });
    const puertaMat = new THREE.MeshStandardMaterial({ color: 0x2a2d1f, roughness: 0.7 });

    function crearPared(x, z, w, h, d) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, h / 2, z);
        scene.add(wall);
    }

    crearPared(-15, -55, 1, 6, 160);
    crearPared(15, -55, 1, 6, 160);
    crearPared(0, 15, 30, 6, 1);
    crearPared(0, -125, 30, 6, 1);

    // contrusccion de puertas o entradas variadas

    function construirPuertaCustom(zPos, minX, maxX) {
        let anchoIzq = minX - (-15);
        let centroIzq = -15 + anchoIzq / 2;
        if (anchoIzq > 0.5) crearPared(centroIzq, zPos, anchoIzq, 6, 1);

        let anchoDer = 15 - maxX;
        let centroDer = maxX + anchoDer / 2;
        if (anchoDer > 0.5) crearPared(centroDer, zPos, anchoDer, 6, 1);

        // sintel superior
        let anchoPuerta = maxX - minX;
        let centroPuerta = minX + anchoPuerta / 2;
        const dintel = new THREE.Mesh(new THREE.BoxGeometry(anchoPuerta, 2, 1.2), wallMat);
        dintel.position.set(centroPuerta, 5, zPos);
        scene.add(dintel);

        // marcos laterales
        const marcoIzq = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 1.4), puertaMat);
        marcoIzq.position.set(minX, 2, zPos);
        scene.add(marcoIzq);

        const marcoDer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 1.4), puertaMat);
        marcoDer.position.set(maxX, 2, zPos);
        scene.add(marcoDer);
    }

    // puerta 1
    construirPuertaCustom(-25, -8, -3);

    // puerta 2
    construirPuertaCustom(-65, 3, 8);

    // puerta 3
    construirPuertaCustom(-95, -2.5, 2.5);
}

function cargarArmas() {
    const configurarModeloArma = (modelo) => {
        modelo.scale.set(0.22, 0.22, 0.22);
        modelo.position.set(0.28, -0.25, -0.45);
        modelo.rotation.set(0, Math.PI / 2, 0); 
        camera.add(modelo);
    };

    loader.load('modelos/arma1.glb', (gltf) => {
        weapons[1].mesh = gltf.scene;
        configurarModeloArma(weapons[1].mesh);
    });

    loader.load('modelos/arma2.glb', (gltf) => {
        weapons[2].mesh = gltf.scene;
        configurarModeloArma(weapons[2].mesh);
        weapons[2].mesh.visible = false;
    });

    const flashGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0x55ff33, transparent: true, opacity: 0.9 });
    muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0.25, -0.18, -0.85);
    muzzleFlash.visible = false;
    camera.add(muzzleFlash);

    muzzleLight = new THREE.PointLight(0x55ff33, 5, 8);
    muzzleLight.position.set(0.25, -0.18, -0.75);
    muzzleLight.visible = false;
    camera.add(muzzleLight);
}

function cargarZombis() {
    const datosZombis = [
        { x: -3, z: -16, velocidad: 0.045 },
        { x: 3, z: -20, velocidad: 0.130 },
        { x: 0, z: -22, velocidad: 0.048 },

        { x: -5, z: -43, velocidad: 0.052 },
        { x: -2, z: -46, velocidad: 0.140 },
        { x: 2, z: -45, velocidad: 0.055 },
        { x: 5, z: -48, velocidad: 0.145 },
        { x: -3, z: -52, velocidad: 0.050 },

        { x: -6, z: -68, velocidad: 0.058 },
        { x: 6, z: -75, velocidad: 0.150 },
        { x: -2, z: -82, velocidad: 0.060 },
        { x: 4, z: -86, velocidad: 0.155 },

        { x: -4, z: -102, velocidad: 0.165 },
        { x: -1, z: -105, velocidad: 0.170 },
        { x: 2, z: -104, velocidad: 0.065 },
        { x: 5, z: -108, velocidad: 0.175 },
        { x: -3, z: -112, velocidad: 0.180 },
        { x: 3, z: -115, velocidad: 0.185 }
    ];

    const audioLoader = new THREE.AudioLoader();

    datosZombis.forEach(datos => {
        loader.load('modelos/zombi.glb', (gltf) => {
            const zombiMesh = gltf.scene;
            zombiMesh.scale.set(0.65, 0.65, 0.65);
            zombiMesh.position.set(datos.x, 0, datos.z);
            scene.add(zombiMesh);

            const zombiSound = new THREE.PositionalAudio(new THREE.AudioListener());
            audioLoader.load('sonidos/zombisonido.mp3', (buffer) => {
                zombiSound.setBuffer(buffer);
                zombiSound.setRefDistance(5);
                zombiSound.setLoop(true);
                zombiSound.setVolume(0.8);
            });
            zombiMesh.add(zombiSound);

            zombies.push({
                mesh: zombiMesh,
                hp: 2,
                activo: false,
                rangoDeteccion: 19,
                velocidad: datos.velocidad,
                sound: zombiSound
            });
        }, undefined, (error) => console.error("error de carga zombi.glb", error));
    });
}

function cargarColeccionables() {
    const posicionesCajas = [
        { x: -8, z: -15 },
        { x: 8, z: -55 },
        { x: -7, z: -98 }
    ];

    posicionesCajas.forEach(pos => {
        loader.load('modelos/cajamunicion.glb', (gltf) => {
            const caja = gltf.scene;
            caja.scale.set(1.2, 1.2, 1.2);
            caja.position.set(pos.x, 0.5, pos.z);
            scene.add(caja);
            coleccionables.push(caja);
        }, undefined, (error) => console.error("error de carga cajamunicion.glb", error));
    });
}

function cargarCuraciones() {
    const posicionesCura = [
        { x: 6, z: -30 },
        { x: -8, z: -82 }
    ];

    posicionesCura.forEach(pos => {
        loader.load('modelos/botiquin.glb', (gltf) => {
            const botiquin = gltf.scene;
            botiquin.scale.set(1.0, 1.0, 1.0);
            botiquin.position.set(pos.x, 0.5, pos.z);
            scene.add(botiquin);
            curaciones.push(botiquin);
        }, undefined, (error) => console.error("error de carga botiquin.glb", error));
    });
}

function crearZonaExtraccion() {
    const zonaGeo = new THREE.CylinderGeometry(4, 4, 0.2, 24);
    const zonaMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.6 });
    zonaExtraccionMesh = new THREE.Mesh(zonaGeo, zonaMat);
    zonaExtraccionMesh.position.set(0, 0.1, -118);
    scene.add(zonaExtraccionMesh);

    const luzExtraccion = new THREE.PointLight(0x00ffaa, 1.5, 20);
    luzExtraccion.position.set(0, 3, -118);
    scene.add(luzExtraccion);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Digit1': cambiarArma(1); break;
        case 'Digit2': cambiarArma(2); break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function cambiarArma(num) {
    currentWeapon = num;
    if (weapons[1].mesh) weapons[1].mesh.visible = (num === 1);
    if (weapons[2].mesh) weapons[2].mesh.visible = (num === 2);
    document.getElementById('weapon-name').innerText = weapons[num].name;
    document.getElementById('ammo-count').innerText = weapons[num].ammo;
}

function disparar() {
    if (!controls.isLocked || juegoTerminado) return;

    let armaActual = weapons[currentWeapon];
    if (armaActual.ammo > 0) {
        armaActual.ammo--;
        document.getElementById('ammo-count').innerText = armaActual.ammo;

        if (currentWeapon === 1) {
            if (soundPistola) {
                if (soundPistola.isPlaying) soundPistola.stop();
                soundPistola.play();
            }
        } else {
            if (soundEscopeta) {
                if (soundEscopeta.isPlaying) soundEscopeta.stop();
                soundEscopeta.play();
            }
        }

        muzzleFlash.visible = true;
        muzzleLight.visible = true;
        setTimeout(() => { 
            muzzleFlash.visible = false; 
            muzzleLight.visible = false; 
        }, 60);

        comprobarImpactoZombi();
    }
}

// colisiones
function limitarMovimientoJugador() {
    if (camera.position.x < -14.2) camera.position.x = -14.2;
    if (camera.position.x > 14.2) camera.position.x = 14.2;
    if (camera.position.z > 14.0) camera.position.z = 14.0;
    if (camera.position.z < -124.0) camera.position.z = -124.0;

    // puerta 1
    if (camera.position.z > -26.5 && camera.position.z < -23.5) {
        if (camera.position.x < -8.0 || camera.position.x > -3.0) {
            camera.position.z = camera.position.z < -25.0 ? -26.5 : -23.5;
        }
    }

    // puerta 2 
    if (camera.position.z > -66.5 && camera.position.z < -63.5) {
        if (camera.position.x < 3.0 || camera.position.x > 8.0) {
            camera.position.z = camera.position.z < -65.0 ? -66.5 : -63.5;
        }
    }

    // puerta 3
    if (camera.position.z > -96.5 && camera.position.z < -93.5) {
        if (camera.position.x < -2.5 || camera.position.x > 2.5) {
            camera.position.z = camera.position.z < -95.0 ? -96.5 : -93.5;
        }
    }
}

function limitarMovimientoZombi(zombi) {
    if (zombi.mesh.position.x < -14.0) zombi.mesh.position.x = -14.0;
    if (zombi.mesh.position.x > 14.0) zombi.mesh.position.x = 14.0;
    if (zombi.mesh.position.z > 14.0) zombi.mesh.position.z = 14.0;
    if (zombi.mesh.position.z < -124.0) zombi.mesh.position.z = -124.0;

    if (zombi.mesh.position.z > -26.5 && zombi.mesh.position.z < -23.5) {
        if (zombi.mesh.position.x < -8.0 || zombi.mesh.position.x > -3.0) {
            zombi.mesh.position.z = zombi.mesh.position.z < -25.0 ? -26.5 : -23.5;
        }
    }

    if (zombi.mesh.position.z > -66.5 && zombi.mesh.position.z < -63.5) {
        if (zombi.mesh.position.x < 3.0 || zombi.mesh.position.x > 8.0) {
            zombi.mesh.position.z = zombi.mesh.position.z < -65.0 ? -66.5 : -63.5;
        }
    }

    if (zombi.mesh.position.z > -96.5 && zombi.mesh.position.z < -93.5) {
        if (zombi.mesh.position.x < -2.5 || zombi.mesh.position.x > 2.5) {
            zombi.mesh.position.z = zombi.mesh.position.z < -95.0 ? -96.5 : -93.5;
        }
    }
}

const raycaster = new THREE.Raycaster();
function comprobarImpactoZombi() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    let meshesZombis = zombies.filter(z => z.hp > 0).map(z => z.mesh);
    let intersects = raycaster.intersectObjects(meshesZombis, true);

    if (intersects.length > 0) {
        let objetoImpactado = intersects[0].object;
        let zombiEncontrado = zombies.find(z => {
            let pertenece = false;
            z.mesh.traverse(child => { if (child === objetoImpactado) pertenece = true; });
            return pertenece;
        });

        if (zombiEncontrado && zombiEncontrado.hp > 0) {
            zombiEncontrado.hp--;

            if (zombiEncontrado.hp === 1) {
                zombiEncontrado.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material = child.material.clone();
                        child.material.emissive = new THREE.Color(0xaa0000);
                    }
                });
            } else if (zombiEncontrado.hp <= 0) {
                if (zombiEncontrado.sound && zombiEncontrado.sound.isPlaying) {
                    zombiEncontrado.sound.stop();
                }
                scene.remove(zombiEncontrado.mesh);
            }
        }
    }
}

function mostrarAviso(texto) {
    const el = document.getElementById('mensaje-estado');
    el.innerText = texto;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked === true && !juegoTerminado) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 45.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 45.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        camera.position.y = 1.6;

        limitarMovimientoJugador();

        zombies.forEach(zombi => {
            if (zombi.hp > 0) {
                let distancia = zombi.mesh.position.distanceTo(camera.position);
                if (distancia < zombi.rangoDeteccion) {
                    zombi.activo = true;
                    if (zombi.sound && !zombi.sound.isPlaying) {
                        zombi.sound.play();
                    }
                }

                if (zombi.activo) {
                    zombi.mesh.lookAt(camera.position.x, zombi.mesh.position.y, camera.position.z);
                    zombi.mesh.translateZ(zombi.velocidad);

                    limitarMovimientoZombi(zombi);

                    let distanciaXZ = new THREE.Vector2(zombi.mesh.position.x, zombi.mesh.position.z).distanceTo(
                        new THREE.Vector2(camera.position.x, camera.position.z)
                    );

                    if (distanciaXZ < 1.8) {
                        saludJugador -= 0.8;
                        if (saludJugador < 0) saludJugador = 0;

                        document.getElementById('health-bar').style.width = saludJugador + '%';
                        document.getElementById('health-bar').innerText = Math.round(saludJugador) + '%';

                        if (saludJugador <= 0) {
                            juegoTerminado = true;
                            controls.unlock();
                            alert("GAME OVER: Fuiste derrotado por los zombis.");
                            location.reload();
                        }
                    }
                }
            }
        });

        coleccionables.forEach((caja, index) => {
            caja.rotation.y += 0.03;
            if (camera.position.distanceTo(caja.position) < 1.8) {
                weapons[1].ammo += 10;
                weapons[2].ammo += 5;
                document.getElementById('ammo-count').innerText = weapons[currentWeapon].ammo;
                mostrarAviso("¡MUNICIÓN RECARGADA! (+10 / +5)");
                scene.remove(caja);
                coleccionables.splice(index, 1);
            }
        });

        curaciones.forEach((botiquin, index) => {
            botiquin.rotation.y += 0.04;
            if (camera.position.distanceTo(botiquin.position) < 1.8) {
                saludJugador = Math.min(100, saludJugador + 35);
                document.getElementById('health-bar').style.width = saludJugador + '%';
                document.getElementById('health-bar').innerText = Math.round(saludJugador) + '%';
                
                mostrarAviso("¡VIDA RECUPERADA! (+35 HP)");
                scene.remove(botiquin);
                curaciones.splice(index, 1);
            }
        });

        if (camera.position.distanceTo(zonaExtraccionMesh.position) < 4.0) {
            juegoTerminado = true;
            controls.unlock();
            alert("¡MISIÓN COMPLETADA! Has llegado a la zona de extracción.");
            location.reload();
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}