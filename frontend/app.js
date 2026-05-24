/**
 * SISTEMA INTERACTIVO CLARO DE POLINOMIOS DE BERNSTEIN IN R²
 * Soporte para Ejes con Números y Plano Movible (Pan & Zoom)
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
    
    // Configuración inicial de la cámara de la pantalla movible
    panX: 0,
    panY: 0,
    zoom: 40, // Pixels por unidad matemática
    isPanning: false,
    startX: 0,
    startY: 0
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
        for (let k = 0; k <= 150; k++) {
            const t = k / 150;
            let x = 0, y = 0;
            for (let i = 0; i <= n; i++) {
                const b = MathUtils.polinomioBernstein(i, n, t);
                x += puntos[i][0] * b; y += puntos[i][1] * b;
            }
            trayectoria.push([x, y]);
        }
        return trayectoria;
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
            y: cy - mathY * state.zoom // Invertimos Y para la pantalla
        };
    },

    ajustarCamaraEspacio: () => {
        // Quitamos el transform CSS problemático
        viewGroup.removeAttribute('transform');
        Renderer.actualizarEjesYNumeros();
        Renderer.actualizarEscena(); // Obligatorio para mover las curvas al hacer pan/zoom
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
                text.setAttribute('y', origin.y + 15); // Desplazamiento fijo en px
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

    dibujarNodosControl: () => {
        const container = document.getElementById('control-points');
        container.innerHTML = '';
        state.points.forEach((p, idx) => {
            const s = Renderer.toScreen(p[0], p[1]);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', s.x);
            circle.setAttribute('cy', s.y);
            circle.setAttribute('r', 8); // Radio de 8px fijos en pantalla (sin dividir por zoom)
            circle.setAttribute('class', 'control-node'); 
            circle.dataset.index = idx;
            container.appendChild(circle);
        });
    },

    actualizarFormularioInputsManuales: () => {
        const container = document.getElementById('inputs-container');
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
    },

    mostrarDatosBackend: (data) => {
        if (!data) return;
        document.getElementById('matplotlib-render').src = data.plot_img;
        const outputElement = document.getElementById('math-output');
        outputElement.innerHTML = `
            $$B_x(t) = ${data.latex.Bx}$$
            $$B_y(t) = ${data.latex.By}$$
        `;
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

        svgElement.addEventListener('mousedown', (e) => {
            const target = e.target;
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
                Interactor.ejecutarSincronizacionCompleta();
            }
        });

        svgElement.addEventListener('mousemove', (e) => {
            if (state.draggedIndex !== null) {
                const coord = Interactor.convertirPantallaAEspacio(e.clientX, e.clientY);
                state.points[state.draggedIndex] = [coord.x, coord.y];
                Renderer.actualizarEscena();
            } else if (state.isPanning) {
                // Mover pantalla relocalizando el foco de la escena
                state.panX = Math.round(e.clientX - state.startX);
                state.panY = Math.round(e.clientY - state.startY);
                Renderer.ajustarCamaraEspacio();
            }
        });

        window.addEventListener('mouseup', () => {
            if (state.draggedIndex !== null) {
                state.draggedIndex = null;
                Interactor.ejecutarSincronizacionCompleta();
            }
            if (state.isPanning) state.isPanning = false;
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
        });

        document.getElementById('inputs-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-input')) {
                state.points.splice(parseInt(e.target.dataset.index), 1);
                Renderer.actualizarEscena(); Interactor.ejecutarSincronizacionCompleta();
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
            Interactor.ejecutarSincronizacionCompleta();
        });

        // Reajustar coordenadas si cambia el tamaño de la ventana del navegador
        window.addEventListener('resize', () => Renderer.ajustarCamaraEspacio());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Renderer.ajustarCamaraEspacio();
    Renderer.actualizarEscena();
    Interactor.registrarEventos();
    Interactor.ejecutarSincronizacionCompleta();
});