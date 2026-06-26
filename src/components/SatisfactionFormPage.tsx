import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { findTenantAndDefibGlobally, fetchRawCollectionFromFirestore, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { t } from '../utils/translate';
import { getParisTimestamp } from '../utils/dateUtils';

export default function SatisfactionFormPage() {
  const [defibId, setDefibId] = useState('');
  const [nomPrenom, setNomPrenom] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [mention, setMention] = useState<'Excellent' | 'Parfait' | 'Moyen' | 'Décevant' | 'Médiocre'>('Excellent');
  
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [isIdValid, setIsIdValid] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live lookup check of defibrillator identifier against main software's registry
  useEffect(() => {
    const trimmed = defibId.trim();
    if (!trimmed) {
      setIsIdValid(null);
      return;
    }

    setIsCheckingId(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const result = await findTenantAndDefibGlobally(trimmed);
        if (result && result.exists) {
          setIsIdValid(true);
        } else {
          setIsIdValid(false);
        }
      } catch (err) {
        console.error("Error checking ID on satisfaction form:", err);
        setIsIdValid(false);
      } finally {
        setIsCheckingId(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounce);
  }, [defibId]);

  // Combined validity check
  const isFormValid = useMemo(() => {
    return defibId.trim().length > 0 &&
           nomPrenom.trim().length > 0 &&
           commentaire.trim().length > 0 &&
           isIdValid === true &&
           !isCheckingId;
  }, [defibId, nomPrenom, commentaire, isIdValid, isCheckingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Locate the correct tenant owning the defibrillator identification
      const tenantInfo = await findTenantAndDefibGlobally(defibId);
      if (!tenantInfo) {
        setErrorMessage("Erreur: Impossible de localiser le propriétaire de ce défibrillateur.");
        setIsSubmitting(false);
        return;
      }

      const { tenantId } = tenantInfo;

      // 2. Add the customer review to that specific tenant's customerReviews partition in firestore
      const key = tenantId === 'demo' ? 'customerReviews' : `${tenantId}_customerReviews`;
      const existingReviews = await fetchRawCollectionFromFirestore<any[]>(key) || [];

      const newReview = {
        id: 'rev-' + Date.now(),
        clientName: nomPrenom.trim(),
        comment: commentaire.trim(),
        label: mention,
        dateStr: new Date().toISOString().split('T')[0]
      };

      const updatedList = [newReview, ...existingReviews];

      // Update firestore doc
      await setDoc(doc(db, 'appData', key), { value: updatedList });

      // Generate a corresponding notification for the tenant
      try {
        const notifKey = tenantId === 'demo' ? 'notifications' : `${tenantId}_notifications`;
        const existingNotifications = await fetchRawCollectionFromFirestore<any[]>(notifKey) || [];
        const client_denomination = nomPrenom.trim() || "Un client anonyme";
        const label_review = mention;
        const comment_text = commentaire.trim() ? ` (${commentaire.trim()})` : "";
        const newNotif = {
          id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          category: 'Système',
          title: `Le client ${client_denomination} signale sa satisfaction avec la mention : ${label_review}${comment_text}.`,
          timestamp: getParisTimestamp(),
          situation: 'Nouveau',
        };
        const updatedNotifs = [newNotif, ...existingNotifications];
        await setDoc(doc(db, 'appData', notifKey), { value: updatedNotifs });

        const currentActiveTenant = localStorage.getItem('defib_tenant_id') || 'demo';
        if (currentActiveTenant === tenantId) {
          localStorage.setItem(`defib_${tenantId}_notifications`, JSON.stringify(updatedNotifs));
        }
      } catch (notifErr) {
        console.warn("Failed to save corresponding system notification:", notifErr);
      }

      // Update local storage if the currently loaded tenant matches the target tenant
      const currentActiveTenant = localStorage.getItem('defib_tenant_id') || 'demo';
      if (currentActiveTenant === tenantId) {
        localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(updatedList));
      }

      setIsSubmitted(true);
      // Optional: clear inputs
      setDefibId('');
      setNomPrenom('');
      setCommentaire('');
      setMention('Excellent');
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setErrorMessage("Une erreur est survenue lors de l'enregistrement de votre évaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative" id="satisfaction-viewport-wrapper">
      <style>{`
        body {
          background: #ffffff !important;
        }

        #satisfaction-card input, #satisfaction-card select, #satisfaction-card textarea {
          border: 1px solid #dedede !important;
          border-radius: 13px !important;
          padding: 14px !important;
          font-size: 16px !important;
          font-weight: 300 !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          outline: none !important;
          transition: 0s !important;
          font-family: 'DefibeoMain', 'Civilprom', sans-serif !important;
        }

        #satisfaction-card button {
          transition: 0s !important;
        }

        #satisfaction-card input:focus, #satisfaction-card select:focus, #satisfaction-card textarea:focus, #satisfaction-card button[type="submit"]:focus,
        #satisfaction-card input:hover, #satisfaction-card select:hover, #satisfaction-card textarea:hover, #satisfaction-card button[type="submit"]:hover {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 3px !important;
        }
      `}</style>

      <div className="sm:mx-auto w-full max-w-md">
        {/* Outer Container with white background, without box-shadow/border as requested */}
        <div className="bg-white p-2 sm:p-4 relative overflow-hidden" id="satisfaction-card">
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {errorMessage && (
              <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-sans">
                {errorMessage}
              </div>
            )}

            {/* ID DEFIB FIELD */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="defib_id" className="text-sm font-bold text-slate-700 font-sans">
                {t("Identifiant du défibrillateur.")}
              </label>
              <input
                id="defib_id"
                type="text"
                required
                placeholder={t("Ex: ABC-D00-123.")}
                value={defibId}
                onChange={(e) => setDefibId(e.target.value)}
                className="w-full text-black"
              />
              
              {isCheckingId && (
                <p className="text-[16px] text-red-600 font-bold font-sans mt-0.5">
                  {t("Vérification de l'identifiant...")}
                </p>
              )}
              {!isCheckingId && isIdValid === true && (
                <p className="text-[16px] text-red-600 font-bold font-sans mt-0.5">
                  {t("Identifiant défibrillateur valide.")}
                </p>
              )}
              {!isCheckingId && isIdValid === false && (
                <p className="text-[16px] text-red-600 font-bold font-sans mt-0.5">
                  {t("Identifiant défibrillateur invalide.")}
                </p>
              )}
            </div>

            {/* NOM PRENOM */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nom_prenom" className="text-sm font-bold text-slate-700 font-sans">
                {t("Votre nom et prénom.")}
              </label>
              <input
                id="nom_prenom"
                type="text"
                required
                placeholder={t("Ex: Jean Dupont.")}
                value={nomPrenom}
                onChange={(e) => setNomPrenom(e.target.value)}
                className="w-full text-black"
              />
            </div>

            {/* MENTION (RATING) EMOTIONS BUTTON PILLS */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 font-sans">
                {t("Sélectionnez une mention.")}
              </label>
              <div className="grid grid-cols-2 gap-2 text-center">
                {(['Excellent', 'Parfait', 'Moyen', 'Décevant', 'Médiocre'] as const).map((opt) => {
                  const isSelected = mention === opt;
                  
                  // Blue theme colors and shadows for selection
                  const btnStyle: React.CSSProperties = isSelected
                    ? {
                        backgroundColor: 'rgb(53, 86, 236)',
                        color: '#ffffff',
                        boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '18px',
                        padding: '12px 14px',
                        fontWeight: '100',
                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                        cursor: 'pointer',
                        transition: '0s',
                      }
                    : {
                        backgroundColor: '#f1f5f9', // grey
                        color: '#475569', // grey text
                        border: '1px solid #cbd5e1', // grey border
                        borderRadius: '12px',
                        fontSize: '18px',
                        padding: '12px 14px',
                        fontWeight: '100',
                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                        cursor: 'pointer',
                        transition: '0s',
                      };

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMention(opt)}
                      style={btnStyle}
                      className="active:scale-98"
                    >
                      {t(opt)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COMMENTAIRE */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="commentaire" className="text-sm font-bold text-slate-700 font-sans">
                {t("Commentaire.")}
              </label>
              <textarea
                id="commentaire"
                required
                rows={4}
                placeholder={t("Entrez votre commentaire.")}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full text-black"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                backgroundColor: isFormValid && !isSubmitting ? 'rgb(53, 86, 236)' : '#cbd5e1',
                color: isFormValid && !isSubmitting ? '#ffffff' : '#64748b',
                boxShadow: isFormValid && !isSubmitting 
                  ? 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                  : 'none',
                borderRadius: '12px',
                fontSize: '18px',
                padding: '14px 20px',
                fontWeight: '100',
                fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                transition: '0s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                border: 'none',
                width: '100%',
              }}
            >
              {isSubmitting ? t("Enregistrement...") : t("Valider")}
            </button>

            {/* Form submission success feedback directly below validation button */}
            {isSubmitted && (
              <p className="mt-4 text-center text-[16px] font-semibold text-red-600 font-sans">
                {t("Évaluation enregistrée avec succès, vous pouvez fermer la page.")}
              </p>
            )}
          </form>

        </div>
      </div>
    </div>
  );
}
