"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Tag, Calendar } from "lucide-react";
import { api } from "../../lib/api";
import { visibilityDayCount } from "../../lib/location-detect";
import { checkoutVisibilityPayment } from "../../lib/visibility-pricing";

interface PlacementPaymentModalProps {
  offerItem: any; // Deal or Event
  onClose: () => void;
  onSuccess?: () => void;
}

export function PlacementPaymentModal({ offerItem, onClose, onSuccess }: PlacementPaymentModalProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default placement is 'offer' for deals and 'event' for events.
  const defaultPlacement = offerItem.type === "event" ? "event" : "offer";

  useEffect(() => {
    // Select default placement automatically
    setSelectedPlacements([defaultPlacement]);

    const fetchRules = async () => {
      try {
        const data = await api.promotions.getPricingRules({ silent: true });
        // Filter out the other default placement
        const filtered = data.filter(
          (r) => r.placement !== (offerItem.type === "event" ? "offer" : "event")
        );
        setRules(filtered || []);
      } catch (err: any) {
        console.error("Failed to fetch rules:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, [offerItem.type, defaultPlacement]);

  const togglePlacement = (placement: string) => {
    // Prevent unchecking the base placement to ensure they get listed properly,
    // as per our discussion about not allowing 0 placements.
    if (placement === defaultPlacement) return;

    setSelectedPlacements((prev) =>
      prev.includes(placement)
        ? prev.filter((p) => p !== placement)
        : [...prev, placement]
    );
  };

  const days = visibilityDayCount(offerItem.startDate, offerItem.endDate);

  const calculateTotal = () => {
    let total = 0;
    selectedPlacements.forEach((placement) => {
      const rule = rules.find((r) => r.placement === placement);
      if (rule) {
        total += Number(rule.pricePerDay) * days;
      }
    });
    return total;
  };

  const totalCost = calculateTotal();

  const handleCheckout = async () => {
    if (selectedPlacements.length === 0) {
      setError("Please select at least one placement to continue.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const payload: any = {
        startTime: offerItem.startDate,
        endTime: offerItem.endDate,
        placements: selectedPlacements,
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
        // Free / already paid
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
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Boost Your Visibility
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Select where you want your {offerItem.type} to appear.
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

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl mb-6">
                {error}
              </div>
            )}

            <div className="mb-6 flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl">
              <div className="flex items-center gap-3">
                {offerItem.type === "event" ? (
                  <Calendar className="w-5 h-5 text-orange-500" />
                ) : (
                  <Tag className="w-5 h-5 text-orange-500" />
                )}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-0.5">
                    Duration
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {days} Day{days > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  Base Total
                </div>
                <div className="text-lg font-black text-slate-900">
                  Rs {totalCost.toLocaleString()}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-4" />
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Loading Placements...
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Available Placements
                </div>
                {rules.map((rule) => {
                  const isSelected = selectedPlacements.includes(rule.placement);
                  const isDefault = rule.placement === defaultPlacement;
                  
                  // Make the labels more user friendly
                  let label = rule.placement;
                  let description = "Boost visibility on our platform.";
                  if (rule.placement === "homepage") {
                    label = "Homepage Featured";
                    description = "Appear prominently on the front page.";
                  } else if (rule.placement === "category") {
                    label = "Category Highlight";
                    description = "Top spot in your specific category.";
                  } else if (rule.placement === "listing") {
                    label = "Search Priority";
                    description = "Rank higher in search results.";
                  } else if (rule.placement === "offer" || rule.placement === "event") {
                    label = "Standard Listing";
                    description = "Required base visibility.";
                  }

                  return (
                    <div
                      key={rule.id}
                      onClick={() => togglePlacement(rule.placement)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/30"
                          : "border-slate-100 hover:border-orange-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-orange-500 border-orange-500"
                              : "border-slate-300 group-hover:border-orange-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                            {label}
                            {isDefault && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded-full uppercase tracking-widest">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-400 mt-0.5">
                            {description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900">
                          Rs {Number(rule.pricePerDay).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          / Day
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <button
              onClick={handleCheckout}
              disabled={processing || loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
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
