import React, { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, Package, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import 'chart.js/auto';

interface EstadisticasPanelProps {
  userId: string;
}

type Stats = {
  months: string[];
  createdByMonth: Record<string, number>;
  claimsByStatus: {
    claimed: Record<string, number>;
    completed: Record<string, number>;
    cancelled: Record<string, number>;
    delayed: Record<string, number>;
  };
  bultosByMonth: Record<string, number>;
};

const EstadisticasPanel: React.FC<EstadisticasPanelProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Puntos creados por mes SOLO del usuario
        const { data: createdPoints } = await supabase
          .from('collection_points')
          .select('id, created_at, user_id, status')
          .eq('user_id', userId);
        // Reclamos por mes y estado SOLO del usuario
        const { data: claims } = await supabase
          .from('collection_claims')
          .select('id, created_at, status, completed_at, cancelled_at')
          .eq('user_id', userId);
        const now = new Date();
        const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }).reverse();
        // Puntos creados por mes
        const createdByMonth: Record<string, number> = {};
        (createdPoints || []).forEach(p => {
          const m = p.created_at?.slice(0, 7);
          if (m) createdByMonth[m] = (createdByMonth[m] || 0) + 1;
        });
        // Reclamos por estado y mes
        const claimsByStatus: {
          claimed: Record<string, number>;
          completed: Record<string, number>;
          cancelled: Record<string, number>;
          delayed: Record<string, number>;
        } = {
          claimed: {}, completed: {}, cancelled: {}, delayed: {}
        };
        (claims || []).forEach(c => {
          const m = c.created_at?.slice(0, 7);
          if (c.status === 'claimed') claimsByStatus.claimed[m] = (claimsByStatus.claimed[m] || 0) + 1;
          if (c.status === 'completed') claimsByStatus.completed[m] = (claimsByStatus.completed[m] || 0) + 1;
          if (c.status === 'cancelled') claimsByStatus.cancelled[m] = (claimsByStatus.cancelled[m] || 0) + 1;
          if (c.status === 'delayed') claimsByStatus.delayed[m] = (claimsByStatus.delayed[m] || 0) + 1;
        });
        // Bultos por mes (igual a completed)
        const bultosByMonth = { ...claimsByStatus.completed };
        setStats({ months, createdByMonth, claimsByStatus, bultosByMonth });
        setError(null);
      } catch {
        setError('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (loading) return <div className="text-center text-green-700">Cargando estadísticas...</div>;
  if (error) return <div className="text-center text-red-600">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="text-xl font-bold text-green-700 mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Puntos y Reclamos por Mes</h2>
        <Bar
          data={{
            labels: stats.months,
            datasets: [
              {
                label: 'Puntos Creados',
                data: stats.months.map((m: string) => stats.createdByMonth[m] || 0),
                backgroundColor: '#34d399',
              },
              {
                label: 'Reclamados',
                data: stats.months.map((m: string) => stats.claimsByStatus.claimed[m] || 0),
                backgroundColor: '#60a5fa',
              },
              {
                label: 'Retirados',
                data: stats.months.map((m: string) => stats.claimsByStatus.completed[m] || 0),
                backgroundColor: '#a78bfa',
              },
              {
                label: 'Cancelados',
                data: stats.months.map((m: string) => stats.claimsByStatus.cancelled[m] || 0),
                backgroundColor: '#fbbf24',
              },
              {
                label: 'Demorados',
                data: stats.months.map((m: string) => stats.claimsByStatus.delayed[m] || 0),
                backgroundColor: '#f472b6',
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' as const } },
            scales: { y: { beginAtZero: true } },
          }}
          height={300}
        />
      </div>
      <div className="bg-white rounded-xl p-6 shadow flex flex-col items-center">
        <h2 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2"><Package className="w-5 h-5" /> Proporción de Reclamos</h2>
        <Doughnut
          data={{
            labels: ['Reclamados', 'Retirados', 'Cancelados', 'Demorados'],
            datasets: [
              {
                data: [
                  (Object.values(stats.claimsByStatus.claimed) as number[]).reduce((a, b) => a + b, 0),
                  (Object.values(stats.claimsByStatus.completed) as number[]).reduce((a, b) => a + b, 0),
                  (Object.values(stats.claimsByStatus.cancelled) as number[]).reduce((a, b) => a + b, 0),
                  (Object.values(stats.claimsByStatus.delayed) as number[]).reduce((a, b) => a + b, 0),
                ],
                backgroundColor: ['#60a5fa', '#a78bfa', '#fbbf24', '#f472b6'],
              },
            ],
          }}
          options={{ responsive: true, plugins: { legend: { position: 'bottom' as const } } }}
          width={300}
          height={300}
        />
      </div>
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="text-xl font-bold text-purple-700 mb-2 flex items-center gap-2"><Star className="w-5 h-5" /> Bultos Retirados por Mes</h2>
        <Bar
          data={{
            labels: stats.months,
            datasets: [
              {
                label: 'Bultos Retirados',
                data: stats.months.map((m: string) => stats.bultosByMonth[m] || 0),
                backgroundColor: '#a78bfa',
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' as const } },
            scales: { y: { beginAtZero: true } },
          }}
          height={300}
        />
      </div>
    </div>
  );
};

export default EstadisticasPanel;
