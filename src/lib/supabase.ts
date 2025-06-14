import { createClient } from '@supabase/supabase-js';
import { ReactNode } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  user_id: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  type: 'resident' | 'recycler';
  avatar_url?: string;
  online?: boolean;
  materials?: string[];
  bio?: string;
  experience_years?: number;
  service_areas?: string[];
  dni?: string; // <-- Agregado para permitir el uso de dni
}

export type CollectionPoint = {
  creator_dni: string | undefined;
  additional_info: unknown;
  user_id: string;
  recycler_id: string;
  lng: number;
  lat: number;
  estimated_weight: number;
  cancellation_reason: string | null;
  cancelled_at: string | null; // ISO date string or null if not cancelled
  completed_at: string | null; // ISO date string or null if not completed
  profiles: User;
  creator_email: string;
  creator_name: ReactNode;
  creator_avatar: string | undefined;
  claimed_by: string;
  id: string;
  address: string;
  district: string;
  materials: string[];
  schedule: string;
  status: string;
  claim_id?: string | null; // <-- usa claim_id
  claim_status?: string; // <-- Agregado para el estado real del claim
  pickup_time?: string | null;
  pickup_extra?: string | null; // Nuevo campo agregado
  // otros campos...
};

export interface RecyclerProfile {
  online: boolean;
  id: string;
  user_id: string;
  materials: string[];
  service_areas: string[];
  bio?: string;
  experience_years?: number;
  rating_average: number;
  total_ratings: number;
  profiles: {
    name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface CollectionClaim {
  id: string;
  collection_point_id: string;
  recycler_id: string;
  status: 'claimed' | 'completed' | 'cancelled' | 'failed';
  claimed_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  pickup_time?: string; // Added for countdown timer
}

export async function signUpUser(email: string, password: string, userData: Partial<User> & { dni?: string }) {
  try {
    // Intenta crear el usuario en Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          type: userData.type,
        }
      }
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Failed to create user');

    // Verifica si ya existe un perfil por user_id
    const { data: profileById } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (profileById) {
      return { data: { ...authData, profile: profileById }, error: null };
    }

    // Verifica si ya existe un perfil por email
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (profileByEmail) {
      // Si existe, actualiza el user_id si es necesario
      if (!profileByEmail.user_id) {
        await supabase.from('profiles').update({ user_id: authData.user.id }).eq('email', email);
      }
      return { data: { ...authData, profile: { ...profileByEmail, user_id: authData.user.id } }, error: null };
    }

    // Si no existe, crea el perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        user_id: authData.user.id,
        email: email,
        name: userData.name,
        role: userData.type,
        dni: userData.dni, // dni is now explicitly typed
      }])
      .select()
      .single();

    if (profileError || !profile) {
      // Si falla la creación del perfil, elimina el usuario Auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError || new Error('Failed to create profile');
    }

    // Solo devuelve éxito si el perfil se creó correctamente
    return { data: { ...authData, profile }, error: null };
  } catch (error: unknown) {
    console.error('SignUp error:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    // Sign in user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      if (signInError.message === 'Invalid login credentials') {
        throw new Error('Invalid login credentials');
      }
      throw signInError;
    }

    if (!authData.user) throw new Error('Failed to sign in');

    // Get profile by user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile) {
      // Map role to type for consistency with the User interface
      return {
        data: authData,
        profile: { ...profile, type: profile.role }
      };
    }

    // Si no existe perfil por user_id, busca por email
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', authData.user.email)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;
    if (existingProfile) {
      // Si existe, actualiza el user_id si es necesario
      if (!existingProfile.user_id) {
        await supabase.from('profiles').update({ user_id: authData.user.id }).eq('email', authData.user.email);
      }
      return {
        data: authData,
        profile: { ...existingProfile, user_id: authData.user.id, type: existingProfile.role }
      };
    }

    // Si no existe ni por user_id ni por email, crea el perfil
    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.user_metadata.name || '',
          role: authData.user.user_metadata.type || 'resident',
        }
      ]);

    if (createProfileError) {
      // Si la creación falla por restricción de unicidad, intenta recuperar el perfil existente
      if (createProfileError.code === '23505' || createProfileError.message?.includes('duplicate')) {
        const { data: conflictProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authData.user.email)
          .maybeSingle();
        if (conflictProfile) {
          return {
            data: authData,
            profile: { ...conflictProfile, user_id: authData.user.id, type: conflictProfile.role }
          };
        }
      }
      throw new Error('Failed to create profile');
    }

    // Fetch the newly created profile
    const { data: newProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (fetchError || !newProfile) throw new Error('Failed to fetch profile');

    return {
      data: authData,
      profile: { ...newProfile, type: newProfile.role }
    };
  } catch (error: unknown) {
    console.error('SignIn error:', error);
    throw error;
  }
}

export async function claimCollectionPoint(
  pointId: string,
  recyclerId: string,
  pickupTime: string,
  userId: string // <-- nuevo parámetro obligatorio
): Promise<void> {
  try {
    // Crear el claim con status 'claimed'
    const { data: claim, error: claimError } = await supabase
      .from('collection_claims')
      .insert([
        {
          collection_point_id: pointId,
          recycler_id: recyclerId,
          user_id: userId, // <-- importante para cumplir el constraint
          status: 'claimed',
          pickup_time: pickupTime
        }
      ])
      .select()
      .single();

    if (claimError) throw claimError;

    // Actualizar el punto de recolección
    const { error: updateError } = await supabase
      .from('collection_points')
      .update({
        status: 'claimed',
        claim_id: claim.id,
        pickup_time: pickupTime,
        recycler_id: recyclerId
      })
      .eq('id', pointId); // <-- CORRECTO: debe ser .eq('id', pointId)

    if (updateError) throw updateError;

  } catch (error) {
    console.error('Error claiming collection point:', error);
    throw error;
  }
}

export async function cancelClaim(
  claimId: string, pointId: string, reason: string): Promise<void> {
  try {
    // Update claim status
    const { error: claimError } = await supabase
      .from('collection_claims')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', claimId);

    if (claimError) throw claimError;

    // Update collection point status
    const { error: pointError } = await supabase
      .from('collection_points')
      .update({
        status: 'available',
        claim_id: null,
        pickup_time: null,
        recycler_id: null
      })
      .eq('id', pointId);

    if (pointError) throw pointError;

  } catch (error) {
    console.error('Error cancelling claim:', error);
    throw error;
  }
}

export async function completeCollection(
  claimId: string,
  pointId: string
): Promise<void> {
  try {
    // Update claim status
    const { error: claimError } = await supabase
      .from('collection_claims')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', claimId);

    if (claimError) throw claimError;

    // Update collection point status
    const { error: pointError } = await supabase
      .from('collection_points')
      .update({
        status: 'completed'
      })
      .eq('id', pointId);

    if (pointError) throw pointError;

    // Get resident ID
    const { data: point, error: pointFetchError } = await supabase
      .from('collection_points')
      .select('user_id')
      .eq('id', pointId)
      .single();

    if (pointFetchError) throw pointFetchError;

    // DEBUG: Mostrar el user_id del residente
    console.log('[DEBUG completeCollection] user_id del residente:', point.user_id);

    // Sumar 10 EcoCreditos al residente
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('eco_creditos, user_id')
      .eq('user_id', point.user_id)
      .single();
    if (profileError) throw profileError;
    console.log('[DEBUG completeCollection] eco_creditos actuales:', currentProfile?.eco_creditos, 'user_id:', currentProfile?.user_id);
    const nuevosCreditos = (currentProfile?.eco_creditos || 0) + 10;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ eco_creditos: nuevosCreditos })
      .eq('user_id', point.user_id);
    if (updateError) throw updateError;
    console.log('[DEBUG completeCollection] eco_creditos nuevos:', nuevosCreditos);

    // Crear notificación para el residente
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: point.user_id,
        title: 'Recolección Completada',
        content: 'Tu punto de recolección ha sido completado exitosamente. Has ganado 10 EcoCreditos.',
        type: 'collection_completed',
        related_id: pointId
      }]);

    if (notificationError) throw notificationError;

    // Fin de función
    return;
  } catch (error) {
    console.error('Error completing collection:', error);
    throw error;
  }
}

export async function deleteCollectionPoint(pointId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('collection_points')
      .delete()
      .eq('id', pointId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting collection point:', error);
    throw error;
  }
}

export async function ensureUserProfile({ id, email, name }: { id: string; email: string; name: string; }) {
  // Verifica si el perfil ya existe
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', id)
    .maybeSingle();

  if (!data && !error) {
    // Si no existe, lo crea
    await supabase.from('profiles').insert({
      user_id: id,
      email,
      name,
    });
  }
  // Si hay error, lo ignora aquí porque se maneja en el llamador
}
