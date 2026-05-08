"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Loader2, Phone, Megaphone } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

function RegisterForm() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register, googleLogin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedRole, setSelectedRole] = useState<'user' | 'vendor'>('user');

    useEffect(() => {
        const queryRole = searchParams.get('role');
        const ref = searchParams.get('ref');

        // Priority for referral code: URL 'ref' parameter -> session storage fallback
        if (ref) {
            setReferralCode(ref);
            setSelectedRole('vendor'); // Auto-switch to vendor role for referrals
        } else if (typeof window !== 'undefined') {
            const storedRef = sessionStorage.getItem('referralCode');
            if (storedRef) {
                setReferralCode(storedRef);
                setSelectedRole('vendor');
            }
        }

        if (queryRole === 'vendor') {
            setSelectedRole('vendor');
        } else if (queryRole === 'user') {
            setSelectedRole('user');
        }
    }, [searchParams]);

    const handleGoogleSignup = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                await googleLogin(tokenResponse.access_token, selectedRole, referralCode);
            } catch (err: any) {
                setError(err.message || 'Google registration failed. Please try again.');
            } finally {
                setLoading(false);
            }
        },
        onError: () => setError('Google registration failed. Please try again.'),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register({
                fullName,
                email,
                phone,
                password,
                role: selectedRole,
                referralCode: selectedRole === 'vendor' ? referralCode : undefined
            });
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />

            <main className="flex-grow flex items-center justify-center px-4 py-10 relative overflow-hidden">
                {/* Background Accents */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[128px] pointer-events-none" />

                <div className="max-w-md w-full relative z-10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
                            {selectedRole === 'vendor' ? 'Grow Your Business' : 'Join naampata'}
                        </h1>
                        <p className="text-slate-500 font-medium">
                            {selectedRole === 'vendor'
                                ? 'Register as a vendor to start listing your services'
                                : 'Start exploring and connecting with your community'}
                        </p>
                    </div>

                    <div className="bg-white rounded-[20px] border border-slate-100 p-8 md:p-10 shadow-2xl shadow-blue-500/5">
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8 border border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedRole('user')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest ${selectedRole === 'user' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                User Account
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedRole('vendor')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest ${selectedRole === 'vendor' ? 'bg-white text-[#FF7A30] shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Business Account
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 italic">
                                {error}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        required
                                        type="text"
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-slate-900 font-bold transition-all outline-none"
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        required
                                        type="tel"
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-slate-900 font-bold transition-all outline-none"
                                        placeholder="+1 234 567 890"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        required
                                        type="email"
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-slate-900 font-bold transition-all outline-none"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        required
                                        type="password"
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-slate-900 font-bold transition-all outline-none"
                                        placeholder="At least 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {selectedRole === 'vendor' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                                    <div className="relative">
                                        <Megaphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <input
                                            type="text"
                                            className="w-full pl-14 pr-6 py-4 bg-blue-50/30 border-2 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-slate-900 font-bold transition-all outline-none uppercase placeholder:normal-case"
                                            placeholder="Enter your expert's code"
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3 px-1 leading-5">
                                <input required type="checkbox" className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer mt-0.5" />
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
                                    I agree to the <Link href="/terms" className="text-blue-600 hover:text-blue-700 transition-colors">Terms</Link> and <Link href="/privacy" className="text-blue-600 hover:text-blue-700 transition-colors">Privacy Policy</Link>
                                </p>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all  active:scale-95 disabled:opacity-50 text-white ${selectedRole === 'vendor' ? 'bg-[#FF7A30] hover:bg-black shadow-orange-500/10' : 'bg-[#112D4E] hover:bg-black shadow-slate-900/10'}`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        {selectedRole === 'vendor' ? 'Register Business' : 'Create Account'}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-300 bg-white px-4">Or continue with</div>
                        </div>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleGoogleSignup()}
                            className="w-full py-4 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-sm flex items-center justify-center gap-4 transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Sign up with Google
                        </button>

                        
                    </div>

                    <p className="mt-8 text-center text-sm text-slate-500 font-bold">
                        Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors">Log in here</Link>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
