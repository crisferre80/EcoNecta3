import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, Calendar, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Estructura para la celda de la grilla
interface GridAdCell {
  id: string;
  ad_id: string | null;
  size: string;
  row: number;
  col: number;
  custom_label?: string;
  bg_color?: string;
  advertisement?: {
    id: string;
    title: string;
    image_url: string;
    link?: string;
    active: boolean;
    created_at: string;
  } | null;
}


const Home: React.FC = () => {
  const [gridAds, setGridAds] = useState<GridAdCell[]>([]);
  const [currentAd, setCurrentAd] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGridAds();
  }, []);

  const fetchGridAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads_grid')
        .select(`*, advertisement:ad_id (id, title, image_url, link, active, created_at)`)
        .order('row', { ascending: true })
        .order('col', { ascending: true });
      if (error) throw error;
      setGridAds(data);
    } catch (err) {
      console.error('Error fetching grid ads:', err);
    }
  };

  // Carrusel automático solo en mobile
  useEffect(() => {
    const activeAds = gridAds.filter(cell => cell.advertisement && cell.advertisement.active);
    if (window.innerWidth < 640 && activeAds.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentAd((prev) => (prev + 1) % activeAds.length);
      }, 4000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setCurrentAd(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return undefined;
  }, [gridAds]);

  // Swipe manual (opcional, solo mobile)
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const activeAds = gridAds.filter(cell => cell.advertisement && cell.advertisement.active);
    if (touchStartX.current === null || activeAds.length === 0) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) setCurrentAd((prev) => (prev + 1) % activeAds.length);
      else setCurrentAd((prev) => (prev - 1 + activeAds.length) % activeAds.length);
    }
    touchStartX.current = null;
  };

  // Sponsors Section
  const activeAds = gridAds.filter(cell => cell.advertisement && cell.advertisement.active);

  // Sincroniza currentAd si cambia la cantidad de publicidades activas
  useEffect(() => {
    if (currentAd >= activeAds.length) setCurrentAd(0);
  }, [activeAds.length, currentAd]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-green-600 text-white">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div 
          className="relative h-[600px] bg-cover bg-center flex items-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80')" }}
        >
          <div className="max-w-7xl mx-auto px-10 sm:px-6 lg:px-8 py-24">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Conectando recicladores con comunidades sostenibles</h1>
              <p className="text-xl mb-8">
                Facilitamos la conexión entre recicladores urbanos y residentes que clasifican sus residuos, 
                creando un ecosistema de reciclaje más eficiente y humano.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="bg-white text-green-600 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition">
                  Registrarse
                </Link>
                <Link to="/login" className="bg-green-700 text-white px-6 py-3 rounded-md font-medium hover:bg-green-800 transition relative animate-glow focus:outline-none focus:ring-4 focus:ring-green-300">
                  <span className="absolute inset-0 rounded-md pointer-events-none glow-effect"></span>
                  Ingresar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video institucional */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-green-700 mb-6">Que es el Reciclado en 1 minuto</h2>
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-lg">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/G3Vlm8abEfc"
              title="Video institucional Econecta2"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Cómo funciona?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nuestra plataforma conecta a recicladores urbanos con residentes que separan sus residuos, 
              creando un sistema más eficiente y beneficioso para todos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Regístrate</h3>
              <p className="text-gray-600">
                Crea tu perfil como reciclador urbano o como residente que separa sus residuos.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Conecta</h3>
              <p className="text-gray-600">
                Los residentes registran sus puntos de recolección y los recicladores pueden encontrarlos fácilmente.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Coordina</h3>
              <p className="text-gray-600">
                Establece horarios de recolección y mantén un registro de tus actividades de reciclaje.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Beneficios</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nuestra plataforma ofrece ventajas tanto para recicladores urbanos como para residentes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold text-green-600 mb-4">Para Recicladores</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Acceso a una red de puntos de recolección verificados</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Mayor eficiencia en rutas de recolección</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Perfil visible para la comunidad</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Reconocimiento por su labor ambiental</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold text-green-600 mb-4">Para Residentes</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Contribución directa al medio ambiente</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Gestión adecuada de residuos reciclables</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Horarios de recolección coordinados</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span>Apoyo a la economía circular local</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      {activeAds.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center mb-12">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" fill="#bbf7d0" />
                    <path d="M8 12l2 2 4-4" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </span>
                <h2 className="text-3xl font-bold text-gray-900">Nuestros Auspiciantes</h2>
              </div>
              <p className="text-green-700 text-lg font-medium text-center max-w-2xl">Gracias a estas empresas y organizaciones que apoyan la economía circular y el reciclaje urbano.</p>
              <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-green-700 rounded-full mt-4 mb-2"></div>
            </div>
            {/* Mobile: Carrusel */}
            <div className="block sm:hidden">
              {activeAds.length > 0 && (
                <div
                  className="relative overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{ minHeight: 320 }}
                >
                  {activeAds.map((cell, idx) => (
                    <div
                      key={cell.id}
                      className={`absolute top-0 left-0 w-full transition-transform duration-700 ease-in-out ${idx === currentAd ? 'translate-x-0 opacity-100 z-10' : idx < currentAd ? '-translate-x-full opacity-0 z-0' : 'translate-x-full opacity-0 z-0'}`}
                      style={{ pointerEvents: idx === currentAd ? 'auto' : 'none' }}
                    >
                      <div className="group bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg border border-green-100 overflow-hidden flex flex-col mx-auto max-w-xs">
                        <div className="flex-1 flex items-center justify-center bg-gray-50 p-6" style={{ minHeight: '180px' }}>
                          <img
                            src={cell.advertisement!.image_url}
                            alt={cell.advertisement!.title}
                            className="object-contain max-h-40 w-full rounded-lg shadow-sm bg-white"
                            style={{
                              height: cell.size === '2x2' ? '220px' : cell.size === '2x1' ? '160px' : cell.size === '1x2' ? '120px' : '100px',
                            }}
                          />
                        </div>
                        <div className="p-5 flex flex-col items-center">
                          <h3 className="font-semibold text-lg text-green-800 mb-2 text-center group-hover:text-green-600 transition">{cell.custom_label || cell.advertisement!.title}</h3>
                          {cell.advertisement!.link && (
                            <a
                              href={cell.advertisement!.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block px-4 py-2 rounded-full bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
                            >
                              Más información
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Indicadores */}
                  <div className="flex justify-center gap-2 mt-4">
                    {activeAds.map((_, idx) => (
                      <button
                        key={idx}
                        className={`w-3 h-3 rounded-full ${idx === currentAd ? 'bg-green-600' : 'bg-green-200'}`}
                        onClick={() => setCurrentAd(idx)}
                        aria-label={`Ir al anuncio ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Desktop: grilla */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {activeAds.map((cell) => (
                <div
                  key={cell.id}
                  className="group bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg border border-green-100 overflow-hidden flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-2xl"
                  style={{ backgroundColor: cell.bg_color || undefined }}
                >
                  <div className="flex-1 flex items-center justify-center bg-gray-50 p-6" style={{ minHeight: '180px' }}>
                    <img
                      src={cell.advertisement!.image_url}
                      alt={cell.advertisement!.title}
                      className="object-contain max-h-40 w-full rounded-lg shadow-sm bg-white"
                      style={{
                        height: cell.size === '2x2' ? '220px' : cell.size === '2x1' ? '160px' : cell.size === '1x2' ? '120px' : '100px',
                      }}
                    />
                  </div>
                  <div className="p-5 flex flex-col items-center">
                    <h3 className="font-semibold text-lg text-green-800 mb-2 text-center group-hover:text-green-600 transition">{cell.custom_label || cell.advertisement!.title}</h3>
                    {cell.advertisement!.link && (
                      <a
                        href={cell.advertisement!.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block px-4 py-2 rounded-full bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
                      >
                        Más información
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Únete a nuestra comunidad de reciclaje</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Sé parte del cambio. Juntos podemos crear un sistema de reciclaje más eficiente y humano.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/register" className="bg-white text-green-600 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition">
              Registrarse ahora
            </Link>
            <Link to="/collection-points" className="bg-green-700 text-white px-6 py-3 rounded-md font-medium hover:bg-green-800 border border-white transition">
              Explorar puntos de recolección
            </Link>
            {/* Acceso Admin solo si está logueado como admin */}
            {window.localStorage.getItem('eco_user_email') === 'cristianferreyra8076@gmail.com' && (
              <Link to="/admin-panel" className="bg-yellow-400 text-green-900 px-6 py-3 rounded-md font-bold hover:bg-yellow-500 transition flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Acceso Administrador
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Animación de luz para el botón Ingresar */}
      <style>
      {`
        @keyframes glow {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          50% { box-shadow: 0 0 16px 8px rgba(34,197,94,0.4); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
        }
        .animate-glow {
          animation: glow 2s infinite;
        }
        .glow-effect {
          box-shadow: 0 0 16px 4px rgba(34,197,94,0.4);
          opacity: 0.7;
          z-index: 0;
          animation: glow 2s infinite;
        }
      `}
      </style>
    </div>
  );
};

export default Home;