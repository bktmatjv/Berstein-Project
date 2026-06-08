# 📊 Combinaciones Lineales en $\mathbb{R}^2$ — Base de Polinomios de Bernstein

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render">
</div>

---

## 🚀 Descripción del Proyecto

Este proyecto consiste en una aplicación **Fullstack Interactiva** diseñada para explorar, modelar y validar analíticamente las **Combinaciones Lineales en $\mathbb{R}^2$** utilizando la infraestructura matemática de la **Base de Polinomios de Bernstein**. 

El sistema permite manipular de forma dinámica un conjunto de puntos de control en un plano cartesiano interactivo. Mientras el usuario altera la geometría en el cliente, un backend especializado resuelve la expansión algebraica simbólica de las funciones paramétricas en tiempo real, garantizando precisión absoluta en todo el dominio continuo $t \in [0, 1]$.

---

## 🔗 Enlaces del Proyecto (Demos y Recursos)

* **⚡ Aplicación Web Desplegada (Demo):** [https://berstein-project.vercel.app/](https://berstein-project.vercel.app/)
* **📂 Repositorio Principal:** [https://github.com/bktmatjv/Berstein-Project](https://github.com/bktmatjv/Berstein-Project)
* **🔬 Entorno de Experimentación (Google Colab):** [Ver Cuaderno de Pruebas](https://colab.research.google.com/drive/143v2Snk3nfni_75loirTV2I3OMVnpND0?usp=sharing)
* **🗺️ Flujo Lógico del Sistema:** [Diagrama de Flujo en Canva](https://canva.link/099tqvqfw8oyzye)

---

## ✨ Características Principales

* **Plano Cartesiano SVG Interactivo:** Soporte nativo para arrastrar y soltar nodos (*Drag-and-Drop*), adición dinámica de puntos mediante clics y herramientas avanzadas de cámara fluida (*Pan & Zoom*).
* **Alineación Geométrica Antialiasing:** Los puntos de control cambian de forma y escala mediante transiciones elásticas premium, comportándose como imanes o "atractores" del espacio generado sin deformar el renderizado.
* **Procesamiento Simbólico en Tiempo Real:** El backend descompone los polinomios base y retorna las ecuaciones paramétricas expandidas $B_x(t)$ y $B_y(t)$, junto con la regla de correspondencia final simplificada en formato vectorial $B(t) = (X, Y)$.
* **Visualización Dual Sincronizada:** Doble validación en pantalla: un plano dinámico interactivo en el cliente y un gráfico estático analítico de alta precisión generado por el motor científico en Python.

---

## 🛠️ Arquitectura Tecnológica

### **Frontend (Capa Visual e Interacción)**
* **HTML5 & CSS3:** Diseño de interfaz *Premium SaaS* minimalista inspirado en Linear/Vercel. Implementación de aislamiento de contexto (`isolation: isolate`) para el control de capas profundas de iluminación neón.
* **Vanilla JavaScript:** Motor de traducción de coordenadas matemáticas a píxeles en pantalla con una escala variable de dibujo de 1:1, eliminando el difuminado Chromium clásico.
* **MathJax v3:** Renderizado tipográfico asíncrono de alta calidad para expresiones matemáticas complejas en formato $\LaTeX$.

### **Backend (Capa Científica y Computacional)**
* **FastAPI (Python):** Framework asíncrono de alto rendimiento para la exposición de endpoints REST optimizados con políticas estrictas de CORS.
* **SymPy:** Núcleo de computación algebraica simbólica encargado de expandir y simplificar las combinaciones polinómicas estructuradas.
* **NumPy & Matplotlib:** Generación headless de mapas vectoriales e interpolaciones numéricas de alta densidad para la exportación de matrices gráficas en Base64.

---

## 👥 Integrantes del Equipo — Grupo 2 (UPC)

El desarrollo del presente proyecto ha sido ejecutado de forma equitativa por estudiantes de la **Universidad Peruana de Ciencias Aplicadas**:

| Integrante |
| :--- | 
| **Matias Javier Del Castillo Mendoza** | 
| **Vanessa Jazmin** | 
| **Vivianne Fátima** | 
| **Nicole Abigail** | 

---

## 📐 Fundamento Teórico Resumido

Los polinomios de Bernstein de grado $n$ se definen algebraicamente mediante la distribución binomial:

$$B_{i,n}(t) =  inom{n}{i} t^i (1-t)^{n-i}$$

Donde $t \in [0,1]$. La curva paramétrica resultante $C(t)$ se construye a través de una combinación lineal de los vectores o puntos de control $P_i$ ponderados por sus respectivos polinomios base:

$$C(t) = \sum_{i=0}^{n} P_i B_{i,n}(t)$$

Gracias a las propiedades estructurales de **partición de la unidad** ($\sum B_{i,n}(t) = 1$) y **positividad** ($B_{i,n}(t) \geq 0$), la trayectoria geométrica calculada se mantiene estrictamente contenida dentro de la envoltura convexa del polígono de control, evitando oscilaciones caóticas y asegurando una suavidad perfecta, indispensable en la computación gráfica moderna, software CAD y diseño automotriz.

---
<div align="center">
  <sub>Universidad Peruana de Ciencias Aplicadas (UPC) • Álgebra Lineal Aplicada • 2026</sub>
</div>