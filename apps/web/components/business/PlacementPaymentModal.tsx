"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Tag, Calendar } from "lucide-react";
import { api } from "../../lib/api";
import { visibilityDayCount } from "../../lib/location-detect";
import { checkoutVisibilityPayment } from "../../lib/visibility-pricing";

interface PlacementPaymentModalProps {
  offerItem: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PlacementPaymentModal({ offerItem, onClose, onSuccess }: PlacementPaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayRate, setDayRate] = useState(0);

  const placement = offerItem.type === "event" ? "event" : "offer";

  useEffect(() => {
    const fetchDayRate = async () => {
      try {
        const res = await api.promotions.getVisibilityRate(offerItem.type);
        setDayRate(Number(res?.dayRate) || 0);
      } catch {
        setDayRate(150);
      } finally {
        setLoading(false);
      }
    };
    fetchDayRate();
  }, [offerItem.type]);

  const days = visibilityDayCount(offerItem.startDate, offerItem.endDate);
  const totalCost = dayRate * days;

  const handleCheckout = async () => {
    setProcessing(true);
    setError(null);
    try {
      const payload: any = {
        startTime: offerItem.startDate,
        endTime: offerItem.endDate,
        placements: [placement],
      };

      if (offerItem.type === "event") {
        payload.eventId = offerItem.id;
      } else {
        payload.dealId = offerItem.id;
      }

      const checkout = await checkoutVisibilityPayment(payload);
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment");
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={processing ? undefined : onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Pay for Visibility
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Complete payment to publish your {offerItem.type}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl mb-6">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl">
              <div className="flex items-center gap-3">
                {offerItem.type === "event" ? (
                  <Calendar className="w-5 h-5 text-orange-500" />
                ) : (
                  <Tag className="w-5 h-5 text-orange-500" />
                )}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-0.5">Duration</div>
                  <div className="text-sm font-black text-slate-900">{days} Day{days > 1 ? "s" : ""}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total</div>
                <div className="text-lg font-black text-slate-900">Rs {totalCost.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button
              onClick={handleCheckout}
              disabled={processing || loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <>Pay Rs {totalCost.toLocaleString()}</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
