import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
    try {
        const { api } = await import('../../../lib/api');
        const slugs = await api.businessProfiles.getAllSlugs();
        const params = (slugs || []).map((slug) => ({ vendorSlug: slug }));

        ['sample-vendor', 'template', 'df194c67-03d8-41d1-ad6e-b4518e4a387d'].forEach((slug) => {
            if (!params.some((p) => p.vendorSlug === slug)) {
                params.push({ vendorSlug: slug });
            }
        });

        return params;
    } catch {
        return [
            { vendorSlug: 'sample-vendor' },
            { vendorSlug: 'template' },
            { vendorSlug: 'df194c67-03d8-41d1-ad6e-b4518e4a387d' },
        ];
    }
}

export default async function VendorProfilePage({ params }: { params: Promise<{ vendorSlug: string }> }) {
    const { vendorSlug } = await params;
    permanentRedirect(`/businesses/${vendorSlug}`);
}
