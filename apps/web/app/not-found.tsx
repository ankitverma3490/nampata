"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search, MapPin, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-50 rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
        {/* Animated 404 Illustration */}
        <div className="relative inline-block">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[12rem] md:text-[16rem] font-black leading-none text-slate-900 tracking-tighter select-none"
          >
            404
          </motion.h1>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-red-500 rounded-[28px] flex items-center justify-center shadow-2xl shadow-red-500/40 rotate-12"
          >
            <AlertCircle className="w-12 h-12 text-white" />
          </motion.div>
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Lost in the Neighborhood?
          </h2>
          <p className="text-slate-500 font-bold text-lg max-w-md mx-auto leading-relaxed">
            The page you're looking for has moved out, or never existed in this
            directory. Let's get you back on track.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
        >
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 transition-all active:scale-95 group"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
          <Link
            href="/search"
            className="w-full sm:w-auto px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <Search className="w-5 h-5" />
            Search Businesses
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          <Link
            href="/categories"
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
          >
            <MapPin className="w-3 h-3 text-red-500" /> Browse Categories
          </Link>
          <Link
            href="/about"
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            Support
          </Link>
        </motion.div>
      </div>

      {/* Decorative Branding */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-10 pointer-events-none">
        <span className="text-4xl font-black italic tracking-tighter text-slate-900">
          naampata
        </span>
      </div>
    </div>
  );
}
