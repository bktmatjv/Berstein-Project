/**
    Script principal del frontend que maneja el estado de la aplicación, la interacción del usuario, la comunicación con el backend y el renderizado de la escena SVG.
     - state: Objeto global que almacena los puntos de control, el estado de la cámara y otras variables relevantes.
     - MathUtils: Funciones matemáticas para calcular la trayectoria de Bernstein.
     - ApiService: Funciones para comunicarse con el backend.
     - Renderer: Funciones para dibujar en el SVG y actualizar la interfaz.
     - Interactor: Funciones para manejar eventos de usuario como clics, arrastres, zoom y entradas manuales.

    El flujo general es:
     1. El usuario interactúa con la escena (agrega/mueve puntos, hace zoom, etc.).
     2. El estado se actualiza y se vuelve a renderizar la escena.
     3. Se sincroniza con el backend para obtener datos simbólicos y gráficos adicionales (sacados de matplotlib).
     4. Se muestran los resultados del backend en la interfaz (fórmulas LaTeX y gráfico generado).
 */

const state = {
    points: [
        [0, 0],
        [3, 5],
        [6, 5],
        [9, 0]
    ],
    isAddingMode: false,
    draggedIndex: null,
    draggingT: false,
    t: 0.5, 
    // Configuración inicial de la cámara de la pantalla movible
    panX: 0,
    panY: 0,
    zoom: 40, 
    isPanning: false,
    startX: 0,
    startY: 0, 

};


const svgElement = document.getElementById('cartesian-plane');
const viewGroup = document.getElementById('viewport-group');

// --- CÁLCULOS MATEMÁTICOS FRONTEND ---
const MathUtils = {
    combinatoria: (n, i) => {
        if (i === 0 || i === n) return 1;
        let p = 1, r = 1;
        for (let j = 1; j <= i; j++) { p *= (n - i + j); r *= j; }
        return p / r;
    },
    polinomioBernstein: (i, n, t) => MathUtils.combinatoria(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i),
    obtenerTrayectoriaBernstein: (puntos) => {
        const n = puntos.length - 1;
        if (n < 0) return [];
        const trayectoria = [];
        for (let k = 0; k <= 500; k++) {
            const t = k / 500;
            let x = 0, y = 0;
            for (let i = 0; i <= n; i++) {
                const b = MathUtils.polinomioBernstein(i, n, t);
                x += puntos[i][0] * b; y += puntos[i][1] * b;
            }
            trayectoria.push([x, y]);
        }
        return trayectoria;
    },
        // evaluar berstein 
    evaluarBernstein: (puntos, t) => {
        const n = puntos.length - 1;

        let x = 0;
        let y = 0;

        for (let i = 0; i <= n; i++) {

            const b = MathUtils.polinomioBernstein(i, n, t);

            x += puntos[i][0] * b;
            y += puntos[i][1] * b;
        }

        return [x, y];
    }
};

// --- CLIENTE API ---
const ApiService = {
    async calcularAlgebraSimbolica(puntos) {
        try {
            const response = await fetch('https://berstein-project.onrender.com/symbolic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: puntos })
            });
            return await response.json();
        } catch (error) {
            console.error('Servidor desconectado.', error);
            return null;
        }
    }
};

// --- MANIPULACIÓN DEL DOM Y DIBUJO ---
const Renderer = {
    // Convierte coordenadas del plano cartesiano a coordenadas de pantalla (píxeles)
    toScreen: (mathX, mathY) => {
        const w = svgElement.clientWidth;
        const h = svgElement.clientHeight;
        const cx = w / 2 + state.panX;
        const cy = h / 2 + state.panY;
        return {
            x: cx + mathX * state.zoom,
            y: cy - mathY * state.zoom 
        };
    },

    ajustarCamaraEspacio: () => {

        viewGroup.removeAttribute('transform');
        Renderer.actualizarEjesYNumeros();
        Renderer.actualizarEscena(); 
    },

    actualizarEjesYNumeros: () => {
        const w = svgElement.clientWidth;
        const h = svgElement.clientHeight;

        // El centro (0,0) proyectado en la pantalla
        const origin = Renderer.toScreen(0, 0);

        // Ejes X e Y fijos
        const axX = document.getElementById('axis-x');
        axX.setAttribute('x1', 0);
        axX.setAttribute('y1', origin.y);
        axX.setAttribute('x2', w);
        axX.setAttribute('y2', origin.y);

        const axY = document.getElementById('axis-y');
        axY.setAttribute('x1', origin.x);
        axY.setAttribute('y1', 0);
        axY.setAttribute('x2', origin.x);
        axY.setAttribute('y2', h);

        const gridG = document.getElementById('grid');
        const labelsG = document.getElementById('axis-labels');
        gridG.innerHTML = '';
        labelsG.innerHTML = '';

        const startX = Math.floor((-state.panX - w / 2) / state.zoom) - 2;
        const endX = Math.ceil((-state.panX + w / 2) / state.zoom) + 2;
        const startY = Math.floor((-state.panY - h / 2) / state.zoom) - 2;
        const endY = Math.ceil((-state.panY + h / 2) / state.zoom) + 2;

        // Cuadrícula y Textos en X
        for (let x = startX; x <= endX; x++) {
            const s = Renderer.toScreen(x, 0);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', s.x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', s.x);
            line.setAttribute('y2', h);
            gridG.appendChild(line);

            if (x !== 0) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = x;
                text.setAttribute('x', s.x);
                text.setAttribute('y', origin.y + 15); 
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                labelsG.appendChild(text);
            }
        }

        // Cuadrícula y Textos en Y
        for (let y = startY; y <= endY; y++) {
            const s = Renderer.toScreen(0, y);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', s.y);
            line.setAttribute('x2', w);
            line.setAttribute('y2', s.y);
            gridG.appendChild(line);

            if (y !== 0) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = y;
                text.setAttribute('x', origin.x - 10); // Desplazamiento fijo en px
                text.setAttribute('y', s.y);
                text.setAttribute('text-anchor', 'end');
                text.setAttribute('dominant-baseline', 'middle');
                labelsG.appendChild(text);
            }
        }
    },

    actualizarEscena: () => {
        Renderer.dibujarPoligonoEstructural();
        Renderer.dibujarCurvaBernstein();
        Renderer.dibujarPuntoT();
        Renderer.dibujarNodosControl();
        Renderer.actualizarFormularioInputsManuales();
    },

    dibujarPoligonoEstructural: () => {
        const polyPath = document.getElementById('structural-polygon');
        if (state.points.length === 0) { polyPath.setAttribute('d', ''); return; }
        const pathData = state.points.map((p, idx) => {
            const s = Renderer.toScreen(p[0], p[1]);
            return `${idx === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
        }).join(' ');
        polyPath.setAttribute('d', pathData);
    },

    // ANIMACIÓN DE DIBUJADO DE CURVA: Trazo progresivo usando stroke-dasharray y stroke-dashoffset
    animarCurva: () => {
        const curvePath = document.getElementById('bernstein-curve');

        const length = curvePath.getTotalLength();

        curvePath.style.strokeDasharray = length;
        curvePath.style.strokeDashoffset = length;

        const animation = curvePath.animate(
            [
                { strokeDashoffset: length },
                { strokeDashoffset: 0 }
            ],
            {
                duration: 800,
                easing: "ease-out",
                fill: "forwards"
            }
        );

        animation.onfinish = () => {
            curvePath.style.strokeDashoffset = 0;
        };
    }, 

    encontrarTMasCercano: (mouseX, mouseY) => {

        const trayectoria =
            MathUtils.obtenerTrayectoriaBernstein(
                state.points
            );

        let mejorT = 0;
        let mejorDist = Infinity;

        trayectoria.forEach((p, i) => {

            const screen =
                Renderer.toScreen(
                    p[0],
                    p[1]
                );

            const dx =
                screen.x - mouseX;

            const dy =
                screen.y - mouseY;

            const dist =
                dx*dx + dy*dy;

            if (dist < mejorDist) {

                mejorDist = dist;

                mejorT = i / 500;

            }

        });

        return mejorT;
    }, 

    dibujarCurvaBernstein: () => {
        const curvePath = document.getElementById('bernstein-curve');
        const trayectoria = MathUtils.obtenerTrayectoriaBernstein(state.points);
        if (trayectoria.length === 0) { curvePath.setAttribute('d', ''); return; }
        const pathData = trayectoria.map((p, idx) => {
            const s = Renderer.toScreen(p[0], p[1]);
            return `${idx === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
        }).join(' ');
        curvePath.setAttribute('d', pathData);
    },
    dibujarPuntoT: () => {

        if (state.points.length === 0) {

            const tooltip =
                document.getElementById(
                    'curve-tooltip'
                );

            if (tooltip)
                tooltip.style.display = 'none';

            return;
        }


        const point =
            MathUtils.evaluarBernstein(
                state.points,
                state.t
            );

        const screen =
            Renderer.toScreen(
                point[0],
                point[1]
            );

        const node =
            document.getElementById('curve-point');

        if (!node) return;

        node.setAttribute('cx', screen.x);
        node.setAttribute('cy', screen.y);

        

        const coordText =
            document.getElementById('curve-coordinates');

        if (coordText) {
            coordText.textContent =
                `B(t) = (${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
        }
    },
    

    dibujarNodosControl: () => {
        const container = document.getElementById('control-points');
        const nodosActuales = container.querySelectorAll('.control-node');

        // Si la cantidad de puntos cambió (ej. añadiste/borraste uno), recreamos el DOM
        if (nodosActuales.length !== state.points.length) {
            container.innerHTML = '';
            state.points.forEach((p, idx) => {
                const s = Renderer.toScreen(p[0], p[1]);
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', s.x);
                circle.setAttribute('cy', s.y);
                circle.setAttribute('r', 8); 
                circle.setAttribute('class', 'control-node'); 
                
                // Mantenemos el estado visual si este punto se está arrastrando
                if (state.draggedIndex === idx) circle.classList.add('dragging');
                
                circle.dataset.index = idx;
                container.appendChild(circle);
            });
        } else {
            // Si la cantidad es la misma (estamos arrastrando), SOLO actualizamos posiciones
            state.points.forEach((p, idx) => {
                const s = Renderer.toScreen(p[0], p[1]);
                nodosActuales[idx].setAttribute('cx', s.x);
                nodosActuales[idx].setAttribute('cy', s.y);
            });
        }
    },

    actualizarFormularioInputsManuales: () => {
        const container = document.getElementById('inputs-container');
        const rowsActuales = container.querySelectorAll('.point-input-row');

        if (rowsActuales.length !== state.points.length) {
            container.innerHTML = '';
            state.points.forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = 'point-input-row';
                row.innerHTML = `
                    <label>Punto P${idx}:</label>
                    <input type="number" step="any" class="coord-input x-in" value="${p[0]}">
                    <span>,</span>
                    <input type="number" step="any" class="coord-input y-in" value="${p[1]}">
                    <button class="btn-remove-input" data-index="${idx}">&times;</button>
                `;
                container.appendChild(row);
            });
        } else {

            state.points.forEach((p, idx) => {
                const inputs = rowsActuales[idx].querySelectorAll('.coord-input');

                if (document.activeElement !== inputs[0]) inputs[0].value = p[0];
                if (document.activeElement !== inputs[1]) inputs[1].value = p[1];
            });
        }
    },





    
    mostrarDatosBackend: (data) => {
        if (!data) return;
        document.getElementById('matplotlib-render').src = data.plot_img;
        const outputElement = document.getElementById('math-output');
        
        let htmlContent = `<div class="math-step-title">--- POLINOMIOS DE BERNSTEIN DE GRADO n = ${data.degree} ---</div>`;
        
        // 1. Mostrar las bases
        data.latex.basis.forEach(base_poly => {
            htmlContent += `$$${base_poly}$$`;
        });

        // 2. Mostrar la regla sin simplificar
        htmlContent += `<div class="math-step-title" style="margin-top: 15px;">--- REGLA DE CORRESPONDENCIA (COMBINACIÓN LINEAL) ---</div>`;
        htmlContent += `<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0;">Expresión matemática de la curva (combinación lineal de los polinomios):</p>`;
        htmlContent += `$$B_x(t) = ${data.latex.Bx_raw}$$`;
        htmlContent += `$$B_y(t) = ${data.latex.By_raw}$$`;

        // 3. Mostrar el resultado final en formato vectorial B(t) = (X, Y)
        htmlContent += `<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0; margin-top: 15px;">Regla de correspondencia simplificada:</p>`;
        htmlContent += `$$B(t) = \\left( ${data.latex.Bx}, \\; ${data.latex.By} \\right)$$`;

        outputElement.innerHTML = htmlContent;
        if (window.MathJax) MathJax.typesetPromise([outputElement]);
    }

};

// --- CAPTURA DE INTERACCIONES (Mouse, Movimiento de Pantalla y Zoom) ---
const Interactor = {
    convertirPantallaAEspacio: (clientX, clientY) => {
        const rect = svgElement.getBoundingClientRect();
        const w = rect.width; const h = rect.height;
        const xCanvas = clientX - rect.left;
        const yCanvas = clientY - rect.top;

        // Despeje lineal inverso de la transformación de cámara
        const xMath = (xCanvas - w / 2 - state.panX) / state.zoom;
        const yMath = -(yCanvas - h / 2 - state.panY) / state.zoom;
        return { x: parseFloat(xMath.toFixed(2)), y: parseFloat(yMath.toFixed(2)) };
    },

    ejecutarSincronizacionCompleta: async () => {
        const data = await ApiService.calcularAlgebraSimbolica(state.points);
        Renderer.mostrarDatosBackend(data);
    },

    registrarEventos: () => {
        // Desactivar menú contextual por defecto para usar arrastre libre con clic derecho
        svgElement.addEventListener('contextmenu', e => e.preventDefault());
        
        const tooltip = document.getElementById('point-tooltip');


        svgElement.addEventListener('mousedown', (e) => {

  


            const target = e.target;

            if (target.id === 'curve-point') {

                state.draggingT = true;

                return;
            }

            if (target.classList.contains('control-node')) {
                // Drag and drop de nodos
                state.draggedIndex = parseInt(target.dataset.index);
                target.classList.add('dragging');
            } else if (e.button === 2 || e.button === 1) {
                // Iniciar Panning (Mover pantalla con clic derecho o botón de rueda)
                state.isPanning = true;
                state.startX = e.clientX - state.panX;
                state.startY = e.clientY - state.panY;
            } else if (state.isAddingMode && e.button === 0) {
                // Añadir puntos al hacer clic izquierdo
                const coord = Interactor.convertirPantallaAEspacio(e.clientX, e.clientY);
                state.points.push([coord.x, coord.y]);
                Renderer.actualizarEscena();
                Renderer.animarCurva();
                Interactor.ejecutarSincronizacionCompleta();
            }
        });

        // ===== LOGICA DEL MODAL DE MATEMÁTICAS =====
        const btnExpandMath = document.getElementById('btn-expand-math');
        const modalMath = document.getElementById('math-modal');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const mathOutput = document.getElementById('math-output');
        const modalMathOutput = document.getElementById('modal-math-output');

        if (btnExpandMath && modalMath && btnCloseModal) {
            
            // 1. Abrir Modal
            btnExpandMath.addEventListener('click', () => {
                // Copiamos el HTML interno (que ya tiene los SVGs renderizados de MathJax)
                modalMathOutput.innerHTML = mathOutput.innerHTML;
                modalMath.classList.remove('hidden');
            });

            // 2. Cerrar Modal con el botón (X)
            btnCloseModal.addEventListener('click', () => {
                modalMath.classList.add('hidden');
            });

            // 3. Cerrar Modal haciendo clic fuera de la caja blanca
            modalMath.addEventListener('click', (e) => {
                if (e.target === modalMath) {
                    modalMath.classList.add('hidden');
                }
            });

            // 4. Cerrar Modal con la tecla Escape (UX Premium)
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modalMath.classList.contains('hidden')) {
                    modalMath.classList.add('hidden');
                }
            });
        }

        svgElement.addEventListener('mousemove', (e) => {

            const rect =
                svgElement.getBoundingClientRect();

            const mouseX =
                e.clientX - rect.left;

            const mouseY =
                e.clientY - rect.top;

            // ===== DRAG DEL PUNTO B(t) =====
            if (state.draggingT) {

                state.t =
                    Renderer.encontrarTMasCercano(
                        mouseX,
                        mouseY
                    );

                document
                    .getElementById('t-slider')
                    .value = state.t;

                document
                    .getElementById('t-value')
                    .textContent =
                        state.t.toFixed(2);

                Renderer.dibujarPuntoT();

                return;
            }

            // ===== TOOLTIP DEL PUNTO B(t) =====
            const curvePoint =
                document.getElementById('curve-point');

            const curveTooltip =
                document.getElementById('curve-tooltip');

            if (curvePoint && curveTooltip) {

                const cx =
                    parseFloat(
                        curvePoint.getAttribute('cx')
                    );

                const cy =
                    parseFloat(
                        curvePoint.getAttribute('cy')
                    );

                const dist =
                    Math.hypot(
                        mouseX - cx,
                        mouseY - cy
                    );

                if (dist < 25) {

                    const point =
                        MathUtils.evaluarBernstein(
                            state.points,
                            state.t
                        );

                    curveTooltip.style.display = 'block';

                    curveTooltip.style.left =
                        `${cx + 15}px`;

                    curveTooltip.style.top =
                        `${cy - 15}px`;

                    curveTooltip.innerHTML =
                        `
                        <strong>B(${state.t.toFixed(2)})</strong>
                        <br>
                        (${point[0].toFixed(2)}, ${point[1].toFixed(2)})
                        `;

                } else {

                    curveTooltip.style.display = 'none';

                }
            }

            // ===== DRAG DE PUNTOS DE CONTROL =====
            if (state.draggedIndex !== null) {

                const coord =
                    Interactor.convertirPantallaAEspacio(
                        e.clientX,
                        e.clientY
                    );

                state.points[state.draggedIndex] =
                    [coord.x, coord.y];

                Renderer.actualizarEscena();

            } else if (state.isPanning) {

                state.panX =
                    Math.round(
                        e.clientX - state.startX
                    );

                state.panY =
                    Math.round(
                        e.clientY - state.startY
                    );

                Renderer.ajustarCamaraEspacio();
            }
        });

        window.addEventListener('mouseup', () => {
            if (state.draggedIndex !== null) {
                // Remover la clase de agarre visual
                const draggedNode = document.querySelector(`.control-node[data-index="${state.draggedIndex}"]`);
                if (draggedNode) draggedNode.classList.remove('dragging');

                state.draggedIndex = null;
                Interactor.ejecutarSincronizacionCompleta();
            }
            if (state.isPanning) state.isPanning = false;

            state.draggingT = false;
        });

        // Soporte de Zoom con la rueda del ratón
        svgElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const nuevoZoom = Math.min(
                Math.max(state.zoom * zoomFactor, 10),
                300
            );

            // Snap a enteros
            state.zoom = Math.round(nuevoZoom);
            Renderer.ajustarCamaraEspacio();
            Renderer.actualizarEscena();
        });


        svgElement.addEventListener('mousemove', (e) => {

            const target = e.target;

            if (target.classList.contains('control-node')) {

                const idx = parseInt(target.dataset.index);

                const point = state.points[idx];

                tooltip.innerHTML = `
                    <strong>P${idx}</strong><br>
                    (${point[0]}, ${point[1]})
                `;

                tooltip.style.left = `${e.offsetX + 15}px`;
                tooltip.style.top = `${e.offsetY + 15}px`;

                tooltip.classList.add('visible');
            }
        });

        svgElement.addEventListener('mouseout', (e) => {

            if (e.target.classList.contains('control-node')) {

                tooltip.classList.remove('visible');

            }

        });



        // Eventos de botones e inputs
        const btnAddMode = document.getElementById('btn-add-mode');
        btnAddMode.addEventListener('click', () => {
            state.isAddingMode = !state.isAddingMode;
            btnAddMode.classList.toggle('active', state.isAddingMode);
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            state.points = []; state.panX = 0; state.panY = 0; state.zoom = 40;
            Renderer.ajustarCamaraEspacio(); Renderer.actualizarEscena();
            Interactor.ejecutarSincronizacionCompleta();
        });

        document.getElementById('btn-add-input').addEventListener('click', () => {
            state.points.push([0.0, 0.0]);
            Renderer.actualizarEscena();
            Renderer.animarCurva();
        });

        document.getElementById('inputs-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-input')) {
                state.points.splice(parseInt(e.target.dataset.index), 1);
                Renderer.actualizarEscena(); 
                Renderer.animarCurva();

                Interactor.ejecutarSincronizacionCompleta();
            }
        });

        document.getElementById('btn-submit-manual').addEventListener('click', () => {
            const rows = document.querySelectorAll('.point-input-row');
            const nuevosPuntos = [];
            rows.forEach(row => {
                const xVal = parseFloat(row.querySelector('.x-in').value) || 0;
                const yVal = parseFloat(row.querySelector('.y-in').value) || 0;
                nuevosPuntos.push([xVal, yVal]);
            });
            state.points = nuevosPuntos;
            Renderer.actualizarEscena();
            Renderer.animarCurva();
            Interactor.ejecutarSincronizacionCompleta();
        });

        // Reajustar coordenadas si cambia el tamaño de la ventana del navegador
        window.addEventListener('resize', () => Renderer.ajustarCamaraEspacio());

                document.getElementById('t-slider').addEventListener('input', e => {
            state.t =
                parseFloat(e.target.value);

            document
                .getElementById('t-value')
                .textContent =
                    state.t.toFixed(2);

            Renderer.dibujarPuntoT();

        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Renderer.ajustarCamaraEspacio();
    Renderer.actualizarEscena();
    Interactor.registrarEventos();
    Interactor.ejecutarSincronizacionCompleta();
});
