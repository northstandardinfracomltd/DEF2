import React, { useState } from 'react';
import { t } from '../utils/translate';
import HelpBubble from './HelpBubble';

interface Review {
  id: string;
  clientName: string;
  comment: string;
  label: string;
  dateStr?: string;
}

interface SatisfactionTabProps {
  customerReviews: Review[];
  onUpdateReviews: (updated: Review[]) => void;
}

export default function SatisfactionTab({
  customerReviews,
  onUpdateReviews,
}: SatisfactionTabProps) {
  // Search States
  const [search, setSearch] = useState('');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // Helper date formatter
  const formatToDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleDeleteReview = (id: string) => {
    const updated = customerReviews.filter(r => r.id !== id);
    onUpdateReviews(updated);
    setDeleteReviewId(null);
  };

  // Brand aesthetic styling constants matching other panels
  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
  };

  const rowActionButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '10px',
    fontSize: '18px',
    padding: '9px 19px',
    fontWeight: '100',
    transition: 'all 0s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
  };

  const searchInputStyle: React.CSSProperties = {
    border: '1px solid #dedede',
    borderRadius: '13px',
    padding: '9px 19px',
    fontSize: '18px',
    fontWeight: '100',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    outline: (isSearchHovered || isSearchFocused) ? '2.5px solid #fa53d5' : 'none',
    outlineOffset: (isSearchHovered || isSearchFocused) ? '2px' : '0px',
    transition: 'all 0s',
  };

  // Searching logic
  const filteredReviews = customerReviews.filter((rev) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      rev.clientName.toLowerCase().includes(q) ||
      rev.comment.toLowerCase().includes(q) ||
      rev.label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="satisfaction-tab-container-harmonized">
      <style>{`
        #satisfaction-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):not(#search-satisfaction-input) {
          padding: 12px !important;
          border: 1px solid #dedede !important;
          border-radius: 13px !important;
          font-size: 16px !important;
          font-weight: 100 !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          box-sizing: border-box !important;
          outline: none !important;
          transition: all 0s !important;
        }
        #satisfaction-tab-container-harmonized input#search-satisfaction-input {
          font-size: 18px !important;
        }
        #satisfaction-tab-container-harmonized input#search-satisfaction-input::placeholder {
          font-size: 18px !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          font-weight: 100 !important;
        }
        #satisfaction-tab-container-harmonized #search-satisfaction-input:hover,
        #satisfaction-tab-container-harmonized #search-satisfaction-input:focus {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }
      `}</style>
      
      {/* Header Box aligned with other modules */}
      <div 
        className="bg-white space-y-4 animate-fadeIn"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" style={{ color: '#000000', cursor: 'default' }} id="satisfaction-tab-title">{t("Satisfaction")}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white">
            {/* Search Bar Input */}
            <div className="relative w-full sm:w-80 bg-white">
              <input
                type="text"
                id="search-satisfaction-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Recherche.")}
                className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                style={searchInputStyle}
                onMouseEnter={() => setIsSearchHovered(true)}
                onMouseLeave={() => setIsSearchHovered(false)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>
        </div>
      </div>

      <HelpBubble 
        cacheKey="help_dismissed_satisfaction" 
        text="Retrouvez ici les retours de vos clients suite au lien envoyé après chaque intervention. Ces données permettent de mesurer la satisfaction globale et d'identifier d'éventuels points d'amélioration pour vos services. Chaque retour est horodaté et associé à l'évaluation donnée par le client." 
      />

      {/* Main Table Content */}
      <div className="bg-white overflow-hidden mt-6 rounded-none animate-fadeIn" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
        <div className="overflow-x-auto">
          {filteredReviews.length === 0 ? (
            <div className="p-16 text-center font-sans lg:py-24" id="no-reviews-view">
              <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                {t("Aucun résultat.")}
              </p>
            </div>
          ) : (
            <table className="w-full text-left font-sans border-collapse text-xs" id="satisfaction-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
              <thead>
                <tr className="bg-transparent">
                  <th className="px-5 py-3.5 w-32 whitespace-nowrap" style={thStyle}>{t("Date.")}</th>
                  <th className="px-5 py-3.5 w-1/4" style={thStyle}>{t("Rédacteur.")}</th>
                  <th className="px-5 py-3.5" style={thStyle}>{t("Évaluation.")}</th>
                  <th className="px-5 py-3.5 text-left w-48" style={thStyle}>{t("Satisfaction.")}</th>
                  <th className="px-5 py-3.5 text-right w-24" style={thStyle}>{t("Action.")}</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-xs text-black">
                {filteredReviews.map((rev) => {
                  const truncatedClientName = rev.clientName.length > 15 
                    ? `${rev.clientName.substring(0, 15)}...` 
                    : rev.clientName;

                  const truncatedComment = rev.comment.length > 200 
                    ? `${rev.comment.substring(0, 200)}...` 
                    : rev.comment;

                  return (
                    <tr key={rev.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                      
                      {/* Date of review */}
                      <td className="px-5 py-5 font-sans align-middle cursor-default" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                        <div className="text-black" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                          {formatToDisplayDate(rev.dateStr) || '-'}
                        </div>
                      </td>

                      {/* Customer Info (Rédacteur) */}
                      <td className="px-5 py-5 font-sans align-middle cursor-default" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                        <div className="font-bold text-black" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                          {truncatedClientName}
                        </div>
                      </td>
 
                      {/* Comment (Évaluation) */}
                      <td className="px-5 py-5 font-sans align-middle cursor-default" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                        <div className="text-black" style={{ color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                          {truncatedComment}
                        </div>
                      </td>
 
                      {/* Badge evaluation status (Satisfaction) */}
                      <td className="px-5 py-5 text-left align-middle whitespace-nowrap">
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '1000px',
                            backgroundColor: 'rgb(74, 19, 80)',
                            border: '1px solid rgb(74, 19, 80)',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 600,
                            padding: '6px 14px',
                            whiteSpace: 'nowrap',
                            fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                            cursor: 'default'
                          }}
                        >
                          {t(rev.label)}
                        </span>
                      </td>
 
                      {/* Actions (Action) */}
                      <td className="px-5 py-5 text-right align-middle whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          style={rowActionButtonStyle}
                          className="cursor-pointer font-sans bg-transparent hover:opacity-80 transition-all"
                        >
                          <span>{t("Supprimer")}</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
