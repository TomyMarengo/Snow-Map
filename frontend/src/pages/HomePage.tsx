// src/pages/HomePage.tsx

import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-screen-2xl">
        {/* Sección de Bienvenida */}
        <section className="mb-36">
          <h1 className="text-6xl font-bold text-center mb-4">Bienvenido!</h1>
          <p className="text-2xl text-gray-700 text-center">
            Explorá y aplicá <strong>Gaussian Mixture Models (GMM)</strong> para
            la <strong>Detección de Anomalías</strong>,{' '}
            <strong>Clustering</strong> y más.
          </p>
        </section>

        {/* Sección sobre GMM */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-6 text-center ">
            ¿Qué es Gaussian Mixture Models (GMM)?
          </h2>
          <p className="text-xl text-gray-800 mb-4 text-center">
            <strong>{'Gaussian Mixture Models (GMM)'}</strong> es un modelo
            probabilístico que representa una combinación de múltiples
            distribuciones gaussianas para modelar conjuntos de datos complejos.
            Cada componente gaussiano en el modelo representa una subpoblación
            dentro de los datos, permitiendo una mayor flexibilidad en
            comparación con modelos de distribución única.
          </p>
        </section>

        {/* Sección de Funcionalidades de la Plataforma */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-6 text-center">
            ¿Qué Podés Hacer en Esta Plataforma?
          </h2>
          <ul className="list-inside text-base text-gray-800 text-center list-none flex gap-3">
            <li>
              <div className="text-xl font-bold mb-2">Clustering</div>
              <div className="text-lg">
                Explorá diferentes algoritmos de clustering como GMM y KMeans
                para agrupar tus datos.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">
                Detección de Anomalías
              </div>
              <div className="text-lg">
                Utilizá técnicas avanzadas como Isolation Forest y GMM para
                identificar datos atípicos.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">Modelado de Densidad</div>
              <div className="text-lg">
                Analizá la densidad de tus datos para comprender mejor su
                distribución.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">
                Segmentación de Imágenes
              </div>
              <div className="text-lg">
                Aplicá algoritmos de clustering para segmentar imágenes de
                manera efectiva.
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
