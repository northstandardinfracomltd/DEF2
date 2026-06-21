import React, { useState } from 'react';
import { AchatFournisseur, Variable } from '../types';
import { ShoppingBag, Eye, Trash2, Edit, Plus, FileText, Upload, Search, X } from 'lucide-react';

interface AchatsFournisseursTabProps {
  achatsFournisseurs: AchatFournisseur[];
  saveAchatsFournisseurs: (updated: AchatFournisseur[]) => void;
  variables: Variable[];
}

export default function AchatsFournisseursTab({
  achatsFournisseurs,
  saveAchatsFournisseurs,
  variables,
}: AchatsFournisseursTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAchatId, setEditingAchatId] = useState<string | null>(null);

  // Form States
  const [reference, setReference] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [comment, setComment] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [pdfName, setPdfName] = useState<string | undefined>(undefined);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter variables of category 'Fournisseur'
  const supplierVariables = variables.filter((v) => v.category === 'Fournisseur');

  // Multi-format support for auto-generating references
  const generateNextReference = () => {
    const prefix = 'BL';
    const year = '2026';
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    let maxNum = 0;
    for (const a of achatsFournisseurs) {
      if (a.reference) {
        const match = a.reference.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    return `${prefix}-${year}-${maxNum + 1}`;
  };

  const startNewAchat = () => {
    const nextRef = generateNextReference();
    setReference(nextRef);
    setOrderReference('');
    setSupplierId('');
    setComment('');
    setPdfUrl(undefined);
    setPdfName(undefined);
    setEditingAchatId(null);
    setIsFormOpen(true);
  };

  const startEditAchat = (achat: AchatFournisseur) => {
    setReference(achat.reference);
    setOrderReference(achat.orderReference);
    setSupplierId(achat.supplierId);
    setComment(achat.comment);
    setPdfUrl(achat.pdfUrl);
    setPdfName(achat.pdfName);
    setEditingAchatId(achat.id);
    setIsFormOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPdfUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAchat = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }

    const selectedSup = supplierVariables.find((s) => s.id === supplierId);
    const supplierName = selectedSup ? selectedSup.nom : 'Fournisseur inconnu';

    if (editingAchatId) {
      const updated = achatsFournisseurs.map((a) =>
        a.id === editingAchatId
          ? {
              ...a,
              orderReference,
              supplierId,
              supplierName,
              comment,
              pdfUrl,
              pdfName,
            }
          : a
      );
      saveAchatsFournisseurs(updated);
    } else {
      const newAchat: AchatFournisseur = {
        id: 'achat-' + Date.now(),
        reference,
        orderReference,
        supplierId,
        supplierName,
        comment,
        pdfUrl,
        pdfName,
        dateStr: new Date().toLocaleDateString('fr-FR'),
      };
      saveAchatsFournisseurs([newAchat, ...achatsFournisseurs]);
    }

    setIsFormOpen(false);
  };

  const handleDeleteAchat = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet achat fournisseur ?')) {
      const updated = achatsFournisseurs.filter((a) => a.id !== id);
      saveAchatsFournisseurs(updated);
    }
  };

  // Consult uploaded PDF
  const handleConsultPdf = (achat: AchatFournisseur) => {
    if (!achat.pdfUrl) {
      alert("Aucun fichier n'est rattaché à cet achat.");
      return;
    }
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${achat.pdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    } else {
      // Direct open fallback if original page was sandboxed
      const a = document.createElement('a');
      a.href = achat.pdfUrl;
      a.download = achat.pdfName || 'achat.pdf';
      a.click();
    }
  };

  // Filters logic
  const filteredAchats = achatsFournisseurs.filter((achat) => {
    const matchesSearch =
      achat.reference.toLowerCase().includes(search.toLowerCase()) ||
      achat.orderReference.toLowerCase().includes(search.toLowerCase()) ||
      achat.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      achat.comment.toLowerCase().includes(search.toLowerCase());

    const matchesSupplier = supplierFilter ? achat.supplierId === supplierFilter : true;

    return matchesSearch && matchesSupplier;
  });

  // Theme support
  const customButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '12px',
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
    outline: isSearchHovered || isSearchFocused ? '2.5px solid #fa53d5' : 'none',
    outlineOffset: isSearchHovered || isSearchFocused ? '2px' : '0px',
    transition: 'all 0s',
  };

  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
  };

  return (
    <div id="achats-tab-container-harmonized" className="p-4 md:p-6 space-y-6">
      <style>{`
        #achats-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):not(#search-achats-input),
        #achats-tab-container-harmonized select,
        #achats-tab-container-harmonized textarea {
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
        #achats-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-achats-input),
        #achats-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-achats-input),
        #achats-tab-container-harmonized select:hover:not(:disabled),
        #achats-tab-container-harmonized select:focus:not(:disabled),
        #achats-tab-container-harmonized textarea:hover:not(:disabled),
        #achats-tab-container-harmonized textarea:focus:not(:disabled),
        #achats-tab-container-harmonized #search-achats-input:hover,
        #achats-tab-container-harmonized #search-achats-input:focus {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }
        #achats-tab-container-harmonized select {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          background-image: none !important;
        }
        #achats-tab-container-harmonized select option {
          color: #000000 !important;
          background: #ffffff !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #achats-tab-container-harmonized label,
        #achats-tab-container-harmonized .achats-label-style {
          letter-spacing: normal !important;
          text-transform: none !important;
          font-size: 16px !important;
          color: #000000 !important;
          font-weight: 600 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #achats-tab-container-harmonized input:disabled,
        #achats-tab-container-harmonized select:disabled {
          background-color: #f1f5f9 !important;
          color: #555555 !important;
          cursor: not-allowed !important;
          opacity: 0.82 !important;
        }
      `}</style>

      {!isFormOpen ? (
        <>
          {/* Header dashboard Section */}
          <div
            className="bg-white space-y-4 shadow-sm"
            style={{
              border: '1px solid #dadada',
              borderTop: 'none',
              borderRadius: '0px 0px 18px 18px',
              maxWidth: '98%',
              margin: 'auto',
              padding: '20px',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
              <div>
                <h2
                  className="text-2xl font-bold tracking-tight font-gochi bg-white"
                  style={{ color: '#000000', cursor: 'default', fontFamily: 'Gochi, sans-serif' }}
                >
                  Achats fournisseurs
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Gestion et suivi des bons d'achat et des commandes fournisseurs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-white">
                {/* Supplier filter */}
                <div className="relative">
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="cursor-pointer pr-8 font-sans"
                    style={{
                      padding: '9px 19px !important',
                      fontSize: '15px !important',
                      borderRadius: '13px !important',
                    }}
                  >
                    <option value="">Tous les fournisseurs</option>
                    {supplierVariables.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search query */}
                <div className="relative bg-white">
                  <input
                    type="text"
                    id="search-achats-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-48 sm:w-64 text-black placeholder-[#747474] placeholder:font-light outline-none"
                    style={searchInputStyle}
                    onMouseEnter={() => setIsSearchHovered(true)}
                    onMouseLeave={() => setIsSearchHovered(false)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                </div>

                <button onClick={startNewAchat} style={customButtonStyle} className="font-sans">
                  <Plus className="w-4 h-4" />
                  Nouveau
                </button>
              </div>
            </div>
          </div>

          {/* MAIN RECORDS TABLE */}
          <div className="bg-white overflow-hidden mt-6 rounded-none shadow-xs">
            <div className="overflow-x-auto">
              {filteredAchats.length === 0 ? (
                <div className="p-16 text-center font-sans lg:py-24">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                    Aucun achat fournisseur enregistré.
                  </p>
                </div>
              ) : (
                <table
                  className="w-full text-left font-sans border-collapse text-xs"
                  style={{
                    borderTop: '1px solid rgb(218, 218, 218)',
                    borderBottom: '1px solid rgb(218, 218, 218)',
                  }}
                >
                  <thead>
                    <tr className="bg-transparent">
                      <th className="px-4 py-3.5" style={thStyle}>
                        Référence.
                      </th>
                      <th className="px-4 py-3.5" style={thStyle}>
                        Réf. Commande.
                      </th>
                      <th className="px-4 py-3.5" style={thStyle}>
                        Fournisseur.
                      </th>
                      <th className="px-4 py-3.5" style={thStyle}>
                        Commentaire.
                      </th>
                      <th className="px-4 py-3.5" style={thStyle}>
                        Date.
                      </th>
                      <th className="px-4 py-3.5" style={thStyle}>
                        Document PDF.
                      </th>
                      <th className="px-4 py-3.5 text-right w-36" style={thStyle}>
                        Actions.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs">
                    {filteredAchats.map((achat) => {
                      return (
                        <tr
                          key={achat.id}
                          className="group hover:bg-[#ffecf8] transition-all cursor-pointer border-b border-slate-100"
                        >
                          {/* Reference */}
                          <td
                            className="px-4 py-4 font-mono font-bold text-slate-920"
                            style={{ fontSize: '15px' }}
                          >
                            {achat.reference}
                          </td>

                          {/* Order Reference */}
                          <td className="px-4 py-4 font-sans text-slate-800" style={{ fontSize: '15px' }}>
                            {achat.orderReference || <span className="text-slate-400 italic">Sans</span>}
                          </td>

                          {/* Supplier */}
                          <td
                            className="px-4 py-4 font-sans font-medium text-slate-900"
                            style={{ fontSize: '15px' }}
                          >
                            {achat.supplierName}
                          </td>

                          {/* Comment */}
                          <td className="px-4 py-4 font-sans text-slate-600 max-w-xs truncate" style={{ fontSize: '15px' }}>
                            {achat.comment || <span className="text-slate-450">-</span>}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-4 font-sans text-slate-500" style={{ fontSize: '14px' }}>
                            {achat.dateStr}
                          </td>

                          {/* PDF Document */}
                          <td className="px-4 py-4 font-sans">
                            {achat.pdfUrl ? (
                              <button
                                onClick={() => handleConsultPdf(achat)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#fff0f9] text-[#fa53d5] hover:bg-[#fbd3ef] transition-colors border-0 cursor-pointer text-xs font-semibold"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {achat.pdfName ? (
                                  <span className="truncate max-w-[120px]" title={achat.pdfName}>
                                    {achat.pdfName}
                                  </span>
                                ) : (
                                  'Consulter'
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Aucun</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2 bg-transparent">
                              <button
                                onClick={() => startEditAchat(achat)}
                                className="p-1 px-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer border-0 inline-flex items-center"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAchat(achat.id)}
                                className="p-1 px-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer border-0 inline-flex items-center"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        /* FORM VIEW */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 max-w-2xl mx-auto animate-fadeIn">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-xl font-bold font-gochi text-slate-900" style={{ fontFamily: 'Gochi, sans-serif' }}>
                {editingAchatId ? 'Modifier l’achat fournisseur' : 'Nouvel achat fournisseur'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Veuillez renseigner les détails ci-dessous pour enregistrer ou mettre à jour la commande fournisseur.
              </p>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-450 hover:text-slate-700 border-0 cursor-pointer inline-flex items-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveAchat} className="space-y-5">
            {/* Reference */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider achats-label-style">
                Référence
              </label>
              <input
                type="text"
                value={reference}
                disabled
                className="w-full focus:outline-none bg-slate-50 border border-slate-200 text-slate-500 rounded-md py-2 px-3 font-mono cursor-not-allowed text-sm"
              />
              <span className="text-xs text-slate-400">
                Garantit un ordre chronologique et réglementaire (BL-2026-X).
              </span>
            </div>

            {/* Commande Reference */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider achats-label-style">
                Référence de commande
              </label>
              <input
                type="text"
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                placeholder="Ex. CMD-99120-FR"
                className="w-full"
                required
              />
            </div>

            {/* Fournisseur Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider achats-label-style">
                Fournisseur
              </label>

              {supplierVariables.length === 0 ? (
                <div className="p-3 border border-pink-200 rounded-2xl bg-pink-50/50 text-xs text-pink-700 font-sans">
                  <p className="font-bold mb-1">Aucun fournisseur configuré.</p>
                  Veuillez aller dans l'onglet <strong>'Variables'</strong> et ajouter un fournisseur de catégorie
                  'Fournisseur' d'abord pour pouvoir lier cet achat.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full pr-10 cursor-pointer"
                    required
                  >
                    <option value="">Sélectionner un fournisseur...</option>
                    {supplierVariables.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom} {s.marque ? `(${s.marque})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Comment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider achats-label-style">
                Commentaire
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex. Livraison prévue mardi"
                className="w-full"
              />
            </div>

            {/* PDF File upload / download */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider achats-label-style">
                Téléchargement PDF (Rattacher un document)
              </label>

              <div className="border-2 border-dashed border-slate-200 hover:border-[#fa53d5]/50 transition-colors rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700 font-sans font-medium">
                  {pdfName ? `Fichier : ${pdfName}` : 'Cliquez pour sélectionner un fichier PDF'}
                </p>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Fichiers acceptés : PDF uniquement
                </p>
              </div>

              {pdfUrl && (
                <div className="mt-1 flex items-center justify-between p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 font-sans">
                  <span className="flex items-center gap-1.5 truncate max-w-[80%]">
                    <FileText className="w-4 h-4 text-green-600" />
                    <strong>{pdfName || 'Document.pdf'}</strong> (Chargé avec succès)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfUrl(undefined);
                      setPdfName(undefined);
                    }}
                    className="text-red-500 hover:text-red-700 font-bold border-0 cursor-pointer bg-transparent text-xs"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-sans text-sm font-bold bg-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                style={customButtonStyle}
                className="px-5 py-2.5 text-sm font-bold font-sans"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
