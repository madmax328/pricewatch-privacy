// Lulu Direct API integration
// Docs: https://developers.lulu.com/

const LULU_API_BASE = 'https://api.lulu.com';

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  france: 'FR', belgique: 'BE', belgium: 'BE', suisse: 'CH', switzerland: 'CH',
  canada: 'CA', luxembourg: 'LU', monaco: 'MC', allemagne: 'DE', germany: 'DE',
  espagne: 'ES', spain: 'ES', italie: 'IT', italy: 'IT', 'royaume-uni': 'GB',
  'united kingdom': 'GB', uk: 'GB', 'états-unis': 'US', 'etats-unis': 'US',
  'united states': 'US', usa: 'US', portugal: 'PT', 'pays-bas': 'NL',
  netherlands: 'NL', autriche: 'AT', austria: 'AT', australie: 'AU', australia: 'AU',
};

function normalizeCountryCode(country: string): string {
  if (/^[A-Z]{2}$/.test(country)) return country;
  return COUNTRY_NAME_TO_CODE[country.toLowerCase().trim()] ?? country.toUpperCase().slice(0, 2);
}

let _cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) return _cachedToken.value;

  const key = process.env.LULU_CLIENT_KEY;
  const secret = process.env.LULU_CLIENT_SECRET;
  if (!key || !secret) throw new Error('LULU_CLIENT_KEY and LULU_CLIENT_SECRET are required');

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const res = await fetch(
    `${LULU_API_BASE}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }
  );

  if (!res.ok) throw new Error(`Lulu auth failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return _cachedToken.value;
}

export interface LuluAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export async function createLuluPrintJob(params: {
  orderId: string;
  userEmail: string;
  storyTitle: string;
  coverUrl: string;
  interiorUrl: string;
  address: LuluAddress;
}): Promise<{ luluJobId: string; luluOrderId: string }> {
  const token = await getToken();
  const podPackageId =
    process.env.LULU_POD_PACKAGE_ID || '0583X0827FCSTDPB080CW444GXX';
  const shippingLevel = process.env.LULU_SHIPPING_OPTION || 'MAIL';

  const body = {
    contact_email: params.userEmail,
    external_id: params.orderId,
    line_items: [
      {
        external_id: `${params.orderId}_1`,
        printable_normalization: {
          cover: { source_url: params.coverUrl },
          interior: { source_url: params.interiorUrl },
          pod_package_id: podPackageId,
        },
        quantity: 1,
        title: params.storyTitle,
      },
    ],
    shipping_address: {
      name: `${params.address.firstName} ${params.address.lastName}`.trim(),
      street1: params.address.address,
      city: params.address.city,
      postcode: params.address.postalCode,
      country_code: normalizeCountryCode(params.address.country),
    },
    shipping_option_level: shippingLevel,
  };

  const res = await fetch(`${LULU_API_BASE}/print-jobs/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Lulu print job failed (${res.status}): ${error}`);
  }

  const data = (await res.json()) as { id: string | number; order_id?: string | number };
  return {
    luluJobId: String(data.id),
    luluOrderId: String(data.order_id ?? data.id),
  };
}

export async function getLuluPrintJobStatus(
  jobId: string
): Promise<{ status: string; trackingUrl?: string; trackingNumber?: string; carrier?: string }> {
  const token = await getToken();

  const res = await fetch(`${LULU_API_BASE}/print-jobs/${jobId}/`, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
  });

  if (!res.ok) throw new Error(`Lulu status check failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as {
    status?: { name?: string };
    order_id?: string;
    line_items?: Array<{
      tracking_id?: string;
      tracking_url?: string;
      carrier?: string;
    }>;
  };

  const statusName = data.status?.name ?? 'UNKNOWN';
  const lineItem = data.line_items?.[0];

  return {
    status: statusName,
    trackingUrl: lineItem?.tracking_url,
    trackingNumber: lineItem?.tracking_id,
    carrier: lineItem?.carrier,
  };
}
