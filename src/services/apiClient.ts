const DEMO_USER_ID = 'demo@student';

export const getDemoApiHeaders = () => ({ 'x-demo-user-id': DEMO_USER_ID });

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getDemoApiHeaders(),
      ...options.headers
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body
      ? String(body.error)
      : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
};

export const apiDownload = async (path: string): Promise<{ blob: Blob; filename: string }> => {
  const response = await fetch(path, { headers: getDemoApiHeaders() });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Download failed with status ${response.status}`, response.status, body);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  return {
    blob: await response.blob(),
    filename: encodedFilename ? decodeURIComponent(encodedFilename) : 'adcanvas-project.adcanvas.json'
  };
};
