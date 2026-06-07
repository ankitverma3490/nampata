"use client";

import React, { useState, useEffect } from 'react';
import {
    Users,
    ListTree,
    TrendingUp,
    Briefcase,
    MessageSquare,
    ShieldAlert,
    ChevronRight,
    Eye,
    Store
} from 'lucide-react';
import { api } from '../../lib/api';
import StatsGrid from '../../components/business/StatsGrid';
import { Business } from '../../types/api';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentBusinesses, setRecentBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsData, businessesData] = await Promise.all([
                api.admin.getStats(),
                api.admin.getBusinesses(1, 10, 'approved')
            ]);
            setStats(statsData);
            setRecentBusinesses(businessesData.data || []);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const mappedStats = [
        {
            label: 'Total Users',
            value: stats?.totalUsers || '0',
            icon: Users,
            color: 'bg-gradient-to-br from-[#EE4444] to-[#CC2222] text-white',
            shadow: 'shadow-red-500/20'
        },
        {
            label: 'Total Businesses',
            value: stats?.totalBusinesses || '0',
            icon: Briefcase,
            color: 'bg-gradient-to-br from-[#3366CC] to-[#1144AA]',
            shadow: 'shadow-blue-500/20'
        },
        {
            label: 'Total Reviews',
            value: stats?.totalReviews || '0',
            icon: MessageSquare,
            color: 'bg-gradient-to-br from-[#33AA88] to-[#118866]',
            shadow: 'shadow-emerald-500/20'
        },
        {
            label: 'Active Subscriptions',
            value: stats?.activeSubscriptions || '0',
            icon: TrendingUp,
            color: 'bg-gradient-to-br from-[#FFAA33] to-[#FF8811]',
            shadow: 'shadow-orange-500/20'
        },
    ];

    if (loading) return <div className="p-10 text-slate-400 font-bold uppercase tracking-widest text-center">Loading Admin Dashboard...</div>;

    return (
        <div className="space-y-12 pb-20">
            {/* Admin Header */}
            <div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">System Administration</h1>
                <p className="text-slate-400 font-bold tracking-tight text-lg">Manage users, businesses, and platform health.</p>
            </div>

            {/* Global Stats */}
            <StatsGrid stats={mappedStats} />

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Businesses */}
                <div className="bg-white rounded-[16px] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recently Approved Listings</h3>
                            <p className="text-xs text-slate-400 font-bold">Auto-approved listings now go live without manual review</p>
                        </div>
                        <Link href="/admin/businesses?status=approved" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors flex items-center gap-2">
                            Manage All <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {recentBusinesses.length > 0 ? (
                            recentBusinesses.map((business) => (
                                <div key={business.id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
                                            {business.logoUrl ? (
                                                <img src={business.logoUrl} alt={business.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <ListTree className="w-6 h-6 text-blue-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-tight">{business.title}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                Owner: {business.vendor?.user?.fullName || business.vendor?.businessName || 'Business Owner'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                                {business.category?.name || 'Uncategorized'} · {business.city}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href="/admin/businesses?status=approved"
                                            className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-90 shadow-lg shadow-slate-900/20"
                                            title="Open Business Management"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                    <Store className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Listings Auto-Live</p>
                                <p className="text-slate-300 text-xs mt-1">New approved listings will appear here after automatic approval.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* System Tasks Placeholder */}
                <div className="bg-slate-900 rounded-[16px] p-8 text-white shadow-2xl shadow-red-500/10">
                    <h3 className="text-2xl font-black mb-8 tracking-tight text-white">Critical Actions</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-dark">
                        <Link href="/admin/reports" className="w-full p-6 bg-white/5 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all text-left block">
                            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                                <ShieldAlert className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <p className="font-bold">Moderate Reported Content</p>
                                <p className="text-xs text-slate-400">Manage community reports</p>
                            </div>
                        </Link>
                        <Link href="/admin/qa" className="w-full p-6 bg-white/5 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all text-left block">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="font-bold">Q&A Moderation</p>
                                <p className="text-xs text-slate-400">Review pending community questions</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

