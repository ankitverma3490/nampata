"use client";

import { useAuth } from '../context/AuthContext';

export interface DashboardFeatures {
    showListings: boolean;
    showSaved: boolean;
    showFollowing: boolean;
    showQueries: boolean;
    showLeads: boolean;
    showOffers: boolean;
    showReviews: boolean;
    showAnalytics: boolean;
    showChat: boolean;
    showBroadcast: boolean;
    canRespondBroadcast?: boolean;
    canReplyReviews?: boolean;
    showDemand: boolean;
    showCustomerNotes?: boolean;
    canAddListing: boolean;
    maxListings?: number;
    maxKeywords?: number;
    maxOffers?: number;
    maxEvents?: number;
    maxFaqs?: number;
    maxSubCategories?: number;
    maxNamedPhoneNumbers?: number;
    canCreateAlbums?: boolean;
    isFeatured?: boolean;
    [key: string]: any;
}

export const usePlanFeature = () => {
    const { user } = useAuth();
    
    // In our system, getProfile attaches normalized activeSubscription to vendor
    const activeSub = user?.vendor?.activeSubscription;
    
    // Default features stay conservative until a real plan is available.
    const defaultFeatures: DashboardFeatures = {
        showListings: true,
        showSaved: false,
        showFollowing: false,
        showQueries: false,
        showLeads: false,
        showOffers: false,
        showReviews: false,
        showAnalytics: false,
        showCustomerNotes: false,
        showChat: false,
        showBroadcast: false,
        canRespondBroadcast: false,
        canReplyReviews: false,
        showDemand: false,
        canAddListing: true,
        maxListings: 1,
        maxOffers: 0,
        maxEvents: 0,
        maxKeywords: 0,
        maxFaqs: 0,
        maxSubCategories: 0,
        maxNamedPhoneNumbers: 0,
        canCreateAlbums: false,
        isFeatured: false,
    };

    const features: DashboardFeatures = activeSub?.plan?.dashboardFeatures || defaultFeatures;
    const getFeatureValue = (featureName: string): any => {
        if (user?.role === 'admin' || user?.role === 'superadmin') {
            if (featureName.startsWith('max')) return 999999;
            return true;
        }
        const value = features[featureName];
        if (featureName.startsWith('max')) {
            if (featureName === 'maxSubCategories') {
                const numeric = Number(value ?? 0);
                const fallbackFromCategories = Number((features as any).maxCategories ?? 0);
                if (numeric > 0) return numeric;
                if (fallbackFromCategories > 0) return Math.max(0, fallbackFromCategories - 1);
                return 0;
            }
            if (featureName === 'maxNamedPhoneNumbers') {
                return Number(value ?? (features as any).maxAdditionalPhones ?? 0);
            }
            return Number(value ?? 0);
        }
        return value;
    };

    const hasFeature = (featureName: keyof DashboardFeatures): boolean => {
        // Admins/Superadmins bypass all gating
        if (user?.role === 'admin' || user?.role === 'superadmin') return true;

        // Standard users bypass gating for core community features
        if (user?.role === 'user' && ['showChat', 'showSaved', 'showFollowing', 'showReviews'].includes(featureName as string)) {
            return true;
        }

        const key = featureName as string;
        if (key.startsWith('max')) {
            return Number(getFeatureValue(key) || 0) > 0;
        }

        // If it's a vendor, check their active plan features
        return !!features[featureName];
    };

    return {
        hasFeature,
        getFeatureValue,
        features,
        planName: activeSub?.plan?.name || 'Free',
        isFree: (user?.role !== 'admin' && user?.role !== 'superadmin') && (!activeSub || activeSub.plan?.planType?.toLowerCase() === 'free' || activeSub.plan?.name?.toLowerCase().includes('free')),
        loading: !user,
    };
};
