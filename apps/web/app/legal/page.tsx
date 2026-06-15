import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, Shield, ChevronRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const legalDocuments = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: 'How NAAMPATA collects, uses, stores, and protects personal data.',
  },
  {
    slug: 'terms-users',
    title: 'Terms of Service (Users)',
    description: 'Rules and contract terms for all users of the platform.',
  },
  {
    slug: 'terms-business',
    title: 'Business Terms of Service',
    description: 'Terms that apply to business owners and business accounts.',
  },
  {
    slug: 'refund-policy',
    title: 'Subscription & Refund Policy',
    description: 'Billing, cancellations, renewals, and refund handling.',
  },
  {
    slug: 'content-moderation',
    title: 'Content Moderation Policy',
    description: 'How listings, reviews, reports, and removals are moderated.',
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    description: 'How cookies and similar tracking technologies are used.',
  },
  {
    slug: 'dpa',
    title: 'Data Processing Agreement',
    description: 'Processing terms for enterprise clients and partners.',
  },
  {
    slug: 'affiliate-policy',
    title: 'Affiliate Commission Policy',
    description: 'Rules, eligibility, and commission handling for affiliates.',
  },
  {
    slug: 'dmca',
    title: 'IP & Copyright (DMCA) Policy',
    description: 'Copyright complaints, trademark issues, and takedown process.',
  },
];

export const metadata: Metadata = {
  title: 'Legal Documents | naampata',
  description: 'Browse NAAMPATA legal documents, policies, and platform terms.',
};

export default function LegalIndexPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#112D4E] via-[#1a3f6b] to-[#2D3E50] py-24 px-4">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FF7A30]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-5xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm border border-white/10">
              <Shield className="w-3.5 h-3.5 text-[#FF7A30]" /> Legal Suite
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              NAAMPATA Legal <span className="text-[#FF7A30]">Documents</span>
            </h1>
            <p className="max-w-3xl mx-auto text-white/75 font-semibold leading-relaxed">
              Browse all public legal policies, platform terms, privacy documents, and compliance pages in one place.
            </p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {legalDocuments.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/legal/${doc.slug}`}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF7A30] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-black text-[#112D4E] group-hover:text-[#FF7A30] transition-colors">
                          {doc.title}
                        </h2>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#FF7A30] group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
