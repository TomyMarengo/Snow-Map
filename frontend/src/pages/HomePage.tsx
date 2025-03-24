// src/pages/HomePage.tsx

import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-screen-2xl">
        {/* Welcome Section */}
        <section className="mb-36">
          <h1 className="text-6xl font-bold text-center mb-4">¡Bienvenido!</h1>
          <p className="text-2xl text-gray-700 text-center">
            Explorá y analizá <strong>cambios en la cobertura de nieve</strong>{' '}
            a lo largo del tiempo usando
            <strong> imágenes satelitales</strong> y{' '}
            <strong>datos climáticos</strong>.
          </p>
        </section>

        {/* About Snow Map Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-6 text-center">
            ¿Qué es Snow Map?
          </h2>
          <p className="text-xl text-gray-800 mb-4 text-center">
            <strong>Snow Map</strong> es una herramienta que permite analizar la
            evolución de la cobertura de nieve en regiones montañosas utilizando
            imágenes satelitales. Nuestra plataforma procesa datos de diversas
            fuentes para proporcionar información detallada sobre cambios en la
            nieve a lo largo del tiempo.
          </p>
        </section>

        {/* Platform Features Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold mb-6 text-center">
            ¿Qué Podés Hacer en Esta Plataforma?
          </h2>
          <ul className="list-inside text-base text-gray-800 text-center list-none flex gap-3">
            <li>
              <div className="text-xl font-bold mb-2">Seleccionar Áreas</div>
              <div className="text-lg">
                Dibujá polígonos en el mapa para definir áreas específicas de
                interés para analizar.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">Analizar Tendencias</div>
              <div className="text-lg">
                Visualizá cómo cambia la cobertura de nieve a lo largo de
                diferentes años y estaciones.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">
                Ver Imágenes Satelitales
              </div>
              <div className="text-lg">
                Accedé a imágenes de satélite que muestran la cobertura de nieve
                en diferentes fechas.
              </div>
            </li>
            <li>
              <div className="text-xl font-bold mb-2">Exportar Datos</div>
              <div className="text-lg">
                Descargá los datos para realizar análisis más detallados en tus
                propias herramientas.
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
