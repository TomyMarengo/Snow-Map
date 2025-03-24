export type AnomalyAlgorithm = 'GMM' | 'IsolationForest';

export const anomalyDescriptions: { [key in AnomalyAlgorithm]: string } = {
  GMM: `
En la detección de anomalías, **GMM** modela la distribución subyacente de los datos e **identifica puntos con bajas probabilidades** como anomalías. Este método es útil para capturar estructuras complejas en los datos, pero requiere una buena estimación del número de componentes y **asume que las subpoblaciones siguen una distribución normal**.

**Ventajas de GMM para Detección de Anomalías:**
- **Flexibilidad:** Captura distribuciones complejas.
- **Probabilístico:** Proporciona una medida de certeza sobre la pertenencia de los datos.

**Desventajas de GMM para Detección de Anomalías:**
- **Sensibilidad a Parámetros Iniciales:** El número de componentes y la inicialización pueden afectar el rendimiento.
- **Asunción de Normalidad:** Puede no ser adecuado si las subpoblaciones no siguen una distribución gaussiana.
`,
  IsolationForest: `
**Isolation Forest** es un algoritmo basado en árboles diseñado específicamente para la detección de anomalías. Funciona **construyendo múltiples árboles de aislamiento** que segmentan los datos de manera aleatoria. Las anomalías, al ser puntos menos frecuentes y más fáciles de aislar, tienden a tener **caminos más cortos** en estos árboles.

**Ventajas de Isolation Forest para Detección de Anomalías:**
- **Eficiencia Computacional:** Rápido y escalable para grandes conjuntos de datos.
- **No Paramétrico:** No asume ninguna distribución específica de los datos.
- **Efectivo para Diferentes Tipos de Anomalías:** Detecta tanto anomalías puntuales como grupales.

**Desventajas de Isolation Forest para Detección de Anomalías:**
- **Menos Interpretabilidad:** Proporciona principalmente puntajes de anomalía sin detalles sobre la naturaleza de la anomalía.
- **Dependencia de Parámetros:** La elección del número de árboles y la profundidad puede influir en el rendimiento.
`,
};

export type ClusteringAlgorithm = 'GMM' | 'KMeans';

export const clusteringDescriptions: { [key in ClusteringAlgorithm]: string } =
  {
    GMM: `
En el contexto de Clustering, **GMM** modela la distribución de los datos y asigna cada punto al componente gaussiano con la mayor probabilidad de pertenencia. Esto permite capturar clusters con formas elípticas y tamaños variados.

**Ventajas de GMM para Clustering:**
- **Flexibilidad en la Forma de los Clusters:** Puede identificar clusters de diferentes formas y tamaños.
- **Asignación Probabilística:** Proporciona una probabilidad de pertenencia para cada punto, permitiendo análisis más detallados.

**Desventajas de GMM para Clustering:**
- **Complejidad Computacional:** Puede ser más lento que otros algoritmos como KMeans.
- **Necesidad de Predefinir el Número de Componentes:** Requiere una estimación adecuada del número de clusters.
- **Asunción de Normalidad:** Los clusters deben seguir una distribución gaussiana, lo que puede no ser siempre el caso.
`,
    KMeans: `
**K-Means** es un algoritmo de Clustering no supervisado que particiona los datos en **K** clusters distintos. Funciona iterativamente asignando cada punto al cluster cuyo centro (centroid) está más cercano y luego recalculando los centroides como la media de los puntos asignados a cada cluster.

**Ventajas de KMeans para Clustering:**
- **Simplicidad y Rapidez:** Fácil de implementar y rápido en conjuntos de datos grandes.
- **Escalabilidad:** Funciona bien con grandes volúmenes de datos.

**Desventajas de KMeans para Clustering:**
- **Asunción de Forma Esférica de Clusters:** Tiende a identificar clusters de forma circular y tamaños similares.
- **Sensibilidad a la Inicialización de Centroides:** Diferentes inicializaciones pueden conducir a diferentes resultados.
- **Necesidad de Predefinir K:** Requiere especificar el número de clusters de antemano, lo que puede ser difícil de determinar.
`,
  };

export type DensityDataset = 'iris' | 'housing';

export const densityDescriptions: Record<DensityDataset, string> = {
  iris: `
El **Dataset de Iris** contiene **150 muestras** de flores con **4 características numéricas** (largo y ancho del sépalo y pétalo). 

El **análisis de densidad** evalúa cómo se distribuyen los datos en el espacio, identificando regiones de **alta** y **baja concentración**.  
En el dataset Iris:
- Las regiones de **alta densidad** corresponden a una de las tres especies de flores.
- Las zonas de **baja densidad** marcan las separaciones entre especies o puntos menos representativos.
  `,
  housing: `
El **Dataset de California Housing** contiene información sobre precios de viviendas en California, como la cantidad de habitaciones y el ingreso promedio de los habitantes.

El **análisis de densidad** evalúa cómo se distribuyen los datos en el espacio, identificando regiones de **alta** y **baja concentración**.  
En este dataset:
- Las regiones de **alta densidad** suelen representar propiedades con características comunes.
- Las regiones de **baja densidad** corresponden a propiedades con valores extremos o atípicos.
  `,
};

export type SegmentationDataset =
  | 'MNIST'
  | 'CIFAR10'
  | 'Upload'
  | 'Upload many';

export const segmentationDatasetDescription: Record<
  SegmentationDataset,
  string
> = {
  MNIST: `
- Contiene imágenes en escala de grises de dígitos escritos a mano.
- Cada imagen tiene una resolución de 28x28 píxeles.
- Utilizado comúnmente para tareas de clasificación y segmentación en visión por computadora.
- Ejemplo: Identificación de regiones en un dígito o separación de ruido en los bordes del dígito.
`,
  CIFAR10: `
- Contiene imágenes a color clasificadas en 10 categorías, como animales y vehículos.
- Cada imagen tiene una resolución de 32x32 píxeles.
- Utilizado para tareas más complejas debido a la variedad y riqueza de las clases.
- Ejemplo: Segmentación de regiones específicas en imágenes de objetos como automóviles o pájaros.
`,
  Upload: `
- Sube tu propia imagen para realizar segmentación.
- Asegúrate de que la imagen sea clara y tenga un tamaño razonable.
- La segmentación puede ayudar a identificar regiones de interés o separar objetos del fondo.
- Ejemplo: Segmentación de una imagen de paisaje para aislar el cielo, el agua y la tierra.
`,
  'Upload many': `
- Sube tu propia imagen para realizar segmentación.
- Asegúrate de que la imagen sea clara y tenga un tamaño razonable.
- La segmentación puede ayudar a identificar regiones de interés o separar objetos del fondo.
- Ejemplo: Segmentación de una imagen de paisaje para aislar el cielo, el agua y la tierra.
`,
};

export type SegmentationAlgorithm = 'GMM' | 'KMeans';

export const segmentationAlgorithmDescription: Record<
  SegmentationAlgorithm,
  string
> = {
  KMeans: `
**KMeans para Segmentación**

Agrupa píxeles en **K clusters** basándose en color o intensidad. Ideal para separar regiones de color uniforme o bordes claros.

**Ventajas**:
  - Rápido y fácil de implementar.
  - Funciona bien en imágenes con regiones claramente diferenciadas.

**Desventajas**:
  - Sensible a la inicialización y ruido.
  - No adecuado para distribuciones complejas.
`,
  GMM: `
**GMM para Segmentación**

Modela los píxeles con distribuciones gaussianas para clasificar regiones. Útil para imágenes con transiciones suaves o ruido.

**Ventajas**:
  - Captura distribuciones complejas.
  - Proporciona una segmentación probabilística.

**Desventajas**:
  - Computacionalmente más costoso que KMeans.
  - Requiere una estimación adecuada del número de clusters.
`,
};
