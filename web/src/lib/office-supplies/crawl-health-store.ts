import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { runOfficetownCrawlHealthCheck } from '@/lib/office-supplies/officetown-health';
import {
  OFFICETOWN_PROBE_PRODUCT_CODE,
  normalizeOfficeSupplyCrawlHealth,
  type OfficeSupplyCrawlHealth,
} from '@/lib/office-supplies/types';
import { createServiceClient } from '@/lib/supabase/service';

export async function readOfficeSupplyCrawlHealth(
  hotelId = DEFAULT_HOTEL_ID,
): Promise<OfficeSupplyCrawlHealth | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('office_supply_crawl_health')
    .select('*')
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeOfficeSupplyCrawlHealth(data as Record<string, unknown>);
}

export async function persistOfficeSupplyCrawlHealth(
  health: OfficeSupplyCrawlHealth,
  hotelId = DEFAULT_HOTEL_ID,
): Promise<OfficeSupplyCrawlHealth> {
  const supabase = createServiceClient();
  const previous = await readOfficeSupplyCrawlHealth(hotelId);
  const payload = {
    hotel_id: hotelId,
    status: health.status,
    parser_version: health.parserVersion,
    layout_fingerprint: health.layoutFingerprint,
    previous_fingerprint: previous?.layoutFingerprint ?? health.previousFingerprint,
    fingerprint_changed: health.fingerprintChanged,
    probe_product_code: health.probeProductCode,
    probe_ok: health.probeOk,
    category_product_count: health.categoryProductCount,
    issues: health.issues,
    checked_at: health.checkedAt,
  };

  const { data, error } = await supabase
    .from('office_supply_crawl_health')
    .upsert(payload, { onConflict: 'hotel_id' })
    .select('*')
    .single();
  if (error) throw error;
  return normalizeOfficeSupplyCrawlHealth(data as Record<string, unknown>);
}

export async function runAndPersistOfficeSupplyCrawlHealth(
  hotelId = DEFAULT_HOTEL_ID,
): Promise<OfficeSupplyCrawlHealth> {
  const previous = await readOfficeSupplyCrawlHealth(hotelId);
  const health = await runOfficetownCrawlHealthCheck({
    previousFingerprint: previous?.layoutFingerprint,
    previousStatus: previous?.status,
    probeProductCode: previous?.probeProductCode ?? OFFICETOWN_PROBE_PRODUCT_CODE,
  });
  return persistOfficeSupplyCrawlHealth(health, hotelId);
}
