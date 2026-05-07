import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Brackets, Like, MoreThan } from 'typeorm';
import { Listing, BusinessStatus } from '../../entities/business.entity';
import { BusinessHours, DayOfWeek } from '../../entities/business-hours.entity';
import { BusinessAmenity } from '../../entities/business-amenity.entity';
import { Amenity } from '../../entities/amenity.entity';
import { Category, CategoryStatus } from '../../entities/category.entity';
import { Vendor } from '../../entities/vendor.entity';
import { User, UserRole } from '../../entities/user.entity';
import { ActivePlan, ActivePlanStatus } from '../../entities/active-plan.entity';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { SearchBusinessDto, SearchSortBy } from './dto/search-business.dto';
import { SubscriptionPlanType } from '../../entities/subscription-plan.entity';
import {
    createPaginatedResponse,
    calculateSkip,
} from '../../common/utils/pagination.util';
import { generateSlug, generateUniqueSlug } from '../../common/utils/slug.util';
import { calculateDistance } from '../../common/utils/geolocation.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { SearchService } from '../search/search.service';
import { DemandService } from '../demand/demand.service';

@Injectable()
export class BusinessesService implements OnModuleInit {
    constructor(
        @InjectRepository(Listing)
        private listingRepository: Repository<Listing>,
        @InjectRepository(BusinessHours)
        private businessHoursRepository: Repository<BusinessHours>,
        @InjectRepository(BusinessAmenity)
        private businessAmenityRepository: Repository<BusinessAmenity>,
        @InjectRepository(Amenity)
        private amenityRepository: Repository<Amenity>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        @InjectRepository(Vendor)
        private vendorRepository: Repository<Vendor>,
        @InjectRepository(ActivePlan)
        private activePlanRepository: Repository<ActivePlan>,
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(SubscriptionPlan)
        private subscriptionPlanRepository: Repository<SubscriptionPlan>,
        private notificationsService: NotificationsService,
        private searchService: SearchService,
        private demandService: DemandService,
    ) { }
    
    async onModuleInit() {
        // Backfill logic for recent_until
        try {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            // Native query is faster for backfill
            await this.listingRepository.query(`
                ALTER TABLE businesses ADD COLUMN IF NOT EXISTS recent_until TIMESTAMP NULL;
                UPDATE businesses 
                SET recent_until = created_at + INTERVAL '7 days' 
                WHERE recent_until IS NULL;
                CREATE INDEX IF NOT EXISTS idx_recent_until ON businesses(recent_until);
            `);
            console.log('[BusinessesService] Backfill and index for recent_until completed.');
        } catch (error) {
            console.error('[BusinessesService] Backfill for recent_until failed:', error);
        }
    }

    /**
     * Create a new listing
     */
    async create(createBusinessDto: CreateBusinessDto, user: User): Promise<Listing> {
        // Find or create vendor profile for the user
        let vendor = await this.vendorRepository.findOne({
            where: { userId: user.id },
            relations: ['subscriptions'],
        });

        if (!vendor) {
            // Only allow if user is a vendor, admin or superadmin
            if (user.role === UserRole.USER) {
                throw new ForbiddenException('Only vendors and administrators can create listings');
            }

            // Create a default vendor profile if it doesn't exist (for admins/superadmins)
            vendor = this.vendorRepository.create({
                userId: user.id,
                businessName: `${user.fullName}'s Business`,
                businessPhone: user.phone,
                isVerified: true,
            });
            vendor = await this.vendorRepository.save(vendor);
        }

        // Verify category exists or handle suggestion
        let category = null;
        if (createBusinessDto.categoryId) {
            category = await this.categoryRepository.findOne({
                where: { id: createBusinessDto.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }

            if (category.status !== CategoryStatus.ACTIVE) {
                throw new BadRequestException('Invalid category: selected category is disabled');
            }
        } else if (!createBusinessDto.suggestedCategoryName) {
            throw new BadRequestException('Either categoryId or suggestedCategoryName must be provided');
        }

        // Generate unique slug
        const slug = generateUniqueSlug(createBusinessDto.title);

        // Sanitize offerExpiresAt to prevent invalid date errors
        let sanitizedExpiresAt = createBusinessDto.offerExpiresAt;
        if (
            sanitizedExpiresAt === '' || 
            sanitizedExpiresAt === null || 
            (typeof sanitizedExpiresAt === 'string' && (sanitizedExpiresAt.includes('NaN') || sanitizedExpiresAt.includes('Invalid')))
        ) {
            sanitizedExpiresAt = null as any;
        }

        // NEW: Check for ANY active featured/boosted plan (Unified Subscription Engine)
        const [activeSub, activeNewPlan, referralPlan] = await Promise.all([
            this.subscriptionRepository.findOne({
                where: { vendorId: vendor.id, status: SubscriptionStatus.ACTIVE, endDate: MoreThan(new Date()) },
                relations: ['plan']
            }),
            this.activePlanRepository.findOne({
                where: { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, endDate: MoreThan(new Date()) },
                relations: ['plan']
            }),
            // Check if their vendor profile is verified or they have an active referral plan
            this.activePlanRepository.findOne({
                where: [
                    { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, transactionId: Like('%REFERRAL%') },
                    { vendorId: vendor.id, status: ActivePlanStatus.ACTIVE, transactionId: 'MANUAL_REWARD_REPAIR' }
                ]
            })
        ]);
        
        // --- Limit Enforcement ---
        // Get limits from features. Priority: ActivePlan (New Engine) -> Subscription (Old Engine) -> Default (Free: 1)
        const planFeatures = (activeNewPlan?.plan?.features as any) || activeSub?.plan?.dashboardFeatures || { maxListings: 1 };
        const maxListings = planFeatures.maxListings || 1;
        
        // Count existing listings
        const existingCount = await this.listingRepository.count({
            where: { vendorId: vendor.id }
        });
        
        if (existingCount >= maxListings && ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role as UserRole)) {
            throw new BadRequestException(`Business listing limit reached (${maxListings}). Please upgrade your plan to add more businesses.`);
        }
        
        // --- Image Limit Enforcement ---
        // Robust check for free plan across both subscription engines
        const isFreeSub = activeSub?.plan?.planType === SubscriptionPlanType.FREE;
        const isFreeNewPlan = activeNewPlan?.plan?.name?.toLowerCase().includes('free');
        
        const isFreePlan = (!activeNewPlan && !activeSub) || isFreeSub || isFreeNewPlan;
        const maxImages = isFreePlan ? 3 : 999;

        if (createBusinessDto.images && createBusinessDto.images.length > maxImages) {
            throw new BadRequestException(`Image limit reached. The free plan allows only ${maxImages} images. Please upgrade to basic plan for more.`);
        }
        // -------------------------

        const hasFeaturedSub = (activeSub?.plan?.isFeatured) || ((activeNewPlan?.plan?.features as any)?.isFeatured);
        const hasBoostedSub = !!referralPlan || ((activeNewPlan?.plan?.features as any)?.top_ranking);

        // Always set new listings to PENDING for admin approval workflow
        const listing = this.listingRepository.create({
            ...createBusinessDto,
            offerExpiresAt: sanitizedExpiresAt,
            vendorId: vendor.id,
            slug,
            status: BusinessStatus.PENDING,
            isVerified: false,
            isFeatured: hasFeaturedSub || !!referralPlan,
            isSponsored: hasBoostedSub,
            approvedAt: null,
            recentUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        });

        const savedListing = await this.listingRepository.save(listing);

        // Create business hours if provided
        if (createBusinessDto.businessHours?.length) {
            const hours = createBusinessDto.businessHours.map((hour) =>
                this.businessHoursRepository.create({
                    businessId: savedListing.id,
                    ...hour,
                }),
            );
            await this.businessHoursRepository.save(hours);
        }

        // Create business amenities if provided
        if (createBusinessDto.amenityIds?.length) {
            const amenities = createBusinessDto.amenityIds.map((amenityId) =>
                this.businessAmenityRepository.create({
                    businessId: savedListing.id,
                    amenityId,
                }),
            );
            await this.businessAmenityRepository.save(amenities);
        }

        // Return fully populated listing
        const result = await this.findOne(savedListing.id, user);

        // Notify Admin if there's a suggested category
        if (createBusinessDto.suggestedCategoryName) {
            this.notificationsService.notifyAdmin({
                title: '🆕 New Category Suggestion',
                message: `Vendor "${vendor.businessName}" suggested a new category: "${createBusinessDto.suggestedCategoryName}" for their listing "${result.title}".`,
                type: NotificationType.SYSTEM_UPDATE,
                data: { businessId: result.id, suggestedCategory: createBusinessDto.suggestedCategoryName },
            }).catch(() => {/* non-blocking */ });
        }

        // Index in Elasticsearch (async, don't wait to complete to return response)
        this.searchService.indexBusiness(result).catch(err => console.error('ES Index Error:', err));

        return result;
    }

    /**
     * Search businesses with filters and geo-location
     */
    async search(searchDto: SearchBusinessDto) {
        const {
            page = 1,
            limit = 20,
            latitude,
            longitude,
            radius,
            city,
            categoryId,
            categorySlug,
            minRating,
            priceRange,
            featuredOnly,
            verifiedOnly,
            openNow,
            sortBy,
            userId,
            filter,
        } = searchDto;
        const skip = calculateSkip(page, limit);

        // Quick Filters
        const isFeaturedFilter = filter === 'featured' || featuredOnly;
        const isNewFilter = filter === 'new';

        // Async Search Logging - Log any significant search intent
        if (searchDto.query || city || categorySlug || categoryId || (latitude && longitude)) {
            this.demandService.logSearch({
                keyword: searchDto.query || categorySlug || '',
                city: city || searchDto.city,
                categorySlug: categorySlug as string,
                latitude,
                longitude,
                userId,
            }).catch(err => console.error('[BusinessesService] Analytics log error:', err));
        }

        // Elasticsearch Integration: Get IDs for high-relevance results
        let esIds: string[] | null = null;
        if (searchDto.query && this.searchService.isAvailable()) {
            try {
                esIds = await this.searchService.searchIds(
                    searchDto.query,
                    searchDto.city,
                    searchDto.categorySlug,
                    100, // Fetch top 100 for filtering
                );
            } catch (err) {
                console.error('[BusinessesService] Elasticsearch search error:', err);
            }
        }

        const queryBuilder = this.listingRepository
            .createQueryBuilder('listing')
            .leftJoinAndSelect('listing.category', 'category')
            .leftJoinAndSelect('listing.vendor', 'vendor')
            .leftJoinAndSelect('vendor.user', 'user')
            .leftJoinAndSelect('listing.businessHours', 'businessHours')
            .leftJoinAndSelect('listing.businessAmenities', 'businessAmenities')
            .leftJoinAndSelect('businessAmenities.amenity', 'amenity')
            .where('listing.status = :status', { status: BusinessStatus.APPROVED })
            .andWhere('user.deletion_scheduled_at IS NULL');

        // Apply Search Results from Elasticsearch or fallback to ILIKE
        if (esIds && esIds.length > 0) {
            queryBuilder.andWhere('listing.id IN (:...esIds)', { esIds });
            // If relevance sorting requested, use ES order
            if (sortBy === SearchSortBy.RELEVANCE) {
                // Ensure IDs are properly quoted for the SQL array
                const quotedIds = esIds.map(id => `'${id}'`).join(',');
                queryBuilder.orderBy(`array_position(ARRAY[${quotedIds}]::uuid[], listing.id)`, 'ASC');
            }
        } else if (searchDto.query) {
            // Text search fallback — matches title, description and vendor/admin-added search keywords
            const searchTerms = searchDto.query.toLowerCase().split(' ').filter(term => term.length > 0);
            queryBuilder.andWhere(new Brackets((qb) => {
                for (let i = 0; i < searchTerms.length; i++) {
                    const term = searchTerms[i];
                    qb.andWhere(
                        new Brackets((innerQb) => {
                            innerQb.where(`"listing"."name" ILIKE :term${i}`)
                                .orWhere(`"listing"."description" ILIKE :term${i}`)
                                .orWhere(`"listing"."meta_keywords" ILIKE :term${i}`)
                                .orWhere(`"listing"."search_keywords"::text ILIKE :term${i}`)
                                .orWhere(`"vendor"."business_name" ILIKE :term${i}`);
                        }),
                        { [`term${i}`]: `%${term}%` }
                    );
                }
            }));
        }

        // Category filter
        if (searchDto.categoryId) {
            queryBuilder.andWhere('category.id = :categoryId', {
                categoryId: searchDto.categoryId,
            });
        }

        if (searchDto.categorySlug) {
            queryBuilder.andWhere('category.slug = :categorySlug', {
                categorySlug: searchDto.categorySlug,
            });
        }

        // City filter
        if (city) {
            queryBuilder.andWhere('listing.city ILIKE :city', {
                city: `%${city}%`,
            });
        }

        // Rating filter
        if (minRating) {
            queryBuilder.andWhere('listing.averageRating >= :minRating', {
                minRating,
            });
        }

        // Price range filter
        if (priceRange) {
            queryBuilder.andWhere('listing.priceRange = :priceRange', {
                priceRange,
            });
        }

        // Featured only
        if (isFeaturedFilter) {
            queryBuilder.andWhere('listing.isFeatured = :featured', { featured: true });
        }
        if (isNewFilter) {
            const now = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            // Priority: recentUntil > NOW() OR (recentUntil IS NULL AND createdAt >= 7 days ago)
            queryBuilder.andWhere(new Brackets((qb) => {
                qb.where('listing.recentUntil > :now', { now })
                  .orWhere(new Brackets((inner) => {
                      inner.where('listing.recentUntil IS NULL')
                           .andWhere('listing.createdAt >= :sevenDaysAgo', { sevenDaysAgo });
                  }));
            }));
        }
        if (verifiedOnly) {
            queryBuilder.andWhere('listing.isVerified = :verified', { verified: true });
        }

        // Advanced Filters
        if (searchDto.onlineNow) {
            queryBuilder.andWhere('user.isOnline = :isOnline', { isOnline: true });
        }

        if (searchDto.fastResponse) {
            // "Fast Response" = Vendors who have replied to broadcast job leads
            // If No response yet, we fallback to businesses with totalLeads > 0 as a loose indicator
            queryBuilder.andWhere(new Brackets(qb => {
                qb.where(sq => {
                    const subQuery = sq.subQuery()
                        .select('1')
                        .from('job_lead_responses', 'jlr')
                        .where('jlr.vendor_id = vendor.id')
                        .getQuery();
                    return `EXISTS ${subQuery}`;
                })
                .orWhere('listing.totalLeads > 0');
            }));
        }

        if (searchDto.experience) {
            // "Experienced" listings are those that have been on the platform for at least 1 week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            queryBuilder.andWhere('listing.createdAt <= :oneWeekAgo', { oneWeekAgo });
        }

        if (searchDto.mostContacted) {
            // "Most Contacted" = Businesses with active work chats (conversations) 
            // Fallback to high totalViews if no conversation data exists in Railway yet
            queryBuilder.andWhere(new Brackets(qb => {
                qb.where(sq => {
                    const subQuery = sq.subQuery()
                        .select('1')
                        .from('chat_conversations', 'cc')
                        .where('cc.business_id = listing.id')
                        .getQuery();
                    return `EXISTS ${subQuery}`;
                })
                .orWhere('listing.totalViews > 5'); // Relaxed threshold for visibility
            }));
            // Sort by leads and views
            queryBuilder.addOrderBy('listing.totalLeads', 'DESC');
            queryBuilder.addOrderBy('listing.totalViews', 'DESC');
        }

        // Open Now filter
        if (openNow) {
            const now = new Date();
            const day = now
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toLowerCase();
            const time = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            });

            // Using existing 'businessHours' join from line 302
            queryBuilder
                .andWhere('businessHours.dayOfWeek = :day', { day })
                .andWhere('businessHours.isOpen = :isOpen', { isOpen: true })
                .andWhere(':time BETWEEN businessHours.openTime AND businessHours.closeTime', {
                    time,
                });
        }

        // Sorting
        // 1) Keyword boost: if the query matches a vendor's metaKeywords, rank that listing first
        if (searchDto.query) {
            queryBuilder.addSelect(
                'CASE WHEN "listing"."search_keywords"::text ILIKE :queryBoost THEN 0 WHEN "listing"."meta_keywords" ILIKE :queryBoost THEN 1 ELSE 2 END',
                'boost',
            );
            queryBuilder.setParameter('queryBoost', `%${searchDto.query}%`);
            queryBuilder.addOrderBy('boost', 'ASC');
        }

        // 2) Secondary sort (user-selected or default relevance)
        if (filter === 'new' || (sortBy as any) === 'newest' || sortBy === SearchSortBy.NEWEST) {
            // For "New" sort, we prioritize createdAt above all else (after query boost if present)
            queryBuilder
                .addOrderBy('listing.createdAt', 'DESC')
                .addOrderBy('listing.isSponsored', 'DESC')
                .addOrderBy('listing.isFeatured', 'DESC')
                .addOrderBy('listing.averageRating', 'DESC');
        } else {
            switch (sortBy) {
                case SearchSortBy.DISTANCE:
                    if (latitude && longitude) {
                        queryBuilder.addOrderBy('distance', 'ASC');
                    }
                    break;
                case SearchSortBy.RATING:
                    queryBuilder.addOrderBy('listing.averageRating', 'DESC');
                    break;
                default:
                    // Relevance (sponsored > featured > newest > rating)
                    queryBuilder
                        .addOrderBy('listing.isSponsored', 'DESC')
                        .addOrderBy('listing.isFeatured', 'DESC')
                        .addOrderBy('listing.createdAt', 'DESC')
                        .addOrderBy('listing.averageRating', 'DESC');
            }
        }

        try {
            // Get total count
            const total = await queryBuilder.getCount();

            // Get paginated results
            const listings = await queryBuilder.skip(skip).take(limit).getRawAndEntities();

            // Map and format results
            const results = listings.entities.map((listing) => {
                const result: any = listing;
                if (result.vendor && result.vendor.user) {
                    result.vendor.isOnline = result.vendor.user.isOnline || false;
                }
                return result;
            });

            return createPaginatedResponse(results, page, limit, total);
        } catch (error: any) {
            const fs = require('fs');
            const path = require('path');
            fs.appendFileSync(path.join(process.cwd(), 'permanent_error_log.txt'), `[Search ERROR] ${new Date().toISOString()}: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error)}\n\n`);
            throw error;
        }
    }

    /**
     * Get listing by ID
     */
    async findOne(id: string, user?: User): Promise<Listing> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: [
                'category',
                'vendor',
                'vendor.user',
                'businessHours',
                'businessAmenities',
                'businessAmenities.amenity',
                'reviews',
                'reviews.user',
            ],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Only allow public viewing of APPROVED listings
        // Owners and Admins can view regardless of status
        if (listing.status !== BusinessStatus.APPROVED) {
            const isOwner = user && listing.vendor && listing.vendor.userId === user.id;
            const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);

            if (!isOwner && !isAdmin) {
                throw new NotFoundException('Listing not found');
            }
        }

        // Only count views from non-owners (skip vendor self-views)
        const isOwnerView = user && listing.vendor?.user?.id === user.id;
        if (!isOwnerView) {
            await this.listingRepository.increment({ id }, 'totalViews', 1);
            listing.totalViews = (listing.totalViews || 0) + 1;
        }

        if (listing.vendor && listing.vendor.user) {
            (listing.vendor as any).isOnline = listing.vendor.user.isOnline || false;
        }

        return listing;
    }

    /**
     * Get listing by slug
     */
    async findBySlug(slug: string, user?: User): Promise<Listing> {
        const log = (msg: string) => {
            const fs = require('fs');
            const path = require('path');
            const logFile = path.join(process.cwd(), 'debug_logs.txt');
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
        };

        log(`findBySlug: ${slug} (User: ${user?.email || 'Public'})`);

        try {
            const listing = await this.listingRepository.findOne({
                where: { slug },
                relations: [
                    'category',
                    'vendor',
                    'vendor.user',
                    'businessHours',
                    'businessAmenities',
                    'businessAmenities.amenity',
                    'reviews',
                    'reviews.user',
                ],
            });

            if (!listing) {
                log(`findBySlug: ${slug} - NOT FOUND IN DB`);
                throw new NotFoundException('Listing not found');
            }

            log(`findBySlug: ${slug} - Found in DB. Status: ${listing.status}`);

            const isPubliclyVisible = listing.status === BusinessStatus.APPROVED;
            if (!isPubliclyVisible) {
                const isOwner = user && listing.vendor && listing.vendor.userId === user.id;
                const isAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN);

                if (!isOwner && !isAdmin) {
                    log(`findBySlug: ${slug} - HIDDEN (Status: ${listing.status}, IsOwner: ${!!isOwner}, IsAdmin: ${!!isAdmin})`);
                    throw new NotFoundException('Listing not found');
                }
            }

            // Only count views from non-owners
            const isOwner = user && listing.vendor?.user?.id === user.id;
            if (!isOwner) {
                await this.listingRepository.increment({ id: listing.id }, 'totalViews', 1);
                listing.totalViews = (listing.totalViews || 0) + 1;
            }

            if (listing.vendor && listing.vendor.user) {
                (listing.vendor as any).isOnline = listing.vendor.user.isOnline || false;
            }

            log(`findBySlug: ${slug} - SUCCESS`);
            return listing;
        } catch (error: any) {
            log(`findBySlug: ${slug} - ERROR: ${error.message}\n${error.stack}`);
            throw error;
        }
    }

    /**
     * Update listing
     */
    async update(
        id: string,
        updateBusinessDto: UpdateBusinessDto,
        user: User,
    ): Promise<Listing> {
        const log = (msg: string) => {
            const fs = require('fs');
            const path = require('path');
            const logFile = path.join(process.cwd(), 'debug_logs.txt');
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] UPDATE BUSINESS ${id}: ${msg}\n`);
        };

        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        log(`Current User: ${user.id}, Owner: ${listing.vendor.userId}`);

        // Only owner or admin can update
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('You do not have permission to update this listing');
        }

        if (updateBusinessDto.amenityIds) {
            log(`Amenity IDs count: ${updateBusinessDto.amenityIds.length}`);
        }

        // --- Image Limit Enforcement for Update ---
        if (updateBusinessDto.images) {
            const [activeSub, activeNewPlan] = await Promise.all([
                this.subscriptionRepository.findOne({
                    where: { vendorId: listing.vendorId, status: SubscriptionStatus.ACTIVE, endDate: MoreThan(new Date()) },
                    relations: ['plan']
                }),
                this.activePlanRepository.findOne({
                    where: { vendorId: listing.vendorId, status: ActivePlanStatus.ACTIVE, endDate: MoreThan(new Date()) },
                    relations: ['plan']
                })
            ]);

            const isFreeSub = activeSub?.plan?.planType === SubscriptionPlanType.FREE;
            const isFreeNewPlan = activeNewPlan?.plan?.name?.toLowerCase().includes('free');
            
            const isFreePlan = (!activeNewPlan && !activeSub) || isFreeSub || isFreeNewPlan;
            const maxImages = isFreePlan ? 3 : 999;

            if (updateBusinessDto.images.length > maxImages) {
                throw new BadRequestException(`Image limit reached. The free plan allows only ${maxImages} images. Please upgrade to basic plan for more.`);
            }
        }
        // -------------------------

        const oldSlug = listing.slug;

        // Map basic fields
        if (updateBusinessDto.title && updateBusinessDto.title !== listing.title) {
            listing.title = updateBusinessDto.title;
            listing.slug = generateUniqueSlug(updateBusinessDto.title);
            log(`Title changed to: ${listing.title}, Slug to: ${listing.slug}`);
        }

        if (updateBusinessDto.categoryId && updateBusinessDto.categoryId !== listing.categoryId) {
            listing.categoryId = updateBusinessDto.categoryId;
        }

        // Update basic text fields
        const textFields = [
            'description', 'shortDescription', 'email', 'phone', 'whatsapp',
            'website', 'address', 'city', 'state', 'pincode', 'latitude', 'longitude',
            'logoUrl', 'coverImageUrl', 'images', 'metaTitle', 'metaDescription',
            'metaKeywords', 'hasOffer', 'offerTitle', 'offerDescription', 'offerBadge',
            'offerExpiresAt', 'offerBannerUrl', 'faqs'
        ];

        textFields.forEach(field => {
            if (updateBusinessDto[field] !== undefined) {
                listing[field] = updateBusinessDto[field];
            }
        });

        // Update amenities if provided
        if (updateBusinessDto.amenityIds) {
            log('Updating amenities joins...');
            await this.businessAmenityRepository.delete({ businessId: id });
            
            if (updateBusinessDto.amenityIds.length > 0) {
                const amenities = updateBusinessDto.amenityIds.map((amenityId) =>
                    this.businessAmenityRepository.create({
                        businessId: id,
                        amenityId,
                    }),
                );
                await this.businessAmenityRepository.save(amenities);
                log(`Saved ${amenities.length} amenity records`);
            } else {
                log('Cleared all amenities (empty array received)');
            }
        }

        // Handle Business Hours
        if (updateBusinessDto.businessHours) {
            log('Updating business hours...');
            await this.businessHoursRepository.delete({ businessId: id });
            const hours = updateBusinessDto.businessHours.map((hour) =>
                this.businessHoursRepository.create({
                    businessId: id,
                    ...hour,
                }),
            );
            await this.businessHoursRepository.save(hours);
        }

        // Remove nested objects from update
        const { businessHours: _, amenityIds: __, ...updateData } = updateBusinessDto;

        // Sanitize offerExpiresAt to prevent invalid date errors
        if (
            updateData.offerExpiresAt === '' || 
            updateData.offerExpiresAt === null || 
            (typeof updateData.offerExpiresAt === 'string' && (updateData.offerExpiresAt.includes('NaN') || updateData.offerExpiresAt.includes('Invalid')))
        ) {
            updateData.offerExpiresAt = null as any;
        }

        // Apply updates to the listing object
        Object.assign(listing, updateData);

        await this.listingRepository.save(listing);
        log('Listing saved to database');

        const updatedListing = await this.findOne(id, user);

        // Update in Elasticsearch
        this.searchService.indexBusiness(updatedListing).catch(err => console.error('ES Update Error:', err));

        return updatedListing;
    }

    /**
     * Delete listing
     */
    async remove(id: string, user: User): Promise<void> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Check ownership - Reinforcing filtering as requested
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Unauthorized access');
        }

        await this.listingRepository.remove(listing);

        // Remove from Elasticsearch
        this.searchService.remove(id).catch(err => console.error('ES Remove Error:', err));
    }

    /**
     * Get vendor's listings
     */
    async getVendorBusinesses(userId: string, page = 1, limit = 20) {
        const vendor = await this.vendorRepository.findOne({
            where: { userId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const skip = calculateSkip(page, limit);

        const [listings, total] = await this.listingRepository.findAndCount({
            where: { vendorId: vendor.id },
            relations: [
                'category',
                'businessHours',
                'businessAmenities',
                'businessAmenities.amenity'
            ],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return createPaginatedResponse(listings, page, limit, total);
    }

    /**
     * Get similar listings (same category)
     */
    async getSimilar(idOrSlug: string, limit = 4): Promise<Listing[]> {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        let listing;

        if (isUuid) {
            listing = await this.listingRepository.findOne({
                where: { id: idOrSlug },
                select: ['id', 'categoryId'],
            });
        } else {
            listing = await this.listingRepository.findOne({
                where: { slug: idOrSlug },
                select: ['id', 'categoryId'],
            });
        }

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        return this.listingRepository.find({
            where: {
                categoryId: listing.categoryId,
                id: Not(listing.id), // Exclude current listing
                status: BusinessStatus.APPROVED,
            },
            take: Number(limit),
        });
    }

    /**
     * Update listing image URL
     */
    async updateImage(id: string, imageUrl: string, user: User): Promise<Listing> {
        const listing = await this.listingRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!listing) {
            throw new NotFoundException('Listing not found');
        }

        // Check ownership
        if (listing.vendor.userId !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Unauthorized access');
        }

        listing.coverImageUrl = imageUrl;
        await this.listingRepository.save(listing);

        return this.findOne(id);
    }

    /**
     * Get all available amenities
     */
    async getAllAmenities(): Promise<Amenity[]> {
        return this.amenityRepository.find({
            order: { name: 'ASC' },
        });
    }

    /**
     * Create a new amenity
     */
    async createAmenity(name: string, icon?: string): Promise<Amenity> {
        const existing = await this.amenityRepository.findOne({
            where: { name },
        });

        if (existing) {
            return existing;
        }

        const amenity = this.amenityRepository.create({
            name,
            icon: icon || 'Sparkles',
        });

        return this.amenityRepository.save(amenity);
    }
}
