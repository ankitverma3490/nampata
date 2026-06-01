"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Search, Users, Lock, UserCheck } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { FeatureGate } from '../../../components/business/FeatureGate';
import BusinessCard from '../../../components/BusinessCard';
import { Business } from '../../../types/api';
import Link from 'next/link';

export default function FollowingPage() {
    const { user } = useAuth();
    const [followedBusinesses, setFollowedBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFollowed = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const response = await api.follows.myFollows();
                setFollowedBusinesses(response.data || []);
            } catch (error) {
                console.error('Error fetching followed businesses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFollowed();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest">Loading your following...</p>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                    <Bell className="w-10 h-10 text-slate-300" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Please Log In</h1>
                <p className="text-slate-400 font-bold max-w-md text-lg mb-8">You need to be logged in to view the businesses you follow.</p>
                <Link href="/login" className="px-10 py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 shadow-violet-500/20 transition-all active:scale-95">
                    Login Now
                </Link>
            </div>
        );
    }

    return (
        <FeatureGate feature="showFollowing" title="Unlock Following List" description="Keep track of your favorite local businesses and potential partners. Build your community network today.">
            <div className="space-y-12 pb-20">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight flex items-center gap-4">
                        Following <Bell className="w-8 h-8 text-violet-500 fill-violet-500" />
                    </h1>
                    <p className="text-slate-400 font-bold tracking-tight text-lg">Stay updated with your favorite businesses and partners.</p>
                </div>

                {followedBusinesses.length > 0 ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {followedBusinesses.map((biz) => (
                            <BusinessCard
                                key={biz.id}
                                business={biz}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center px-4">
                        <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-violet-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">You aren't following anyone yet</h3>
                        <p className="text-slate-400 font-bold max-w-sm mb-10">Follow businesses to get updates, special offers, and stay in touch with their latest activity.</p>
                        <Link href="/search" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-95">
                            Discover Businesses
                        </Link>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}

