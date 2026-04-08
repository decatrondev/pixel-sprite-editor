import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function Landing() {
  const { user } = useAuthStore();

  return (
    <div>
      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            Crea sprites y <span className="text-indigo-600">pixel art</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Editor completo para crear hojas de sprites con configuraciones JSON y pixel art con animaciones frame a frame.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/editor" className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl">
              Editor de Sprites
            </Link>
            <Link to="/pixelart" className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-medium border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition">
              Editor Pixel Art
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Herramientas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Hojas de Sprites', desc: 'Carga una imagen, define una grilla y genera configuraciones JSON compatibles con game engines.', color: 'indigo' },
              { title: 'Pixel Art Editor', desc: 'Crea pixel art desde cero con herramientas de dibujo, paletas predefinidas y soporte de animación.', color: 'purple' },
              { title: 'Animaciones', desc: 'Define animaciones seleccionando frames, configura velocidad y previsualiza en tiempo real.', color: 'blue' },
              { title: 'Paletas de Color', desc: 'Paletas predefinidas (GameBoy, NES, C64) o crea las tuyas. Importa y exporta en JSON.', color: 'green' },
              { title: 'Exportar', desc: 'Exporta como PNG escalado, spritesheet, ZIP con todos los frames, o JSON de configuracion.', color: 'orange' },
              { title: 'Proyectos', desc: 'Guarda tus proyectos en la nube, cargalos en cualquier momento y continua donde lo dejaste.', color: 'red' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className={`w-10 h-10 rounded-lg bg-${f.color}-100 text-${f.color}-600 flex items-center justify-center text-lg font-bold mb-4`}>
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Empieza a crear</h2>
          <p className="text-indigo-100 mb-8">
            {user ? 'Abre el editor y comienza tu proximo proyecto.' : 'Registrate gratis y guarda tus proyectos.'}
          </p>
          {user ? (
            <Link to="/editor" className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition">
              Abrir Editor
            </Link>
          ) : (
            <Link to="/register" className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition">
              Crear Cuenta
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
