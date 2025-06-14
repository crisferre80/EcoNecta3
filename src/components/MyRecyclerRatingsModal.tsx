import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star } from 'lucide-react';

interface MyRecyclerRatingsModalProps {
  open: boolean;
  onClose: () => void;
  recyclerId: string;
  recyclerName?: string;
  avatarUrl?: string;
}

interface Rating {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater_id: string;
  resident: {
    name?: string;
    avatar_url?: string;
  };
}

const MyRecyclerRatingsModal: React.FC<MyRecyclerRatingsModalProps> = ({ open, onClose, recyclerId, recyclerName, avatarUrl }) => {
  // const { user } = useUser();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [average, setAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !recyclerId) return;
    setLoading(true);
    setError(null);
    console.log('[MyRecyclerRatingsModal] Buscando calificaciones SOLO para recyclerId:', recyclerId);
    (async () => {
      const profileId = recyclerId;
      const { data, error: fetchError } = await supabase
        .from('recycler_ratings')
        .select('id, rating, comment, created_at, rater_id, recycler_id')
        .eq('recycler_id', profileId)
        .order('created_at', { ascending: false });
      if (fetchError) {
        setError('Error al cargar calificaciones.');
        setRatings([]);
        setAverage(null);
        setLoading(false);
        return;
      }
      console.log('[MyRecyclerRatingsModal] Resultados fetch por recycler_id:', data);
      const raterIds = (data || []).map(r => r.rater_id).filter(Boolean);
      let profilesById: Record<string, { name?: string; avatar_url?: string }> = {};
      if (raterIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', raterIds);
        if (!profilesError && profilesData) {
          profilesById = profilesData.reduce((acc, p) => {
            acc[p.id] = { name: p.name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { name?: string; avatar_url?: string }>);
        }
      }
      const fixedData: Rating[] = (data || []).map((r) => ({
        ...r,
        rating: typeof r.rating === 'string' ? parseFloat(r.rating) : r.rating,
        resident: profilesById[r.rater_id] || {},
      }));
      setRatings(fixedData);
      if (fixedData.length > 0) {
        const avg = fixedData.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 0), 0) / fixedData.length;
        setAverage(avg);
      } else {
        setAverage(null);
      }
      setLoading(false);
    })();
  }, [open, recyclerId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full flex flex-col items-center relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl font-bold" onClick={onClose} aria-label="Cerrar modal">×</button>
        {/* Avatar y nombre */}
        <div className="w-20 h-20 rounded-full overflow-hidden mb-2 flex items-center justify-center bg-gray-200 border-2 border-green-600">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-gray-400">👤</span>
          )}
        </div>
        <h2 className="text-xl font-bold text-green-700 mb-1">{recyclerName || 'Reciclador'}</h2>
        <div className="text-sm text-gray-500 mb-2">Calificaciones recibidas</div>
        {average !== null && (
          <div className="flex items-center mb-2">
            <Star className="h-5 w-5 text-yellow-400 mr-1" />
            <span className="font-medium text-lg">{average.toFixed(1)}</span>
            <span className="ml-2 text-gray-400 text-sm">({ratings.length})</span>
          </div>
        )}
        <div className="w-full mt-2 max-h-72 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-center">Cargando calificaciones...</p>
          ) : error ? (
            <p className="text-red-600 text-center">{error}</p>
          ) : ratings.length === 0 ? (
            <p className="text-gray-500 text-center">Aún no tienes calificaciones.</p>
          ) : (
            <ul className="space-y-4">
              {ratings.map(r => (
                <li key={r.id} className="border-b pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {r.resident?.avatar_url ? (
                        <img src={r.resident.avatar_url} alt="Residente" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg text-gray-400">👤</span>
                      )}
                    </div>
                    <span className="font-semibold text-green-700 text-sm">{r.resident?.name || 'Residente'}</span>
                    <span className="flex items-center ml-2 text-yellow-500 text-sm">
                      {[...Array(r.rating)].map((_, i) => <Star key={i} className="h-4 w-4" fill="#facc15" />)}
                    </span>
                  </div>
                  <div className="text-gray-700 text-sm mb-1">{r.comment || <span className="italic text-gray-400">Sin comentario</span>}</div>
                  <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRecyclerRatingsModal;
