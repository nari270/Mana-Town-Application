import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type NominatimResponse = {
  address?: {
    city?: string;
    city_district?: string;
    county?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    town?: string;
    village?: string;
  };
};

export type ReverseGeocodedLocality = {
  locality: string;
  attribution: string;
};

@Injectable()
export class ReverseGeocodingService {
  private readonly cache = new Map<string, string>();
  private readonly inFlight = new Map<string, Promise<string>>();
  private requestQueue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;

  async getLocality(
    latitude: number,
    longitude: number,
    language: string,
  ): Promise<ReverseGeocodedLocality> {
    const normalizedLanguage = language === 'te' ? 'te' : 'en';
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${normalizedLanguage}`;
    let locality = this.cache.get(cacheKey);
    if (!locality) {
      const pending = this.inFlight.get(cacheKey);
      locality = pending
        ? await pending
        : await this.lookup(cacheKey, latitude, longitude, normalizedLanguage);
    }

    return {
      locality,
      attribution:
        process.env.GEOCODING_ATTRIBUTION ?? '© OpenStreetMap contributors',
    };
  }

  private lookup(
    cacheKey: string,
    latitude: number,
    longitude: number,
    language: string,
  ) {
    const operation = this.fetchLocality(latitude, longitude, language).then(
      (locality) => {
        this.cache.set(cacheKey, locality);
        if (this.cache.size > 10_000) {
          const oldestKey = this.cache.keys().next().value;
          if (oldestKey !== undefined) this.cache.delete(oldestKey);
        }
        return locality;
      },
    );
    this.inFlight.set(cacheKey, operation);
    void operation.then(
      () => this.inFlight.delete(cacheKey),
      () => this.inFlight.delete(cacheKey),
    );
    return operation;
  }

  private async fetchLocality(
    latitude: number,
    longitude: number,
    language: string,
  ) {
    await this.waitForProviderSlot();
    const url = new URL(
      process.env.GEOCODING_BASE_URL ??
        'https://nominatim.openstreetmap.org/reverse',
    );
    url.search = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '10',
      addressdetails: '1',
      'accept-language': language === 'te' ? 'te,en' : 'en',
    }).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            process.env.GEOCODING_USER_AGENT ??
            'ManaTown Digital/1.1 (https://manatown-web.onrender.com)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Location lookup is temporarily unavailable.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Location lookup provider returned HTTP ${response.status}.`,
      );
    }

    const result = (await response.json()) as NominatimResponse;
    const address = result.address;
    const locality =
      address?.town ??
      address?.city ??
      address?.village ??
      address?.municipality ??
      address?.hamlet ??
      address?.suburb ??
      address?.city_district ??
      address?.county;
    if (!locality) {
      throw new ServiceUnavailableException(
        'No locality was returned for the current location.',
      );
    }
    return locality;
  }

  private async waitForProviderSlot() {
    const slot = this.requestQueue.then(async () => {
      const wait = Math.max(0, this.nextRequestAt - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      this.nextRequestAt = Date.now() + 1000;
    });
    this.requestQueue = slot.catch(() => {});
    await slot;
  }
}
