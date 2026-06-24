'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
    FileText, 
    ArrowLeft, 
    Download, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';

const safeFormat = (date: any, formatStr: string, fallback = '—') => {
    if (!date) return fallback;
    const d = new Date(date);
    if (!isValid(d)) return fallback;
    return format(d, formatStr);
};

export default function BusinessInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [invoicesData] = await Promise.all([
                    api.subscriptions.getMyInvoices({ silent: true }),
                ]);
                setInvoices(invoicesData);
            } catch (err: any) {
                console.error('Failed to fetch billing data:', err);
                setError('Unable to load your billing history. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-green-600 bg-green-50 border-green-100';
            case 'pending': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'failed': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/offer-plans"
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Billing & Payments</h1>
                            <p className="text-sm text-gray-500">View your payment history</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full border border-orange-100">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">Secure Billing</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Invoices Table */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600 border border-orange-200">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Purchase History</h2>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice No.</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                No transactions found in your history.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((invoice: any) => (
                                            <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900">
                                                        {safeFormat(invoice.createdAt, 'MMM d, yyyy')}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {safeFormat(invoice.createdAt, 'HH:mm')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 truncate max-w-[220px]">
                                                        {invoice.subscription?.plan?.name || invoice.metadata?.planName || 'Feature Upgrade'}
                                                    </div>
                                                    <div className="text-[10px] text-orange-600 uppercase tracking-tighter font-black">
                                                        {invoice.subscription ? 'Recurring billing' : 'One-time upgrade'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                                                    <span className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                        {invoice.invoiceNumber || 'INV-PENDING'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="font-black text-gray-900">
                                                        <span className="text-[10px] text-gray-400 font-normal mr-1">{invoice.currency} </span>
                                                        {parseFloat(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(invoice.status)}`}>
                                                        {invoice.status?.toLowerCase() === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                                        {invoice.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button className="p-2 text-gray-400 hover:text-orange-600 transition-all rounded-xl hover:bg-orange-50 active:scale-95 group-hover:scale-110">
                                                        <Download className="w-5 h-5 shadow-sm" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
