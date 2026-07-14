import React, { useState } from "react";
import { CompanyInfo, SupportTicket } from "../types";
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  Globe, 
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  Newspaper,
  MessageSquare
} from "lucide-react";

interface PublicWebsiteProps {
  companyInfo: CompanyInfo;
  onGoToLogin: () => void;
  onAddTicket: (ticket: SupportTicket) => void;
}

export default function PublicWebsite({ companyInfo, onGoToLogin, onAddTicket }: PublicWebsiteProps) {
  if (companyInfo.enablePublicWebsite !== 'Oui') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-center">
            <img 
              src={companyInfo.logo || "https://civilprom.s3.eu-north-1.amazonaws.com/defibeo-logo.png"} 
              alt="Logo" 
              className="h-14 w-auto object-contain max-w-[220px]" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Site internet non activé
          </h1>
          <p className="text-slate-600 leading-relaxed text-sm">
            Le site internet public de <strong>{companyInfo.name || "cet exploitant"}</strong> n'est pas actif pour le moment.
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Si vous êtes l'exploitant de cet environnement, vous pouvez l'activer et configurer son contenu depuis vos <strong>Paramètres</strong> Défibeo (section <strong>"Site web exploitant."</strong>).
          </p>
          <div className="pt-2">
            <button
              onClick={onGoToLogin}
              className="px-6 py-3 w-full text-sm font-semibold text-white bg-slate-950 rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
            >
              Se connecter à Défibeo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const settings = companyInfo.websiteSettings || {};
  
  // Local state for Accordion (FAQ section)
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Local state for Contact Form
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    objet: "Autre",
    message: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaqId(prev => (prev === id ? null : id));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("Veuillez remplir les champs obligatoires (Nom, Email, Message).");
      return;
    }

    setIsSubmitting(true);
    
    // Create new SupportTicket / Lead
    const ticketId = `#WEBSITE-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      identifiant: "Visiteur Site Web",
      objet: contactForm.objet as any,
      message: `[Message depuis le site internet commercial]\nNom: ${contactForm.name}\nTél: ${contactForm.phone}\n\n${contactForm.message}`,
      email: contactForm.email,
      phone: contactForm.phone,
      date: new Date().toISOString().split("T")[0],
      status: "Nouveau"
    };

    setTimeout(() => {
      onAddTicket(newTicket);
      setIsSubmitting(false);
      setIsSubmitted(true);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        objet: "Autre",
        message: ""
      });
    }, 1000);
  };

  // Safe defaults
  const logoUrl = companyInfo.logo || "https://civilprom.s3.eu-north-1.amazonaws.com/defibeo-logo.png";
  const compName = companyInfo.name || "Défibeo Solutions";
  const compEmail = companyInfo.email || "contact@defibeo.com";
  const compPhone = companyInfo.phone || "01 00 00 00 00";
  const legalLink = companyInfo.conditionsLegalesLink || "";

  // Dynamic sections configuration with fallbacks
  const hasSec1 = settings.sec1Active !== false;
  const sec1 = {
    title: settings.sec1Title || `Bienvenue chez ${compName}`,
    subtitle: settings.sec1Subtitle || "Votre partenaire de confiance en sécurité médicale",
    desc: settings.sec1Desc || "Nous accompagnons les entreprises, collectivités et ERP dans le choix, l'installation et la maintenance de défibrillateurs automatisés externes (DAE). Garantissez une sécurité maximale grâce à notre expertise.",
    image: settings.sec1Image || "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
  };

  const hasSec2 = settings.sec2Active !== false;
  const sec2Title = settings.sec2Title || "Nos Défibrillateurs Connectés";
  const sec2Subtitle = settings.sec2Subtitle || "Découvrez une gamme d'appareils de haute technologie conformes aux normes européennes.";
  const sec2Items = settings.sec2Items && settings.sec2Items.length > 0 
    ? settings.sec2Items 
    : [
        {
          id: "item-1",
          title: "Défibrillateur DAE Premium",
          description: "Un appareil intelligent de dernière génération, adapté à tous les publics avec instructions vocales en temps réel.",
          imageUrl: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=600&q=80"
        },
        {
          id: "item-2",
          title: "Armoire Intelligente A01",
          description: "Coffret mural connecté avec alarme sonore, ventilation et suivi automatique par auto-vigilance intégrée.",
          imageUrl: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=600&q=80"
        }
      ];

  const hasSec3 = settings.sec3Active !== false;
  const sec3 = {
    title: settings.sec3Title || "Contrat de Maintenance et Services",
    subtitle: settings.sec3Subtitle || "Tranquillité d'esprit et conformité légale garanties",
    desc: settings.sec3Desc || "Notre formule de maintenance inclut la vérification régulière des consommables (piles et électrodes), le remplacement immédiat après utilisation, ainsi qu'un accès complet à notre portail de supervision en ligne.",
    image: settings.sec3Image || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80"
  };

  const hasSec4 = settings.sec4Active !== false;
  const sec4Title = settings.sec4Title || "Questions Fréquentes";
  const sec4Subtitle = settings.sec4Subtitle || "Retrouvez les réponses à vos questions concernant la réglementation et l'usage des DAE.";
  const sec4Items = settings.sec4Items && settings.sec4Items.length > 0
    ? settings.sec4Items
    : [
        {
          id: "faq-1",
          title: "Quelle est la réglementation pour les établissements recevant du public (ERP) ?",
          description: "Depuis le décret de 2018, la présence d'un DAE est obligatoire pour les ERP de catégories 1 à 4, ainsi que pour certains ERP de catégorie 5. La maintenance régulière est également requise par la loi."
        },
        {
          id: "faq-2",
          title: "Comment fonctionne l'auto-vigilance de vos équipements ?",
          description: "Nos armoires connectées effectuent des autotests quotidiens et transmettent en temps réel leur état de fonctionnement. En cas d'anomalie ou d'ouverture, une alerte est instantanément envoyée à nos techniciens."
        },
        {
          id: "faq-3",
          title: "Qui peut utiliser un défibrillateur automatisé externe ?",
          description: "Tout citoyen, même sans formation médicale, est légalement autorisé à utiliser un DAE. L'appareil délivre des instructions vocales claires pour guider chaque étape du processus de réanimation."
        }
      ];

  const hasSec5 = settings.sec5Active !== false;
  const sec5 = {
    title: settings.sec5Title || "Actualités et Réseaux Sociaux",
    subtitle: settings.sec5Subtitle || "Restez informé de nos actualités professionnelles",
    desc: settings.sec5Desc || "Suivez nos interventions sur le terrain, découvrez nos conseils de prévention et partagez vos retours d'expérience avec notre communauté.",
    fb: settings.sec5Fb || "",
    insta: settings.sec5Insta || "",
    linkedin: settings.sec5In || ""
  };

  const hasSec6 = settings.sec6Active !== false;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-100 selection:text-black">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt={compName} 
              className="h-10 sm:h-12 w-auto object-contain max-w-[200px]" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                // fallback if image fails
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="font-bold text-xl tracking-tight text-slate-900 font-sans">{compName}</span>
          </div>

          {/* Action buttons */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-3 sm:items-center">
            <button
              onClick={() => scrollToSection("contact-section")}
              className="px-5 py-2.5 text-center text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={onGoToLogin}
              className="px-5 py-2.5 text-center text-sm font-semibold text-white bg-slate-950 rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Connexion
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: PRESENTATION */}
      {hasSec1 && (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-slate-50 border-b border-slate-100">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" /> Présentation
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-tight tracking-tight">
                {sec1.title}
              </h1>
              <p className="text-lg font-medium text-slate-600">
                {sec1.subtitle}
              </p>
              <div className="w-12 h-1 bg-slate-950 rounded-full"></div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {sec1.desc}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => scrollToSection("contact-section")}
                  className="px-6 py-3 text-sm font-semibold text-white bg-slate-950 rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  Nous contacter
                </button>
              </div>
            </div>
            {sec1.image && (
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                <img 
                  src={sec1.image} 
                  alt="Présentation" 
                  className="w-full h-[300px] sm:h-[400px] object-cover hover:scale-105 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION 2: DEFIBRILLATEURS */}
      {hasSec2 && (
        <section className="py-12 sm:py-20 px-4 sm:px-8 border-b border-slate-100">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4 text-slate-700" /> Matériel médical
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {sec2Title}
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">
                {sec2Subtitle}
              </p>
              <div className="w-12 h-1 bg-slate-950 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sec2Items.map((item, idx) => (
                <div key={item.id || idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full md:w-32 h-32 object-cover rounded-xl shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: OFFRES ET SERVICES */}
      {hasSec3 && (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-slate-50 border-b border-slate-100">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {sec3.image && (
              <div className="order-2 md:order-1 relative overflow-hidden rounded-2xl border border-slate-200">
                <img 
                  src={sec3.image} 
                  alt="Offres et services" 
                  className="w-full h-[300px] sm:h-[400px] object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="space-y-4 order-1 md:order-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-700" /> Services
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {sec3.title}
              </h2>
              <p className="text-lg font-medium text-slate-600">
                {sec3.subtitle}
              </p>
              <div className="w-12 h-1 bg-slate-950 rounded-full"></div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {sec3.desc}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: FAQ ET RESSOURCES */}
      {hasSec4 && (
        <section className="py-12 sm:py-20 px-4 sm:px-8 border-b border-slate-100">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-700" /> FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {sec4Title}
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">
                {sec4Subtitle}
              </p>
              <div className="w-12 h-1 bg-slate-950 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-3">
              {sec4Items.map((item, idx) => {
                const itemId = item.id || `faq-${idx}`;
                const isOpen = expandedFaqId === itemId;
                return (
                  <div key={itemId} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button
                      onClick={() => toggleFaq(itemId)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <span>{item.title}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-50 bg-slate-50/50">
                        {item.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5: ACTUALITES ET RESEAUX */}
      {hasSec5 && (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-slate-50 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                <Newspaper className="w-4 h-4 text-slate-700" /> Réseaux
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {sec5.title}
              </h2>
              <p className="text-lg font-medium text-slate-600">
                {sec5.subtitle}
              </p>
              <div className="w-12 h-1 bg-slate-950 mx-auto rounded-full"></div>
            </div>

            <p className="text-slate-600 leading-relaxed text-sm sm:text-base max-w-xl mx-auto">
              {sec5.desc}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {sec5.fb && (
                <a
                  href={sec5.fb.startsWith("http") ? sec5.fb : `https://${sec5.fb}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-sm inline-flex items-center gap-2 text-slate-800 transition-all cursor-pointer"
                >
                  <Facebook className="w-4 h-4 text-blue-600 fill-blue-600" /> Facebook
                </a>
              )}
              {sec5.insta && (
                <a
                  href={sec5.insta.startsWith("http") ? sec5.insta : `https://${sec5.insta}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-sm inline-flex items-center gap-2 text-slate-800 transition-all cursor-pointer"
                >
                  <Instagram className="w-4 h-4 text-pink-600" /> Instagram
                </a>
              )}
              {sec5.linkedin && (
                <a
                  href={sec5.linkedin.startsWith("http") ? sec5.linkedin : `https://${sec5.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-sm inline-flex items-center gap-2 text-slate-800 transition-all cursor-pointer"
                >
                  <Linkedin className="w-4 h-4 text-blue-800 fill-blue-800" /> LinkedIn
                </a>
              )}
              {!sec5.fb && !sec5.insta && !sec5.linkedin && (
                <span className="text-xs text-slate-400 italic">Aucun réseau social configuré.</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6: CONTACT */}
      {hasSec6 && (
        <section id="contact-section" className="py-12 sm:py-20 px-4 sm:px-8 bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-700" /> Formulaire
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                  Envoyer un message
                </h2>
              </div>

              {isSubmitted ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h3 className="font-bold text-slate-950">Merci pour votre message !</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Votre demande a bien été transmise à l'équipe commerciale de <strong>{compName}</strong>. Nous vous recontacterons dans les plus brefs délais.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm font-bold text-slate-950 underline cursor-pointer"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Jean Dupont"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="jean@exemple.com"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="06 00 00 00 00"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Objet de la demande
                    </label>
                    <select
                      value={contactForm.objet}
                      onChange={e => setContactForm(prev => ({ ...prev, objet: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 appearance-none"
                    >
                      <option value="Autre">Demande générale</option>
                      <option value="Défibrillateur utilisé">Achat de matériel / Devis</option>
                      <option value="Défibrillateur endommagé">Demande de maintenance / SAV</option>
                      <option value="Autre">Autre question</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Votre message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Comment pouvons-nous vous aider ?"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-6 text-sm font-bold text-white bg-slate-950 rounded-xl hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                  </button>
                </form>
              )}
            </div>

            {/* Coordinates */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-950">Nos coordonnées</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Notre équipe commerciale et technique est à votre entière disposition pour répondre à toutes vos interrogations.
                </p>
                <div className="space-y-3 pt-2 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Phone className="w-4 h-4 text-slate-600" />
                    </div>
                    <span>{compPhone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Mail className="w-4 h-4 text-slate-600" />
                    </div>
                    <span>{compEmail}</span>
                  </div>
                  {companyInfo.website && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <Globe className="w-4 h-4 text-slate-600" />
                      </div>
                      <a 
                        href={companyInfo.website.startsWith("http") ? companyInfo.website : `https://${companyInfo.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-slate-950 font-medium inline-flex items-center gap-1"
                      >
                        {companyInfo.website} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200/60 text-xs text-slate-400">
                Horaires d'ouverture : Du lundi au vendredi de 8h30 à 18h00.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-12 px-4 sm:px-8 bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-semibold text-white">{compName}</p>
            <p className="text-xs text-slate-500">
              Site généré depuis le logiciel Defibeo utilisé par {compName}.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {legalLink && (
              <a 
                href={legalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Mentions légales
              </a>
            )}
            <span className="text-slate-800">|</span>
            <span>&copy; {new Date().getFullYear()} Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
