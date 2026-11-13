#  T3 - OPERACION EXTRACCION

Este proyecto es un videojuego de disparos en primera persona (FPS) desarrollado en Three.js para la evaluación T3. La temática se centra en un búnker subterráneo postapocalíptico donde tienes que avanzar a través de pasillos con puertas asimétricas ubicadas estrategicamente, enfrentarte a hordas de zombis con velocidades mixtas, gestionar la munición de tus dos armas y recolectar botiquines de vida hasta llegar a la zona de extracción final para ganar la partida.

 - Controles
W, A, S, D: Moverse por el escenario (adelante, izquierda, atrás, derecha).

Mouse: Mirar a los alrededores y apuntar en primera persona.

Click Izquierdo: Disparar.

Teclas 1 y 2: Cambiar entre la pistola táctica (arma 1) y la escopeta pesada(arma 2).

 - Instrucciones de instalación y ejecución
Debido a las políticas de seguridad de los navegadores (CORS) con la carga local de modelos 3D (.glb) y audios (.mp3), el juego debe ejecutarse mediante un servidor local:

Clona o descarga este repositorio en tu computadora.

Asegúrate de tener los archivos ordenados en la siguiente estructura:

index.html

style.css

main.js

Carpeta /modelos/ (con los archivos .glb de las armas, zombis, cajas y botiquines).

Carpeta /sonidos/ (con los audios del ambiente, zombis y disparos).

Para correrlo:

Opción recomendada (VS Code): Abre la carpeta del proyecto en Visual Studio Code, instala la extensión Live Server, dale click derecho a index.html y selecciona "Open with Live Server".

Opción con Python: Abre una terminal dentro de la carpeta del proyecto, ejecuta el comando python -m http.server y abre en tu navegador http://localhost:8000.

📚 Fuentes de recursos externos
Librerías oficiales y de control de Three.js (PointerLockControls, GLTFLoader, PositionalAudio, Raycaster).

Modelos 3D en formato .glb optimizados para web y texturas procedurales hechas en Canvas 2D.
