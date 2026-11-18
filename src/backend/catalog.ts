import { supabase } from '@/integrations/supabase/client';
import { formatDeviceFullName, normalizeDevice, type VerifiedDevice } from '../engine/recommend';

/** Public phone catalog + games, read straight from Supabase (public read policies). */

export interface BrandOption {
  id: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
  releaseYear: number | null;
}

export interface GameOption {
  id: string;
  name: string;
  shortName: string;
  publisher: string;
  supportsGyro: boolean;
}

type Json = Record<string, unknown>;

export async function fetchBrands(): Promise<BrandOption[]> {
  const { data, error } = await supabase.from('brands').select('id, data');
  if (error) throw new Error('Could not load phone brands.');
  return (data ?? [])
    .map((row) => ({ id: row.id, name: String((row.data as Json)?.name ?? row.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchModels(brandId: string): Promise<ModelOption[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('id, release_date, data')
    .eq('brand_id', brandId)
    .order('release_date', { ascending: false });
  if (error) throw new Error('Could not load phone models.');
  return (data ?? []).map((row) => {
    const d = (row.data ?? {}) as Json;
    return {
      id: row.id,
      name: formatDeviceFullName(String(d.brand ?? ''), String(d.model ?? row.id)),
      releaseYear: typeof d.releaseYear === 'number' ? d.releaseYear : null,
    };
  });
}

export async function fetchDevice(deviceId: string): Promise<VerifiedDevice> {
  const { data: row, error } = await supabase.from('devices').select('id, data').eq('id', deviceId).maybeSingle();
  if (error) throw new Error('Could not load this phone’s specifications.');
  if (!row) throw new Error('This phone is no longer in the catalog.');
  const raw = { ...((row.data ?? {}) as Json), id: row.id };
  const chipsetId = typeof raw.chipsetId === 'string' ? raw.chipsetId : null;
  let chipset: Json | null = null;
  if (chipsetId) {
    const { data: chip } = await supabase.from('chipsets').select('data').eq('id', chipsetId).maybeSingle();
    chipset = (chip?.data as Json) ?? null;
  }
  return normalizeDevice(raw, chipset);
}

export async function fetchGames(): Promise<GameOption[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, name, short_name, publisher, supports_gyro')
    .order('sort_order');
  if (error) throw new Error('Could not load supported games.');
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    shortName: g.short_name,
    publisher: g.publisher,
    supportsGyro: g.supports_gyro,
  }));
}

export const catalogKeys = {
  brands: ['catalog', 'brands'] as const,
  models: (brandId: string) => ['catalog', 'models', brandId] as const,
  device: (deviceId: string) => ['catalog', 'device', deviceId] as const,
  games: ['catalog', 'games'] as const,
};
