"use client";

import Link from 'next/link';
import { ArrowRight, CheckCircle, Info } from 'lucide-react';

export default function VerificationsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Verifications</h1>
                <p className="text-slate-500 font-bold mt-2">Listings no longer wait for manual approval before going live.</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 lg:p-10">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Info className="w-7 h-7" />
                    </div>
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Automatic Listing Approval Is Active</h2>
                            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                                New listings now go live automatically when they contain valid coordinates. Listings without coordinates
                                enter the background geocoding flow and become live as soon as location resolution completes.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                <div className="flex items-center gap-2 text-emerald-600 font-black">
                                    <CheckCircle className="w-5 h-5" />
                                    Instant Live
                                </div>
                                <p className="text-sm text-slate-500 font-medium mt-2">
                                    Listings with complete map coordinates are approved immediately.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                <div className="flex items-center gap-2 text-blue-600 font-black">
                                    <Info className="w-5 h-5" />
                                    Geocode Queue
                                </div>
                                <p className="text-sm text-slate-500 font-medium mt-2">
                                    Address-only submissions wait for geocoding, not for manual admin approval.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                <div className="flex items-center gap-2 text-amber-600 font-black">
                                    <ArrowRight className="w-5 h-5" />
                                    Admin Moderation
                                </div>
                                <p className="text-sm text-slate-500 font-medium mt-2">
                                    Admins now intervene only for suspend, reject, restore, featured, and abuse cases.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Link
                                href="/admin/businesses?status=approved"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all"
                            >
                                Open Live Listings
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/admin/businesses"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-black text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                            >
                                Open Business Management
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
