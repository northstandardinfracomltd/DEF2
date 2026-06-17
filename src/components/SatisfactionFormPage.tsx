import React, { useState, useEffect, useMemo } from 'react';
import { ThumbsUp, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { findTenantAndDefibGlobally, fetchRawCollectionFromFirestore, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

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

  // Live lookup check of defibrillator identifier against main software's registry, same as Login.tsx
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
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative" id="satisfaction-viewport-wrapper">
      <style>{`
        body {
          background: radial-gradient(#7e2e86, #36093a) !important;
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
          transition: all 0.15s ease-in-out !important;
          font-family: 'DefibeoMain', 'Civilprom', sans-serif !important;
        }

        #satisfaction-card input:focus, #satisfaction-card select:focus, #satisfaction-card textarea:focus {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          border-color: transparent !important;
        }

        #satisfaction-card input::placeholder, #satisfaction-card textarea::placeholder {
          font-weight: 100 !important;
          color: #a0a0a0 !important;
          font-size: 16px !important;
          font-family: 'DefibeoMain', 'Civilprom', sans-serif !important;
        }
      `}</style>

      <div className="sm:mx-auto w-full max-w-md">
        {/* Simple Brand Header similar to Login.tsx */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
            <ThumbsUp className="h-8 w-8 text-neutral-100" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "DefibeoMain, Civilprom, sans-serif" }}>
            Défibeo
          </h2>
          <p className="mt-2 text-sm text-neutral-300 font-sans">
            Évaluation de la satisfaction de nos prestations
          </p>
        </div>

        {/* Outer White Card following same aesthetic */}
        <div className="bg-white rounded-[24px] shadow-2xl p-8 border border-white/10 relative overflow-hidden" id="satisfaction-card">
          
          {isSubmitted ? (
            <div className="text-center py-6 animate-fadeIn">
              <div className="mx-auto h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 font-sans">
                Évaluation enregistrée avec succès.
              </h3>
              <p className="mt-3 text-sm text-slate-500 font-sans">
                Merci énormément pour votre temps précieux et votre confiance. Vos retours nous aident à améliorer continuellement la qualité de nos interventions de maintenance.
              </p>
              
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-fuchsia-600 text-white font-bold text-sm rounded-xl hover:bg-fuchsia-700 transition-all shadow-md hover:shadow-lg cursor-pointer"
                style={{ fontFamily: 'DefibeoMain, Civilprom, sans-serif' }}
              >
                Déposer un autre avis
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {errorMessage && (
                <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-sans">
                  {errorMessage}
                </div>
              )}

              {/* ID DEFIB FIELD */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="defib_id" className="text-sm font-bold text-slate-700 uppercase tracking-wider font-sans">
                  Identifiant du Défibrillateur *
                </label>
                <input
                  id="defib_id"
                  type="text"
                  required
                  placeholder="Ex : PAR-101"
                  value={defibId}
                  onChange={(e) => setDefibId(e.target.value)}
                  className="w-full text-black"
                />
                
                {isCheckingId && (
                  <p className="text-xs text-slate-500 font-medium font-sans mt-0.5 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-fuchsia-500" />
                    Vérification de l'identifiant...
                  </p>
                )}
                {!isCheckingId && isIdValid === true && (
                  <p className="text-xs text-emerald-600 font-bold font-sans mt-0.5">
                    ✓ Identifiant de défibrillateur valide
                  </p>
                )}
                {!isCheckingId && isIdValid === false && (
                  <p className="text-xs text-rose-600 font-bold font-sans mt-0.5">
                    ✗ Identifiant introuvable ou invalide
                  </p>
                )}
              </div>

              {/* NOM PRENOM */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nom_prenom" className="text-sm font-bold text-slate-700 uppercase tracking-wider font-sans">
                  Nom Prénom *
                </label>
                <input
                  id="nom_prenom"
                  type="text"
                  required
                  placeholder="Ex : Jean-Marc DUPONT"
                  value={nomPrenom}
                  onChange={(e) => setNomPrenom(e.target.value)}
                  className="w-full text-black"
                />
              </div>

              {/* MENTION (RATING) EMOTIONS BUTTON PILLS */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider font-sans">
                  Mention *
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                  {(['Excellent', 'Parfait', 'Moyen', 'Décevant', 'Médiocre'] as const).map((opt) => {
                    const isSelected = mention === opt;
                    let activeBg = 'bg-fuchsia-600 text-white border-fuchsia-600';
                    if (opt === 'Médiocre' || opt === 'Décevant') {
                      activeBg = 'bg-rose-600 text-white border-rose-600';
                    } else if (opt === 'Moyen') {
                      activeBg = 'bg-amber-500 text-white border-amber-500';
                    } else if (opt === 'Excellent' || opt === 'Parfait') {
                      activeBg = 'bg-emerald-600 text-white border-emerald-600';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setMention(opt)}
                        className={`text-xs font-bold py-2.5 px-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? `${activeBg} shadow-sm scale-102`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        style={{ fontFamily: 'DefibeoMain, Civilprom, sans-serif' }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COMMENTAIRE */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="commentaire" className="text-sm font-bold text-slate-700 uppercase tracking-wider font-sans">
                  Commentaire *
                </label>
                <textarea
                  id="commentaire"
                  required
                  rows={4}
                  placeholder="Partagez votre expérience d'intervention..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="w-full text-black"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-4 px-4 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isFormValid && !isSubmitting
                    ? 'bg-fuchsia-600 hover:bg-fuchsia-700 hover:shadow-lg shadow-md'
                    : 'bg-slate-300 cursor-not-allowed text-slate-500'
                }`}
                style={{ fontFamily: 'DefibeoMain, Civilprom, sans-serif' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Valider'
                )}
              </button>
            </form>
          )}

        </div>
        
        {/* Under feedback direct button redirecting home */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-all"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
