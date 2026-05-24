from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sympy as sp
from math import comb
from typing import List, Tuple
import numpy as np

# Configurar Matplotlib para trabajar en entornos sin interfaz gráfica (headless)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

app = FastAPI(title="Bernstein Symbolic Backend")

# Configuración estricta de CORS
app.add_middleware(
    CORSMiddleware,
    # Permite todas las URLs por ahora. 
    # Cuando tengas la URL final de tu frontend, cámbiala aquí por seguridad.
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PointsInput(BaseModel):
    points: List[Tuple[float, float]]

def bernstein(i, n, t):
    return comb(n, i) * (t ** i) * ((1 - t) ** (n - i))

def combinacion_lineal_vectorial(t, vectores_p):
    n = len(vectores_p) - 1
    x, y = 0, 0
    for i in range(n + 1):
        b = bernstein(i, n, t)
        x += vectores_p[i][0] * b
        y += vectores_p[i][1] * b
    return x, y

@app.post("/symbolic")
async def get_symbolic_expressions(data: PointsInput):
    vectores_control = data.points
    n = len(vectores_control) - 1
    
    if n < 0:
        return {"degree": 0, "Bx_expanded": "0", "By_expanded": "0", "latex": {"Bx": "0", "By": "0"}, "plot_img": ""}

    t = sp.Symbol('t')
    B_x = 0
    B_y = 0

    # 1. CÁLCULO SIMBÓLICO (Exactamente como index.py)
    for i, (px, py) in enumerate(vectores_control):
        coef_bin = comb(n, i)
        polinomio_base = coef_bin * (t**i) * ((1 - t)**(n - i))
        B_x += px * polinomio_base
        B_y += py * polinomio_base

    B_x_exp = sp.expand(B_x)
    B_y_exp = sp.expand(B_y)

    # 2. GENERACIÓN DEL GRÁFICO MATPLOTLIB (Adaptado del index.py original)
    t_values = np.linspace(0, 1, 1000)
    trayecto_x, trayecto_y = [], []
    for tv in t_values:
        vx, vy = combinacion_lineal_vectorial(tv, vectores_control)
        trayecto_x.append(vx)
        trayecto_y.append(vy)

    px_coords = [p[0] for p in vectores_control]
    py_coords = [p[1] for p in vectores_control]

    # Crear figura con estética oscura integrada
    plt.figure(figsize=(8, 5))
    plt.gcf().patch.set_facecolor('#161b22')
    ax = plt.gca()
    ax.set_facecolor('#070a0e')

    # Estilos del gráfico de tu index.py original
    plt.plot(px_coords, py_coords, 'ro--', alpha=0.6, label="Combinación polinómica estructural")
    plt.plot(trayecto_x, trayecto_y if 'trayecto_y' in locals() else trayecto_y, 'b', linewidth=2, label="Espacio generado B(t)")

    for i, p in enumerate(vectores_control):
        plt.text(p[0] + 0.1, p[1] + 0.1, f"P{i}({p[0]}, {p[1]})", fontsize=9, fontweight='bold', color='#c9d1d9')

    # Configuración de ejes y textos
    ax.tick_params(colors='#svgElement' if False else '#8b949e')
    ax.xaxis.label.set_color('#c9d1d9')
    ax.yaxis.label.set_color('#c9d1d9')
    ax.title.set_color('#58a6ff')
    
    plt.title("Transformación Lineal en R² (Matplotlib Backend)")
    plt.xlabel("Eje X")
    plt.ylabel("Eje Y")
    plt.grid(True, color='#30363d', linestyle='--')
    plt.legend(facecolor='#161b22', edgecolor='#30363d', labelcolor='#c9d1d9')
    plt.tight_layout()

    # Guardar gráfico en un buffer de memoria de bytes
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=120, facecolor=plt.gcf().get_facecolor())
    buf.seek(0)
    plt.close()

    # Codificar a Base64 string para mandarlo por JSON
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')

    return {
        "degree": n,
        "Bx_expanded": str(B_x_exp),
        "By_expanded": str(B_y_exp),
        "latex": {
            "Bx": sp.latex(B_x_exp),
            "By": sp.latex(B_y_exp)
        },
        "plot_img": f"data:image/png;base64,{img_base64}"
    }