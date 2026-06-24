import { Injectable, Logger, Inject } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Listing, BusinessStatus } from '../../entities/business.entity';
import { SearchBusinessDto } from '../businesses/dto/search-business.dto';
import * as crypto from 'crypto';

@Injectable()
export class SearchLocationService {
    private readonly logger = new Logger(SearchLocationService.name);
    private INDEX_NAME = 'businesses';

    constructor(
        private readonly elasticsearchService: ElasticsearchService,
        @InjectRepository(Listing)
        private readonly businessRepository: Repository<Listing>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private generateCacheKey(dto: SearchBusinessDto): string {
        const payload = JSON.stringify(dto);
        const hash = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 8);
        return `search:${dto.city?.toLowerCase() || 'all'}:${dto.categorySlug || 'all'}:${dto.radius || 0}:${hash}`;
    }

    async searchHybrid(dto: SearchBusinessDto): Promise<any[]> {
        const cacheKey = this.generateCacheKey(dto);
        
        // 1. Try Cache
        const cached = await this.cacheManager.get<any[]>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache HIT for key: ${cacheKey}`);
            return cached;
        }

        this.logger.debug(`Cache MISS for key: ${cacheKey}. Executing Hybrid Search.`);

        const { query, city, categorySlug, minRating, verifiedOnly, latitude, longitude, radius } = dto;

        // 2. Query Elasticsearch (Semantic, Text, Filters)
        const filters: any[] = [];
        if (city) filters.push({ term: { city: city.toLowerCase() } });
        if (categorySlug) filters.push({ term: { category_slug: categorySlug } });
        if (minRating) filters.push({ range: { rating: { gte: minRating } } });
        if (verifiedOnly) filters.push({ term: { is_verified: true } });

        const baseQuery = query
            ? {
                multi_match: {
                    query,
                    fields: ['search_keywords^10', 'title^5', 'category^3', 'meta_keywords^2', 'description', 'address'],
                    fuzziness: 'AUTO'
                }
              }
            : { match_all: {} };

        let esIds: string[] = [];
        let esFailed = false;
        try {
            const esResult = await this.elasticsearchService.search({
                index: this.INDEX_NAME,
                body: {
                    query: {
                        bool: {
                            must: [baseQuery, { term: { status: BusinessStatus.APPROVED } }],
                            filter: filters
                        }
                    },
                    size: 500, // Fetch up to 500 candidate IDs
                    _source: false // We only need IDs
                }
            });

            esIds = esResult.hits.hits.map(hit => hit._id);
        } catch (err) {
            esFailed = true;
            this.logger.error('Elasticsearch query failed, falling back to database query in hybrid search', err);
        }

        let businesses: Listing[] = [];

        // 3. Query Database (with PostGIS/earthdistance for radius lookup)
        if (esFailed) {
            this.logger.log('[Hybrid Search] Executing pure database fallback search.');
            const qb = this.businessRepository.createQueryBuilder('b')
                .leftJoinAndSelect('b.category', 'category')
                .where('b.status = :status', { status: BusinessStatus.APPROVED });

            if (city) {
                qb.andWhere('LOWER(b.city) = :city', { city: city.toLowerCase() });
            }
            if (categorySlug) {
                qb.andWhere('category.slug = :categorySlug', { categorySlug });
            }
            if (minRating) {
                qb.andWhere('b.averageRating >= :minRating', { minRating });
            }
            if (verifiedOnly) {
                qb.andWhere('b.isVerified = :verifiedOnly', { verifiedOnly: true });
            }

            if (query) {
                const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
                for (const term of searchTerms) {
                    qb.andWhere(
                        new Brackets((innerQb) => {
                            innerQb.where('LOWER(b.title) LIKE :term', { term: `%${term}%` })
                                .orWhere('LOWER(b.description) LIKE :term', { term: `%${term}%` })
                                .orWhere('LOWER(b.city) LIKE :term', { term: `%${term}%` })
                                .orWhere('LOWER(category.name) LIKE :term', { term: `%${term}%` })
                                .orWhere('b.meta_keywords LIKE :term', { term: `%${term}%` })
                                .orWhere('"b"."search_keywords"::text ILIKE :term', { term: `%${term}%` });
                        }),
                        { term: `%${term}%` }
                    );
                }
            }

            if (latitude && longitude) {
                const formula = `earth_distance(ll_to_earth(b.latitude, b.longitude), ll_to_earth(:lat, :lng))`;
                qb.addSelect(`${formula} / 1000`, 'distance');
                qb.setParameters({ lat: latitude, lng: longitude });

                if (radius) {
                    const radiusInMeters = radius * 1000;
                    qb.andWhere(`${formula} <= :radiusInMeters`, { radiusInMeters });
                }
                qb.orderBy('distance', 'ASC');
            } else {
                qb.orderBy('b.createdAt', 'DESC');
            }

            qb.take(dto.limit || 50).skip(((dto.page || 1) - 1) * (dto.limit || 50));
            const { entities, raw } = await qb.getRawAndEntities();
            businesses = entities.map((entity, index) => {
                const rawItem = raw[index];
                if (rawItem) {
                    const distanceKey = Object.keys(rawItem).find(k => k.toLowerCase().includes('distance'));
                    if (distanceKey && rawItem[distanceKey] !== undefined && rawItem[distanceKey] !== null) {
                        (entity as any).distance = parseFloat(rawItem[distanceKey]);
                    }
                }
                return entity;
            });
        } else {
            if (esIds.length === 0) {
                return []; // No matches from ES
            }

            const qb = this.businessRepository.createQueryBuilder('b')
                .leftJoinAndSelect('b.category', 'category')
                .where('b.id IN (:...ids)', { ids: esIds });

            if (latitude && longitude) {
                const formula = `earth_distance(ll_to_earth(b.latitude, b.longitude), ll_to_earth(:lat, :lng))`;
                qb.addSelect(`${formula} / 1000`, 'distance');
                qb.setParameters({ lat: latitude, lng: longitude });

                if (radius) {
                    const radiusInMeters = radius * 1000;
                    qb.andWhere(`${formula} <= :radiusInMeters`, { radiusInMeters });
                }
                qb.orderBy('distance', 'ASC');
            } else {
                // Keep the ordering from ES by sorting by the order of esIds if possible,
                // or fall back to standard sorting.
                qb.orderBy('b.createdAt', 'DESC');
            }

            qb.take(dto.limit || 50).skip(((dto.page || 1) - 1) * (dto.limit || 50));
            const { entities, raw } = await qb.getRawAndEntities();
            businesses = entities.map((entity, index) => {
                const rawItem = raw[index];
                if (rawItem) {
                    const distanceKey = Object.keys(rawItem).find(k => k.toLowerCase().includes('distance'));
                    if (distanceKey && rawItem[distanceKey] !== undefined && rawItem[distanceKey] !== null) {
                        (entity as any).distance = parseFloat(rawItem[distanceKey]);
                    }
                }
                return entity;
            });
        }

        const formattedResults = businesses.map(b => ({
            id: b.id,
            title: b.title,
            description: b.description,
            category: b.category?.name,
            city: b.city,
            location: { lat: b.latitude, lon: b.longitude },
            rating: b.averageRating,
            isFeatured: b.isFeatured,
            isVerified: b.isVerified,
            status: b.status,
            slug: b.slug,
            logoUrl: b.logoUrl,
            coverImageUrl: b.coverImageUrl,
            phone: b.phone,
            address: b.address,
            followersCount: b.followersCount,
            createdAt: b.createdAt,
            distance: (b as any).distance ?? null,
        }));

        // 4. Cache the results for 15 minutes (900000 ms)
        await this.cacheManager.set(cacheKey, formattedResults, 900000);

        return formattedResults;
    }
}
