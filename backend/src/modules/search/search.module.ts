import { Module, Logger } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { SearchService } from './search.service';
import { SearchLocationService } from './search-location.service';
import { SearchController } from './search.controller';
import { Listing } from '../../entities/business.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DemandModule } from '../demand/demand.module';

function isValidUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

@Module({
    imports: [
        TypeOrmModule.forFeature([Listing]),
        NotificationsModule,
        DemandModule,
        CacheModule.register(),
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const enabled = configService.get<string>('ELASTICSEARCH_ENABLED') === 'true';
                const rawNode = configService.get<string>('ELASTICSEARCH_NODE');

                // If disabled or URL invalid, use a dummy URL so DI doesn't crash
                // SearchService.onModuleInit will catch the connection failure gracefully
                if (!enabled || !isValidUrl(rawNode)) {
                    return {
                        node: 'http://localhost:9200',
                        auth: { username: 'elastic', password: '' },
                        tls: { rejectUnauthorized: false },
                    };
                }

                const apiKey = configService.get<string>('ELASTICSEARCH_API_KEY');
                const auth: any = apiKey
                    ? { apiKey }
                    : {
                        username: configService.get<string>('ELASTICSEARCH_USERNAME') || 'elastic',
                        password: configService.get<string>('ELASTICSEARCH_PASSWORD') || '',
                    };

                return {
                    node: rawNode,
                    auth,
                    tls: {
                        rejectUnauthorized: configService.get<string>('ELASTICSEARCH_REJECT_UNAUTHORIZED') !== 'false',
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [SearchController],
    providers: [SearchService, SearchLocationService],
    exports: [SearchService, SearchLocationService],
})
export class SearchModule { }
