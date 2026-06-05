import { Injectable } from '@nestjs/common';
import {
    CountryAddressConfig,
    getAddressConfig,
    getSupportedAddressConfigs,
    resolveCountryCode,
} from '../../common/utils/address-config.util';
import { ISO_COUNTRIES } from '../../common/data/iso-countries';

@Injectable()
export class AddressConfigService {
    private readonly cache = new Map<string, CountryAddressConfig>();

    getCountries(): { code: string; name: string }[] {
        return [...ISO_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    }

    getSupportedConfigs(): CountryAddressConfig[] {
        return getSupportedAddressConfigs();
    }

    async getConfig(countryCode: string): Promise<CountryAddressConfig> {
        const code = resolveCountryCode(countryCode);
        const cached = this.cache.get(code);
        if (cached) return cached;

        const fallback = getAddressConfig(code);
        this.cache.set(code, fallback);
        return fallback;
    }

    async validatePostalCode(countryCode: string, postalCode?: string | null): Promise<boolean> {
        const config = await this.getConfig(countryCode);
        const value = (postalCode || '').trim();

        if (config.postalCode?.required && !value) return false;
        if (!value || !config.postalCode?.regex) return true;

        try {
            return new RegExp(config.postalCode.regex, 'i').test(value);
        } catch {
            return true;
        }
    }
}
