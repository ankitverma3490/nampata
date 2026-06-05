export type AddressFieldKey =
    | 'address'
    | 'addressLine2'
    | 'city'
    | 'state'
    | 'pincode';

export type AddressFieldConfig = {
    key: AddressFieldKey;
    label: string;
    required: boolean;
    order: number;
    used: boolean;
    regex?: string | null;
};

export type PostalCodeConfig = {
    key: 'pincode';
    label: string;
    required: boolean;
    regex?: string;
};

export type CountryAddressConfig = {
    countryCode: string;
    countryName: string;
    fieldOrder: AddressFieldKey[];
    fields: AddressFieldConfig[];
    fieldMap: Record<AddressFieldKey, AddressFieldConfig>;
    postalCode: PostalCodeConfig;

    // Backward-compatible shape currently used by frontend hooks.
    addressLines: AddressFieldConfig;
    locality: AddressFieldConfig;
    administrativeArea: AddressFieldConfig;
};

type AddressConfigSeed = {
    countryCode: string;
    countryName: string;
    fieldLabels: Record<AddressFieldKey, string>;
    fieldOrder: AddressFieldKey[];
    requiredFields: AddressFieldKey[];
    postalCode?: {
        label?: string;
        required?: boolean;
        regex?: string;
    };
};

const DEFAULT_SEED: AddressConfigSeed = {
    countryCode: '',
    countryName: 'Unknown',
    fieldLabels: {
        address: 'Street Address',
        addressLine2: 'Address Line 2',
        city: 'City / Locality',
        state: 'State / Province / Region',
        pincode: 'Postal Code',
    },
    fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
    requiredFields: ['address', 'city'],
    postalCode: {
        label: 'Postal Code',
        required: false,
    },
};

const ADDRESS_CONFIGS: Record<string, AddressConfigSeed> = {
    US: {
        countryCode: 'US',
        countryName: 'United States',
        fieldLabels: {
            address: 'Street Address',
            addressLine2: 'Apt / Suite / Unit',
            city: 'City',
            state: 'State',
            pincode: 'ZIP Code',
        },
        fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
        requiredFields: ['address', 'city', 'state'],
        postalCode: { label: 'ZIP Code', required: false, regex: '^\\d{5}(?:-\\d{4})?$' },
    },
    CA: {
        countryCode: 'CA',
        countryName: 'Canada',
        fieldLabels: {
            address: 'Street Address',
            addressLine2: 'Unit / Suite / Building',
            city: 'City',
            state: 'Province',
            pincode: 'Postal Code',
        },
        fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
        requiredFields: ['address', 'city', 'state'],
        postalCode: { label: 'Postal Code', required: false, regex: '^[A-Za-z]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d$' },
    },
    GB: {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        fieldLabels: {
            address: 'Address Line 1',
            addressLine2: 'Address Line 2',
            city: 'Post Town',
            state: 'County',
            pincode: 'Postcode',
        },
        fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
        requiredFields: ['address', 'city'],
        postalCode: { label: 'Postcode', required: false, regex: '^[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}$' },
    },
    AE: {
        countryCode: 'AE',
        countryName: 'United Arab Emirates',
        fieldLabels: {
            address: 'Street Address',
            addressLine2: 'Building / Unit',
            city: 'City',
            state: 'Emirate',
            pincode: 'Postal Code',
        },
        fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
        requiredFields: ['address', 'city', 'state'],
        postalCode: { label: 'Postal Code', required: false },
    },
    PK: {
        countryCode: 'PK',
        countryName: 'Pakistan',
        fieldLabels: {
            address: 'Street Address',
            addressLine2: 'Address Line 2',
            city: 'City',
            state: 'Province',
            pincode: 'Postal Code',
        },
        fieldOrder: ['address', 'addressLine2', 'city', 'state', 'pincode'],
        requiredFields: ['address', 'city', 'state'],
        postalCode: { label: 'Postal Code', required: false, regex: '^\\d{5}$' },
    },
};

const COUNTRY_ALIASES: Record<string, string> = {
    USA: 'US',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    CANADA: 'CA',
    UK: 'GB',
    'UNITED KINGDOM': 'GB',
    GREATBRITAIN: 'GB',
    'GREAT BRITAIN': 'GB',
    UAE: 'AE',
    'UNITED ARAB EMIRATES': 'AE',
    PAKISTAN: 'PK',
};

function buildFieldConfig(
    key: AddressFieldKey,
    seed: AddressConfigSeed,
    order: number,
): AddressFieldConfig {
    const isPostal = key === 'pincode';
    return {
        key,
        label: isPostal ? (seed.postalCode?.label || seed.fieldLabels.pincode) : seed.fieldLabels[key],
        required: isPostal ? !!seed.postalCode?.required : seed.requiredFields.includes(key),
        order,
        used: true,
        regex: isPostal ? seed.postalCode?.regex ?? null : null,
    };
}

function buildCountryAddressConfig(seed: AddressConfigSeed): CountryAddressConfig {
    const normalizedOrder = seed.fieldOrder.filter((key, index, list) => list.indexOf(key) === index);
    const fieldMap = normalizedOrder.reduce<Record<AddressFieldKey, AddressFieldConfig>>((acc, key, index) => {
        acc[key] = buildFieldConfig(key, seed, index + 1);
        return acc;
    }, {} as Record<AddressFieldKey, AddressFieldConfig>);

    // Ensure all known field keys always exist for consumers that access by key.
    const allKeys: AddressFieldKey[] = ['address', 'addressLine2', 'city', 'state', 'pincode'];
    for (const key of allKeys) {
        if (!fieldMap[key]) {
            fieldMap[key] = buildFieldConfig(key, seed, normalizedOrder.length + 1);
            fieldMap[key].used = false;
        }
    }

    const fields = normalizedOrder.map((key) => fieldMap[key]);
    if (!fields.some((field) => field.key === 'addressLine2')) {
        fields.splice(1, 0, fieldMap.addressLine2);
    }
    if (!fields.some((field) => field.key === 'pincode')) {
        fields.push(fieldMap.pincode);
    }

    const postalCode: PostalCodeConfig = {
        key: 'pincode',
        label: seed.postalCode?.label || seed.fieldLabels.pincode,
        required: !!seed.postalCode?.required,
        regex: seed.postalCode?.regex,
    };

    return {
        countryCode: seed.countryCode,
        countryName: seed.countryName,
        fieldOrder: normalizedOrder,
        fieldMap,
        fields,
        postalCode,
        addressLines: fieldMap.address,
        locality: fieldMap.city,
        administrativeArea: fieldMap.state,
    };
}

export function resolveCountryCode(country?: string | null): string {
    if (!country) return '';
    const trimmed = country.trim();
    const upper = trimmed.toUpperCase();
    return ADDRESS_CONFIGS[upper] ? upper : COUNTRY_ALIASES[upper] || upper;
}

export function getAddressConfig(country?: string | null): CountryAddressConfig {
    const code = resolveCountryCode(country);
    const baseSeed = ADDRESS_CONFIGS[code];

    if (!baseSeed) {
        return buildCountryAddressConfig({
            ...DEFAULT_SEED,
            countryCode: code || DEFAULT_SEED.countryCode,
            countryName: country?.trim() || code || DEFAULT_SEED.countryName,
        });
    }

    return buildCountryAddressConfig(baseSeed);
}

export function getSupportedAddressConfigs(): CountryAddressConfig[] {
    return Object.values(ADDRESS_CONFIGS)
        .sort((a, b) => a.countryName.localeCompare(b.countryName))
        .map(buildCountryAddressConfig);
}

export function validatePostalCode(country: string | undefined, postalCode?: string | null): boolean {
    const config = getAddressConfig(country);
    const value = (postalCode || '').trim();

    if (config.postalCode.required && !value) return false;
    if (!value || !config.postalCode.regex) return true;

    return new RegExp(config.postalCode.regex, 'i').test(value);
}
