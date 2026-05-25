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
    # Permite todas las URLs 
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
        return {"degree": 0, "latex": {"basis": [], "Bx_raw": "0", "By_raw": "0", "Bx": "0", "By": "0"}, "plot_img": ""}

    t = sp.Symbol('t')
    B_x = 0
    B_y = 0

    basis_latex = []
    terms_x = []
    terms_y = []

    # 1. CÁLCULO SIMBÓLICO Y EXTRACCIÓN DE PASOS
    for i, (px, py) in enumerate(vectores_control):
        coef_bin = comb(n, i)
        polinomio_base = coef_bin * (t**i) * ((1 - t)**(n - i))
        
        # Guardar el polinomio de Bernstein individual
        poly_latex = sp.latex(polinomio_base)
        basis_latex.append(f"B_{{{i},{n}}}(t) = {poly_latex}")

        # Construir la expresión sin simplificar (evitamos meter términos multiplicados por 0)
        if px != 0:
            terms_x.append(f"{px} \\cdot \\left[ {poly_latex} \\right]")
        if py != 0:
            terms_y.append(f"{py} \\cdot \\left[ {poly_latex} \\right]")

        B_x += px * polinomio_base
        B_y += py * polinomio_base

    B_x_exp = sp.expand(B_x)
    B_y_exp = sp.expand(B_y)

    unexpanded_x = " + ".join(terms_x).replace("+ -", "- ") if terms_x else "0"
    unexpanded_y = " + ".join(terms_y).replace("+ -", "- ") if terms_y else "0"

    # 2. GENERACIÓN DEL GRÁFICO MATPLOTLIB 
    t_values = np.linspace(0, 1, 1000)
    trayecto_x, trayecto_y = [], []
    for tv in t_values:
        vx, vy = combinacion_lineal_vectorial(tv, vectores_control)
        trayecto_x.append(vx)
        trayecto_y.append(vy)

    px_coords = [p[0] for p in vectores_control]
    py_coords = [p[1] for p in vectores_control]

    plt.figure(figsize=(8, 5))
    plt.gcf().patch.set_facecolor('#161b22')
    ax = plt.gca()
    ax.set_facecolor('#070a0e')

    plt.plot(px_coords, py_coords, 'ro--', alpha=0.6, label="Combinación polinómica estructural")
    plt.plot(trayecto_x, trayecto_y, 'b', linewidth=2, label="Espacio generado B(t)")

    for i, p in enumerate(vectores_control):
        plt.text(p[0] + 0.1, p[1] + 0.1, f"P{i}({p[0]}, {p[1]})", fontsize=9, fontweight='bold', color='#c9d1d9')

    ax.tick_params(colors='#8b949e')
    ax.xaxis.label.set_color('#c9d1d9')
    ax.yaxis.label.set_color('#c9d1d9')
    ax.title.set_color('#58a6ff')
    
    plt.title("Transformación Lineal en R² (Matplotlib Backend)")
    plt.xlabel("Eje X")
    plt.ylabel("Eje Y")
    plt.grid(True, color='#30363d', linestyle='--')
    plt.legend(facecolor='#161b22', edgecolor='#30363d', labelcolor='#c9d1d9')
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=120, facecolor=plt.gcf().get_facecolor())
    buf.seek(0)
    plt.close()

    img_base64 = base64.b64encode(buf.read()).decode('utf-8')

    return {
        "degree": n,
        "latex": {
            "basis": basis_latex,
            "Bx_raw": unexpanded_x,
            "By_raw": unexpanded_y,
            "Bx": sp.latex(B_x_exp),
            "By": sp.latex(B_y_exp)
        },
        "plot_img": f"data:image/png;base64,{img_base64}"
    }


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"healthy": True}