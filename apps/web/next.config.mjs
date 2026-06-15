const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
    images: {
        unoptimized: true,
    },
    trailingSlash: isStaticExport,
    output: isStaticExport ? 'export' : 'standalone',
};

export default nextConfig;
