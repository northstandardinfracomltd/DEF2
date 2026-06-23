import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  HelpCircle,
  FileText,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Camera,
  Layers,
  UploadCloud,
  FileSignature,
  DollarSign,
  Play,
  Square,
  LogOut,
  Map,
  Eye,
  Sliders,
  CheckSquare,
  X,
  Zap,
  Calendar,
  Printer,
} from "lucide-react";
import {
  CompanyInfo,
  Member,
  SupportTicket,
  Defibrillateur,
  Variable,
  Client,
  PointageLog,
  StockRecord,
  CommercialDoc,
  CommercialDocItem,
  DistributedStockLocation,
  StockMovement,
} from "../types";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import GmaoCorrectionForm from "./GmaoCorrectionForm";
import GmaoOtherEquipmentCorrectionForm from "./GmaoOtherEquipmentCorrectionForm";
import {
  triggerEmail6RapportIntervention,
  sendScriptEmail,
} from "../utils/emailService";
import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

// Helper functions for French date <-> ISO date picker compatibility
const getIsoDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  return dateStr;
};

const getFrenchDate = (isoDate: string) => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

const formatToNormalCase = (str: string) => {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const truncateTourTitle = (title: string) => {
  if (!title) return "";
  return title.length > 15 ? title.substring(0, 15) + "..." : title;
};

interface PublicPortalProps {
  companyInfo: CompanyInfo;
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  defibrillateurs: Defibrillateur[];
  onUpdateDefib: (updated: Defibrillateur) => void;
  variables: Variable[];
  clients: Client[];
  onAddTicket: (
    ticket: Omit<SupportTicket, "id" | "date" | "status">,
  ) => string;
  onClose: () => void;
  onOpenClientPortal?: (client: Client) => void;
  stocks?: StockRecord[];
  onUpdateStocks?: (updatedStocks: StockRecord[]) => void;
  distributedStocks?: DistributedStockLocation[];
  onUpdateDistributedStocks?: (updated: DistributedStockLocation[]) => void;
  commercialDocs?: CommercialDoc[];
  onUpdateCommercialDocs?: (updatedDocs: CommercialDoc[]) => void;
  fsmTours?: any[];
  onUpdateFsmTours?: (updated: any[]) => void;
  otherEquipments?: any[];
  onUpdateOtherEquipments?: (updated: any[]) => void;
  generatedReports?: GeneratedReport[];
  onUpdateGeneratedReports?: (updated: GeneratedReport[]) => void;
  pointages?: PointageLog[];
  onUpdatePointages?: (updated: PointageLog[]) => void;
  expenses?: Expense[];
  onUpdateExpenses?: (updated: Expense[]) => void;
}

// Receipt expense type
interface Expense {
  id: string;
  techName: string;
  title: string;
  amountTtc: number;
  amountHt: number;
  amountTva: number;
  dateStr: string;
  photoUrl?: string;
}

// Generated report log type
interface GeneratedReport {
  id: string;
  date: string;
  techName: string;
  defibId: string;
  defibIdentifiant: string;
  title: string;
  siteMission: string;
  photoUrl?: string;
  defibSnapshot?: Defibrillateur;
  validated?: boolean;
}

export default function PublicPortal({
  companyInfo,
  members,
  onUpdateMembers,
  defibrillateurs,
  onUpdateDefib,
  variables,
  clients,
  onAddTicket,
  onClose,
  onOpenClientPortal,
  stocks = [],
  onUpdateStocks,
  distributedStocks = [],
  onUpdateDistributedStocks,
  commercialDocs = [],
  onUpdateCommercialDocs,
  fsmTours,
  onUpdateFsmTours,
  otherEquipments = [],
  onUpdateOtherEquipments,
  generatedReports: propGeneratedReports,
  onUpdateGeneratedReports,
  pointages: propPointages,
  onUpdatePointages,
  expenses: propExpenses,
  onUpdateExpenses,
}: PublicPortalProps) {
  const getNextDocRef = (
    type: "Devis" | "Facture" | "Proforma",
    docs: CommercialDoc[],
  ): string => {
    const prefix =
      type === "Devis" ? "DEV" : type === "Facture" ? "FACT" : "PRO";
    const year = "2026";
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    let maxNum = 0;
    for (const doc of docs) {
      if (doc.type === type && doc.ref) {
        const match = doc.ref.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;
  };

  // Screens: 'landing' | 'signalement' | 'mainteneur' | 'success-ticket'
  const [currentScreen, setCurrentScreen] = useState<
    "landing" | "signalement" | "mainteneur" | "success-ticket"
  >("landing");

  // Report Form full-width overlay state
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);

  // Accordion collapse/expand states for the 9 sections of the report form
  const [openSection1, setOpenSection1] = useState(true);
  const [openSection2, setOpenSection2] = useState(false);
  const [openSection3, setOpenSection3] = useState(false);
  const [openSection4, setOpenSection4] = useState(false);
  const [openSection5, setOpenSection5] = useState(false);
  const [openSection6, setOpenSection6] = useState(false);
  const [openSection7, setOpenSection7] = useState(false);
  const [openSection8, setOpenSection8] = useState(false);
  const [openSection9, setOpenSection9] = useState(false);

  // New ticket state
  const [ticketForm, setTicketForm] = useState({
    identifiant: "",
    objet: "Défibrillateur utilisé" as SupportTicket["objet"],
    message: "",
    email: "",
    phone: "",
  });
  const [createdTicketId, setCreatedTicketId] = useState("");

  // PIN authentication state
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState("");

  // Inline expanded logins
  const [activeInlineLogin, setActiveInlineLogin] = useState<
    "tech" | "client" | null
  >(null);
  const [inlineTechPin, setInlineTechPin] = useState("");
  const [inlineTechError, setInlineTechError] = useState("");
  const [inlineClientKey, setInlineClientKey] = useState("");
  const [inlineClientError, setInlineClientError] = useState("");

  const [isInlineReportOpen, setIsInlineReportOpen] = useState(false);
  const [inlineReportSuccess, setInlineReportSuccess] = useState(false);

  const handleInlineTechLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineTechError("");
    const trimmedPin = inlineTechPin.trim();
    if (!trimmedPin) {
      setInlineTechError("Veuillez saisir votre code PIN.");
      return;
    }
    const matched = members.find((m) => m.pin === trimmedPin);
    if (matched) {
      setAuthenticatedUser(matched);
      localStorage.setItem(
        "defib_active_tech_session",
        JSON.stringify(matched),
      );
      setInlineTechPin("");
      setActiveInlineLogin(null);
    } else {
      setInlineTechError("Code PIN invalide.");
    }
  };

  const handleInlineClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineClientError("");
    const trimmedKey = inlineClientKey.trim().toUpperCase();
    if (!trimmedKey) {
      setInlineClientError("Veuillez saisir votre clé d'accès.");
      return;
    }
    const matched = clients.find(
      (c) => c.accessKey && c.accessKey.trim().toUpperCase() === trimmedKey,
    );
    if (matched) {
      setInlineClientKey("");
      setActiveInlineLogin(null);
      onOpenClientPortal?.(matched);
    } else {
      setInlineClientError("Clé d'accès invalide.");
    }
  };

  // Local storage logged in technician session
  const [authenticatedUser, setAuthenticatedUser] = useState<Member | null>(
    () => {
      const saved = localStorage.getItem("defib_active_tech_session");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
      return null;
    },
  );

  // Active tab inside Technician Webapp
  type WebappTab =
    | "interventions"
    | "rapports"
    | "stocks"
    | "temps"
    | "frais"
    | "localisation";
  const [activeTab, setActiveTab] = useState<WebappTab>("interventions");

  // Google Calendar Integration states
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    null,
  );
  const [syncedGoogleEmail, setSyncedGoogleEmail] = useState<string | null>(
    () => {
      try {
        const activeTechRaw = localStorage.getItem("defib_active_tech_session");
        if (activeTechRaw) {
          const activeTech = JSON.parse(activeTechRaw);
          return localStorage.getItem(
            `defib_google_cal_email_${activeTech?.name || "common"}`,
          );
        }
      } catch (e) {}
      return localStorage.getItem("defib_google_cal_email_common");
    },
  );
  const [isSyncingGoogleCal, setIsSyncingGoogleCal] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [showOperationHelp, setShowOperationHelp] = useState(false);

  // Selected tour ID for mobile view
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [pauseEnabled, setPauseEnabled] = useState(false);

  // Selected tour ID and passage num for currently opening GMAO report overlay
  const [reportActiveTourId, setReportActiveTourId] = useState<string>("");
  const [reportActivePassageNum, setReportActivePassageNum] = useState<
    number | null
  >(null);

  // Error messages for each tour ID in technician portal
  const [tourErrorMap, setTourErrorMap] = useState<Record<string, string>>({});
  const [attemptedEndTourIds, setAttemptedEndTourIds] = useState<string[]>([]);

  // Localisation form states for the connected technician
  const [techLocationLink, setTechLocationLink] = useState("");
  const [gpsSharingLink, setGpsSharingLink] = useState("");

  // Technician Stocks Tab States
  const [selectedTechDistributedStockId, setSelectedTechDistributedStockId] =
    useState<string>("");
  const [showRapatriementForm, setShowRapatriementForm] =
    useState<boolean>(false);
  const [rapatrimentVolume, setRapatrimentVolume] = useState<number>(0);
  const [rapatrimentTrackingLink, setRapatrimentTrackingLink] =
    useState<string>("");
  const [rapatrimentDate, setRapatrimentDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [rapatrimentStatut, setRapatrimentStatut] = useState<
    "Préparation" | "Expédié" | "Terminé" | "Annulé"
  >("Préparation");

  // helper for technician stocks tab lookup & changes
  const techActiveStocks = useMemo(() => {
    if (!techLocationLink) return [];
    return distributedStocks.filter(
      (item) =>
        item.locationName &&
        item.locationName.toLowerCase().trim() ===
          techLocationLink.toLowerCase().trim(),
    );
  }, [distributedStocks, techLocationLink]);

  const selectedTechStock = useMemo(() => {
    return distributedStocks.find(
      (item) => item.id === selectedTechDistributedStockId,
    );
  }, [distributedStocks, selectedTechDistributedStockId]);

  const matchedStockRecord = useMemo(() => {
    if (!selectedTechStock) return null;
    return stocks.find(
      (s) =>
        s.id === selectedTechStock.stockId ||
        s.denominationPieceId === selectedTechStock.denominationPieceId,
    );
  }, [stocks, selectedTechStock]);

  const selectedStockVariable = useMemo(() => {
    if (!selectedTechStock) return null;
    return variables.find(
      (v) => v.id === selectedTechStock.denominationPieceId,
    );
  }, [variables, selectedTechStock]);

  // Dynamically calculate outgoing volumes for technician stocks (same as standard form)
  const getPieceOutgoingStats = useMemo(() => {
    return (denomPieceId: string) => {
      const stats = {
        week1: { vol: 0 },
        week2: { vol: 0 },
        next30: { vol: 0 },
      };

      if (!denomPieceId) return stats;

      const vObj = variables.find((v) => v.id === denomPieceId);
      if (!vObj) return stats;

      const pieceNameLower = vObj.nom.toLowerCase().trim();

      const getDaysDiff = (dateStr: string) => {
        if (!dateStr) return 999;
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - base.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const activeToursList = (fsmTours || []).filter(
        (t: any) =>
          t.status === "Brouillon" ||
          t.status === "À faire" ||
          t.status === "En cours",
      );

      activeToursList.forEach((tour: any) => {
        const diffDays = getDaysDiff(tour.startDate);
        const missions = tour.missions || tour.passages || [];

        missions.forEach((m: any) => {
          const parts = m.requiredParts || [];
          const matchCount = parts.filter(
            (p: string) => p && p.toLowerCase().trim() === pieceNameLower,
          ).length;

          if (matchCount > 0) {
            if (diffDays <= 7) {
              stats.week1.vol += matchCount;
            } else if (diffDays > 7 && diffDays <= 14) {
              stats.week2.vol += matchCount;
            }

            if (diffDays > 7 && diffDays <= 30) {
              stats.next30.vol += matchCount;
            }
          }
        });
      });

      return stats;
    };
  }, [fsmTours, variables]);

  const outgoingStats = useMemo(() => {
    if (!selectedTechStock)
      return { week1: { vol: 0 }, week2: { vol: 0 }, next30: { vol: 0 } };
    return getPieceOutgoingStats(selectedTechStock.denominationPieceId);
  }, [getPieceOutgoingStats, selectedTechStock]);

  const handleAlertLogistique = async () => {
    const logisticsMember = members.find(
      (m) =>
        m.adminSubRole === "Logistique" ||
        m.role?.toLowerCase().includes("logistique"),
    );
    if (!logisticsMember) {
      alert(
        "Alerte impossible : aucun collaborateur Logistique n'est enregistré dans l'équipe.",
      );
      return;
    }
    if (!logisticsMember.email) {
      alert(
        "Alerte impossible : le collaborateur Logistique n'a pas d'adresse email renseignée.",
      );
      return;
    }

    const techName = authenticatedUser?.name || "Un technicien";
    const pieceName = selectedStockVariable?.nom || "Dénomination inconnue";
    const ugsCode = matchedStockRecord?.ugs || "N/A";

    const subject = `Alerte approvisionnement stock - ${techName}`;
    const body = `${techName} a besoin de stock pour le pièce/service ${pieceName} UGS ${ugsCode}.`;

    try {
      const sent = await sendScriptEmail({
        to: logisticsMember.email,
        subject,
        body,
        replyTo: authenticatedUser?.email || "noreply@defibeo.com",
      });
      if (sent) {
        alert(
          `Email d'alerte envoyé avec succès à ${logisticsMember.name} (Logistique).`,
        );
      } else {
        alert("Une erreur s'est produite lors de l'envoi de l'email.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur technique lors de l'envoi de l'email.");
    }
  };

  const handleConfirmRapatriement = () => {
    if (!matchedStockRecord || !selectedTechStock) return;

    // Create new movement
    const newMvId = "mv_" + Date.now();
    const newMv: StockMovement = {
      id: newMvId,
      type: "Rapatriement",
      volume: Number(rapatrimentVolume) || 0,
      date: rapatrimentDate,
      statut: rapatrimentStatut,
      trackingLink: rapatrimentTrackingLink,
    };

    const updatedMovements = [newMv, ...(matchedStockRecord.mouvements || [])];

    const newVolDispo = Math.max(
      0,
      selectedTechStock.volumeDisponible - (Number(rapatrimentVolume) || 0),
    );

    // update distributed stock
    if (onUpdateDistributedStocks && distributedStocks) {
      const updatedDs = distributedStocks.map((it) => {
        if (it.id === selectedTechStock.id) {
          return {
            ...it,
            volumeDisponible: newVolDispo,
          };
        }
        return it;
      });
      onUpdateDistributedStocks(updatedDs);
    }

    // update central stocks
    if (onUpdateStocks) {
      const updatedStocks = stocks.map((st) => {
        if (st.id === matchedStockRecord.id) {
          return {
            ...st,
            mouvements: updatedMovements,
          };
        }
        return st;
      });
      onUpdateStocks(updatedStocks);
    }

    alert("Retour (Rapatriement) enregistré avec succès !");
    setShowRapatriementForm(false);
  };

  const handleNavigateToAddress = (address: string) => {
    if (!address) return;
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const encodedAddress = encodeURIComponent(address);
    if (isIOS) {
      window.location.href = `maps://maps.apple.com/?q=${encodedAddress}`;
    } else if (isAndroid) {
      window.location.href = `geo:0,0?q=${encodedAddress}`;
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        "_blank",
      );
    }
  };

  // Navigation scrolling state and ref for fades
  const navRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 5);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    handleNavScroll();
    window.addEventListener("resize", handleNavScroll);
    return () => window.removeEventListener("resize", handleNavScroll);
  }, [activeTab]);

  // Real-time dynamic clock tracking
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tournées/Interventions Dummy State
  const [tours, setTours] = useState(() => {
    // Try to load and translate from defib_fsm_tours
    try {
      const mainToursRaw = localStorage.getItem("defib_fsm_tours");
      const activeTechRaw = localStorage.getItem("defib_active_tech_session");
      let activeTech: Member | null = null;
      if (activeTechRaw) {
        try {
          activeTech = JSON.parse(activeTechRaw);
        } catch {}
      }
      const activeTechName = activeTech ? activeTech.name : "";

      if (mainToursRaw) {
        const mainTours = JSON.parse(mainToursRaw);
        if (Array.isArray(mainTours) && mainTours.length > 0) {
          // Filter by active technician if logged in
          const matchedFsmTours = mainTours.filter((mt: any) => {
            if (!activeTechName) return true;
            return (
              mt.techName &&
              mt.techName.toLowerCase().trim() ===
                activeTechName.toLowerCase().trim()
            );
          });

          if (matchedFsmTours.length > 0) {
            return matchedFsmTours.map((mt: any, index: number) => {
              const tryFormatDateToFrench = (dateStr: string) => {
                if (!dateStr) return "";
                const parts = dateStr.split("-");
                if (parts.length === 3 && parts[0].length === 4) {
                  return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return dateStr;
              };

              return {
                id: mt.id || `fsm-tour-${index}`,
                title: mt.title || "Tournée",
                startDate: tryFormatDateToFrench(mt.startDate),
                status: mt.status || "À faire",
                techName: mt.techName || "",
                passages: (mt.missions || []).map((m: any, idx: number) => {
                  const defib = defibrillateurs.find(
                    (d: any) =>
                      d.identifiant === m.defibIdentifiant ||
                      d.id === m.defibIdentifiant ||
                      (m.clientName && m.clientName.includes(d.identifiant)),
                  );
                  const other = otherEquipments.find(
                    (o: any) =>
                      o.identifiant === m.defibIdentifiant ||
                      o.id === m.defibIdentifiant,
                  );
                  let equipmentType = m.equipmentType;
                  if (!equipmentType) {
                    if (defib) {
                      equipmentType = "Défibrillateur";
                    } else if (other) {
                      equipmentType = other.categorie;
                    } else {
                      equipmentType = m.reason?.toLowerCase().includes("autre")
                        ? "Autre matériel"
                        : "Défibrillateur";
                    }
                  }
                  let model = "Défibrillateur standard";
                  let address = m.clientName || "Adresse non spécifiée";
                  if (defib) {
                    const modelVar = variables.find(
                      (v: any) => v.id === defib.modeleId,
                    );
                    if (modelVar) {
                      model = modelVar.marque
                        ? `${modelVar.marque} ${modelVar.nom}`
                        : modelVar.nom;
                    }
                    const addrParts = [
                      defib.numVoie,
                      defib.cp,
                      defib.ville,
                    ].filter(Boolean);
                    if (addrParts.length > 0) {
                      address = addrParts.join(", ");
                    }
                  } else if (other) {
                    model = other.categorie || "Autre matériel";
                    const addrParts = [
                      other.numeroVoie,
                      other.codePostal,
                      other.ville,
                    ].filter(Boolean);
                    if (addrParts.length > 0) {
                      address = addrParts.join(", ");
                    }
                  }
                  const calculatedDate = (() => {
                    const tourStartDate = mt.startDate || "";
                    if (!tourStartDate) return "";
                    const d = new Date(tourStartDate);
                    if (isNaN(d.getTime())) return tourStartDate;
                    const daysToAdd = Math.floor(idx / 6);
                    d.setDate(d.getDate() + daysToAdd);
                    return d.toISOString().split("T")[0];
                  })();
                  const rawEstDate = m.estimatedDate || calculatedDate;

                  return {
                    num: idx + 1,
                    id: m.id || `df-p-${idx}`,
                    identifiant: m.defibIdentifiant || defib?.identifiant || "",
                    model,
                    address,
                    equipmentType,
                    status: m.status || "À faire",
                    reason: m.reason || "Visite technique",
                    requiredParts: m.requiredParts || [],
                    estimatedDate: rawEstDate,
                    estimatedSlot: m.estimatedSlot || "",
                    rejectionReason: m.rejectionReason || "",
                    rejectedAt: m.rejectedAt || "",
                  };
                }),
              };
            });
          }
        }
      }
    } catch (e) {
      console.error(
        "Error parsing defib_fsm_tours in technician portal state init:",
        e,
      );
    }

    // Fallback to local storage defib_mobile_tours2, or hardcoded default ones
    const saved = localStorage.getItem("defib_mobile_tours2");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "tour-1",
        title: "Tournée Nantes Hyper-Centre",
        startDate: "03-06-2026",
        passages: [
          {
            num: 1,
            id: "df-p1",
            identifiant: "PAR-101",
            model: "HeartStart HS1",
            address: "Place du Commerce, Nantes",
            status: "À faire",
            reason: "Remplacement batterie",
            requiredParts: ["Batterie Lithium HS1 (4 ans)"],
            estimatedDate: "03-06-2026",
          },
          {
            num: 2,
            id: "df-p2",
            identifiant: "PAR-102",
            model: "ZOLL AED Plus",
            address: "12 Rue de Budapest, Nantes",
            status: "Effectué",
            reason: "Remplacement électrodes CPR-D-padz",
            requiredParts: ["Paire d’électrodes CPR-D"],
            estimatedDate: "03-06-2026",
          },
          {
            num: 3,
            id: "df-p3",
            identifiant: "PAR-103",
            model: "Lifepak CR2",
            address: "44 Rue de Strasbourg, Nantes",
            status: "À faire",
            reason: "Contrôle annuel & Nettoyage",
            requiredParts: ["Kit de nettoyage standard"],
            estimatedDate: "03-06-2026",
          },
        ],
      },
      {
        id: "tour-2",
        title: "Tournée Agglomération Ouest",
        startDate: "04-06-2026",
        passages: [
          {
            num: 1,
            id: "df-p4",
            identifiant: "PAR-104",
            model: "Defibrillator FRx",
            address: "18 Rue de la Paix, Sautron",
            status: "À faire",
            reason: "Changement batterie & électrodes",
            requiredParts: ["Batterie FRx", "Cartouche Électrodes SMART II"],
            estimatedDate: "04-06-2026",
          },
          {
            num: 2,
            id: "df-p5",
            identifiant: "PAR-105",
            model: "BeneHeart C1A",
            address: "Avenue de l'Atlantique, Saint-Herblain",
            status: "À faire",
            reason: "Visite préventive annuelle",
            requiredParts: ["Aucune pièce requise"],
            estimatedDate: "04-06-2026",
          },
        ],
      },
    ];
  });

  // Persist tour state changes and sync to general FSM tours
  const saveTours = (updated: typeof tours) => {
    setTours(updated);
    localStorage.setItem("defib_mobile_tours2", JSON.stringify(updated));

    // Also sync back to prop callback if present
    if (onUpdateFsmTours && fsmTours) {
      const updatedMainTours = fsmTours.map((mt: any) => {
        const matchedMobileTour = updated.find(
          (t) => t.id === mt.id || t.title === mt.title,
        );
        if (matchedMobileTour) {
          const updatedMissions = (mt.missions || []).map(
            (m: any, idx: number) => {
              const matchedPassage = matchedMobileTour.passages.find(
                (p: any) =>
                  p.num === idx + 1 || p.identifiant === m.defibIdentifiant,
              );
              if (matchedPassage) {
                return {
                  ...m,
                  status: matchedPassage.status,
                  rejectionReason: matchedPassage.rejectionReason || "",
                  rejectedAt: matchedPassage.rejectedAt || "",
                };
              }
              return m;
            },
          );
          const hasStarted = updatedMissions.some(
            (m: any) => m.status === "Effectué" || m.status === "En cours",
          );
          let newStatus = mt.status;
          if (mt.status !== "Effectué" && mt.status !== "Terminé") {
            newStatus = hasStarted ? "En cours" : "À faire";
          }

          return {
            ...mt,
            status:
              matchedMobileTour.status === "Terminé" ||
              matchedMobileTour.status === "Effectué"
                ? "Effectué"
                : newStatus,
            missions: updatedMissions,
          };
        }
        return mt;
      });
      onUpdateFsmTours(updatedMainTours);
    } else {
      // Fallback
      try {
        const mainToursRaw = localStorage.getItem("defib_fsm_tours");
        if (mainToursRaw) {
          const mainTours = JSON.parse(mainToursRaw);
          const updatedMainTours = mainTours.map((mt: any) => {
            const matchedMobileTour = updated.find(
              (t) => t.id === mt.id || t.title === mt.title,
            );
            if (matchedMobileTour) {
              const updatedMissions = (mt.missions || []).map(
                (m: any, idx: number) => {
                  const matchedPassage = matchedMobileTour.passages.find(
                    (p: any) =>
                      p.num === idx + 1 || p.identifiant === m.defibIdentifiant,
                  );
                  if (matchedPassage) {
                    return {
                      ...m,
                      status: matchedPassage.status,
                      rejectionReason: matchedPassage.rejectionReason || "",
                      rejectedAt: matchedPassage.rejectedAt || "",
                    };
                  }
                  return m;
                },
              );
              const hasStarted = updatedMissions.some(
                (m: any) => m.status === "Effectué" || m.status === "En cours",
              );
              let newStatus = mt.status;
              if (mt.status !== "Effectué" && mt.status !== "Terminé") {
                newStatus = hasStarted ? "En cours" : "À faire";
              }

              return {
                ...mt,
                status:
                  matchedMobileTour.status === "Terminé" ||
                  matchedMobileTour.status === "Effectué"
                    ? "Effectué"
                    : newStatus,
                missions: updatedMissions,
              };
            }
            return mt;
          });
          localStorage.setItem(
            "defib_fsm_tours",
            JSON.stringify(updatedMainTours),
          );
        }
      } catch (e) {
        console.error("Error syncing back to defib_fsm_tours:", e);
      }
    }
  };

  const getSortedTours = () => {
    const parseTourDate = (dateStr: string) => {
      if (!dateStr) return 0;
      const clean = dateStr.replace(/\//g, "-");
      const parts = clean.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d).getTime();
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return new Date(y, m, d).getTime();
        }
      }
      return 0;
    };
    return [...tours].sort(
      (a, b) => parseTourDate(b.startDate) - parseTourDate(a.startDate),
    );
  };

  // Dynamic sync of tours from main defib_fsm_tours on login, defibrillateurs change or mount
  useEffect(() => {
    try {
      const activeTechName = authenticatedUser ? authenticatedUser.name : "";
      const isMemberOfEnv = authenticatedUser
        ? members.some(
            (m) =>
              (m.name &&
                m.name.toLowerCase().trim() ===
                  authenticatedUser.name.toLowerCase().trim()) ||
              (m.email &&
                m.email.toLowerCase().trim() ===
                  authenticatedUser.email?.toLowerCase().trim()),
          )
        : false;

      let matchedFsmTours: any[] = [];

      if (fsmTours) {
        matchedFsmTours = fsmTours.filter((mt: any) => {
          if (!isMemberOfEnv) return false;
          const isTechAssigned =
            activeTechName &&
            mt.techName &&
            mt.techName.toLowerCase().trim() ===
              activeTechName.toLowerCase().trim();
          const isStatusTodo =
            mt.status === "À faire" || mt.status === "En cours";
          return isTechAssigned && isStatusTodo;
        });
      } else {
        const mainToursRaw = localStorage.getItem("defib_fsm_tours");
        if (mainToursRaw) {
          const mainTours = JSON.parse(mainToursRaw);
          if (Array.isArray(mainTours)) {
            matchedFsmTours = mainTours.filter((mt: any) => {
              if (!activeTechName) return true;
              const isTechAssigned =
                mt.techName &&
                mt.techName.toLowerCase().trim() ===
                  activeTechName.toLowerCase().trim();
              const isStatusTodo =
                mt.status === "À faire" || mt.status === "En cours";
              return isTechAssigned && isStatusTodo;
            });
          }
        }
      }

      if (matchedFsmTours.length > 0) {
        const mapped = matchedFsmTours.map((mt: any, index: number) => {
          const tryFormatDateToFrench = (dateStr: string) => {
            if (!dateStr) return "";
            const parts = dateStr.split("-");
            if (parts.length === 3 && parts[0].length === 4) {
              return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return dateStr;
          };

          return {
            id: mt.id || `fsm-tour-${index}`,
            title: mt.title || "Tournée",
            startDate: tryFormatDateToFrench(mt.startDate),
            status: mt.status || "À faire",
            techName: mt.techName || "",
            passages: (mt.missions || []).map((m: any, idx: number) => {
              const defib = defibrillateurs.find(
                (d: any) =>
                  d.identifiant === m.defibIdentifiant ||
                  d.id === m.defibIdentifiant ||
                  (m.clientName && m.clientName.includes(d.identifiant)),
              );
              const other = otherEquipments.find(
                (o: any) =>
                  o.identifiant === m.defibIdentifiant ||
                  o.id === m.defibIdentifiant,
              );
              let equipmentType = m.equipmentType;
              if (!equipmentType) {
                if (defib) {
                  equipmentType = "Défibrillateur";
                } else if (other) {
                  equipmentType = other.categorie;
                } else {
                  equipmentType = m.reason?.toLowerCase().includes("autre")
                    ? "Autre matériel"
                    : "Défibrillateur";
                }
              }
              let model = "Défibrillateur standard";
              let address = m.clientName || "Adresse non spécifiée";
              if (defib) {
                const modelVar = variables.find(
                  (v: any) => v.id === defib.modeleId,
                );
                if (modelVar) {
                  model = modelVar.marque
                    ? `${modelVar.marque} ${modelVar.nom}`
                    : modelVar.nom;
                }
                const addrParts = [defib.numVoie, defib.cp, defib.ville].filter(
                  Boolean,
                );
                if (addrParts.length > 0) {
                  address = addrParts.join(", ");
                }
              } else if (other) {
                model = other.categorie || "Autre matériel";
                const addrParts = [
                  other.numeroVoie,
                  other.codePostal,
                  other.ville,
                ].filter(Boolean);
                if (addrParts.length > 0) {
                  address = addrParts.join(", ");
                }
              }
              const calculatedDate = (() => {
                const tourStartDate = mt.startDate || "";
                if (!tourStartDate) return "";
                const d = new Date(tourStartDate);
                if (isNaN(d.getTime())) return tourStartDate;
                const daysToAdd = Math.floor(idx / 6);
                d.setDate(d.getDate() + daysToAdd);
                return d.toISOString().split("T")[0];
              })();
              const rawEstDate = m.estimatedDate || calculatedDate;

              return {
                num: idx + 1,
                id: m.id || `df-p-${idx}`,
                identifiant: m.defibIdentifiant || defib?.identifiant || "",
                model,
                address,
                equipmentType,
                status: m.status || "À faire",
                reason: m.reason || "Visite technique",
                requiredParts: m.requiredParts || [],
                estimatedDate: rawEstDate,
                estimatedSlot: m.estimatedSlot || "",
                rejectionReason: m.rejectionReason || "",
                rejectedAt: m.rejectedAt || "",
              };
            }),
          };
        });

        setTours(mapped);
      } else {
        setTours([]);
      }
    } catch (e) {
      console.error("Error syncing FSM tours inside useEffect:", e);
    }
  }, [authenticatedUser, defibrillateurs, fsmTours, members, variables]);

  // Switch/Toggle status of a passage
  const togglePassageStatus = (tourId: string, passageNum: number) => {
    const updated = tours.map((t) => {
      if (t.id === tourId) {
        return {
          ...t,
          passages: t.passages.map((p) => {
            if (p.num === passageNum) {
              const newStatus = p.status === "À faire" ? "Effectué" : "À faire";
              return { ...p, status: newStatus };
            }
            return p;
          }),
        };
      }
      return t;
    });
    saveTours(updated);
  };

  // PDF Report state variables
  const [selectedDefibId, setSelectedDefibId] = useState("");
  const [selectedDefibData, setSelectedDefibData] =
    useState<Defibrillateur | null>(null);
  const [selectedOtherEquipmentUnique, setSelectedOtherEquipmentUnique] =
    useState<any | null>(null);
  const [isLotScannerOpen, setIsLotScannerOpen] = useState(false);
  const [isSerieScannerOpen, setIsSerieScannerOpen] = useState(false);
  const [isLotAScannerOpen, setIsLotAScannerOpen] = useState(false);
  const [isLotPScannerOpen, setIsLotPScannerOpen] = useState(false);
  const [isLotBatScannerOpen, setIsLotBatScannerOpen] = useState(false);

  // Custom Maintenance Fields for Tab 2
  const [receiptTitle, setReceiptTitle] = useState(
    "RAPPORT TECHNIQUE DÉFIBRILLATEUR",
  );
  const [missionSite, setMissionSite] = useState<"DÉPLACEMENT" | "ATELIER SAV">(
    "DÉPLACEMENT",
  );
  const [horodateInput, setHorodateInput] = useState("");
  const [techPhotoUrl, setTechPhotoUrl] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Generated Reports Historical Feed list from LocalStorage
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(
    () => {
      const saved = localStorage.getItem("defib_generated_reports");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return [
        {
          id: "rep-1",
          date: "02-06-2026 14:15",
          techName: "Thierry Martin",
          defibId: "df_1",
          defibIdentifiant: "PAR-101",
          title: "CONSTAT DE MAINTENANCE DÉFIBRILLATEUR",
          siteMission: "DÉPLACEMENT",
          photoUrl:
            "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=100&auto=format&fit=crop",
        },
      ];
    },
  );

  useEffect(() => {
    if (propGeneratedReports) {
      setGeneratedReports(propGeneratedReports);
    }
  }, [propGeneratedReports]);

  const saveReports = (updated: GeneratedReport[]) => {
    setGeneratedReports(updated);
    try {
      localStorage.setItem("defib_generated_reports", JSON.stringify(updated));
    } catch (e) {
      console.warn(
        "LocalStorage Quota Exceeded while saving generated reports locally:",
        e,
      );
    }
    if (onUpdateGeneratedReports) {
      onUpdateGeneratedReports(updated);
    }
  };

  const parseReportDate = (dateStr: string) => {
    if (!dateStr) return 0;
    // Handle formats like "DD-MM-YYYY HH:mm" or "DD/MM/YYYY HH:mm" or ISO
    const clean = dateStr.replace(/\s+/g, " ").replace(/\//g, "-").trim();
    if (clean.includes("T") || clean.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(clean).getTime();
    }
    const spaceParts = clean.split(" ");
    const datePart = spaceParts[0];
    const timePart = spaceParts[1] || "00:00";

    const dateParts = datePart.split("-");
    const timeParts = timePart.split(":");

    if (dateParts.length === 3) {
      let day = parseInt(dateParts[0], 10);
      let month = parseInt(dateParts[1], 10) - 1;
      let year = parseInt(dateParts[2], 10);
      if (dateParts[0].length === 4) {
        year = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        day = parseInt(dateParts[2], 10);
      }

      const hour = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
      const min = timeParts[1] ? parseInt(timeParts[1], 10) : 0;

      return new Date(year, month, day, hour, min).getTime();
    }
    return 0;
  };

  const sortedAndLimitedReports = [...generatedReports]
    .sort((a, b) => {
      const timeA = parseReportDate(a.date);
      const timeB = parseReportDate(b.date);
      return timeB - timeA;
    })
    .slice(0, 50);

  const [printingReport, setPrintingReport] = useState<GeneratedReport | null>(
    null,
  );

  const handleDownloadReport = (report: any) => {
    const snapshot =
      report.defibSnapshot ||
      defibrillateurs.find(
        (d) =>
          d.id === report.defibId || d.identifiant === report.defibIdentifiant,
      ) ||
      {};

    if (snapshot.categorie && snapshot.categorie !== "Défibrillateur") {
      const clientFound = clients.find((c) => c.id === snapshot.clientId);
      const clientName = clientFound
        ? clientFound.denomination
        : snapshot.nomPrenomSite || "Non rattaché";

      // Filter out typical top-level keys to get custom equipment properties!
      const topLevelKeys = [
        "id",
        "clientId",
        "nomPrenomSite",
        "telephoneSite",
        "emailSite",
        "contrat",
        "nomContrat",
        "referenceContrat",
        "debutContrat",
        "finContrat",
        "pays",
        "codePostal",
        "cp",
        "ville",
        "adresseComplexe",
        "identifiant",
        "codeNfc",
        "statutGmao",
        "categorie",
        "conforme",
        "miseEnServiceDate",
        "miseEnService",
        "commentaireGmao",
      ];

      const customProperties = Object.entries(snapshot).filter(([k, v]) => {
        return (
          !topLevelKeys.includes(k) &&
          v !== undefined &&
          v !== null &&
          v !== "" &&
          typeof v !== "object"
        );
      });

      const compLogo = companyInfo.logo || "";
      const compName = companyInfo.name || "Défibeo Solutions";
      const compEmail = companyInfo.email || "";
      const compPhone = companyInfo.phone || "";
      const compWebsite = companyInfo.website || "";

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || "-"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @font-face {
              font-family: "Civilprom";
              src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
              font-weight: 100 900;
              font-style: normal;
              font-display: swap;
            }
            @font-face {
              font-family: "Gochi";
              src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            * {
              box-sizing: border-box;
              font-family: "Civilprom", "Inter", sans-serif !important;
              font-weight: 100 !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              font-family: "Civilprom", "Inter", sans-serif !important;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #print-container {
              width: 210mm;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .pdf-page {
              position: relative;
              width: 210mm;
              height: 297mm;
              padding: 20mm 15mm;
              box-sizing: border-box;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 15px;
              page-break-after: always;
              break-after: page;
            }
            .pdf-header {
              font-family: "Gochi", cursive !important;
              font-size: 32px;
              font-weight: normal !important;
              text-align: center;
              color: #000000;
              margin-top: -10px;
              margin-bottom: 4px;
            }
            .pdf-grid {
              display: flex;
              flex-direction: column;
              gap: 12px;
              width: 100%;
            }
            .pdf-card {
              border: 1px solid rgb(201, 190, 205);
              border-radius: 14px;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pdf-card-header {
              padding: 10px 14px 2px 14px;
              font-size: 18px;
              color: #000000;
            }
            .pdf-card-body {
              padding: 8px 14px 12px 14px;
              font-size: 16px;
              display: flex;
              flex-direction: column;
              gap: 4px;
              color: #000000;
            }
            .pdf-line {
              color: #000000;
              line-height: 1.35;
              font-size: 16px;
            }
            .pdf-label {
              color: rgb(138, 138, 138);
            }
            .pdf-bold {
              color: #000000;
            }
            .pdf-footer {
              position: absolute;
              bottom: 15mm;
              right: 15mm;
              font-size: 11px;
              color: #000000;
            }
          </style>
        </head>
        <body class="bg-white">
          <div id="print-container">
            <div class="pdf-page">
              <div class="pdf-header">
                ${report.title ? report.title : `Rapport d’intervention - ${snapshot.categorie}`}
              </div>
              
              <div style="font-family: 'Civilprom', sans-serif !important; font-size: 18px; text-align: center; color: #000000; margin-bottom: 8px; line-height: 1.4;">
                Conservez et archivez consciencieusement ce certificat technique GMAO pour vos obligations d'entretien.
              </div>

              <div class="pdf-grid">
                <!-- SECTION 1 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">1 — Coordonnées du mainteneur.</div>
                  <div class="pdf-card-body" style="align-items: flex-start; justify-content: flex-start; text-align: left; gap: 4px;">
                    ${compLogo ? `<img src="${compLogo}" style="max-height: 40px; max-width: 300px; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ""}
                    <div class="pdf-line pdf-bold" style="font-size: 16px; margin-bottom: 2px;">${compName}</div>
                    <div class="pdf-line"><span class="pdf-label">Email :</span> <span class="pdf-bold">${compEmail || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Tél :</span> <span class="pdf-bold">${compPhone || ""}</span></div>
                    <div class="pdf-line" style="margin-top: 2px;"><a href="https://${compWebsite}" target="_blank" style="color: #2563eb; text-decoration: underline;">${compWebsite}</a></div>
                  </div>
                </div>

                <!-- SECTION 2 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">2 — Infos client & contrat.</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Contact sur place :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Sous contrat :</span> <span class="pdf-bold">${snapshot.contrat || "Non"}</span></div>
                    ${
                      snapshot.contrat === "Oui"
                        ? `
                      <div class="pdf-line"><span class="pdf-label">Nom du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ""}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Référence contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ""}</span></div>
                    `
                        : ""
                    }
                  </div>
                </div>

                <!-- SECTION 3 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">3 — Spécifications du matériel (${snapshot.categorie}).</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Catégorie :</span> <span class="pdf-bold">${snapshot.categorie || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Identifiant unique :</span> <span class="pdf-bold">${snapshot.identifiant || ""}</span></div>
                    ${snapshot.codeNfc ? `<div class="pdf-line"><span class="pdf-label">Code NFC :</span> <span class="pdf-bold">${snapshot.codeNfc}</span></div>` : ""}
                    <div class="pdf-line"><span class="pdf-label">Statut GMAO :</span> <span class="pdf-bold">${snapshot.statutGmao || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Mise en service :</span> <span class="pdf-bold">${snapshot.miseEnServiceDate || snapshot.miseEnService || ""}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Conformité générale :</span> <span class="pdf-bold ${snapshot.conforme === "Non" ? "text-rose-600 font-bold" : "text-emerald-600"}">${snapshot.conforme || "Oui"}</span></div>
                  </div>
                </div>
              </div>
              <div class="pdf-footer">Page 1 / 2</div>
            </div>

            <!-- PAGE 2 -->
            <div class="pdf-page">
              <div class="pdf-grid">
                <!-- CUSTOM SECTION / CHECKPOINTS -->
                ${
                  customProperties.length > 0
                    ? `
                  <div class="pdf-card">
                    <div class="pdf-card-header">4 — Paramètres spécifiques & Vérifications.</div>
                    <div class="pdf-card-body">
                      ${customProperties
                        .map(
                          ([key, val]) => `
                        <div class="pdf-line"><span class="pdf-label" style="text-transform: capitalize;">${key.replace(/([A-Z])/g, " $1")}:</span> <span class="pdf-bold">${val}</span></div>
                      `,
                        )
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- ACTIONS, NOTES & CAPTURE EVIDENCE -->
                <div class="pdf-card">
                  <div class="pdf-card-header">5 — Clôture de l'intervention.</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Technicien intervenant :</span> <span class="pdf-bold">${report.techName || "Administrateur"}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Date d’intervention :</span> <span class="pdf-bold">${report.date || "-"}</span></div>
                    ${report.endTimeStamp ? `<div class="pdf-line"><span class="pdf-label">Heure de fin :</span> <span class="pdf-bold">${report.endTimeStamp}</span></div>` : ""}
                    <div class="pdf-line" style="margin-bottom: 4px;">
                      <span class="pdf-label">Commentaire / Remarques :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireGmao || snapshot.commentaire || "Aucun commentaire."}</span>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%; padding-top: 8px; margin-top: 4px;">
                      <!-- Photo -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Photographie terrain.</div>
                        ${
                          report.photoUrl
                            ? `
                          <div style="border: none; border-radius: 4px; overflow: hidden; background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 120px; max-width: 200px;">
                            <img src="${report.photoUrl}" style="max-height: 120px; max-width: 200px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                          </div>
                        `
                            : '<div style="font-size: 15px; color: #a1a1a1; font-style: italic;">Aucune photographie</div>'
                        }
                      </div>

                      <!-- Signature Technicien -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                        ${
                          report.techSignature
                            ? `
                          <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                            <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                          </div>
                        `
                            : `
                          <div style="font-size: 15px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `
                        }
                      </div>

                      <!-- Signature Client -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                        ${
                          report.clientPinCode
                            ? `
                          <div style="font-size: 11px; margin-bottom: 2px;">
                            <span class="pdf-label" style="font-size:11px; color:#555;">Code validation:</span> 
                            <span class="pdf-bold" style="font-size:11px; font-family: monospace !important; font-weight: bold !important; color:#000;">${report.clientPinCode}</span>
                          </div>
                        `
                            : ""
                        }
                        ${
                          clientFound && clientFound.clientSignatureImage
                            ? `
                          <div style="background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; gap: 2px;">
                            <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                            <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">Signé électroniquement</div>
                          </div>
                        `
                            : `
                          ${
                            report.clientPinCode
                              ? `
                            <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">
                              Signé électroniquement par PIN (${report.clientPinCode})
                            </div>
                          `
                              : `
                            <div style="font-size: 13px; color: #a1a1a1; font-style: italic;">
                              Non signée
                            </div>
                          `
                          }
                        `
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pdf-footer">Page 2 / 2</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }

    // Resolve CompanyInfo
    const compLogo = companyInfo.logo || "";
    const compName = companyInfo.name || "Défibeo Solutions";
    const compEmail = companyInfo.email || "";
    const compPhone = companyInfo.phone || "";
    const compWebsite = companyInfo.website || "";

    // Resolving Client Name
    const clientFound = clients.find((c) => c.id === snapshot.clientId);
    const clientName = clientFound
      ? clientFound.denomination
      : snapshot.nomPrenomSite || "Non rattaché";

    // Resolving Model names from Variable list
    const defibModel = variables.find((v) => v.id === snapshot.modeleId);
    const defibModelName = defibModel
      ? `${defibModel.marque} ${defibModel.nom}`
      : snapshot.modeleId || "Non spécifié";

    const coffretModel = variables.find(
      (v) => v.id === snapshot.modeleCoffretId,
    );
    const coffretModelName = coffretModel
      ? `${coffretModel.marque} ${coffretModel.nom}`
      : snapshot.modeleCoffretId || "Non spécifié";

    const electrodeAModel = variables.find(
      (v) => v.id === snapshot.modeleElectrodeAId,
    );
    const electrodeAModelName = electrodeAModel
      ? `${electrodeAModel.marque} ${electrodeAModel.nom}`
      : snapshot.modeleElectrodeAId || "Non spécifié";

    const electrodeASecoursModel = variables.find(
      (v) => v.id === snapshot.modeleElectrodeASecoursId,
    );
    const electrodeASecoursModelName = electrodeASecoursModel
      ? `${electrodeASecoursModel.marque} ${electrodeASecoursModel.nom}`
      : "";

    const electrodePModel = variables.find(
      (v) => v.id === snapshot.modeleElectrodePId,
    );
    const electrodePModelName = electrodePModel
      ? `${electrodePModel.marque} ${electrodePModel.nom}`
      : snapshot.modeleElectrodePId || "Non spécifié";

    const electrodePSecoursModel = variables.find(
      (v) => v.id === snapshot.modeleElectrodePSecoursId,
    );
    const electrodePSecoursModelName = electrodePSecoursModel
      ? `${electrodePSecoursModel.marque} ${electrodePSecoursModel.nom}`
      : "";

    const batterieModel = variables.find(
      (v) => v.id === snapshot.modeleBatterieId,
    );
    const batterieModelName = batterieModel
      ? `${batterieModel.marque} ${batterieModel.nom}`
      : snapshot.modeleBatterieId || "Non spécifié";

    // Helper to resolve stock pieces
    const getStockPieceLabel = (stockId: string) => {
      if (!stockId) return "-";
      const stockItem = stocks.find((s: any) => s.id === stockId);
      if (!stockItem) return stockId;
      const variableItem = variables.find(
        (v: any) => v.id === stockItem.denominationPieceId,
      );
      if (!variableItem) return `Pièce (${stockItem.denominationPieceId})`;
      return `${variableItem.nom} (${variableItem.marque})`;
    };

    // Helper to resolve service label
    const getServiceLabel = (serviceId: string) => {
      if (!serviceId) return "";
      const stockItem = stocks.find((s: any) => s.id === serviceId);
      if (stockItem) {
        const variable = variables.find(
          (v: any) => v.id === stockItem.denominationPieceId,
        );
        return variable ? `${variable.nom} (${variable.marque})` : "Service";
      }
      const variable = variables.find((v: any) => v.id === serviceId);
      if (variable) {
        return `${variable.nom} (${variable.marque})`;
      }
      return serviceId;
    };

    const selElectrodeA = getStockPieceLabel(
      report.selectionElectrodeARemplacee,
    );
    const selElectrodeASecours = getStockPieceLabel(
      report.selectionElectrodeASecoursRemplacee,
    );
    const selElectrodeP = getStockPieceLabel(
      report.selectionElectrodePRemplacee,
    );
    const selElectrodePSecours = getStockPieceLabel(
      report.selectionElectrodePSecoursRemplacee,
    );
    const selBatterie = getStockPieceLabel(report.selectionBatterieRemplacee);
    const selKitSecours = getStockPieceLabel(
      report.selectionKitSecoursRemplace,
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || "-"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          @font-face {
            font-family: "Civilprom";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }

          @font-face {
            font-family: "Gochi";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }

          * {
            box-sizing: border-box;
            font-family: "Civilprom", "Inter", sans-serif !important;
            font-weight: 100 !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            font-family: "Civilprom", "Inter", sans-serif !important;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #print-container {
            width: 210mm;
            margin: 0 auto;
            background-color: #ffffff;
          }

          .pdf-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 20mm 15mm;
            box-sizing: border-box;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 15px;
            page-break-after: always;
            break-after: page;
          }

          .pdf-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          .pdf-header {
            font-family: "Gochi", cursive !important;
            font-size: 32px;
            font-weight: normal !important;
            text-align: center;
            color: #000000;
            margin-top: -10px;
            margin-bottom: 4px;
            padding: 0;
            border: none;
          }

          .pdf-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }

          .pdf-card {
            border: 1px solid rgb(201, 190, 205);
            border-radius: 14px;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pdf-card-header {
            background-color: transparent;
            color: #000000;
            border-bottom: none;
            font-size: 18px;
            font-weight: 100 !important;
            text-align: left;
            padding: 10px 14px 2px 14px;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-card-body {
            padding: 8px 14px 12px 14px;
            font-size: 16px;
            font-family: "Civilprom", sans-serif !important;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
            color: #000000;
          }

          .pdf-line {
            color: #000000;
            line-height: 1.35;
            font-size: 16px;
            text-align: left;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-label {
            color: rgb(138, 138, 138);
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-bold {
            font-weight: 100 !important;
            color: #000000;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-footer {
            position: absolute;
            bottom: 15mm;
            right: 15mm;
            font-size: 11px;
            color: #000000;
            font-family: "Civilprom", sans-serif;
            font-weight: 100 !important;
          }
        </style>
      </head>
      <body class="bg-white">
        
        <div id="print-container">

          <!-- PAGE 1 -->
          <div class="pdf-page">
            <div class="pdf-header">
              ${report.title ? report.title : "Rapport d’intervention GMAO"}
            </div>

            <div style="font-family: 'Civilprom', sans-serif !important; font-size: 18px; text-align: center; color: #000000; margin-bottom: 8px; line-height: 1.4;">
              Utilisez ce lien pour vous connecter à l’accès client, envoyer une demande ou signaler un problème&nbsp;: 
              <a href="https://defibeo.deroesch.com/" target="_blank" style="color: #2563eb; text-decoration: underline;">https://defibeo.deroesch.com/</a>
              <br />
              Nous vous recommandons de conserver et archiver le présent document.
            </div>

            <div class="pdf-grid">
              <!-- SECTION 1 -->
              <div class="pdf-card">
                <div class="pdf-card-header">1 — Coordonnées du mainteneur.</div>
                <div class="pdf-card-body" style="align-items: flex-start; justify-content: flex-start; text-align: left; gap: 4px;">
                  ${compLogo ? `<img src="${compLogo}" style="max-height: 40px; max-width: 300px; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ""}
                  <div class="pdf-line pdf-bold" style="font-size: 16px; margin-bottom: 2px;">${compName}</div>
                  <div class="pdf-line"><span class="pdf-label">Email :</span> <span class="pdf-bold">${compEmail || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Tél :</span> <span class="pdf-bold">${compPhone || ""}</span></div>
                  <div class="pdf-line" style="margin-top: 2px;"><a href="https://${compWebsite}" target="_blank" style="color: #2563eb; text-decoration: underline;">${compWebsite}</a></div>
                </div>
              </div>

              <!-- SECTION 2 -->
              <div class="pdf-card">
                <div class="pdf-card-header">2 — Infos défibrillateur.</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Contact :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Identifiant :</span> <span class="pdf-bold">${snapshot.identifiant || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Série :</span> <span class="pdf-bold">${snapshot.numeroSerie || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Modèle :</span> <span class="pdf-bold">${snapshot.modeleId ? defibModelName : ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Contrat :</span> <span class="pdf-bold">${snapshot.contrat || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Référence du contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Catégorie du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Facture :</span> <span class="pdf-bold">${report.emettreFactureBrouillon || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Service facturé :</span> <span class="pdf-bold">${report.serviceEmettreId ? getServiceLabel(report.serviceEmettreId) : ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Voie :</span> <span class="pdf-bold">${snapshot.numVoie || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Ville :</span> <span class="pdf-bold">${snapshot.ville || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Code Postal :</span> <span class="pdf-bold">${snapshot.cp || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Région :</span> <span class="pdf-bold">${snapshot.region || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Pays :</span> <span class="pdf-bold">${snapshot.pays || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Latitude GPS :</span> <span class="pdf-bold">${snapshot.latitude || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Longitude GPS :</span> <span class="pdf-bold">${snapshot.longitude || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Fabrication :</span> <span class="pdf-bold">${snapshot.fabrication || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Mise en service :</span> <span class="pdf-bold">${snapshot.miseEnService || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Fin de garantie :</span> <span class="pdf-bold">${snapshot.finGarantie || ""}</span></div>
                </div>
              </div>

              <!-- SECTION 3 -->
              <div class="pdf-card">
                <div class="pdf-card-header">3 — Coffret ou armoire.</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle de boîtier :</span> <span class="pdf-bold">${coffretModelName || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot de boîtier :</span> <span class="pdf-bold">${snapshot.numeroLotCoffret || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Équipé d’une alarme :</span> <span class="pdf-bold">${report.equipeAlarme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Alarme fonctionnelle :</span> <span class="pdf-bold">${report.alarme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Dispositif d’armoire connectée :</span> <span class="pdf-bold">${report.armoireConnectee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Dispositif handicap :</span> <span class="pdf-bold">${report.dispositifHandicap || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Signalétique conforme :</span> <span class="pdf-bold">${report.signaletiqueConforme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant le boîtier :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireCoffret || ""}</span></div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 1 / 3</div>
          </div>

          <!-- PAGE 2 -->
          <div class="pdf-page">
            <div class="pdf-grid">
              <!-- SECTION 4 -->
              <div class="pdf-card">
                <div class="pdf-card-header">4 — Vérifications techniques.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  <div class="pdf-line"><span class="pdf-label">Conforme à mon arrivée :</span> <span class="pdf-bold">${report.techConformeArrivee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire sur l’état à mon arrivée :</span> <span class="pdf-bold">${report.techCommentaireArrivee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-rose-700">Nettoyage :</span> <span class="pdf-bold">${report.techNettoyage || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Voyant conforme :</span> <span class="pdf-bold">${report.techVoyantConforme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Équipé d’un message numérique :</span> <span class="pdf-bold">${report.techEquipeMessageNumerique || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Message numérique conforme :</span> <span class="pdf-bold">${report.techMessageNumeroConforme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Guides vocaux conformes :</span> <span class="pdf-bold">${report.techGuidesVocauxConformes || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Branchement conforme des électrodes :</span> <span class="pdf-bold">${report.techBranchementElectrodesConforme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Délivrance du choc conforme :</span> <span class="pdf-bold">${report.techDelivranceChocConforme || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Résultat du test en joules de l’électrode A :</span> <span class="pdf-bold">${report.techResultatJoulesElectrodeA ? report.techResultatJoulesElectrodeA + " J" : ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Résultat du test en joules de l’électrode P :</span> <span class="pdf-bold">${report.techResultatJoulesElectrodeA2 ? report.techResultatJoulesElectrodeA2 + " J" : ""}</span></div>
                </div>
              </div>

              <!-- SECTION 5 -->
              <div class="pdf-card">
                <div class="pdf-card-header">5 — Électrode adulte (A).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode A :</span> <span class="pdf-bold">${electrodeAModelName || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot A :</span> <span class="pdf-bold">${snapshot.lotElectrodeA || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Insertion :</span> <span class="pdf-bold">${snapshot.insertionElectrodeA || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeA || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Modèle électrode secours :</span> <span class="pdf-bold">${electrodeASecoursModelName || "Aucun"}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodeASecours || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeA || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode A remplacée :</span> <span class="pdf-bold">${report.electrodeARemplacee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Électrode A conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodeAConformeSante || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeA || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Électrode A Secours remplacée :</span> <span class="pdf-bold">${report.electrodeASecoursRemplacee || "Non"}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Sélection de l'électrode Secours A remplacée :</span> <span class="pdf-bold">${selElectrodeASecours || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode A :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeA || ""}</span></div>
                </div>
              </div>

              <!-- SECTION 6 -->
              <div class="pdf-card">
                <div class="pdf-card-header">6 — Électrode pédiatrique (P).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode P :</span> <span class="pdf-bold">${electrodePModelName || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot P :</span> <span class="pdf-bold">${snapshot.lotElectrodeP || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeP || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Modèle électrode secours :</span> <span class="pdf-bold">${electrodePSecoursModelName || "Aucun"}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodePSecours || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeP || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode P remplacée :</span> <span class="pdf-bold">${report.electrodePRemplacee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Électrode P conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodePConformeSante || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeP || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Électrode P Secours remplacée :</span> <span class="pdf-bold">${report.electrodePSecoursRemplacee || "Non"}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Sélection de l'électrode Secours P remplacée :</span> <span class="pdf-bold">${selElectrodePSecours || ""}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode P :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeP || ""}</span></div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 2 / 3</div>
          </div>

          <!-- PAGE 3 -->
          <div class="pdf-page">
            <div class="pdf-grid">
              <!-- SECTION 7 -->
              <div class="pdf-card">
                <div class="pdf-card-header">7 — Batterie (B).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle de batterie :</span> <span class="pdf-bold">${batterieModelName || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Pourcentage de charge :</span> <span class="pdf-bold">${snapshot.pourcentageBatterie ? snapshot.pourcentageBatterie + "%" : ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot B :</span> <span class="pdf-bold">${snapshot.lotBatterie || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionBatterie || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Batterie remplacée :</span> <span class="pdf-bold">${report.batterieRemplacee || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Batterie conforme et fonctionnelle :</span> <span class="pdf-bold">${report.batterieConformeSante || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de la batterie :</span> <span class="pdf-bold">${selBatterie || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant la batterie :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireBatterie || ""}</span></div>
                </div>
              </div>

              <!-- SECTION 8 -->
              <div class="pdf-card">
                <div class="pdf-card-header">8 — Vérifications du kit de secours.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  <div class="pdf-line"><span class="pdf-label">Trousse de secours présente :</span> <span class="pdf-bold">${report.kitTrousseSecoursPresent || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Kit de secours remplacé ou ajouté :</span> <span class="pdf-bold">${report.kitSecoursRemplaceOuAjoute || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection d’un kit de secours :</span> <span class="pdf-bold">${selKitSecours || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Ciseaux présents :</span> <span class="pdf-bold">${report.kitCiseauxPresents || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Masque présent :</span> <span class="pdf-bold">${report.kitMasquePresent || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption du masque :</span> <span class="pdf-bold">${report.kitPeremptionMasque || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Serviettes présentes :</span> <span class="pdf-bold">${report.kitServiettesPresentes || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption des serviettes :</span> <span class="pdf-bold">${report.kitPeremptionServiettes || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Paires de gants présents :</span> <span class="pdf-bold">${report.kitGantsPresents || ""}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Rasoir :</span> <span class="pdf-bold">${report.kitRasoirPresent || ""}</span></div>
                </div>
              </div>

              <!-- SECTION 9 -->
              <div class="pdf-card">
                <div class="pdf-card-header">9 — Diagnostic et clôture.</div>
                <div class="pdf-card-body" style="display: flex; flex-direction: column; gap: 6px;">
                  <div class="pdf-line">
                    <span class="pdf-label">Défibrillateur conforme et prêt à l’usage :</span> <span class="pdf-bold">${snapshot.conforme === "Oui" || report.conforme === "Oui" ? "Oui" : "Non"}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Technicien :</span> <span class="pdf-bold">${report.techName || "-"}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Fichier de données récupéré :</span> <span class="pdf-bold">${report.fichierDonneesRecupere || ""}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Horodatage début d’intervention :</span> <span class="pdf-bold">${report.date || "-"}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Horodatage fin d’intervention :</span> <span class="pdf-bold">${report.endTimeStamp || "-"}</span>
                  </div>
                  <div class="pdf-line" style="margin-bottom: 4px;">
                    <span class="pdf-label">Commentaire :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaire || report.defibSnapshot?.commentaire || "-"}</span>
                  </div>
                  
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%; padding-top: 8px; margin-top: 4px;">
                    <!-- Photography -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Photographie du défibrillateur.</div>
                      ${
                        report.photoUrl
                          ? `
                        <div style="border: none; border-radius: 4px; overflow: hidden; background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 120px; max-width: 200px;">
                          <img src="${report.photoUrl}" style="max-height: 120px; max-width: 200px; object-fit: contain;" alt="Preuve" referrerPolicy="no-referrer" />
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- Signature Technicien -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                      ${
                        report.techSignature
                          ? `
                        <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                          <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                        </div>
                      `
                          : `
                        <div style="font-size: 16px; color: #000000; font-style: italic;">
                          Non signée
                        </div>
                      `
                      }
                    </div>

                    <!-- Signature Client -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                      ${
                        report.clientPinCode
                          ? `
                        <div style="font-size: 11px; margin-bottom: 2px;">
                          <span class="pdf-label" style="font-size:11px; color:#555;">Code validation:</span> 
                          <span class="pdf-bold" style="font-size:11px; font-family: monospace !important; font-weight: bold !important; color:#000;">${report.clientPinCode}</span>
                        </div>
                      `
                          : ""
                      }
                      ${
                        clientFound && clientFound.clientSignatureImage
                          ? `
                        <div style="background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; gap: 2px;">
                          <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                          <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">Signé électroniquement</div>
                        </div>
                      `
                          : `
                        ${
                          report.clientPinCode
                            ? `
                          <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">
                            Signé électroniquement par PIN (${report.clientPinCode})
                          </div>
                        `
                            : `
                          <div style="font-size: 13px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `
                        }
                      `
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 3 / 3</div>
          </div>

        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // TIME WORK tracking state variables
  const [pointages, setPointages] = useState<PointageLog[]>(() => {
    const envId = localStorage.getItem("defib_tenant_id") || "demo";
    const saved = localStorage.getItem(`defib_${envId}_pointages_history`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "pt-1",
        techName: "Technicien Ouest",
        startDate: "02-06-2026",
        startTime: "08:00",
        endDate: "02-06-2026",
        endTime: "12:00",
        durationSeconds: 14400,
        isOngoing: false,
      },
    ];
  });

  useEffect(() => {
    if (propPointages) {
      setPointages(propPointages);
    }
  }, [propPointages]);

  const savePointages = (updated: PointageLog[]) => {
    setPointages(updated);
    const envId = localStorage.getItem("defib_tenant_id") || "demo";
    localStorage.setItem(
      `defib_${envId}_pointages_history`,
      JSON.stringify(updated),
    );
    if (onUpdatePointages) {
      onUpdatePointages(updated);
    }
  };

  // Track ticker in seconds for active stopwatch
  const [ongoingSeconds, setOngoingSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const activePointage = pointages.find(
      (p) => p.isOngoing && p.techName === authenticatedUser?.name,
    );
    if (activePointage) {
      const getStartDateTime = (
        startDateStr: string,
        startTimeStr: string,
      ): Date => {
        const parts = startDateStr.split(/[-/]/);
        const tParts = startTimeStr.split(":");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          date.setHours(parseInt(tParts[0], 10), parseInt(tParts[1], 10), 0, 0);
          return date;
        }
        const fallback = new Date();
        fallback.setHours(
          parseInt(tParts[0], 10),
          parseInt(tParts[1], 10),
          0,
          0,
        );
        return fallback;
      };

      const startObj = getStartDateTime(
        activePointage.startDate,
        activePointage.startTime,
      );

      const checkAndTick = () => {
        const now = new Date();
        const diffSeconds = Math.max(
          0,
          Math.round((now.getTime() - startObj.getTime()) / 1000),
        );

        if (diffSeconds >= 10 * 3600) {
          const tenHoursLater = new Date(startObj.getTime() + 10 * 3600 * 1000);
          const activeIdx = pointages.findIndex(
            (p) => p.id === activePointage.id,
          );
          if (activeIdx !== -1) {
            const updated = [...pointages];
            updated[activeIdx] = {
              ...activePointage,
              endDate: tenHoursLater.toLocaleDateString("fr-FR"),
              endTime:
                String(tenHoursLater.getHours()).padStart(2, "0") +
                ":" +
                String(tenHoursLater.getMinutes()).padStart(2, "0"),
              durationSeconds: 10 * 3600,
              comment:
                activePointage.comment && activePointage.comment.trim()
                  ? activePointage.comment.trim()
                  : "Nouvelle période sans titre.",
              isOngoing: false,
            };
            savePointages(updated);
            alert(
              "Pointage arrêté automatiquement : durée maximum de 10 heures atteinte.",
            );
          }
        } else {
          setOngoingSeconds(diffSeconds);
        }
      };

      checkAndTick();
      interval = setInterval(checkAndTick, 1000);
    } else {
      setOngoingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [pointages, authenticatedUser]);

  // Expenses state variables
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const envId = localStorage.getItem("defib_tenant_id") || "demo";
    const saved = localStorage.getItem(`defib_${envId}_expenses`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "exp-1",
        techName: "Thierry Martin",
        title: "Abonnement Parking Nantes",
        amountTtc: 18.2,
        amountHt: 15.17,
        amountTva: 3.03,
        dateStr: "2026-06-02",
        photoUrl:
          "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&auto=format&fit=crop",
      },
    ];
  });

  useEffect(() => {
    if (propExpenses) {
      setExpenses(propExpenses);
    }
  }, [propExpenses]);

  const saveExpenses = (updated: Expense[]) => {
    setExpenses(updated);
    const envId = localStorage.getItem("defib_tenant_id") || "demo";
    try {
      localStorage.setItem(`defib_${envId}_expenses`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage quota exceeded for expenses in PublicPortal:", e);
    }
    if (onUpdateExpenses) {
      onUpdateExpenses(updated);
    }
  };

  // New expense form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseTtc, setExpenseTtc] = useState("");
  const [expenseHt, setExpenseHt] = useState("");
  const [expenseTva, setExpenseTva] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [expensePhotoUrl, setExpensePhotoUrl] = useState("");
  const expensePhotoInputRef = useRef<HTMLInputElement>(null);

  // Localisation form states for the connected technician
  const [techStartAddress, setTechStartAddress] = useState("");
  const [routeOptimization, setRouteOptimization] = useState(
    "Aller au plus proche d'abord",
  );

  // Autopopulate technician location details on login / select tab
  useEffect(() => {
    if (authenticatedUser) {
      const liveMember = members.find((m) => m.name === authenticatedUser.name);
      if (liveMember) {
        setTechLocationLink(liveMember.locationLink || "");
        setGpsSharingLink(
          liveMember.gpsSharingLink ||
            localStorage.getItem(
              `defib_tech_location_link_${liveMember.name}`,
            ) ||
            "",
        );
      }

      // Load stored starting address if any
      const envId = localStorage.getItem("defib_tenant_id") || "demo";
      const savedStart = localStorage.getItem(
        `defib_${envId}_tech_start_address_${authenticatedUser.name}`,
      );
      const savedOpt = localStorage.getItem(
        `defib_${envId}_tech_optimization_${authenticatedUser.name}`,
      );
      if (savedStart) setTechStartAddress(savedStart);
      if (savedOpt) setRouteOptimization(savedOpt);
    }
  }, [authenticatedUser, activeTab, members]);

  // Handle DAE lookup selection
  const handleDefibLookupChange = (daeId: string) => {
    setSelectedDefibId(daeId);
    const found = defibrillateurs.find((df) => df.id === daeId);
    if (found) {
      // Cloned deep fields to form
      setSelectedDefibData({ ...found });

      // Build initial timestamp for Horodate
      const now = new Date();
      const d = String(now.getDate()).padStart(2, "0");
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const y = now.getFullYear();
      const h = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setHorodateInput(`${d}-${m}-${y} ${h}:${min}:${s}`);
    } else {
      setSelectedDefibData(null);
    }
  };

  // Auto tax calculations helper
  const handleTtcChange = (val: string) => {
    setExpenseTtc(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const calculatedTva = num * 0.2;
      const calculatedHt = num - calculatedTva;
      setExpenseHt(calculatedHt.toFixed(2));
      setExpenseTva(calculatedTva.toFixed(2));
    } else {
      setExpenseHt("");
      setExpenseTva("");
    }
  };

  const handleHtChange = (val: string) => {
    setExpenseHt(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const ttcNum = num / 0.8;
      const tvaNum = ttcNum * 0.2;
      setExpenseTtc(ttcNum.toFixed(2));
      setExpenseTva(tvaNum.toFixed(2));
    } else {
      setExpenseTtc("");
      setExpenseTva("");
    }
  };

  // File Picker Base64 helper with auto-resize and compression (avoids Storage quota exceeded)
  const triggerPhotoRead = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        // Check if image format can be loaded into an Image object
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6); // 60% quality is perfect & extremely light
            setter(compressedBase64);
          } else {
            setter(rawBase64);
          }
        };
        img.onerror = () => {
          setter(rawBase64);
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  // PIN code handling refs
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Screen resets
  useEffect(() => {
    if (currentScreen === "mainteneur") {
      setPinDigits(["", "", "", ""]);
      setPinError("");
      // focus
      setTimeout(() => pinRefs[0].current?.focus(), 150);
    }
  }, [currentScreen]);

  // PIN changes
  const handlePinDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = cleanVal;
    setPinDigits(newDigits);
    setPinError("");

    if (cleanVal !== "" && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinBackspace = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && pinDigits[index] === "" && index > 0) {
      const newDigits = [...pinDigits];
      newDigits[index - 1] = "";
      setPinDigits(newDigits);
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinDialClick = (num: number) => {
    const emptyIdx = pinDigits.findIndex((d) => d === "");
    if (emptyIdx !== -1) {
      const newDigits = [...pinDigits];
      newDigits[emptyIdx] = num.toString();
      setPinDigits(newDigits);
      setPinError("");
      if (emptyIdx < 3) {
        pinRefs[emptyIdx + 1].current?.focus();
      }
    }
  };

  const handlePinClear = () => {
    setPinDigits(["", "", "", ""]);
    setPinError("");
    pinRefs[0].current?.focus();
  };

  // Evaluate PIN on change completeness
  useEffect(() => {
    const pinStr = pinDigits.join("");
    if (pinStr.length === 4) {
      const matched = members.find((m) => m.pin === pinStr);
      if (matched) {
        setPinError("");
        setAuthenticatedUser(matched);
        localStorage.setItem(
          "defib_active_tech_session",
          JSON.stringify(matched),
        );

        // Auto toast feedback
        setTimeout(() => {
          setCurrentScreen("landing");
        }, 800);
      } else {
        setPinError("Code PIN invalide. Accès refusé.");
        setTimeout(() => {
          setPinDigits(["", "", "", ""]);
          pinRefs[0].current?.focus();
        }, 1200);
      }
    }
  }, [pinDigits]);

  const handleLogout = () => {
    setAuthenticatedUser(null);
    localStorage.removeItem("defib_active_tech_session");
    setCurrentScreen("landing");
    setActiveTab("interventions");
    if (onClose) {
      onClose();
    }
  };

  // SUBMITS & ENREGISTREMENTS

  // Submit Signalement incident from public
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.identifiant || !ticketForm.message || !ticketForm.email) {
      alert(
        "Veuillez remplir tous les champs obligatoires (*) pour envoyer l'incident.",
      );
      return;
    }

    const ticketId = onAddTicket({
      identifiant: ticketForm.identifiant,
      objet: ticketForm.objet,
      message: ticketForm.message,
      email: ticketForm.email,
      phone: ticketForm.phone,
    });

    setCreatedTicketId(ticketId);
    setCurrentScreen("success-ticket");
    setTicketForm({
      identifiant: "",
      objet: "Défibrillateur utilisé",
      message: "",
      email: "",
      phone: "",
    });
  };

  const handleInlineTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.identifiant || !ticketForm.message || !ticketForm.email) {
      alert(
        "Veuillez remplir tous les champs obligatoires (*) pour envoyer l'incident.",
      );
      return;
    }

    const ticketId = onAddTicket({
      identifiant: ticketForm.identifiant,
      objet: ticketForm.objet,
      message: ticketForm.message,
      email: ticketForm.email,
      phone: ticketForm.phone,
    });

    setCreatedTicketId(ticketId);
    setInlineReportSuccess(true);
    setTicketForm({
      identifiant: "",
      objet: "Défibrillateur utilisé",
      message: "",
      email: "",
      phone: "",
    });
  };

  // Save/Generate PDF Report (Tab 2)
  const handleSavePdfReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDefibData) {
      alert(
        "Veuillez sélectionner un défibrillateur dans le menu déroulant lookup.",
      );
      return;
    }

    // Update with today's date (or horodate input date) as the derniereMaintenance date!
    const todayStr = new Date().toISOString().split("T")[0];
    const updatedDefib = {
      ...selectedDefibData,
      derniereMaintenance: todayStr,
    };

    // 1. Durably update main defibrillator record inside global state
    onUpdateDefib(updatedDefib);

    // 2. Generate a neat printed report block record
    const rId = "REP-" + Date.now();
    const newReportRecord: GeneratedReport = {
      id: rId,
      date: horodateInput || new Date().toLocaleString("fr-FR"),
      techName: authenticatedUser?.name || "Technicien connecté",
      defibId: updatedDefib.id,
      defibIdentifiant: updatedDefib.identifiant,
      title: receiptTitle,
      siteMission: missionSite,
      photoUrl: techPhotoUrl || undefined,
      defibSnapshot: { ...updatedDefib },
    };

    saveReports([newReportRecord, ...generatedReports]);

    // Email 6: RAPPORT SUITE À UNE INTERVENTION AU CLIENT
    try {
      const matchingClient = clients?.find(
        (c: any) => c.id === selectedDefibData.clientId,
      );
      const clientEmail =
        selectedDefibData.emailSite ||
        matchingClient?.email ||
        matchingClient?.emailSite;
      if (clientEmail && clientEmail.trim()) {
        triggerEmail6RapportIntervention(
          clientEmail.trim(),
          selectedDefibData.identifiant,
          newReportRecord.date,
          companyInfo.name || "Défibeo Suite",
          companyInfo.email || "",
        ).catch((e) => console.error("Error triggering Email 6:", e));
      } else {
        console.warn(
          `[Email 6] Client email not found for defibrillator ${selectedDefibData.identifiant}`,
        );
      }
    } catch (err6) {
      console.error("Error triggering Email 6 workflow:", err6);
    }

    alert(
      `Le rapport "${receiptTitle}" a été enregistré avec succès et rattaché avec l'historique du défibrillateur ${selectedDefibData.identifiant}. Les données du matériel central ont été mises à jour !`,
    );

    // Reset lookup state
    setSelectedDefibId("");
    setSelectedDefibData(null);
    setTechPhotoUrl("");
  };

  // Submit WORK TIME Pointage (Tab 3)
  const handleTogglePointage = () => {
    const now = new Date();
    const activeIdx = pointages.findIndex(
      (p) => p.isOngoing && p.techName === authenticatedUser?.name,
    );

    if (activeIdx !== -1) {
      // Ending ongoingPointage
      const activePointage = pointages[activeIdx];

      const getStartDateTime = (
        startDateStr: string,
        startTimeStr: string,
      ): Date => {
        const parts = startDateStr.split(/[-/]/);
        const tParts = startTimeStr.split(":");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          date.setHours(parseInt(tParts[0], 10), parseInt(tParts[1], 10), 0, 0);
          return date;
        }
        const fallback = new Date();
        fallback.setHours(
          parseInt(tParts[0], 10),
          parseInt(tParts[1], 10),
          0,
          0,
        );
        return fallback;
      };

      const startObj = getStartDateTime(
        activePointage.startDate || now.toLocaleDateString("fr-FR"),
        activePointage.startTime,
      );
      const diffSeconds = Math.max(
        1,
        Math.round((now.getTime() - startObj.getTime()) / 1000),
      );
      const finalDurationSeconds = Math.min(10 * 3600, diffSeconds);

      // If duration exceeded 10 hours, adjust the end date and time to be exactly 10 hours after starting
      let finalEndDate = now.toLocaleDateString("fr-FR");
      let finalEndTime =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");
      if (diffSeconds > 10 * 3600) {
        const tenHoursLater = new Date(startObj.getTime() + 10 * 3600 * 1000);
        finalEndDate = tenHoursLater.toLocaleDateString("fr-FR");
        finalEndTime =
          String(tenHoursLater.getHours()).padStart(2, "0") +
          ":" +
          String(tenHoursLater.getMinutes()).padStart(2, "0");
      }

      const updated = [...pointages];
      updated[activeIdx] = {
        ...activePointage,
        endDate: finalEndDate,
        endTime: finalEndTime,
        durationSeconds: finalDurationSeconds,
        comment:
          activePointage.comment && activePointage.comment.trim()
            ? activePointage.comment.trim()
            : "Nouvelle période sans titre.",
        isOngoing: false,
      };

      savePointages(updated);
      alert("Pointage arrêté ! Période enregistrée dans votre historique.");
    } else {
      // Starting new Pointage
      const newLog: PointageLog = {
        id: "pt-" + Date.now(),
        techName: authenticatedUser?.name || "Technicien connecté",
        startDate: now.toLocaleDateString("fr-FR"),
        startTime:
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0"),
        isOngoing: true,
      };

      savePointages([newLog, ...pointages]);
      alert(
        "Période de travail commencée. Le chronomètre est lancé ! Keep safe.",
      );
    }
  };

  const handleEditPointage = (
    id: string,
    newStart: string,
    newEnd: string,
    comment?: string,
    newStartDate?: string,
  ) => {
    const updated = pointages.map((p) => {
      if (p.id === id) {
        // Calculate raw estimated parsed minutes
        const sParts = newStart.split(":").map(Number);
        const eParts = newEnd.split(":").map(Number);
        const durationMin = Math.max(
          1,
          eParts[0] * 60 + eParts[1] - (sParts[0] * 60 + sParts[1]),
        );

        return {
          ...p,
          startDate: newStartDate !== undefined ? newStartDate : p.startDate,
          startTime: newStart,
          endTime: newEnd,
          durationSeconds: durationMin * 60,
          comment: comment !== undefined ? comment : p.comment,
        };
      }
      return p;
    });
    savePointages(updated);
  };

  const handleDeletePointage = (id: string) => {
    savePointages(pointages.filter((p) => p.id !== id));
  };

  // Submit EXPENSE Receipt (Tab 4)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseTtc) {
      alert("Veuillez remplir au minimum l'Objet et le Total TTC. (€).");
      return;
    }

    const newExpense: Expense = {
      id: "exp-" + Date.now(),
      techName: authenticatedUser?.name || "Technicien connecté",
      title: expenseTitle.trim(),
      amountTtc: parseFloat(expenseTtc) || 0,
      amountHt: parseFloat(expenseHt) || 0,
      amountTva: parseFloat(expenseTva) || 0,
      dateStr: expenseDate,
      photoUrl: expensePhotoUrl || undefined,
    };

    saveExpenses([newExpense, ...expenses]);

    // Reset expense ticket forms
    setExpenseTitle("");
    setExpenseTtc("");
    setExpenseHt("");
    setExpenseTva("");
    setExpensePhotoUrl("");
    alert("Frais de ticket de caisse soumis avec succès !");
  };

  const handleDeleteExpense = (id: string) => {
    saveExpenses(expenses.filter((e) => e.id !== id));
  };

  // Save Location configurations (Tab 5)
  const handleSaveLocalisation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedUser) return;

    // 1. Update matching member in parent Central state database
    const updatedMembers = members.map((m) => {
      if (m.name === authenticatedUser.name) {
        return {
          ...m,
          gpsSharingLink: gpsSharingLink,
        };
      }
      return m;
    });

    onUpdateMembers(updatedMembers);

    // 2. Persist starting address & optimized route to local storage
    const envId = localStorage.getItem("defib_tenant_id") || "demo";
    localStorage.setItem(
      `defib_${envId}_tech_start_address_${authenticatedUser.name}`,
      techStartAddress,
    );
    localStorage.setItem(
      `defib_${envId}_tech_optimization_${authenticatedUser.name}`,
      routeOptimization,
    );
    localStorage.setItem(
      `defib_tech_location_link_${authenticatedUser.name}`,
      gpsSharingLink,
    );

    alert(
      `Vos préférences géographiques ont été enregistrées avec succès et le lien de live tracking a été envoyé vers le pupitre principal d'administration !`,
    );
  };

  // Google Calendar integration helpers
  const handleGoogleCalendarSync = async () => {
    setIsSyncingGoogleCal(true);
    setSyncStatusMsg(null);
    setShowDomainHelp(false);
    setShowOperationHelp(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const email = result?.user?.email || "";

      if (!token) {
        throw new Error("Impossible d'obtenir le jeton d'accès OAuth.");
      }

      setGoogleAccessToken(token);
      setSyncedGoogleEmail(email);

      // Persist the email
      const techName = authenticatedUser?.name || "common";
      localStorage.setItem(`defib_google_cal_email_${techName}`, email);

      // Perform synchronization!
      const syncResult = await performGoogleCalendarSync(token);

      setSyncStatusMsg({
        type: "success",
        text: `Agenda Google synchronisé avec succès ! ${syncResult.count} mission(s) synchronisée(s) sur le calendrier 'Défibeo'.`,
      });
    } catch (error: any) {
      console.error("Error in Google Calendar sync:", error);

      const errorMsgStr = error?.message || "";
      const isAuthError =
        errorMsgStr.includes("unauthorized-domain") ||
        (error?.code &&
          typeof error.code === "string" &&
          error.code.includes("unauthorized-domain"));

      const isOperationNotAllowed =
        errorMsgStr.includes("operation-not-allowed") ||
        (error?.code &&
          typeof error.code === "string" &&
          error.code.includes("operation-not-allowed")) ||
        errorMsgStr.includes("AUTH/OPERATION_NOT_ALLOWED") ||
        errorMsgStr.includes("AUTH/OPERATION NOT ALLOWED");

      if (isAuthError) {
        setShowDomainHelp(true);
        setSyncStatusMsg({
          type: "error",
          text: `Erreur d'autorisation : Ce domaine n'est pas autorisé dans la configuration de votre projet Firebase. Veuillez suivre les instructions ci-dessous pour l'ajouter.`,
        });
      } else if (isOperationNotAllowed) {
        setShowOperationHelp(true);
        setSyncStatusMsg({
          type: "error",
          text: `Erreur de configuration (auth/operation-not-allowed) : La connexion Google n'est pas activée dans votre console Firebase. Veuillez suivre les instructions ci-dessous.`,
        });
      } else {
        setSyncStatusMsg({
          type: "error",
          text:
            error?.message || "Erreur lors de la synchronisation de l'agenda.",
        });
      }
    } finally {
      setIsSyncingGoogleCal(false);
    }
  };

  const handleDeactivateGoogleCalendar = () => {
    if (
      !window.confirm(
        "Voulez-vous désactiver la synchronisation de Google Calendar ?",
      )
    ) {
      return;
    }
    const techName = authenticatedUser?.name || "common";
    localStorage.removeItem(`defib_google_cal_email_${techName}`);
    setGoogleAccessToken(null);
    setSyncedGoogleEmail(null);
    setSyncStatusMsg({
      type: "success",
      text: "La synchronisation Google Calendar a été désactivée.",
    });
  };

  const performGoogleCalendarSync = async (accessToken: string) => {
    // 1. Get List of Calendars with a safe fallback
    let calendars: any[] = [];
    try {
      const listRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        calendars = listData.items || [];
      } else {
        const errText = await listRes.text();
        console.warn("Calendar list API returned non-OK status. Details:", errText);
      }
    } catch (err) {
      console.error("Error fetching calendar list:", err);
    }

    const techName = authenticatedUser?.name || "common";
    const savedCalId = localStorage.getItem(`defib_google_cal_id_${techName}`);
    let calendarId = "";

    // Find any calendar matching "Défibeo", "Defibeo", or "Défibéo"
    const existingCal = calendars.find((c: any) => {
      const summary = (c.summary || "").toLowerCase().trim();
      return summary === "defibeo" || summary === "défibeo" || summary === "défibéo";
    });

    if (existingCal) {
      calendarId = existingCal.id;
      console.log("Found existing calendar 'Défibeo' from API list. ID:", calendarId);
    } else if (savedCalId) {
      // Fallback check if savedCalId still exists / is accessible
      try {
        const checkRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${savedCalId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (checkRes.ok) {
          calendarId = savedCalId;
          console.log("Using cached calendar ID from localStorage:", calendarId);
        }
      } catch (err) {
        console.error("Cached calendar ID validation failed:", err);
      }
    }

    // 2. If not found, create a new calendar "Défibeo"
    if (!calendarId) {
      console.log("No existing calendar found. Creating a new one 'Défibeo'...");
      const createRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ summary: "Défibeo" }),
        },
      );
      if (!createRes.ok) {
        const createErrText = await createRes.text();
        console.error("Calendar creation failed:", createErrText);
        throw new Error(`Impossible de configurer l'agenda dédié 'Défibeo'. Détails Google API: ${createErrText}`);
      }
      const newCal = await createRes.json();
      calendarId = newCal.id;
    }

    // Save/refresh the calendar ID in localStorage
    if (calendarId) {
      localStorage.setItem(`defib_google_cal_id_${techName}`, calendarId);
    }

    // 3. To avoid duplicate events, fetch the existing events of this calendar and delete them.
    try {
      const eventsRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?maxResults=2500`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const existingEvents = eventsData.items || [];
        for (const ev of existingEvents) {
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${ev.id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
        }
      } else {
        console.warn("Could not retrieve current events from the calendar before adding.");
      }
    } catch (err) {
      console.error("Error clearing existing events:", err);
    }

    // 4. Find all missions assigned to the technician that have an estimatedDate
    const missionsToSync = tours
      .flatMap((t) => t.passages || [])
      .filter((p) => p.estimatedDate);

    if (missionsToSync.length === 0) {
      return { count: 0 };
    }

    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";

    // Helper functions for French date <-> ISO date picker compatibility
    const normalizeToYyyymmddInSync = (dateStr: string): string => {
      if (!dateStr) return "";
      const clean = dateStr.replace(/\//g, "-").trim();
      const parts = clean.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        }
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      return dateStr;
    };

    const parseSlotToTimeInSync = (slot: string) => {
      const cleaned = slot.trim().toLowerCase();
      const match = cleaned.match(/^(\d+):(\d+)(am|pm)?$/);
      if (match) {
        let hrs = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const period = match[3];
        if (period === "pm" && hrs < 12) {
          hrs += 12;
        } else if (period === "am" && hrs === 12) {
          hrs = 0;
        }
        return { hrs, mins };
      }
      return { hrs: 9, mins: 0 };
    };

    for (const m of missionsToSync) {
      const dateYmd = normalizeToYyyymmddInSync(m.estimatedDate);
      const slotStr = m.estimatedSlot ? m.estimatedSlot.trim() : "09:00";
      const { hrs, mins } = parseSlotToTimeInSync(slotStr);

      const startHrsStr = String(hrs).padStart(2, "0");
      const startMinsStr = String(mins).padStart(2, "0");

      let endHrs = hrs;
      let endMins = mins + 30;
      if (endMins >= 60) {
        endHrs += 1;
        endMins -= 60;
      }
      if (endHrs >= 24) {
        endHrs = 23;
        endMins = 59;
      }
      const endHrsStr = String(endHrs).padStart(2, "0");
      const endMinsStr = String(endMins).padStart(2, "0");

      const startDateTime = `${dateYmd}T${startHrsStr}:${startMinsStr}:00`;
      const endDateTime = `${dateYmd}T${endHrsStr}:${endMinsStr}:00`;

      const description =
        `Modèle : ${m.model}\n` +
        `Adresse : ${m.address}\n` +
        `Situation : ${m.status}\n` +
        (m.requiredParts && m.requiredParts.length > 0
          ? `Pièce(s) : ${m.requiredParts.join(", ")}`
          : "");

      const eventBody = {
        summary: `${m.reason || "Visite technique"} - ${m.identifiant || "Mission"}`,
        description,
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
      };

      const eventRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );

      if (!eventRes.ok) {
        console.error(
          `Failed to add event for mission ${m.identifiant}:`,
          await eventRes.text(),
        );
      }
    }

    return { count: missionsToSync.length };
  };

  const getNextPassageZone = () => {
    if (!selectedTourId) return "Ville_CP";
    const activeTour = getSortedTours().find((t) => t.id === selectedTourId);
    if (!activeTour || !activeTour.passages || activeTour.passages.length === 0)
      return "Ville_CP";

    const donePassages = activeTour.passages.filter(
      (p: any) => p.status === "Effectué",
    );
    let nextPassage: any = null;

    if (donePassages.length > 0) {
      const highestDoneNum = Math.max(...donePassages.map((p: any) => p.num));
      nextPassage = activeTour.passages.find(
        (p: any) => p.num === highestDoneNum + 1,
      );
      if (!nextPassage) {
        nextPassage = activeTour.passages.find(
          (p: any) => p.status === "À faire" && p.num > highestDoneNum,
        );
      }
    }

    if (!nextPassage) {
      nextPassage = activeTour.passages.find(
        (p: any) => p.status === "À faire",
      );
    }

    if (!nextPassage) return "Ville_CP";

    const defib = defibrillateurs.find(
      (d: any) =>
        d.identifiant === nextPassage.identifiant ||
        d.id === nextPassage.identifiant,
    );
    if (defib && defib.ville) {
      const cpStr = defib.cp ? ` ${defib.cp}` : "";
      return `${defib.ville}${cpStr}`;
    }

    const other = otherEquipments.find(
      (o: any) =>
        o.identifiant === nextPassage.identifiant ||
        o.id === nextPassage.identifiant,
    );
    if (other && other.ville) {
      const cpStr = other.codePostal ? ` ${other.codePostal}` : "";
      return `${other.ville}${cpStr}`;
    }

    if (nextPassage.address) {
      const parts = nextPassage.address.split(",");
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
      return nextPassage.address;
    }

    return "Ville_CP";
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col items-center p-0 text-slate-800 selection:bg-indigo-600/30 font-sans"
      id="public-portal-envelope"
    >
      {/* Main Responsive Portal Container (Standalone App Layout) */}
      <div
        className="w-full max-w-[480px] min-h-screen bg-white relative flex flex-col"
        id="smartphone-shell"
      >
        {/* ----------------- IF TECHNICIAN IS LOGGED IN STATE ----------------- */}
        {authenticatedUser ? (
          <div
            className="flex-1 flex flex-col overflow-hidden bg-white relative"
            id="authenticated-console-layout"
          >
            {/* FULL WIDTH SPECIAL REPORT FORM OVERLAY */}
            {isReportOverlayOpen && (
              <div
                className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-y-auto px-2 pt-0 pb-2 sm:pt-0 sm:pb-4 sm:px-4 animate-slideUp text-black force-smartphone-layout"
                id="report-form-overlay"
              >
                {selectedOtherEquipmentUnique ? (
                  <GmaoOtherEquipmentCorrectionForm
                    otherEquipment={selectedOtherEquipmentUnique}
                    clients={clients}
                    forceSmartphoneLayout={true}
                    isNew={true}
                    otherEquipments={otherEquipments}
                    defibrillateurs={defibrillateurs}
                    onSelectDefibrillator={(defibId) => {
                      setSelectedOtherEquipmentUnique(null);
                      setSelectedDefibId(defibId);
                      const defib = defibrillateurs.find(
                        (d) => d.id === defibId,
                      );
                      if (defib) setSelectedDefibData(defib);
                    }}
                    onSelectOtherEquipment={(otherEq) => {
                      setSelectedOtherEquipmentUnique(otherEq);
                    }}
                    onCancel={() => {
                      setIsReportOverlayOpen(false);
                      setSelectedOtherEquipmentUnique(null);
                      setReportActiveTourId("");
                      setReportActivePassageNum(null);
                    }}
                    onSave={(updatedReport) => {
                      const reportId = "REP-" + Date.now();
                      const submission = {
                        ...updatedReport,
                        id: reportId,
                        techName:
                          authenticatedUser?.name || "Technicien connecté",
                        date:
                          updatedReport.date ||
                          new Date().toLocaleString("fr-FR"),
                        validated: false, // Explicitly false so it requires validation from GMAO
                      };

                      saveReports([submission, ...generatedReports]);

                      // NOTE: Auto-update other equip list and email sending is bypassed at this stage
                      // It will occur automatically once validated from the main GMAO workspace.

                      // Automatically transition corresponding passage status to "Effectué"
                      if (
                        reportActiveTourId &&
                        reportActivePassageNum !== null
                      ) {
                        const updated = tours.map((t) => {
                          if (t.id === reportActiveTourId) {
                            return {
                              ...t,
                              passages: t.passages.map((p) => {
                                if (p.num === reportActivePassageNum) {
                                  return { ...p, status: "Effectué" };
                                }
                                return p;
                              }),
                            };
                          }
                          return t;
                        });
                        saveTours(updated);
                      }

                      alert(
                        `Le rapport "${submission.title}" a été enregistré avec succès (en attente de validation sur le logiciel principal) !`,
                      );
                      setIsReportOverlayOpen(false);
                      setSelectedOtherEquipmentUnique(null);
                      setReportActiveTourId("");
                      setReportActivePassageNum(null);
                    }}
                  />
                ) : (
                  <GmaoCorrectionForm
                    isNew={true}
                    clients={clients}
                    variables={variables}
                    defibrillateurs={defibrillateurs}
                    otherEquipments={otherEquipments}
                    onSelectOtherEquipment={(otherEq) => {
                      setSelectedOtherEquipmentUnique(otherEq);
                    }}
                    initialDefibId={selectedDefibId}
                    stocks={stocks}
                    forceSmartphoneLayout={true}
                    onCancel={() => {
                      setIsReportOverlayOpen(false);
                      setSelectedDefibId("");
                      setSelectedDefibData(null);
                      setReportActiveTourId("");
                      setReportActivePassageNum(null);
                    }}
                    onSave={(updatedReport) => {
                      const reportId = "REP-" + Date.now();
                      const submission = {
                        ...updatedReport,
                        id: reportId,
                        techName:
                          authenticatedUser?.name || "Technicien connecté",
                        date:
                          updatedReport.date ||
                          new Date().toLocaleString("fr-FR"),
                        validated: false, // Require validation in GMAO tab
                      };

                      saveReports([submission, ...generatedReports]);

                      // NOTE: Auto-update defibrillator record and email triggering are bypassed at this level
                      // They are successfully pending approval inside the GMAO tab.

                      // 1. Decrement Stock for selected/replaced products
                      const updatedStocks = [...stocks];
                      const toDecrementIds: string[] = [];

                      if (
                        updatedReport.kitSecoursRemplaceOuAjoute === "Oui" &&
                        updatedReport.selectionKitSecoursRemplace
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionKitSecoursRemplace,
                        );
                      }
                      if (
                        updatedReport.batterieRemplacee === "Oui" &&
                        updatedReport.selectionBatterieRemplacee
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionBatterieRemplacee,
                        );
                      }
                      if (
                        updatedReport.electrodePRemplacee === "Oui" &&
                        updatedReport.selectionElectrodePRemplacee
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionElectrodePRemplacee,
                        );
                      }
                      if (
                        updatedReport.electrodePSecoursRemplacee === "Oui" &&
                        updatedReport.selectionElectrodePSecoursRemplacee
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionElectrodePSecoursRemplacee,
                        );
                      }
                      if (
                        updatedReport.electrodeARemplacee === "Oui" &&
                        updatedReport.selectionElectrodeARemplacee
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionElectrodeARemplacee,
                        );
                      }
                      if (
                        updatedReport.electrodeASecoursRemplacee === "Oui" &&
                        updatedReport.selectionElectrodeASecoursRemplacee
                      ) {
                        toDecrementIds.push(
                          updatedReport.selectionElectrodeASecoursRemplacee,
                        );
                      }
                      if (
                        updatedReport.emettreFactureBrouillon === "Oui" &&
                        updatedReport.serviceEmettreId
                      ) {
                        const matchedStock = stocks.find(
                          (s) =>
                            s.id === updatedReport.serviceEmettreId ||
                            s.denominationPieceId ===
                              updatedReport.serviceEmettreId,
                        );
                        if (matchedStock) {
                          toDecrementIds.push(matchedStock.id);
                        }
                      }

                      let stocksMutated = false;
                      toDecrementIds.forEach((id) => {
                        const stockIndex = updatedStocks.findIndex(
                          (s) => s.id === id || s.denominationPieceId === id,
                        );
                        if (stockIndex !== -1) {
                          const stObj = updatedStocks[stockIndex];
                          updatedStocks[stockIndex] = {
                            ...stObj,
                            quantite: Math.max(0, (stObj.quantite ?? 1) - 1),
                            quantiteReservee: Math.max(
                              0,
                              (stObj.quantiteReservee ?? 0) - 1,
                            ),
                          };
                          stocksMutated = true;
                        }
                      });

                      if (stocksMutated && onUpdateStocks) {
                        onUpdateStocks(updatedStocks);
                      }

                      // 2. Draft Invoice Creation
                      if (
                        updatedReport.emettreFactureBrouillon === "Oui" &&
                        onUpdateCommercialDocs
                      ) {
                        const invoiceItems: CommercialDocItem[] = [];

                        // Add service if selected
                        if (updatedReport.serviceEmettreId) {
                          const st = stocks.find(
                            (s: any) => s.id === updatedReport.serviceEmettreId,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Service",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          } else {
                            const matchedVar = variables.find(
                              (v: any) =>
                                v.id === updatedReport.serviceEmettreId,
                            );
                            if (matchedVar) {
                              invoiceItems.push({
                                variableId: matchedVar.id,
                                nomPiece: `${matchedVar.nom} (${matchedVar.marque})`,
                                prixVenteHt: 150,
                                quantite: 1,
                              });
                            } else if (
                              updatedReport.serviceEmettreId.startsWith(
                                "st_fallback_srv_",
                              )
                            ) {
                              const fallbacks = [
                                {
                                  id: "st_fallback_srv_1",
                                  label:
                                    "Maintenance Préventive standard (Défibeo)",
                                  price: 150,
                                },
                                {
                                  id: "st_fallback_srv_2",
                                  label: "Mise en service DAE (Défibeo)",
                                  price: 120,
                                },
                                {
                                  id: "st_fallback_srv_3",
                                  label: "Audit de conformité (Défibeo)",
                                  price: 95,
                                },
                              ];
                              const matchedFallback = fallbacks.find(
                                (fb) =>
                                  fb.id === updatedReport.serviceEmettreId,
                              );
                              if (matchedFallback) {
                                invoiceItems.push({
                                  variableId: "v_srv_fallback",
                                  nomPiece: matchedFallback.label,
                                  prixVenteHt: matchedFallback.price,
                                  quantite: 1,
                                });
                              }
                            }
                          }
                        }

                        // Add kit if replaced & selected
                        if (
                          updatedReport.kitSecoursRemplaceOuAjoute === "Oui" &&
                          updatedReport.selectionKitSecoursRemplace
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id ===
                              updatedReport.selectionKitSecoursRemplace,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Kit de secours",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        // Add battery if replaced & selected
                        if (
                          updatedReport.batterieRemplacee === "Oui" &&
                          updatedReport.selectionBatterieRemplacee
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id === updatedReport.selectionBatterieRemplacee,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Batterie",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        // Add electrode P if replaced & selected
                        if (
                          updatedReport.electrodePRemplacee === "Oui" &&
                          updatedReport.selectionElectrodePRemplacee
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id ===
                              updatedReport.selectionElectrodePRemplacee,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Électrode P",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        // Add electrode A if replaced & selected
                        if (
                          updatedReport.electrodeARemplacee === "Oui" &&
                          updatedReport.selectionElectrodeARemplacee
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id ===
                              updatedReport.selectionElectrodeARemplacee,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Électrode A",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        // Add electrode A secours if replaced & selected
                        if (
                          updatedReport.electrodeASecoursRemplacee === "Oui" &&
                          updatedReport.selectionElectrodeASecoursRemplacee
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id ===
                              updatedReport.selectionElectrodeASecoursRemplacee,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Électrode Secours A",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        // Add electrode P secours if replaced & selected
                        if (
                          updatedReport.electrodePSecoursRemplacee === "Oui" &&
                          updatedReport.selectionElectrodePSecoursRemplacee
                        ) {
                          const st = stocks.find(
                            (s: any) =>
                              s.id ===
                              updatedReport.selectionElectrodePSecoursRemplacee,
                          );
                          if (st) {
                            const matchedVar = variables.find(
                              (v: any) => v.id === st.denominationPieceId,
                            );
                            invoiceItems.push({
                              variableId: st.denominationPieceId,
                              nomPiece: matchedVar
                                ? `${matchedVar.nom} (${matchedVar.marque})`
                                : "Électrode Secours P",
                              prixVenteHt: st.prixVenteHt,
                              quantite: 1,
                            });
                          }
                        }

                        if (invoiceItems.length > 0) {
                          const clientId =
                            updatedReport.defibSnapshot?.clientId || "";
                          const matchedClient = clients.find(
                            (c: any) => c.id === clientId,
                          );
                          const clientDenomination = matchedClient
                            ? matchedClient.denomination
                            : updatedReport.defibSnapshot?.nomPrenomSite ||
                              "Client inconnu";

                          const totalHtSum = invoiceItems.reduce(
                            (sum, item) =>
                              sum + item.prixVenteHt * item.quantite,
                            0,
                          );

                          const generatedRef = getNextDocRef(
                            "Facture",
                            commercialDocs,
                          );
                          const newInvoice: CommercialDoc = {
                            id: "doc-" + Date.now(),
                            ref: generatedRef,
                            type: "Facture",
                            clientId: clientId,
                            clientDenomination: clientDenomination,
                            items: invoiceItems,
                            totalHt: totalHtSum,
                            status: "Brouillon",
                            dateStr: new Date().toISOString().split("T")[0],
                            commentaire: "Générée suite à une intervention.",
                          };

                          onUpdateCommercialDocs([
                            newInvoice,
                            ...commercialDocs,
                          ]);
                        }
                      }

                      // Automatically transition corresponding passage status to "Effectué"
                      if (
                        reportActiveTourId &&
                        reportActivePassageNum !== null
                      ) {
                        const updated = tours.map((t) => {
                          if (t.id === reportActiveTourId) {
                            return {
                              ...t,
                              passages: t.passages.map((p) => {
                                if (p.num === reportActivePassageNum) {
                                  return { ...p, status: "Effectué" };
                                }
                                return p;
                              }),
                            };
                          }
                          return t;
                        });
                        saveTours(updated);
                      }

                      alert(
                        `Le rapport "${submission.title}" a été enregistré avec succès (en attente de validation sur le logiciel principal) !`,
                      );
                      setIsReportOverlayOpen(false);
                      setSelectedDefibId("");
                      setSelectedDefibData(null);
                      setReportActiveTourId("");
                      setReportActivePassageNum(null);
                    }}
                  />
                )}

                <div className="hidden">
                  {/* Overlay header container */}
                  <header className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center border border-emerald-500/20">
                        <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider font-mono">
                        RAPPORT D'INTERVENTION COMPLET
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsReportOverlayOpen(false);
                        setSelectedDefibId("");
                        setSelectedDefibData(null);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </header>

                  {/* Content form - complete 9 sections structured exactly like the principal software */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar bg-slate-50">
                    {/* SEARCH LOOKUP COMPONENT */}
                    <div className="bg-white p-3.5 border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                      <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block font-mono">
                        🔍 ÉQUIPEMENT DE LA BASE PRINCIPALE (RECHERCHE RAPIDE)
                      </label>
                      <select
                        value={selectedDefibId}
                        onChange={(e) =>
                          handleDefibLookupChange(e.target.value)
                        }
                        className="w-full px-2.5 py-2.5 bg-slate-55 border border-slate-220 rounded-xl text-xs text-slate-800 font-bold cursor-pointer focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="">Sélection d'un matériel.</option>
                        {defibrillateurs.map((df) => (
                          <option key={df.id} value={df.id}>
                            {df.identifiant} - {df.numeroSerie}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                        Lien direct : Toute confirmation mettra à jour en temps
                        réel l'ensemble de la base de données.
                      </p>
                    </div>

                    {selectedDefibData ? (
                      <form
                        onSubmit={handleSavePdfReport}
                        className="space-y-4 pb-12"
                      >
                        {/* RAPPORT CONFIGURATION */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block font-mono">
                            📋 CONFIGURATION DU DOCUMENT PDF
                          </span>

                          {/* Title select */}
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">
                              Intitulé du Document *
                            </label>
                            <select
                              value={receiptTitle}
                              onChange={(e) => setReceiptTitle(e.target.value)}
                              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg text-slate-800 cursor-pointer"
                            >
                              <option value="RAPPORT TECHNIQUE DÉFIBRILLATEUR">
                                RAPPORT TECHNIQUE DÉFIBRILLATEUR
                              </option>
                              <option value="CONSTAT DE MAINTENANCE DÉFIBRILLATEUR">
                                CONSTAT DE MAINTENANCE DÉFIBRILLATEUR
                              </option>
                              <option value="RI RAPPORT INTERVENTION">
                                RI RAPPORT INTERVENTION
                              </option>
                              <option value="RAPPORT DISTANCIEL">
                                RAPPORT DISTANCIEL
                              </option>
                              <option value="BON PRÊT DÉFIBRILLATEUR">
                                BON PRÊT DÉFIBRILLATEUR
                              </option>
                              <option value="BON REPRISE DÉFIBRILLATEUR">
                                BON REPRISE DÉFIBRILLATEUR
                              </option>
                              <option value="MISE EN SERVICE DÉFIBRILLATEUR">
                                MISE EN SERVICE DÉFIBRILLATEUR
                              </option>
                            </select>
                          </div>

                          {/* Technician (Locked) */}
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">
                              Technicien Auteur
                            </label>
                            <input
                              type="text"
                              readOnly
                              disabled
                              value={
                                authenticatedUser?.name || "Technicien connecté"
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-indigo-600 rounded-lg cursor-not-allowed"
                            />
                          </div>

                          {/* Horodate manual entry */}
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block font-mono">
                              Date et Heure d'Intervention
                            </label>
                            <input
                              type="text"
                              value={horodateInput}
                              onChange={(e) => setHorodateInput(e.target.value)}
                              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 text-xs font-mono text-slate-805 rounded-lg"
                            />
                          </div>

                          {/* Mission site and Photo Capture */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase block">
                                Nature Mission *
                              </label>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setMissionSite("DÉPLACEMENT")}
                                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer border text-center transition-all ${
                                    missionSite === "DÉPLACEMENT"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-305 shadow-xs"
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  📍 Déplacement
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMissionSite("ATELIER SAV")}
                                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer border text-center transition-all ${
                                    missionSite === "ATELIER SAV"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-305 shadow-xs"
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  ⚙️ Atelier SAV
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase block">
                                Cliché terrain
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => photoInputRef.current?.click()}
                                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 font-bold cursor-pointer transition-colors shrink-0 flex items-center justify-center animate-pulse"
                                  title="Prendre Photo"
                                >
                                  <Camera className="w-4 h-4 text-emerald-500" />
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={photoInputRef}
                                  onChange={(e) =>
                                    triggerPhotoRead(e, setTechPhotoUrl)
                                  }
                                  className="hidden"
                                />
                                {techPhotoUrl ? (
                                  <div className="relative w-10 h-10 border border-slate-200 rounded overflow-hidden shadow-xs shrink-0">
                                    <img
                                      src={techPhotoUrl}
                                      className="w-full h-full object-cover"
                                      alt="Cliché Preview"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setTechPhotoUrl("")}
                                      className="absolute inset-0 bg-red-600/90 font-black text-[8px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white uppercase"
                                    >
                                      Suppr.
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[8px] text-slate-500 font-mono italic">
                                    No photo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* THE 9 CONCURRENT SECTIONS OF PRINCIPAL REGISTER FORM COMPOSITION */}
                        <div className="space-y-2">
                          {/* SECTION 1: DAE DESCRIPTION AND MODEL */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection1(!openSection1)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-650 font-mono font-bold">
                                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                                Section 1: Appareil Défibrillateur
                              </span>
                              <span className="text-slate-500">
                                {openSection1 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection1 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Identifiant unique *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={
                                        selectedDefibData.identifiant || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          identifiant:
                                            e.target.value.toUpperCase(),
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded font-bold font-mono text-xs focus:ring-0 focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Numéro de Série *
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        required
                                        value={
                                          selectedDefibData.numeroSerie || ""
                                        }
                                        onChange={(e) =>
                                          setSelectedDefibData({
                                            ...selectedDefibData,
                                            numeroSerie: e.target.value,
                                          })
                                        }
                                        className="flex-1 px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded font-mono text-xs focus:ring-0 focus:border-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setIsSerieScannerOpen(true)
                                        }
                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                      >
                                        Scan
                                      </button>
                                    </div>
                                    {isSerieScannerOpen && (
                                      <BarcodeScannerModal
                                        isOpen={isSerieScannerOpen}
                                        onClose={() =>
                                          setIsSerieScannerOpen(false)
                                        }
                                        onScanSuccess={(scannedText) => {
                                          if (selectedDefibData) {
                                            setSelectedDefibData({
                                              ...selectedDefibData,
                                              numeroSerie: scannedText,
                                            });
                                          }
                                          setIsSerieScannerOpen(false);
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Modèle de Défibrillateur *
                                  </label>
                                  <select
                                    value={selectedDefibData.modeleId || ""}
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        modeleId: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                    required
                                  >
                                    <option value="">
                                      -- Sélectionner un modèle --
                                    </option>
                                    {variables
                                      .filter(
                                        (v) =>
                                          v.category ===
                                          "Modèle Défibrillateur",
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.nom} ({v.marque})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 2: CLIENT INFO & CONTRACT DETAILS */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection2(!openSection2)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <User className="w-3.5 h-3.5 text-indigo-600" />
                                Section 2: Client & Contrat souscrit
                              </span>
                              <span className="text-slate-500">
                                {openSection2 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection2 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Client rattaché *
                                  </label>
                                  <select
                                    value={selectedDefibData.clientId || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const matched = clients.find(
                                        (c) => c.id === val,
                                      );
                                      if (matched) {
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          clientId: val,
                                          nomPrenomSite:
                                            matched.nomPrenomSite || "",
                                          telephoneSite:
                                            matched.telephoneSite || "",
                                          emailSite: matched.emailSite || "",
                                          contrat: matched.contrat || "Non",
                                          nomContrat: matched.nomContrat || "",
                                          referenceContrat:
                                            matched.referenceContrat || "",
                                          debutContrat:
                                            matched.debutContrat || "",
                                          finContrat: matched.finContrat || "",
                                        });
                                      } else {
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          clientId: val,
                                        });
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                    required
                                  >
                                    <option value="">
                                      Sélectionner un client...
                                    </option>
                                    {clients.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.denomination} ({c.siret})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Nom Site / Responsable
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        selectedDefibData.nomPrenomSite || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          nomPrenomSite: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Téléphone Site
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        selectedDefibData.telephoneSite || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          telephoneSite: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Email Responsable
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.emailSite || ""}
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        emailSite: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>

                                <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Contrat Associé ?
                                    </label>
                                    <select
                                      value={selectedDefibData.contrat || "Non"}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          contrat: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    >
                                      <option value="Oui">
                                        Oui (Contrat actif)
                                      </option>
                                      <option value="Non">Non</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Référence Contrat
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        selectedDefibData.referenceContrat || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          referenceContrat: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] font-mono focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 3: CABINET HOUSING / COFFRET */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection3(!openSection3)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                Section 3: Coffret de Protection
                              </span>
                              <span className="text-slate-500">
                                {openSection3 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection3 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Modèle de Coffret / Boîtier
                                  </label>
                                  <select
                                    value={
                                      selectedDefibData.modeleCoffretId || ""
                                    }
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        modeleCoffretId: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs focus:border-indigo-500"
                                  >
                                    <option value="">
                                      Sélectionner un modèle...
                                    </option>
                                    {variables
                                      .filter(
                                        (v) => v.category === "Modèle Coffret",
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.nom} ({v.marque})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Numéro Lot Boîtier
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={
                                        selectedDefibData.numeroLotCoffret || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          numeroLotCoffret: e.target.value,
                                        })
                                      }
                                      className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.3px] font-mono focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setIsLotScannerOpen(true)}
                                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0"
                                    >
                                      Scan
                                    </button>
                                  </div>
                                  {isLotScannerOpen && (
                                    <BarcodeScannerModal
                                      isOpen={isLotScannerOpen}
                                      onClose={() => setIsLotScannerOpen(false)}
                                      onScanSuccess={(scannedText) => {
                                        if (selectedDefibData) {
                                          setSelectedDefibData({
                                            ...selectedDefibData,
                                            numeroLotCoffret: scannedText,
                                          });
                                        }
                                        setIsLotScannerOpen(false);
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 4: LOCATION AND GEOLOC DETAILS */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection4(!openSection4)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                Section 4: Accès & Géolocalisation
                              </span>
                              <span className="text-slate-500">
                                {openSection4 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection4 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      N° & Rue
                                    </label>
                                    <input
                                      type="text"
                                      value={selectedDefibData.numVoie || ""}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          numVoie: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Ville
                                    </label>
                                    <input
                                      type="text"
                                      value={selectedDefibData.ville || ""}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          ville: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Code Postal
                                    </label>
                                    <input
                                      type="text"
                                      value={selectedDefibData.cp || ""}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          cp: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Région
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        selectedDefibData.region ||
                                        "Île-de-France"
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          region: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-emerald-600 uppercase font-mono">
                                      Latitude GPS *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={selectedDefibData.latitude || ""}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          latitude: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-emerald-600 rounded font-mono text-[9px] font-bold focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-emerald-600 uppercase font-mono">
                                      Longitude GPS *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={selectedDefibData.longitude || ""}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          longitude: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-emerald-600 rounded font-mono text-[9px] font-bold focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px]">
                                  <span className="font-bold text-slate-500 uppercase">
                                    Ouverture H24 / J7
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedDefibData.acces247 || false
                                    }
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        acces247: e.target.checked,
                                      })
                                    }
                                    className="rounded bg-white border-slate-200 text-indigo-650 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 5: MISE EN SERVICE & CYCLE DATES */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection5(!openSection5)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                Section 5: Dates clés de Cycle & Validité
                              </span>
                              <span className="text-slate-500">
                                {openSection5 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection5 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px] font-mono">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase font-sans">
                                      Mise en Service
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.miseEnService || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          miseEnService: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase font-sans">
                                      Fin de Garantie
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.finGarantie || ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          finGarantie: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 6: ADULT ELECTRODE PADS */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection6(!openSection6)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                Section 6: Électrode Adulte & Mixte
                              </span>
                              <span className="text-slate-500">
                                {openSection6 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection6 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Modèle d'électrode Adulte
                                  </label>
                                  <select
                                    value={
                                      selectedDefibData.modeleElectrodeAId || ""
                                    }
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        modeleElectrodeAId: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                  >
                                    <option value="">
                                      Sélectionner un modèle...
                                    </option>
                                    {variables
                                      .filter(
                                        (v) =>
                                          v.category === "Modèle Électrode",
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.nom} ({v.marque})
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Numéro de LOT (A)
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={
                                          selectedDefibData.lotElectrodeA || ""
                                        }
                                        onChange={(e) =>
                                          setSelectedDefibData({
                                            ...selectedDefibData,
                                            lotElectrodeA: e.target.value,
                                          })
                                        }
                                        className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setIsLotAScannerOpen(true)
                                        }
                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                      >
                                        Scan
                                      </button>
                                    </div>
                                    {isLotAScannerOpen && (
                                      <BarcodeScannerModal
                                        isOpen={isLotAScannerOpen}
                                        onClose={() =>
                                          setIsLotAScannerOpen(false)
                                        }
                                        onScanSuccess={(scannedText) => {
                                          if (selectedDefibData) {
                                            setSelectedDefibData({
                                              ...selectedDefibData,
                                              lotElectrodeA: scannedText,
                                            });
                                          }
                                          setIsLotAScannerOpen(false);
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Situation Couleur (A)
                                    </label>
                                    <select
                                      value={
                                        selectedDefibData.situationElectrodeA ||
                                        "Vert"
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          situationElectrodeA: e.target
                                            .value as any,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded text-[9px] cursor-pointer focus:border-indigo-500"
                                    >
                                      <option value="Vert">
                                        🟢 Conforme (Vert)
                                      </option>
                                      <option value="Orange">
                                        🟡 Rechange Recommandée
                                      </option>
                                      <option value="Rouge">
                                        🔴 Hors validité (Rouge)
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 font-mono">
                                  <div className="space-y-0.5">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">
                                      Date d'Insertion
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.insertionElectrodeA ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          insertionElectrodeA: e.target.value,
                                        })
                                      }
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">
                                      Péremption Pad (A) *
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.peremptionElectrodeA ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          peremptionElectrodeA: e.target.value,
                                        })
                                      }
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-805 rounded text-[8.5px] border-emerald-500/30 focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 7: CHILD ELECTRODE PADS */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection7(!openSection7)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                Section 7: Électrode Pédiatrique & Secours
                              </span>
                              <span className="text-slate-500">
                                {openSection7 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection7 && (
                              <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Modèle Électrode Pédiatrique
                                  </label>
                                  <select
                                    value={
                                      selectedDefibData.modeleElectrodePId || ""
                                    }
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        modeleElectrodePId: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                  >
                                    <option value="">
                                      Sélectionner un modèle...
                                    </option>
                                    {variables
                                      .filter(
                                        (v) =>
                                          v.category === "Modèle Électrode",
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.nom} ({v.marque})
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Numéro LOT (P)
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={
                                          selectedDefibData.lotElectrodeP || ""
                                        }
                                        onChange={(e) =>
                                          setSelectedDefibData({
                                            ...selectedDefibData,
                                            lotElectrodeP: e.target.value,
                                          })
                                        }
                                        className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setIsLotPScannerOpen(true)
                                        }
                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                      >
                                        Scan
                                      </button>
                                    </div>
                                    {isLotPScannerOpen && (
                                      <BarcodeScannerModal
                                        isOpen={isLotPScannerOpen}
                                        onClose={() =>
                                          setIsLotPScannerOpen(false)
                                        }
                                        onScanSuccess={(scannedText) => {
                                          if (selectedDefibData) {
                                            setSelectedDefibData({
                                              ...selectedDefibData,
                                              lotElectrodeP: scannedText,
                                            });
                                          }
                                          setIsLotPScannerOpen(false);
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Péremption Pad (P) *
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.peremptionElectrodeP ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          peremptionElectrodeP: e.target.value,
                                        })
                                      }
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] font-mono focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 8: ACCUMULATOR / BATTERY SYSTEM */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection8(!openSection8)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                Section 8: Accumulateur / Batterie d'Énergie
                              </span>
                              <span className="text-slate-500">
                                {openSection8 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection8 && (
                              <div className="p-3 border-t border-slate-200 space-y-3.5 bg-slate-50/40 text-[10px]">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                    Modèle d'accumulateur
                                  </label>
                                  <select
                                    value={
                                      selectedDefibData.modeleBatterieId || ""
                                    }
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        modeleBatterieId: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                  >
                                    <option value="">
                                      Sélectionner un modèle...
                                    </option>
                                    {variables
                                      .filter(
                                        (v) => v.category === "Modèle Batterie",
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.nom} ({v.marque})
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-0.5">
                                    <label className="block text-[8px] font-black text-emerald-600 uppercase font-mono">
                                      % Charge *
                                    </label>
                                    <input
                                      type="number"
                                      maxLength={3}
                                      required
                                      value={
                                        selectedDefibData.pourcentageBatterie ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          pourcentageBatterie: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1.5 bg-white border border-emerald-500/30 text-emerald-600 font-black font-mono text-[11px] rounded text-center focus:border-emerald-500"
                                      placeholder="100"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      LOT Batterie
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={
                                          selectedDefibData.lotBatterie || ""
                                        }
                                        onChange={(e) =>
                                          setSelectedDefibData({
                                            ...selectedDefibData,
                                            lotBatterie: e.target.value,
                                          })
                                        }
                                        className="flex-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setIsLotBatScannerOpen(true)
                                        }
                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                      >
                                        Scan
                                      </button>
                                    </div>
                                    {isLotBatScannerOpen && (
                                      <BarcodeScannerModal
                                        isOpen={isLotBatScannerOpen}
                                        onClose={() =>
                                          setIsLotBatScannerOpen(false)
                                        }
                                        onScanSuccess={(scannedText) => {
                                          if (selectedDefibData) {
                                            setSelectedDefibData({
                                              ...selectedDefibData,
                                              lotBatterie: scannedText,
                                            });
                                          }
                                          setIsLotBatScannerOpen(false);
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 font-mono">
                                  <div className="space-y-0.5">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">
                                      Péremption Batterie *
                                    </label>
                                    <input
                                      type="date"
                                      value={
                                        selectedDefibData.peremptionBatterie ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          peremptionBatterie: e.target.value,
                                        })
                                      }
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">
                                      État de santé
                                    </label>
                                    <select
                                      value={
                                        selectedDefibData.situationBatterie ||
                                        "Vert"
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          situationBatterie: e.target
                                            .value as any,
                                        })
                                      }
                                      className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                    >
                                      <option value="Vert">
                                        🟢 Conforme (Vert)
                                      </option>
                                      <option value="Orange">
                                        🟡 Basse tension
                                      </option>
                                      <option value="Rouge">
                                        🔴 Remplacement
                                      </option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* SECTION 9: GENERAL CONFORMITY & ARCHIVE */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setOpenSection9(!openSection9)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                            >
                              <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                Section 9: Catégories & Conformité Globale
                              </span>
                              <span className="text-slate-500">
                                {openSection9 ? "▲" : "▼"}
                              </span>
                            </button>

                            {openSection9 && (
                              <div className="p-3 border-t border-slate-200 space-y-3.5 bg-slate-50/40 text-[10px]">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold text-amber-600 uppercase font-mono">
                                      Conforme *
                                    </label>
                                    <select
                                      value={
                                        selectedDefibData.conforme || "Oui"
                                      }
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          conforme: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded text-[9.5px] focus:border-indigo-500"
                                    >
                                      <option value="Oui">
                                        Oui (Conforme)
                                      </option>
                                      <option value="Non">
                                        Non (Non conforme)
                                      </option>
                                    </select>
                                  </div>
                                  <div className="space-y-1 font-sans">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase">
                                      Archivé pour Historique
                                    </label>
                                    <select
                                      value={selectedDefibData.archive || "Non"}
                                      onChange={(e) =>
                                        setSelectedDefibData({
                                          ...selectedDefibData,
                                          archive: e.target.value as any,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                    >
                                      <option value="Oui">Oui (Archivé)</option>
                                      <option value="Non">Non (Actif)</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase col-span-2">
                                    Notes et observations techniques
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={selectedDefibData.commentaire || ""}
                                    onChange={(e) =>
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        commentaire: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-white border border-slate-200 text-slate-800 text-[10px] rounded leading-tight focus:border-indigo-500"
                                    placeholder="Entrez vos remarques de maintenance..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SUBMIT ACTION BUTTONS */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer transition-colors border border-emerald-500 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                          >
                            <Check className="w-4 h-4" />
                            Sauvegarder et Valider le Rapport
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-[10px] uppercase border border-dashed border-slate-200 rounded-2xl font-mono leading-relaxed bg-slate-50">
                        Veuillez charger un DAE ci-dessus pour charger
                        l'intégralité du formulaire de rapport.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar Navigation for Mobile - requested Header style: 
                TOUT EN HAUT À GAUCHE: Le nom de l'entreprise
                À DROITE: Le Prénom/Nom de l'utilisateur */}
            <header
              className="px-5 pb-3.5 pt-8 flex flex-col gap-2.5 shrink-0 select-none text-white"
              style={{ backgroundColor: "#5d1f74", borderBottom: "none" }}
            >
              {/* Ligne 1 : Nom de l'entreprise - centré */}
              <div className="flex items-center justify-center text-center pt-2">
                <div
                  style={{ color: "#ffffff", paddingTop: "10px" }}
                  className="font-gochi text-2xl text-center tracking-wide"
                >
                  {companyInfo.name.length > 25
                    ? companyInfo.name.substring(0, 25) + "..."
                    : companyInfo.name}
                </div>
              </div>

              {/* Ligne 2 : Technicien et Quitter - 50% / 50% */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <span
                  style={{
                    fontSize: "16px",
                    padding: "10px",
                    background: "transparent",
                    border: "1px solid #ffffff2b",
                    color: "#fff",
                    borderRadius: "9999px",
                    textAlign: "center",
                    width: "50%",
                    fontWeight: "bold",
                  }}
                  className="truncate"
                >
                  {authenticatedUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: "16px",
                    padding: "10px",
                    background: "#ffffff1a",
                    border: "1px solid #ffffff2b",
                    color: "#fff",
                    borderRadius: "9999px",
                    width: "50%",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[#ffffff2a] transition-all text-center"
                >
                  Quitter
                </button>
              </div>
            </header>

            {/* TAB SELECTOR: Horizontal capsule switch toggle layout with dynamic fades */}
            <nav
              className="py-0 px-0 relative shrink-0"
              id="nav-tabs"
              style={{ backgroundColor: "#5d1f74" }}
            >
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#5d1f74] to-transparent pointer-events-none z-10" />
              )}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#5d1f74] to-transparent pointer-events-none z-10" />
              )}

              <div
                ref={navRef}
                onScroll={handleNavScroll}
                className="flex p-2.5 gap-3.5 shrink-0 overflow-x-auto no-scrollbar scroll-smooth min-w-full"
                style={{ backgroundColor: "#5d1f74" }}
              >
                <button
                  onClick={() => setActiveTab("interventions")}
                  style={
                    activeTab === "interventions"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Interventions</span>
                </button>

                <button
                  onClick={() => setActiveTab("rapports")}
                  style={
                    activeTab === "rapports"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Rapports</span>
                </button>

                <button
                  onClick={() => setActiveTab("stocks")}
                  style={
                    activeTab === "stocks"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Stocks</span>
                </button>

                <button
                  onClick={() => setActiveTab("temps")}
                  style={
                    activeTab === "temps"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Temps</span>
                </button>

                <button
                  onClick={() => setActiveTab("frais")}
                  style={
                    activeTab === "frais"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Frais</span>
                </button>

                <button
                  onClick={() => setActiveTab("localisation")}
                  style={
                    activeTab === "localisation"
                      ? {
                          backgroundColor: "rgb(254, 78, 187)",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                          borderRadius: "12px",
                          boxShadow: "none",
                        }
                      : {
                          color: "#ffffff",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }
                  }
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Réglages</span>
                </button>
              </div>
            </nav>

            {/* Scrollable Contents Body */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
              id="tab-content-area"
            >
              {/* ----------------- TAB 1: INTERVENTIONS ----------------- */}
              {activeTab === "interventions" &&
                (() => {
                  const currentTourForPause = selectedTourId
                    ? getSortedTours().find((t) => t.id === selectedTourId)
                    : null;
                  const hasTodoMissions =
                    currentTourForPause && currentTourForPause.passages
                      ? currentTourForPause.passages.some(
                          (p: any) => p.status === "À faire",
                        )
                      : false;

                  return (
                    <div
                      className="space-y-4 pb-16 animate-fadeIn"
                      id="tab-interventions-screen"
                    >
                      {/* Toggle "Suspendre pour pause" */}
                      {selectedTourId && hasTodoMissions && (
                        <div className="px-1" id="pause-toggle-block">
                          <div
                            className="bg-white border p-4 space-y-3"
                            style={{
                              borderColor: "rgb(201, 190, 205)",
                              borderRadius: "14px",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[18px] font-bold text-black font-sans">
                                Suspendre pour pause.
                              </span>
                              <button
                                type="button"
                                onClick={() => setPauseEnabled(!pauseEnabled)}
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden"
                                style={{
                                  backgroundColor: pauseEnabled
                                    ? "#fe4eba"
                                    : "#cbd5e1",
                                }}
                              >
                                <span
                                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                                  style={{
                                    transform: pauseEnabled
                                      ? "translateX(20px)"
                                      : "translateX(0px)",
                                  }}
                                />
                              </button>
                            </div>
                            {pauseEnabled && (
                              <div className="text-[18px] font-semibold text-[#fe4eba] font-sans">
                                Zone recommandée pour votre pause :{" "}
                                <span className="font-bold">
                                  {getNextPassageZone()}
                                </span>
                                .
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Select native dropdown system for choosing active tour - sorted by date newest first */}
                      <div className="px-1 select-none">
                        <select
                          value={selectedTourId}
                          onChange={(e) => setSelectedTourId(e.target.value)}
                          className="w-full bg-white text-black cursor-pointer appearance-none transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none text-center"
                          style={{
                            border: "1px solid rgb(201, 190, 205)",
                            borderRadius: "14px",
                            padding: "14px 20px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            boxShadow: "none",
                            outline: "none",
                            textAlign: "center",
                            textAlignLast: "center",
                          }}
                        >
                          <option value="" disabled>
                            Sélectionnez une tournée
                          </option>
                          {getSortedTours().map((t) => (
                            <option key={t.id} value={t.id}>
                              {truncateTourTitle(t.title)} - {t.startDate}{" "}
                              {t.status === "Terminé" ? " (Terminé)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* List of stacked tournées */}
                      {selectedTourId &&
                        getSortedTours()
                          .filter((t) => t.id === selectedTourId)
                          .map((t) => (
                            <div key={t.id} className="space-y-3">
                              {/* Stacked Passage records list */}
                              <div
                                className="space-y-3"
                                id={`tour-passages-${t.id}`}
                              >
                                {t.passages.map((p) => {
                                  const isCompleted = p.status === "Effectué";
                                  const matchedOther = otherEquipments?.find(
                                    (o: any) =>
                                      o.identifiant === p.identifiant ||
                                      o.id === p.identifiant,
                                  );
                                  const matchedDefib = defibrillateurs?.find(
                                    (d: any) =>
                                      d.identifiant === p.identifiant ||
                                      d.id === p.identifiant,
                                  );
                                  const equipmentPhone =
                                    matchedOther?.telephoneSite ||
                                    matchedDefib?.telephoneSite ||
                                    "";
                                  return (
                                    <div
                                      key={p.num}
                                      className="bg-white p-5 space-y-4"
                                      style={{
                                        border: "1px solid rgb(201, 190, 205)",
                                        borderRadius: "14px",
                                        boxShadow: "none",
                                      }}
                                      id={`passage-card-${p.num}`}
                                    >
                                      {/* Toggle Status Check above passage number, aligned to the left */}
                                      <div className="flex justify-start w-full">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            togglePassageStatus(t.id, p.num)
                                          }
                                          className="flex items-center gap-2 cursor-pointer focus:outline-hidden"
                                          style={{ fontSize: "16px" }}
                                        >
                                          <span
                                            className="rounded-full flex items-center justify-center transition-all bg-white"
                                            style={{
                                              border: isCompleted
                                                ? "2.5px solid #fe4eba"
                                                : "2.5px solid #cbd5e1",
                                              width: "22px",
                                              height: "22px",
                                              minWidth: "22px",
                                              minHeight: "22px",
                                              backgroundColor: "#ffffff",
                                            }}
                                          >
                                            {isCompleted && (
                                              <span
                                                className="rounded-full bg-[#fe4eba]"
                                                style={{
                                                  width: "10px",
                                                  height: "10px",
                                                }}
                                              />
                                            )}
                                          </span>
                                          <span className="font-semibold text-black">
                                            {isCompleted
                                              ? "Effectué"
                                              : "À faire"}
                                          </span>
                                        </button>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          {/* Rond rose avec le numéro du passage */}
                                          <div
                                            className="flex items-center justify-center font-bold text-white rounded-full shrink-0"
                                            style={{
                                              backgroundColor: "#fe4eba",
                                              width: "28px",
                                              height: "28px",
                                              fontSize: "14px",
                                            }}
                                          >
                                            {p.num}
                                          </div>

                                          {/* Identifiant du défibrillateur dans une gelule alignée à gauche et pas en full width */}
                                          <span
                                            style={{
                                              backgroundColor:
                                                "rgb(77, 21, 83)",
                                              color: "rgb(255, 255, 255)",
                                              borderRadius: "1000px",
                                              padding: "4px 12px",
                                              fontSize: "15px",
                                              fontWeight: 700,
                                              border: "none",
                                              display: "inline-block",
                                            }}
                                          >
                                            {p.identifiant}
                                          </span>
                                        </div>

                                        {/* Textes de la div en font color black */}
                                        <div
                                          className="space-y-1.5"
                                          style={{
                                            fontSize: "16px",
                                            color: "#000000",
                                            fontFamily:
                                              "var(--font-sans), sans-serif",
                                          }}
                                        >
                                          <p style={{ color: "#000000" }}>
                                            Matériel :{" "}
                                            <span
                                              className="font-semibold"
                                              style={{ color: "#000000" }}
                                            >
                                              {p.equipmentType ||
                                                "Défibrillateur"}
                                            </span>
                                          </p>
                                          <p style={{ color: "#000000" }}>
                                            Modèle :{" "}
                                            <span
                                              className="font-semibold"
                                              style={{ color: "#000000" }}
                                            >
                                              {p.model}
                                            </span>
                                          </p>
                                          <p style={{ color: "#000000" }}>
                                            Adresse :{" "}
                                            <span
                                              className="font-semibold"
                                              style={{ color: "#000000" }}
                                            >
                                              {p.address}
                                            </span>
                                          </p>
                                          <p style={{ color: "#000000" }}>
                                            Téléphone :{" "}
                                            {equipmentPhone ? (
                                              <a
                                                href={`tel:${equipmentPhone.replace(/\s+/g, "")}`}
                                                className="font-semibold underline hover:opacity-75 transition-opacity"
                                                style={{
                                                  color: "#fe4eba",
                                                  cursor: "pointer",
                                                }}
                                                id={`tel-link-${p.num}`}
                                              >
                                                {equipmentPhone}
                                              </a>
                                            ) : (
                                              <span className="font-semibold text-gray-400">
                                                Non renseigné
                                              </span>
                                            )}
                                          </p>
                                          {p.reason &&
                                            p.reason.trim() !== "" && (
                                              <p style={{ color: "#000000" }}>
                                                Motif :{" "}
                                                <span
                                                  className="font-semibold"
                                                  style={{ color: "#000000" }}
                                                >
                                                  {p.reason}
                                                </span>
                                              </p>
                                            )}
                                          {p.estimatedDate && (
                                            <p style={{ color: "#000000" }}>
                                              Date estimée :{" "}
                                              <span
                                                className="font-semibold"
                                                style={{ color: "#000000" }}
                                              >
                                                {(() => {
                                                  const cleanDate =
                                                    p.estimatedDate.replace(
                                                      /\//g,
                                                      "-",
                                                    );
                                                  const pts =
                                                    cleanDate.split("-");
                                                  if (pts.length === 3) {
                                                    if (pts[0].length === 4) {
                                                      return `${pts[2]}/${pts[1]}/${pts[0]}`;
                                                    }
                                                    return `${pts[0]}/${pts[1]}/${pts[2]}`;
                                                  }
                                                  return p.estimatedDate;
                                                })()}
                                              </span>
                                            </p>
                                          )}
                                          <p style={{ color: "#000000" }}>
                                            Créneau estimé :{" "}
                                            <span
                                              className="font-semibold"
                                              style={{ color: "#000000" }}
                                            >
                                              {p.estimatedSlot || "--"}
                                            </span>
                                          </p>
                                          {p.requiredParts &&
                                            p.requiredParts.length > 0 &&
                                            p.requiredParts.some(
                                              (part) =>
                                                part &&
                                                part.trim() !==
                                                  "Aucune pièce" &&
                                                part.trim() !==
                                                  "Aucune pièce requise" &&
                                                part.trim() !== "Aucune" &&
                                                part.trim() !== "",
                                            ) && (
                                              <p style={{ color: "#000000" }}>
                                                Pièce(s) :{" "}
                                                <span
                                                  className="font-semibold"
                                                  style={{ color: "#000000" }}
                                                >
                                                  {p.requiredParts.join(", ")}
                                                </span>
                                              </p>
                                            )}
                                        </div>
                                      </div>

                                      <div className="flex gap-3">
                                        <button
                                          type="button"
                                          disabled={isCompleted}
                                          onClick={() =>
                                            handleNavigateToAddress(p.address)
                                          }
                                          style={{
                                            backgroundColor: isCompleted
                                              ? "#e2e8f0"
                                              : "#000000",
                                            color: isCompleted
                                              ? "#94a3b8"
                                              : "#fff",
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            borderRadius: "12px",
                                            padding: "11px 20px",
                                            border: "none",
                                            boxShadow: "none",
                                            cursor: isCompleted
                                              ? "not-allowed"
                                              : "pointer",
                                            flex: 1,
                                          }}
                                          className={
                                            isCompleted
                                              ? "opacity-60 transition-all font-bold"
                                              : "hover:opacity-90 active:scale-[0.99] transition-all font-bold"
                                          }
                                        >
                                          Y aller
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isCompleted}
                                          onClick={() => {
                                            const matchedOther =
                                              otherEquipments?.find(
                                                (o) =>
                                                  o.identifiant ===
                                                  p.identifiant,
                                              );
                                            if (matchedOther) {
                                              setSelectedOtherEquipmentUnique(
                                                matchedOther,
                                              );
                                              setReportActiveTourId(t.id);
                                              setReportActivePassageNum(p.num);
                                              setIsReportOverlayOpen(true);
                                            } else {
                                              const matched =
                                                defibrillateurs.find(
                                                  (df) =>
                                                    df.identifiant ===
                                                    p.identifiant,
                                                ) || defibrillateurs[0];
                                              if (matched) {
                                                setSelectedOtherEquipmentUnique(
                                                  null,
                                                );
                                                handleDefibLookupChange(
                                                  matched.id,
                                                );
                                                // Pre-fill fields for nicer wizard UX!
                                                setReceiptTitle(
                                                  "Rapport technique défibrillateur",
                                                );
                                                setMissionSite("DÉPLACEMENT");
                                                setReportActiveTourId(t.id);
                                                setReportActivePassageNum(
                                                  p.num,
                                                );
                                                setIsReportOverlayOpen(true);
                                              } else {
                                                alert(
                                                  `Aucun matériel central disponible.`,
                                                );
                                              }
                                            }
                                          }}
                                          style={{
                                            backgroundColor: isCompleted
                                              ? "#e2e8f0"
                                              : "#3556ec",
                                            color: isCompleted
                                              ? "#94a3b8"
                                              : "#fff",
                                            fontSize: "18px",
                                            fontWeight: "bold",
                                            borderRadius: "12px",
                                            padding: "11px 20px",
                                            border: "none",
                                            boxShadow: isCompleted
                                              ? "none"
                                              : "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                                            cursor: isCompleted
                                              ? "not-allowed"
                                              : "pointer",
                                            flex: 1,
                                          }}
                                          className={
                                            isCompleted
                                              ? "opacity-60 transition-all font-bold"
                                              : "hover:opacity-90 active:scale-[0.99] transition-all font-bold"
                                          }
                                        >
                                          Rapport
                                        </button>
                                      </div>

                                      {/* Rejection reason input for uncompleted passages */}
                                      {!isCompleted &&
                                        attemptedEndTourIds.includes(t.id) && (
                                          <div
                                            className="mt-2.5 p-3 rounded-lg"
                                            style={{
                                              backgroundColor: "#fde5ff",
                                            }}
                                          >
                                            <label
                                              className="block text-[18px] font-bold mb-1 font-sans"
                                              style={{
                                                color: "#973e9e",
                                                textTransform: "none",
                                              }}
                                            >
                                              Raison de rejet de mission.
                                            </label>
                                          <input
                                            type="text"
                                            maxLength={25}
                                            value={p.rejectionReason || ""}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const updated = tours.map(
                                                (item) => {
                                                  if (item.id === t.id) {
                                                    return {
                                                      ...item,
                                                      passages:
                                                        item.passages.map(
                                                          (pass) => {
                                                            if (
                                                              pass.num === p.num
                                                            ) {
                                                              return {
                                                                ...pass,
                                                                rejectionReason:
                                                                  val,
                                                                rejectedAt:
                                                                  pass.rejectedAt ||
                                                                  new Date().toLocaleDateString(
                                                                    "fr-FR",
                                                                  ),
                                                              };
                                                            }
                                                            return pass;
                                                          },
                                                        ),
                                                    };
                                                  }
                                                  return item;
                                                },
                                              );
                                              saveTours(updated);
                                            }}
                                            placeholder="Raison du rejet (max 25 car.)"
                                            className="placeholder-black placeholder:text-black font-sans focus:outline-none focus:ring-0 border-none outline-none"
                                            style={{
                                              backgroundColor: "#ffffff",
                                              color: "#000000",
                                              borderRadius: "8px",
                                              padding: "7px 10px",
                                              width: "100%",
                                              fontSize: "18px",
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Terminer la tournée button in Red */}
                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={t.status === "Terminé"}
                                  onClick={() => {
                                    if (!attemptedEndTourIds.includes(t.id)) {
                                      setAttemptedEndTourIds((prev) => [
                                        ...prev,
                                        t.id,
                                      ]);
                                    }
                                    // Find non-completed passages
                                    const uncompletedPassages =
                                      t.passages.filter(
                                        (pass) => pass.status !== "Effectué",
                                      );
                                    if (uncompletedPassages.length > 0) {
                                      // Check if any of these does not have a filled out rejectionReason
                                      const hasUnfilledReasons =
                                        uncompletedPassages.some(
                                          (pass) =>
                                            !pass.rejectionReason ||
                                            !pass.rejectionReason.trim(),
                                        );
                                      if (hasUnfilledReasons) {
                                        // Update error message
                                        setTourErrorMap((prev) => ({
                                          ...prev,
                                          [t.id]:
                                            "Informations requises sur les missions non effectuées.",
                                        }));
                                        return;
                                      }
                                    }

                                    // Success: clear errors, mark as finished
                                    setTourErrorMap((prev) => {
                                      const copy = { ...prev };
                                      delete copy[t.id];
                                      return copy;
                                    });

                                    // update tours state
                                    const updatedTours = tours.map((item) => {
                                      if (item.id === t.id) {
                                        return {
                                          ...item,
                                          status: "Terminé",
                                          passages: item.passages.map(
                                            (pass) => {
                                              if (
                                                pass.status !== "Effectué" &&
                                                (!pass.rejectedAt ||
                                                  pass.rejectedAt.trim() === "")
                                              ) {
                                                return {
                                                  ...pass,
                                                  rejectedAt:
                                                    new Date().toLocaleDateString(
                                                      "fr-FR",
                                                    ),
                                                };
                                              }
                                              return pass;
                                            },
                                          ),
                                        };
                                      }
                                      return item;
                                    });
                                    saveTours(updatedTours);

                                    alert(
                                      "La tournée a bien été marquée comme terminée !",
                                    );
                                  }}
                                  style={{
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    padding: "14px 20px",
                                    border: "none",
                                    boxShadow:
                                      t.status === "Terminé"
                                        ? "none"
                                        : "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, inset 0 6px 12px #ffffff1f",
                                    cursor:
                                      t.status === "Terminé"
                                        ? "not-allowed"
                                        : "pointer",
                                    width: "100%",
                                    opacity: t.status === "Terminé" ? 0.55 : 1,
                                  }}
                                  className={`${t.status === "Terminé" ? "" : "hover:bg-red-700 active:scale-[0.99]"} transition-all flex items-center justify-center gap-2`}
                                >
                                  Terminer la tournée
                                </button>

                                {/* Conditional error message */}
                                {tourErrorMap[t.id] && (
                                  <div
                                    className="mt-2.5 p-3 rounded-lg border text-center font-semibold text-sm animate-fadeIn"
                                    style={{
                                      backgroundColor: "#fff5f5",
                                      borderColor: "#feb2b2",
                                      color: "#c53030",
                                    }}
                                  >
                                    {tourErrorMap[t.id]}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                    </div>
                  );
                })()}

              {/* ----------------- TAB 2: RAPPORTS PDF ----------------- */}
              {activeTab === "rapports" && (
                <div
                  className="space-y-4 pb-16 animate-fadeIn"
                  id="tab-rapports-screen"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOtherEquipmentUnique(null);
                      setSelectedDefibId("");
                      setSelectedDefibData(null);
                      setReceiptTitle("Rapport technique défibrillateur");
                      setMissionSite("DÉPLACEMENT");
                      setReportActiveTourId("");
                      setReportActivePassageNum(null);
                      setIsReportOverlayOpen(true);
                    }}
                    style={{
                      backgroundColor: "#3556ec",
                      color: "#ffffff",
                      fontSize: "18px",
                      fontWeight: "bold",
                      borderRadius: "12px",
                      padding: "14px 20px",
                      border: "none",
                      boxShadow:
                        "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                      cursor: "pointer",
                      width: "100%",
                    }}
                    className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 font-bold"
                  >
                    Nouveau Rapport Spontané
                  </button>

                  <div className="space-y-4">
                    {sortedAndLimitedReports.map((rep) => {
                      const snapshot =
                        rep.defibSnapshot ||
                        defibrillateurs.find(
                          (d) =>
                            d.id === rep.defibId ||
                            d.identifiant === rep.defibIdentifiant,
                        ) ||
                        {};
                      const clientFound = clients.find(
                        (c) => c.id === snapshot.clientId,
                      );
                      const clientName = clientFound
                        ? clientFound.denomination
                        : snapshot.nomPrenomSite || "Non rattaché";

                      return (
                        <div
                          key={rep.id}
                          className="p-5 bg-white rounded-[14px] space-y-4"
                          style={{
                            border: "1px solid rgb(201, 190, 205)",
                            boxShadow: "none",
                          }}
                          id={`report-card-${rep.id}`}
                        >
                          {/* Gelule Date en premier */}
                          <div className="flex items-center justify-center pb-1">
                            <span
                              style={{
                                color: "#ffffff",
                                backgroundColor: "#5d1f74",
                                padding: "10px 20px",
                                borderRadius: "9999px",
                                fontWeight: "bold",
                                fontSize: "16px",
                                display: "inline-block",
                                width: "auto",
                                textAlign: "center",
                              }}
                            >
                              {rep.date}
                            </span>
                          </div>

                          <div
                            className="space-y-1.5"
                            style={{
                              fontSize: "16px",
                              color: "#000000",
                              fontFamily: "var(--font-sans), sans-serif",
                            }}
                          >
                            <p style={{ color: "#000000" }}>
                              Document :{" "}
                              <span
                                className="font-semibold"
                                style={{ color: "#000000" }}
                              >
                                {formatToNormalCase(
                                  rep.title || "Rapport de maintenance",
                                )}
                              </span>
                            </p>
                            <p style={{ color: "#000000" }}>
                              Identifiant :{" "}
                              <span
                                className="font-semibold"
                                style={{ color: "#000000" }}
                              >
                                {snapshot.identifiant || rep.defibIdentifiant}
                              </span>
                            </p>
                            <p style={{ color: "#000000" }}>
                              Équipement :{" "}
                              <span
                                className="font-semibold"
                                style={{ color: "#000000" }}
                              >
                                {snapshot.categorie
                                  ? formatToNormalCase(snapshot.categorie)
                                  : "Défibrillateur"}
                              </span>
                            </p>
                            <p style={{ color: "#000000" }}>
                              Technicien :{" "}
                              <span
                                className="font-semibold"
                                style={{ color: "#000000" }}
                              >
                                {rep.techName}
                              </span>
                            </p>
                            <p style={{ color: "#000000" }}>
                              Client :{" "}
                              <span
                                className="font-semibold"
                                style={{ color: "#000000" }}
                              >
                                {formatToNormalCase(clientName)}
                              </span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadReport(rep)}
                            style={{
                              backgroundColor: "#3556ec",
                              color: "#fff",
                              fontSize: "18px",
                              fontWeight: "bold",
                              borderRadius: "12px",
                              padding: "12px 20px",
                              border: "none",
                              boxShadow:
                                "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                              cursor: "pointer",
                              width: "100%",
                            }}
                            className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                            Télécharger PDF
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----------------- TAB: STOCKS ----------------- */}
              {activeTab === "stocks" && (
                <div
                  className="space-y-4 pb-16 animate-fadeIn"
                  id="tab-stocks-screen"
                >
                  {/* Info: Emplacement (Disabled Input en premier, hors d'une div) */}
                  <input
                    type="text"
                    value={techLocationLink || "Aucun emplacement spécifié"}
                    disabled
                    style={{
                      color: "#000000",
                      fontSize: "18px",
                      textAlign: "center",
                      borderColor: "#D5D5D5",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "13px",
                      padding: "12px 14px",
                      backgroundColor: "#ffffff",
                      width: "100%",
                      boxSizing: "border-box",
                      opacity: 1,
                      WebkitTextFillColor: "#000000",
                    }}
                    className="font-sans font-semibold mb-2"
                  />

                  {/* Piece / Material Select (hors d'une div, sans titre, style text noir, 18px, center, border D5D5D5, bg white) */}
                  <select
                    value={selectedTechDistributedStockId}
                    onChange={(e) => {
                      setSelectedTechDistributedStockId(e.target.value);
                      setShowRapatriementForm(false);
                    }}
                    style={{
                      color: "#000000",
                      fontSize: "18px",
                      textAlign: "center",
                      textAlignLast: "center",
                      borderColor: "#D5D5D5",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "13px",
                      padding: "12px 14px",
                      backgroundColor: "#ffffff",
                      width: "100%",
                      boxSizing: "border-box",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      outline: "none",
                    }}
                    className="font-sans font-semibold mb-2 cursor-pointer"
                  >
                    <option value="">Sélection d’un stock distribué.</option>
                    {techActiveStocks.map((item) => {
                      const matchedCentralStock = stocks.find(
                        (s) =>
                          s.id === item.stockId ||
                          s.denominationPieceId === item.denominationPieceId,
                      );
                      const ugs = matchedCentralStock?.ugs || "";
                      const vObj = variables.find(
                        (v) => v.id === item.denominationPieceId,
                      );
                      const pieceName = vObj ? vObj.nom : "Pièce inconnue";
                      return (
                        <option key={item.id} value={item.id}>
                          {pieceName} {ugs ? `(UGS: ${ugs})` : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Details shown ONLY when a stock is selected */}
                  {selectedTechStock ? (
                    <div className="space-y-4 mt-6">
                      {/* Section 1: Volumes (3-col grid) */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {selectedTechStock.volumeDisponible}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Disponible
                          </div>
                        </div>

                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {selectedTechStock.volumeReserve}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Réservé
                          </div>
                        </div>

                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {selectedTechStock.volumeEntrant}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Entrant
                          </div>
                        </div>
                      </div>

                      {/* Section: Outgoing Stats (3-col grid below) */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {outgoingStats.week1.vol}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Sortant cette semaine
                          </div>
                        </div>

                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {outgoingStats.week2.vol}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Sortant semaine prochaine
                          </div>
                        </div>

                        <div
                          className="p-4 text-center"
                          style={{
                            backgroundColor: "#fde5ff",
                            borderRadius: "13px",
                            border: "none",
                            boxShadow: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "150px",
                          }}
                        >
                          <div
                            className="font-extrabold font-sans"
                            style={{ fontSize: "22px", color: "#973e9e" }}
                          >
                            {outgoingStats.next30.vol}
                          </div>
                          <div
                            className="font-bold mt-1 font-sans leading-tight"
                            style={{
                              fontSize: "16px",
                              color: "#973e9e",
                            }}
                          >
                            Sortant 7 à 30 jours
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Mouvements (Table layout with scroll horizontally) */}
                      <div className="bg-white space-y-3">
                        <div className="flex bg-white select-none">
                          <span
                            className="inline-flex items-center px-4 py-1.5 rounded-full font-semibold font-sans"
                            style={{
                              color: "#fff",
                              backgroundColor: "#5f1f66",
                              fontSize: "16px",
                              border: "none",
                              textTransform: "none",
                              letterSpacing: "normal",
                            }}
                          >
                            Mouvements
                          </span>
                        </div>

                        <div
                          className="overflow-x-auto border rounded-xl mt-2 bg-white"
                          style={{
                            borderColor: "oklch(0.88 0 0)",
                            borderWidth: "1px",
                          }}
                        >
                          <table className="w-full text-left font-sans border-collapse text-xs">
                            <thead>
                              <tr
                                className="bg-white"
                                style={{
                                  borderBottom: "1px solid oklch(0.88 0 0)",
                                }}
                              >
                                <th
                                  className="px-3 py-3 text-center font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Indicateur.
                                </th>
                                <th
                                  className="px-3 py-3 font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Circulation.
                                </th>
                                <th
                                  className="px-3 py-3 font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Raccordement.
                                </th>
                                <th
                                  className="px-3 py-3 text-center font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Volume.
                                </th>
                                <th
                                  className="px-3 py-3 text-center font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Suivi du colis.
                                </th>
                                <th
                                  className="px-3 py-3 text-center font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Date.
                                </th>
                                <th
                                  className="px-3 py-3 text-center font-semibold text-black font-sans"
                                  style={{
                                    fontSize: "16px",
                                    color: "#000000",
                                    whiteSpace: "nowrap",
                                    cursor: "default",
                                  }}
                                >
                                  Situation.
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {(matchedStockRecord?.mouvements || []).length ===
                              0 ? (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="text-center text-xs text-slate-400 py-4 font-sans bg-white"
                                  >
                                    Aucun mouvement enregistré pour ce stock.
                                  </td>
                                </tr>
                              ) : (
                                (matchedStockRecord?.mouvements || []).map(
                                  (mv, index, arr) => {
                                    return (
                                      <tr
                                        key={mv.id}
                                        className="hover:bg-slate-50 transition-all font-sans bg-white text-black"
                                        style={{
                                          borderBottom:
                                            index === arr.length - 1
                                              ? "none"
                                              : "1px solid oklch(0.88 0 0)",
                                        }}
                                      >
                                        {/* Indicator (Pink text with 18px arrow) */}
                                        <td
                                          className="px-3 py-2 whitespace-nowrap bg-white text-center"
                                          style={{ cursor: "default" }}
                                        >
                                          <span
                                            className="inline-flex items-center justify-center font-bold font-sans"
                                            style={{
                                              color: "#fa53d5",
                                              fontSize: "18px",
                                              lineHeight: "1",
                                              cursor: "default",
                                            }}
                                          >
                                            {mv.type ===
                                            "Réapprovisionnement fournisseur"
                                              ? "↓"
                                              : mv.type === "Distribution"
                                                ? "→"
                                                : mv.type === "Annulation"
                                                  ? "↑"
                                                  : "←"}
                                          </span>
                                        </td>
                                        {/* Type / Circulation */}
                                        <td
                                          className="px-3 py-2 bg-white font-medium text-black"
                                          style={{
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            color: "#000000",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.type || ""}
                                        </td>
                                        {/* Raccordement */}
                                        <td
                                          className="px-3 py-2 bg-white font-medium text-black"
                                          style={{
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            color: "#000000",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.emplacement || ""}
                                        </td>
                                        {/* Volume */}
                                        <td
                                          className="px-3 py-2 text-center bg-white font-semibold text-black"
                                          style={{
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            color: "#000000",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.volume !== undefined &&
                                          mv.volume !== null
                                            ? mv.volume
                                            : ""}
                                        </td>
                                        {/* Suivi du colis */}
                                        <td
                                          className="px-3 py-2 text-center bg-white text-black font-semibold font-sans"
                                          style={{
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            color: "#000000",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.trackingLink ? (
                                            <a
                                              href={
                                                mv.trackingLink.startsWith(
                                                  "http",
                                                )
                                                  ? mv.trackingLink
                                                  : `https://${mv.trackingLink}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[#fa53d5] hover:underline font-bold font-sans"
                                              style={{ cursor: "pointer" }}
                                              title="Suivre le colis"
                                            >
                                              Ouvrir le lien
                                            </a>
                                          ) : (
                                            ""
                                          )}
                                        </td>
                                        {/* Date */}
                                        <td
                                          className="px-3 py-2 text-center bg-white font-medium text-black"
                                          style={{
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            color: "#000000",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.date
                                            ? new Date(
                                                mv.date,
                                              ).toLocaleDateString("fr-FR")
                                            : ""}
                                        </td>
                                        {/* Situation */}
                                        <td
                                          className="px-3 py-2 text-center bg-white font-medium text-black"
                                          style={{
                                            fontSize: "16px",
                                            cursor: "default",
                                          }}
                                        >
                                          {mv.statut || ""}
                                        </td>
                                      </tr>
                                    );
                                  },
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 3: Actions (Two side-by-side black styled buttons) */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={handleAlertLogistique}
                            style={{
                              backgroundColor: "#000000",
                              color: "#ffffff",
                              borderRadius: "13px",
                              fontSize: "18px",
                              fontWeight: "bold",
                              padding: "12px 14px",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "center",
                              width: "100%",
                            }}
                            className="font-sans hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center"
                          >
                            Alerter
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRapatrimentVolume(
                                selectedTechStock.volumeDisponible,
                              );
                              setRapatrimentTrackingLink("");
                              setRapatrimentDate(
                                new Date().toISOString().split("T")[0],
                              );
                              setRapatrimentStatut("Préparation");
                              setShowRapatriementForm(true);
                            }}
                            style={{
                              backgroundColor: "#000000",
                              color: "#ffffff",
                              borderRadius: "13px",
                              fontSize: "18px",
                              fontWeight: "bold",
                              padding: "12px 14px",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "center",
                              width: "100%",
                            }}
                            className="font-sans hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center"
                          >
                            Tout retourner
                          </button>
                        </div>

                        {/* Rapatriement sub-form */}
                        {showRapatriementForm && (
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 font-sans text-xs text-black">
                            <div className="border-b border-slate-200/60 pb-1 flex items-center justify-between bg-transparent">
                              <h4 className="font-extrabold text-[#5d1f74] bg-transparent">
                                Créer un retour
                              </h4>
                              <span className="text-[9px] text-slate-400 uppercase font-bold bg-transparent">
                                Rapatriement
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 bg-transparent">
                              <div className="flex flex-col gap-0.5 bg-transparent">
                                <label className="text-[10px] font-bold text-slate-500 uppercase bg-transparent">
                                  Type
                                </label>
                                <input
                                  type="text"
                                  value="Rapatriement"
                                  disabled
                                  className="w-full bg-slate-100 border border-slate-200 p-2 rounded text-slate-550 font-bold bg-transparent"
                                />
                              </div>

                              <div className="flex flex-col gap-0.5 bg-transparent">
                                <label className="text-[10px] font-bold text-slate-500 uppercase bg-transparent">
                                  Volume *
                                </label>
                                <input
                                  type="number"
                                  value={rapatrimentVolume}
                                  onChange={(e) =>
                                    setRapatrimentVolume(
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                  placeholder="Indiquer le volume"
                                  className="w-full bg-white border border-slate-200 p-2 rounded text-black font-semibold"
                                />
                              </div>

                              <div className="flex flex-col gap-0.5 bg-transparent">
                                <label className="text-[10px] font-bold text-slate-500 uppercase bg-transparent">
                                  Lien de suivi
                                </label>
                                <input
                                  type="text"
                                  value={rapatrimentTrackingLink}
                                  onChange={(e) =>
                                    setRapatrimentTrackingLink(e.target.value)
                                  }
                                  placeholder="Coller lien de suivi"
                                  className="w-full bg-white border border-slate-200 p-2 rounded text-black font-semibold"
                                />
                              </div>

                              <div className="flex flex-col gap-0.5 bg-transparent">
                                <label className="text-[10px] font-bold text-slate-500 uppercase bg-transparent">
                                  Date *
                                </label>
                                <input
                                  type="date"
                                  value={rapatrimentDate}
                                  onChange={(e) =>
                                    setRapatrimentDate(e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 p-2 rounded text-black font-semibold"
                                />
                              </div>

                              <div className="flex flex-col gap-0.5 bg-transparent">
                                <label className="text-[10px] font-bold text-slate-500 uppercase bg-transparent">
                                  Statut *
                                </label>
                                <select
                                  value={rapatrimentStatut}
                                  onChange={(e) =>
                                    setRapatrimentStatut(e.target.value as any)
                                  }
                                  className="w-full bg-white border border-slate-200 p-2 rounded text-black font-semibold cursor-pointer"
                                >
                                  <option value="Préparation">
                                    Préparation
                                  </option>
                                  <option value="Expédié">Expédié</option>
                                  <option value="Terminé">Terminé</option>
                                  <option value="Annulé">Annulé</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 bg-transparent font-sans">
                              <button
                                type="button"
                                onClick={() => setShowRapatriementForm(false)}
                                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-center transition-colors cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={handleConfirmRapatriement}
                                className="flex-1 py-2 bg-[#fe4eba] hover:opacity-90 text-white rounded-lg font-bold text-center transition-opacity cursor-pointer"
                              >
                                Confirmer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ----------------- TAB 3: TEMPS ----------------- */}
              {activeTab === "temps" && (
                <div
                  className="space-y-6 pb-16 animate-fadeIn"
                  id="tab-temps-screen"
                >
                  <style>{`
                    #tab-temps-screen input[type="date"]::-webkit-calendar-picker-indicator,
                    #tab-temps-screen input[type="time"]::-webkit-calendar-picker-indicator {
                      display: none !important;
                      -webkit-appearance: none !important;
                      background: none !important;
                      width: 0 !important;
                      height: 0 !important;
                      margin: 0 !important;
                    }
                  `}</style>

                  {/* Digital Clock Section */}
                  <div
                    style={{ backgroundColor: "#000000" }}
                    className="p-5 rounded-2xl text-center space-y-2"
                  >
                    <span
                      style={{
                        fontSize: "18px",
                        color: "#ffffff",
                        fontFamily: "var(--font-sans), sans-serif",
                      }}
                      className="font-normal block !text-white"
                    >
                      Date et heure.
                    </span>
                    <div
                      style={{
                        fontSize: "18px",
                        color: "#ffffff",
                        fontFamily: "var(--font-sans), sans-serif",
                      }}
                      className="font-bold !text-white"
                    >
                      {currentTime.toLocaleTimeString("fr-FR")}
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        color: "#ffffff",
                        fontFamily: "var(--font-sans), sans-serif",
                      }}
                      className="font-bold !text-white"
                    >
                      {currentTime.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Period control and tracker */}
                  {(() => {
                    const activePointage = pointages.find(
                      (p) =>
                        p.isOngoing && p.techName === authenticatedUser?.name,
                    );
                    const isTracking = !!activePointage;

                    // Compute current tracker stopwatch formats
                    const formatStopwatch = (totalSec: number) => {
                      const h = String(Math.floor(totalSec / 3600)).padStart(
                        2,
                        "0",
                      );
                      const m = String(
                        Math.floor((totalSec % 3600) / 60),
                      ).padStart(2, "0");
                      const s = String(totalSec % 60).padStart(2, "0");
                      return `${h}:${m}:${s}`;
                    };

                    return (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={handleTogglePointage}
                          style={{
                            backgroundColor: isTracking ? "#dc2626" : "#3556ec",
                            color: "#fff",
                            fontSize: "18px",
                            fontWeight: "bold",
                            borderRadius: "12px",
                            padding: "14px 20px",
                            border: "none",
                            boxShadow:
                              "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                            cursor: "pointer",
                            width: "100%",
                          }}
                          className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          {isTracking ? (
                            <span>Terminer le pointage</span>
                          ) : (
                            <span>Démarrer la période</span>
                          )}
                        </button>

                        {isTracking && (
                          <div
                            style={{
                              backgroundColor: "#f5ceff",
                              color: "#651c78",
                            }}
                            className="p-4 rounded-xl text-center space-y-1.5"
                          >
                            <span
                              style={{
                                fontSize: "16px",
                                color: "#651c78",
                                fontFamily: "var(--font-sans), sans-serif",
                              }}
                              className="font-semibold block"
                            >
                              Calcul du temps de travail.
                            </span>
                            <div
                              style={{
                                fontSize: "24px",
                                color: "#651c78",
                                fontFamily: "var(--font-sans), sans-serif",
                              }}
                              className="font-bold"
                            >
                              {formatStopwatch(ongoingSeconds)}
                            </div>
                            <p
                              style={{
                                fontSize: "16px",
                                color: "#651c78",
                                fontFamily: "var(--font-sans), sans-serif",
                              }}
                              className="font-semibold"
                            >
                              Débuté à {activePointage?.startTime}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Pointages registered historical log list */}
                  <div className="space-y-3">
                    <div className="space-y-4">
                      {pointages
                        .filter(
                          (p) =>
                            p.techName === authenticatedUser?.name &&
                            !p.isOngoing,
                        )
                        .map((p, index) => {
                          const isFirst = index === 0;
                          return (
                            <div
                              key={p.id}
                              className="p-3.5 sm:p-5 rounded-[14px] space-y-4"
                              style={{
                                border: "1px solid rgb(201, 190, 205)",
                                boxShadow: "none",
                                backgroundColor: isFirst ? "#fde5ff" : "#ffffff",
                              }}
                              id={`pointage-card-${p.id}`}
                            >
                              <div className="flex items-center justify-center pb-1">
                                <span
                                  style={{
                                    color: "#ffffff",
                                    backgroundColor: "#5d1f74",
                                    padding: "10px 20px",
                                    borderRadius: "9999px",
                                    fontWeight: "bold",
                                    fontSize: "16px",
                                    display: "inline-block",
                                    width: "auto",
                                    textAlign: "center",
                                  }}
                                >
                                  Pointage de{" "}
                                  {Math.round((p.durationSeconds || 0) / 60)} min
                                  ({((p.durationSeconds || 0) / 3600).toFixed(2)}{" "}
                                  h)
                                </span>
                              </div>

                              {/* Editable fields for past Pointages */}
                              <div className="space-y-4">
                                <div className="space-y-1.5 min-w-0">
                                  <label
                                    style={{
                                      fontSize: "16px",
                                      color: isFirst ? "#973e9e" : "#000000",
                                    }}
                                    className="block font-bold select-none"
                                  >
                                    Date.
                                  </label>
                                  <input
                                    type="date"
                                    value={getIsoDate(p.startDate)}
                                    style={{
                                      fontSize: "16px",
                                      padding: "10px 12px",
                                      borderRadius: "13px",
                                      border: "1px solid rgb(201, 190, 205)",
                                      outline: "none",
                                      boxSizing: "border-box",
                                      width: "100%",
                                      maxWidth: "100%",
                                      minWidth: "0px",
                                      display: "block",
                                    }}
                                  className="w-full max-w-full min-w-0 bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                  onChange={(e) =>
                                    handleEditPointage(
                                      p.id,
                                      p.startTime,
                                      p.endTime || "12:00",
                                      p.comment,
                                      getFrenchDate(e.target.value),
                                    )
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5 min-w-0">
                                  <label
                                    style={{ fontSize: "16px", color: isFirst ? "#973e9e" : "#000000" }}
                                    className="block font-bold select-none"
                                  >
                                    Début.
                                  </label>
                                  <input
                                    type="time"
                                    value={p.startTime}
                                    style={{
                                      fontSize: "16px",
                                      padding: "10px 12px",
                                      borderRadius: "13px",
                                      border: "1px solid rgb(201, 190, 205)",
                                      outline: "none",
                                      boxSizing: "border-box",
                                      width: "100%",
                                      maxWidth: "100%",
                                      minWidth: "0px",
                                      display: "block",
                                    }}
                                    className="w-full max-w-full min-w-0 bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                    onChange={(e) =>
                                      handleEditPointage(
                                        p.id,
                                        e.target.value,
                                        p.endTime || "12:00",
                                        p.comment,
                                        p.startDate,
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                  <label
                                    style={{ fontSize: "16px", color: isFirst ? "#973e9e" : "#000000" }}
                                    className="block font-bold select-none"
                                  >
                                    Clôture.
                                  </label>
                                  <input
                                    type="time"
                                    value={p.endTime || ""}
                                    style={{
                                      fontSize: "16px",
                                      padding: "10px 12px",
                                      borderRadius: "13px",
                                      border: "1px solid rgb(201, 190, 205)",
                                      outline: "none",
                                      boxSizing: "border-box",
                                      width: "100%",
                                      maxWidth: "100%",
                                      minWidth: "0px",
                                      display: "block",
                                    }}
                                    className="w-full max-w-full min-w-0 bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                    onChange={(e) =>
                                      handleEditPointage(
                                        p.id,
                                        p.startTime,
                                        e.target.value,
                                        p.comment,
                                        p.startDate,
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5 min-w-0">
                                <label
                                  style={{ fontSize: "16px", color: isFirst ? "#973e9e" : "#000000" }}
                                  className="block font-bold select-none"
                                >
                                  Commentaire pour la période.
                                </label>
                                <input
                                  type="text"
                                  maxLength={50}
                                  placeholder="Entrez un commentaire."
                                  value={p.comment || ""}
                                  style={{
                                    fontSize: "16px",
                                    padding: "10px 12px",
                                    borderRadius: "13px",
                                    border: "1px solid rgb(201, 190, 205)",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    width: "100%",
                                    maxWidth: "100%",
                                    minWidth: "0px",
                                    display: "block",
                                  }}
                                  className="w-full max-w-full min-w-0 bg-white focus:border-indigo-500"
                                  onChange={(e) =>
                                    handleEditPointage(
                                      p.id,
                                      p.startTime,
                                      p.endTime || "12:00",
                                      e.target.value,
                                      p.startDate,
                                    )
                                  }
                                />
                              </div>

                              <div className="flex items-center gap-3 pt-1 w-full">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePointage(p.id)}
                                  style={{
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    padding: "12px 18px",
                                    border: "none",
                                    cursor: "pointer",
                                    flex: 1,
                                  }}
                                  className="hover:opacity-90 transition-all font-bold"
                                >
                                  Supprimer
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    alert("Pointage enregistré avec succès !")
                                  }
                                  style={{
                                    backgroundColor: "#000000",
                                    color: "#ffffff",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    padding: "12px 18px",
                                    border: "none",
                                    cursor: "pointer",
                                    flex: 1,
                                  }}
                                  className="hover:opacity-90 transition-all font-bold"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- TAB 4: FRAIS ----------------- */}
              {activeTab === "frais" && (
                <div
                  className="space-y-6 pb-16 animate-fadeIn"
                  id="tab-frais-screen"
                >
                  <style>{`
                    #tab-frais-screen input,
                    #tab-frais-screen label,
                    #tab-frais-screen input::placeholder {
                      font-family: var(--font-sans), "Civilprom", "DefibeoMain", sans-serif !important;
                    }
                  `}</style>

                  {/* Ticket addition Form */}
                  <form
                    onSubmit={handleSaveExpense}
                    className="space-y-5 bg-white p-0 rounded-2xl"
                    id="auth-main-card"
                    style={{
                      border: "none",
                      padding: "0px",
                      boxShadow: "none",
                    }}
                  >
                    <div className="space-y-4">
                      {/* Title */}
                      <div className="space-y-1.5">
                        <label
                          style={{ fontSize: "16px" }}
                          className="block font-bold text-black select-none"
                        >
                          Objet
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={expenseTitle}
                          onChange={(e) => setExpenseTitle(e.target.value)}
                          placeholder="Entrez une raison."
                          style={{
                            fontSize: "16px",
                            padding: "14px",
                            borderRadius: "13px",
                            border: "1px solid #dedede",
                            outline: "none",
                          }}
                          className="w-full bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Amounts Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label
                            style={{ fontSize: "16px" }}
                            className="block font-bold text-black select-none"
                          >
                            Total TTC. (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={expenseTtc}
                            onChange={(e) => handleTtcChange(e.target.value)}
                            placeholder="0.00"
                            style={{
                              fontSize: "16px",
                              padding: "14px",
                              borderRadius: "13px",
                              border: "1px solid #dedede",
                              outline: "none",
                            }}
                            className="w-full bg-white text-black font-bold focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            style={{ fontSize: "16px" }}
                            className="block font-bold text-black select-none"
                          >
                            Total HT. (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseHt}
                            onChange={(e) => handleHtChange(e.target.value)}
                            placeholder="0.00"
                            style={{
                              fontSize: "16px",
                              padding: "14px",
                              borderRadius: "13px",
                              border: "1px solid #dedede",
                              outline: "none",
                            }}
                            className="w-full bg-white text-black focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label
                            style={{ fontSize: "16px" }}
                            className="block font-bold text-black select-none"
                          >
                            Total TVA. (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseTva}
                            onChange={(e) => setExpenseTva(e.target.value)}
                            placeholder="0.00"
                            style={{
                              fontSize: "16px",
                              padding: "14px",
                              borderRadius: "13px",
                              border: "1px solid #dedede",
                              outline: "none",
                            }}
                            className="w-full bg-white text-black focus:border-indigo-500"
                          />
                        </div>

                        {/* Date */}
                        <div className="space-y-1.5">
                          <label
                            style={{ fontSize: "16px" }}
                            className="block font-bold text-black select-none"
                          >
                            Date du paiement.
                          </label>
                          <input
                            type="text"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            placeholder={new Date().toISOString().split("T")[0]}
                            style={{
                              fontSize: "16px",
                              padding: "14px",
                              borderRadius: "13px",
                              border: "1px solid #dedede",
                              outline: "none",
                            }}
                            className="w-full bg-white focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Photo select */}
                      <div className="space-y-1.5">
                        <label
                          style={{ fontSize: "16px" }}
                          className="block font-bold text-black select-none"
                        >
                          Photographie ou fichier.
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              expensePhotoInputRef.current?.click()
                            }
                            style={{
                              backgroundColor: "#000000",
                              color: "#fff",
                              fontSize: "18px",
                              fontWeight: "bold",
                              borderRadius: "12px",
                              padding: "9px 18px",
                              border: "none",
                              boxShadow:
                                "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                              cursor: "pointer",
                            }}
                            className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                          >
                            <span>Sélectionner</span>
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            ref={expensePhotoInputRef}
                            onChange={(e) =>
                              triggerPhotoRead(e, setExpensePhotoUrl)
                            }
                            className="hidden"
                          />
                          {expensePhotoUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(
                                      `<iframe src="${expensePhotoUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
                                    );
                                  }
                                }}
                                style={{
                                  backgroundColor: "#000000",
                                  color: "#fff",
                                  fontSize: "18px",
                                  fontWeight: "bold",
                                  borderRadius: "12px",
                                  padding: "9px 18px",
                                  border: "none",
                                  boxShadow:
                                    "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                                  cursor: "pointer",
                                }}
                                className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                              >
                                Aperçu
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpensePhotoUrl("")}
                                style={{
                                  backgroundColor: "#dc2626",
                                  color: "#fff",
                                  fontSize: "18px",
                                  fontWeight: "bold",
                                  borderRadius: "12px",
                                  padding: "9px 18px",
                                  border: "none",
                                  boxShadow:
                                    "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                                  cursor: "pointer",
                                }}
                                className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        backgroundColor: "#3556ec",
                        color: "#fff",
                        fontSize: "18px",
                        fontWeight: "bold",
                        borderRadius: "12px",
                        padding: "14px 20px",
                        border: "none",
                        boxShadow:
                          "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                        cursor: "pointer",
                        width: "100%",
                      }}
                      className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                    >
                      <span>Enregistrer</span>
                    </button>
                  </form>
                </div>
              )}

              {/* ----------------- TAB 5: LOCALISATION ----------------- */}
              {activeTab === "localisation" && (
                <div
                  className="space-y-6 pb-16 animate-fadeIn"
                  id="tab-localisation-screen"
                >
                  <form
                    onSubmit={handleSaveLocalisation}
                    className="space-y-5"
                    style={{
                      border: "none",
                      padding: "0",
                      background: "transparent",
                      boxShadow: "none",
                    }}
                    id="auth-main-card"
                  >
                    <div className="space-y-4">
                      {/* Live map link */}
                      <div className="space-y-1.5">
                        <label
                          style={{ fontSize: "16px" }}
                          className="block font-bold text-black select-none"
                        >
                          Lien de partage de localisation Google Maps. *
                        </label>
                        <input
                          type="text"
                          required
                          value={gpsSharingLink}
                          onChange={(e) => setGpsSharingLink(e.target.value)}
                          placeholder="Collez le lien Google Maps"
                          style={{
                            fontSize: "16px",
                            padding: "14px",
                            borderRadius: "13px",
                            border: "1px solid #dedede",
                            outline: "none",
                          }}
                          className="w-full bg-white focus:border-indigo-500 font-sans"
                        />
                      </div>

                      {/* Starting address */}
                      <div className="space-y-1.5">
                        <label
                          style={{ fontSize: "16px" }}
                          className="block font-bold text-black select-none"
                        >
                          Adresse de départ ou de retour. *
                        </label>
                        <input
                          type="text"
                          required
                          value={techStartAddress}
                          onChange={(e) => setTechStartAddress(e.target.value)}
                          placeholder="Ex: 1 Rue Exemple, 12345, France"
                          style={{
                            fontSize: "16px",
                            padding: "14px",
                            borderRadius: "13px",
                            border: "1px solid #dedede",
                            outline: "none",
                          }}
                          className="w-full bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Route Optimization selector */}
                      <div className="space-y-1.5">
                        <label
                          style={{ fontSize: "16px" }}
                          className="block font-bold text-black select-none"
                        >
                          Stratégie des déplacements. *
                        </label>
                        <select
                          value={routeOptimization}
                          onChange={(e) => setRouteOptimization(e.target.value)}
                          style={{
                            fontSize: "16px",
                            padding: "14px",
                            borderRadius: "13px",
                            border: "1px solid #dedede",
                            outline: "none",
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                          className="w-full bg-white font-semibold cursor-pointer focus:border-indigo-500"
                        >
                          <option value="Aller au plus proche d'abord">
                            Se rendre d'abord au plus proche.
                          </option>
                          <option value="Aller au plus loin d'abord">
                            Se rendre d'abord au plus éloigné.
                          </option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        backgroundColor: "#3556ec",
                        color: "#fff",
                        fontSize: "18px",
                        fontWeight: "bold",
                        borderRadius: "12px",
                        padding: "14px 20px",
                        border: "none",
                        boxShadow:
                          "inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f",
                        cursor: "pointer",
                        width: "100%",
                      }}
                      className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Enregistrer</span>
                    </button>

                    {/* Google Calendar integration section */}
                    <div className="pt-5 space-y-4">
                      <h3 className="text-lg font-bold text-slate-800">
                        Intégration Google Calendar
                      </h3>

                      {syncStatusMsg && (
                        <p
                          style={{
                            fontSize: "18px",
                            color: "rgb(254, 78, 187)",
                            textAlign: "center"
                          }}
                        >
                          {syncStatusMsg.text}
                        </p>
                      )}

                      {showDomainHelp && (
                        <div
                          className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-[12px] space-y-2"
                          id="domain-authorization-guide"
                        >
                          <p className="font-bold text-sm">
                            💡 Action requise sur votre projet Firebase :
                          </p>
                          <p className="text-xs leading-relaxed">
                            Pour des raisons de sécurité, Google demande à ce
                            que le nom de domaine de la webapp soit rajouté aux
                            domaines autorisés de votre projet Firebase.
                          </p>
                          <ol className="text-xs list-decimal pl-4 space-y-1.5 font-medium">
                            <li>
                              Ouvrez la console Firebase :{" "}
                              <a
                                href="https://console.firebase.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 underline font-semibold hover:text-indigo-800"
                              >
                                console.firebase.google.com
                              </a>
                            </li>
                            <li>
                              Allez dans <strong>Authentication</strong> &gt;
                              onglet <strong>Paramètres</strong> &gt; section{" "}
                              <strong>Domaines autorisés</strong>
                            </li>
                            <li>
                              Cliquez sur le bouton{" "}
                              <strong>Ajouter un domaine</strong>
                            </li>
                            <li>
                              Saisissez l'adresse suivante :{" "}
                              <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900 font-bold select-all">
                                {window.location.hostname}
                              </code>
                            </li>
                          </ol>
                          <p className="text-xs text-amber-700 pt-1 font-semibold">
                            Une fois l'adresse ajoutée, recliquez sur
                            "Synchroniser Google Calendar" !
                          </p>
                        </div>
                      )}

                      {showOperationHelp && (
                        <div
                          className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-[12px] space-y-2"
                          id="sign-in-method-guide"
                        >
                          <p className="font-bold text-sm">
                            💡 Activer l'authentification Google sur votre
                            console Firebase :
                          </p>
                          <p className="text-xs leading-relaxed">
                            L'authentification Google n'est pas encore activée
                            en tant que fournisseur d'identité sur votre base de
                            données Firebase.
                          </p>
                          <ol className="text-xs list-decimal pl-4 space-y-1.5 font-medium">
                            <li>
                              Ouvrez la console Firebase :{" "}
                              <a
                                href="https://console.firebase.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 underline font-semibold hover:text-indigo-800"
                              >
                                console.firebase.google.com
                              </a>
                            </li>
                            <li>
                              Allez dans la section{" "}
                              <strong>Authentication</strong> dans la barre
                              latérale gauche.
                            </li>
                            <li>
                              Allez dans l'onglet{" "}
                              <strong>Sign-in method</strong> (ou Mode de
                              connexion).
                            </li>
                            <li>
                              Cliquez sur le bouton{" "}
                              <strong>
                                Ajouter un fournisseur de connexion
                              </strong>{" "}
                              (Add provider).
                            </li>
                            <li>
                              Sélectionnez <strong>Google</strong> dans la
                              liste.
                            </li>
                            <li>
                              Basculez l'interrupteur sur{" "}
                              <strong>Activer</strong> (Enable), renseignez
                              l'e-mail d'assistance utilisateur du projet, puis
                              cliquez sur <strong>Enregistrer</strong>.
                            </li>
                          </ol>
                          <p className="text-xs text-amber-700 pt-1 font-semibold">
                            Une fois la méthode Google activée, vous pourrez
                            synchroniser votre Google Calendar en un clic !
                          </p>
                        </div>
                      )}

                      {!syncedGoogleEmail ? (
                        <button
                          type="button"
                          onClick={handleGoogleCalendarSync}
                          disabled={isSyncingGoogleCal}
                          style={{
                            backgroundColor: "#000000",
                            color: "#ffffff",
                            fontSize: "18px",
                            fontWeight: "bold",
                            borderRadius: "12px",
                            padding: "14px 20px",
                            border: "none",
                            cursor: "pointer",
                            width: "100%",
                          }}
                          className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          {isSyncingGoogleCal ? (
                            <span>Synchronisation en cours...</span>
                          ) : (
                            <span>Synchroniser</span>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p
                            style={{
                              fontSize: "18px",
                              color: "rgb(254, 78, 187)",
                              textAlign: "center"
                            }}
                          >
                            Compte synchronisé ({syncedGoogleEmail})
                          </p>

                          <button
                            type="button"
                            onClick={handleGoogleCalendarSync}
                            disabled={isSyncingGoogleCal}
                            style={{
                              backgroundColor: "#000000",
                              color: "#ffffff",
                              fontSize: "18px",
                              fontWeight: "bold",
                              borderRadius: "12px",
                              padding: "14px 20px",
                              border: "none",
                              cursor: "pointer",
                              width: "100%",
                            }}
                            className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                            {isSyncingGoogleCal ? (
                              <span>Synchronisation en cours...</span>
                            ) : (
                              <span>Forcer la synchronisation</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleDeactivateGoogleCalendar}
                            style={{
                              backgroundColor: "#dc2626",
                              color: "#ffffff",
                              fontSize: "18px",
                              fontWeight: "bold",
                              borderRadius: "12px",
                              padding: "14px 20px",
                              border: "none",
                              cursor: "pointer",
                              width: "100%",
                            }}
                            className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                            <span>Désactiver Google Calendar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ----------------- IF TECHNICIAN IS NOT LOGGED IN STATE (PUBLIC VIEWPORTS) ----------------- */
          <div
            className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar"
            id="public-unauthenticated-layout"
          >
            {/* Main Content screens wrapper */}
            <main className="flex-1 px-4 py-8 flex flex-col justify-center relative">
              {/* LANDING SCREEN */}
              {currentScreen === "landing" && (
                <div
                  className="space-y-8 text-center animate-fadeIn"
                  id="landing-screen"
                >
                  <div className="space-y-4 pt-10">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase pt-6">
                      {companyInfo.name || "Défibeo Solutions"}
                    </h1>
                    <div className="space-y-1">
                      <h2 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">
                        Rallier le portail
                      </h2>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed max-w-xs mx-auto">
                    Signalez un incident sur un défibrillateur DAE de proximité
                    ou retournez à la page de connexion de l'administration.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    {/* BUTTON 1: SIGNALEMENT */}
                    <div
                      className={`w-full bg-slate-50 border p-5 rounded-2xl text-left transition-all duration-200 relative ${
                        isInlineReportOpen
                          ? "border-indigo-500 bg-white ring-1 ring-indigo-500/10 shadow-xs"
                          : "border-slate-200 hover:bg-slate-100/80 hover:border-indigo-500/35 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!isInlineReportOpen) {
                          setIsInlineReportOpen(true);
                          setInlineReportSuccess(false);
                        }
                      }}
                      id="card-portal-report"
                    >
                      <div className="space-y-0.5 select-none">
                        <div className="text-[12px] font-black text-slate-800 uppercase tracking-tight flex justify-between items-center">
                          <span>Signalement Incident</span>
                          {isInlineReportOpen && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsInlineReportOpen(false);
                                setInlineReportSuccess(false);
                              }}
                              className="text-[9px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent uppercase tracking-wider font-sans"
                            >
                              Réduire
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal font-sans">
                          Boîtier DAE vandalisé, utilisé ou voyant rouge
                          suspect.
                        </p>
                      </div>

                      {isInlineReportOpen && (
                        <div
                          className="mt-4 pt-4 border-t border-slate-100 space-y-3.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inlineReportSuccess ? (
                            <div className="py-2 text-center space-y-2">
                              <p className="text-emerald-600 font-extrabold text-xs animate-fadeIn uppercase tracking-wider">
                                Message envoyé avec succès
                              </p>
                              <p className="text-[10px] text-slate-555 leading-relaxed">
                                Merci pour votre signalement citoyen !
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsInlineReportOpen(false);
                                  setInlineReportSuccess(false);
                                }}
                                className="mt-1 px-3 py-1 bg-slate-100 hover:bg-slate-205 text-slate-700 font-extrabold text-[9px] rounded-lg cursor-pointer border border-slate-200 transition-colors uppercase tracking-wider"
                              >
                                Fermer
                              </button>
                            </div>
                          ) : (
                            <form
                              onSubmit={handleInlineTicketSubmit}
                              className="space-y-3 font-sans text-slate-700 text-[10px]"
                            >
                              <div className="space-y-3">
                                {/* ID DAE */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">
                                    Identifiant du DAE incidenté *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={ticketForm.identifiant}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        identifiant: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 font-bold uppercase focus:bg-white focus:outline-hidden"
                                    placeholder="Ex: PAR-102"
                                  />
                                </div>

                                {/* Objet */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">
                                    Objet du Ticket *
                                  </label>
                                  <select
                                    value={ticketForm.objet}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        objet: e.target.value as any,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-205 rounded-lg text-[11px] text-slate-800 cursor-pointer focus:bg-white focus:outline-hidden"
                                  >
                                    <option value="Défibrillateur utilisé">
                                      Défibrillateur utilisé
                                    </option>
                                    <option value="Défibrillateur endommagé">
                                      Défibrillateur endommagé
                                    </option>
                                    <option value="Défibrillateur hors service">
                                      Défibrillateur hors service
                                    </option>
                                    <option value="Autre">Autre</option>
                                  </select>
                                </div>

                                {/* Email */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">
                                    Votre Email pour suivi *
                                  </label>
                                  <input
                                    type="email"
                                    required
                                    value={ticketForm.email}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        email: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 focus:bg-white focus:outline-hidden"
                                    placeholder="dupont@gmail.com"
                                  />
                                </div>

                                {/* Message */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">
                                    Message & Constat visuel *
                                  </label>
                                  <textarea
                                    required
                                    rows={3}
                                    value={ticketForm.message}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        message: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-202 rounded-lg text-[11px] text-slate-900 leading-normal focus:bg-white focus:outline-hidden"
                                    placeholder="Ex: Le voyant clignote rouge ou le coffret ..."
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsInlineReportOpen(false);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 shadow-xs border border-indigo-500"
                                >
                                  Envoyer le Signalement
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={
                        companyInfo.website
                          ? companyInfo.website.startsWith("http")
                            ? companyInfo.website
                            : `https://${companyInfo.website}`
                          : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200 shadow-xs"
                      id="btn-return-to-site"
                      onClick={(e) => {
                        if (!companyInfo.website) {
                          e.preventDefault();
                          onClose();
                        }
                      }}
                    >
                      Retour au site
                    </a>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-[10px] text-slate-400">
                      Une solution du logiciel{" "}
                      <a
                        href="https://defibeo.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        Défibeo
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* SUCCESS FORM */}
              {currentScreen === "success-ticket" && (
                <div className="bg-white border border-slate-200 p-6 rounded-2.5xl text-center space-y-4 animate-scaleUp shadow-lg">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-250 rounded-full mx-auto flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-black text-slate-900 uppercase">
                      Alerte Transmise !
                    </h2>
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-indigo-700 font-bold border border-slate-205">
                      ID TICKET : {createdTicketId}
                    </span>
                    <p className="text-[10px] text-slate-600 leading-normal pt-2">
                      Nos techniciens d'assistance ont reçu votre rapport
                      d'incident sur le terminal {ticketForm.identifiant}. Merci
                      pour votre vigilance citoyenne !
                    </p>
                  </div>

                  <button
                    onClick={() => setCurrentScreen("landing")}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 font-bold text-[10px] rounded-lg cursor-pointer text-slate-800 border border-slate-250 transition-colors"
                  >
                    Retourner à l'Accueil
                  </button>
                </div>
              )}

              {/* PIN MAINTENANCE CODE SCREEN */}
              {currentScreen === "mainteneur" && (
                <div
                  className="bg-white border border-slate-200 p-5 rounded-2.5xl space-y-4 max-w-sm mx-auto animate-scaleUp shadow-xl"
                  id="mainteneur-screen"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentScreen("landing")}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Accès Déverrouillage
                      </h2>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Saisissez votre code PIN individuel à 4 chiffres
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Visual PIN Inputs */}
                    <div className="flex justify-center gap-2">
                      {pinDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={pinRefs[index]}
                          type="password"
                          maxLength={1}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) =>
                            handlePinDigitChange(index, e.target.value)
                          }
                          onKeyDown={(e) => handlePinBackspace(index, e)}
                          className="w-10 h-12 text-center text-xl font-mono font-bold text-indigo-600 bg-slate-50 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                        />
                      ))}
                    </div>

                    {pinError && (
                      <div className="p-2 bg-rose-50 text-rose-800 border border-rose-150 rounded-lg text-center text-[9px] font-bold">
                        {pinError}
                      </div>
                    )}

                    {/* Fast Keypad dial */}
                    <div
                      className="grid grid-cols-3 gap-2 max-w-[210px] mx-auto pt-1"
                      id="fast-keypad"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePinDialClick(num)}
                          className="h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[13px] font-bold cursor-pointer transition-colors flex items-center justify-center text-slate-800 active:bg-slate-300"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handlePinClear}
                        className="h-10 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg text-[8px] font-bold text-rose-700 uppercase tracking-widest cursor-pointer flex items-center justify-center active:bg-rose-200"
                      >
                        Effacer
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinDialClick(0)}
                        className="h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[13px] font-bold cursor-pointer flex items-center justify-center text-slate-800 active:bg-slate-300"
                      >
                        0
                      </button>
                      <div className="text-slate-400 text-[8px] flex items-center justify-center font-mono uppercase font-black tracking-wide select-none">
                        SÉCURISÉ
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Public footer omitted */}
          </div>
        )}

        {printingReport && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-9999 overflow-y-auto p-4 flex flex-col items-center animate-fadeIn print:bg-white print:p-0 print:absolute print:inset-0"
            id="print-overlay"
          >
            {/* Dynamic styles injected just for standard print layouts */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media print {
                header, footer, nav, button, .no-print {
                  display: none !important;
                }
                body, html, #root {
                  background-color: white !important;
                  color: black !important;
                }
                #print-page-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
            `,
              }}
            />

            {/* Top control bar */}
            <div className="w-full max-w-4xl bg-slate-800 text-white rounded-t-xl p-3 flex justify-between items-center shadow-lg border-b border-slate-700 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">
                  Aperçu avant Impression du Rapport (Prêt pour Impression /
                  PDF)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors uppercase tracking-wider shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer ce Rapport</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingReport(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Centered structured printable A4 Content */}
            <div
              id="print-page-sheet"
              className="w-full max-w-4xl bg-white text-slate-850 p-8 md:p-12 shadow-2xl rounded-b-xl space-y-6 font-sans text-xs border-x border-b border-slate-200 min-h-[1100px]"
            >
              {/* Document Header block */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-5 h-5 text-rose-600 fill-rose-50" />
                    <span className="text-sm font-black uppercase tracking-tight text-slate-950">
                      {companyInfo.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wide">
                    {companyInfo.website} | Tél : {companyInfo.phone}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {companyInfo.email}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                    DOCUMENT OFFICIEL
                  </span>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {printingReport.title}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-500">
                    RÉFÉRENCE :{" "}
                    <span className="font-bold text-slate-800">
                      {printingReport.id}
                    </span>
                  </p>
                </div>
              </div>

              {/* Intervention metadata banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-[10.5px]">
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">
                    📅 HORODATE INTERVENTION
                  </span>
                  <p className="font-bold text-slate-850 mt-0.5">
                    {printingReport.date}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">
                    👤 REPRÉSENTANT TECHNIQUE
                  </span>
                  <p className="font-bold text-slate-850 mt-0.5">
                    {printingReport.techName}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">
                    📍 TYPE DE SITE / TOURNÉE
                  </span>
                  <p className="font-bold text-slate-850 mt-0.5">
                    {printingReport.siteMission}
                  </p>
                </div>
              </div>

              {(() => {
                const snapshot =
                  printingReport.defibSnapshot ||
                  defibrillateurs.find(
                    (d) =>
                      d.id === printingReport.defibId ||
                      d.identifiant === printingReport.defibIdentifiant,
                  ) ||
                  defibrillateurs[0];
                if (!snapshot)
                  return (
                    <p className="text-slate-400 text-center font-mono py-12">
                      Détails d'équipements non-disponibles pour ce matériel.
                    </p>
                  );

                const clientObj = clients.find(
                  (c) => c.id === snapshot.clientId,
                );
                const defMod = variables.find(
                  (v) => v.id === snapshot.modeleId,
                );
                const cofMod = variables.find(
                  (v) => v.id === snapshot.modeleCoffretId,
                );
                const elAMod = variables.find(
                  (v) => v.id === snapshot.modeleElectrodeAId,
                );
                const elPMod = variables.find(
                  (v) => v.id === snapshot.modeleElectrodePId,
                );
                const batMod = variables.find(
                  (v) => v.id === snapshot.modeleBatterieId,
                );

                return (
                  <div className="space-y-6">
                    {/* 1. SECTION MATÉRIEL */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1 flex items-center justify-between">
                        <span>1. SECTION SYSTÈME DÉFIBRILLATEUR</span>
                        <span className="text-[9px] font-mono font-bold text-slate-500">
                          ID CENTRAL : {snapshot.identifiant}
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Identifiant court
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.identifiant}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Numéro de Série
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.numeroSerie}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Désignation / Marque
                          </span>
                          <span className="font-bold text-slate-850">
                            {defMod ? defMod.nom : snapshot.modeleId}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Constructeur
                          </span>
                          <span className="font-bold text-slate-850">
                            {defMod ? defMod.marque : "-"}
                          </span>
                        </div>
                      </div>
                      {snapshot.commentaire && (
                        <div className="bg-slate-50 p-2.5 rounded-lg text-slate-700 italic leading-relaxed">
                          Note technique relative à l'unité :{" "}
                          {snapshot.commentaire}
                        </div>
                      )}
                    </div>

                    {/* 2. SECTION CLIENT */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        2. EXPLOITANT & SITE DESIGNATION
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Client exploitant
                          </span>
                          <span className="font-bold text-slate-850">
                            {clientObj
                              ? clientObj.denomination
                              : "Non rattaché"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Responsable Local
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.nomPrenomSite || "-"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Téléphone direct
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.telephoneSite || "-"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Courriel de Liaison
                          </span>
                          <span className="font-bold text-slate-850 break-all">
                            {snapshot.emailSite || "-"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Régime contractuel
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.contrat === "Oui"
                              ? "✓ SOUS CONTRAT"
                              : "HORS CONTRAT"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Abonnement
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.nomContrat || "-"}
                          </span>
                        </div>
                        <div className="bg-slate-55 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Référence Administrative
                          </span>
                          <span className="font-bold text-slate-850 font-mono">
                            {snapshot.referenceContrat || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. COFFRET */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        3. COFFRET MURAL ET ALARMES
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Modèle Coffret mural
                          </span>
                          <span className="font-bold text-slate-850">
                            {cofMod ? cofMod.nom : snapshot.modeleCoffretId}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Numéro de Lot mural
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.numeroLotCoffret || "-"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Remarques audit coffret
                          </span>
                          <span className="font-bold text-slate-850">
                            {snapshot.commentaireCoffret ||
                              "Examen visuel approuvé"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4. ACCÈS */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        4. CONDITIONS D'ACCÈS DU PUBLIC & GPS
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-3 rounded-lg lg:col-span-2">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Adresse physique rattachée
                          </span>
                          <span className="font-bold text-slate-950 font-sans">
                            {snapshot.numVoie}, {snapshot.cp} {snapshot.ville}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">
                            Coordonnées cartographiques (Lat/Lng)
                          </span>
                          <span className="font-bold text-indigo-800 font-mono">
                            {snapshot.latitude}, {snapshot.longitude}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center text-[9px] font-mono">
                        <div
                          className={`p-1.5 rounded-lg border font-bold ${snapshot.acces247 ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                        >
                          OUVERT 24H/7J : {snapshot.acces247 ? "OUI" : "NON"}
                        </div>
                        <div
                          className={`p-1.5 rounded-lg border font-bold ${snapshot.accesSemaine ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                        >
                          ACCÈS SEMAINE :{" "}
                          {snapshot.accesSemaine ? "OUI" : "NON"}
                        </div>
                        <div
                          className={`p-1.5 rounded-lg border font-bold ${snapshot.accesWeekend ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                        >
                          ACCÈS WEEKEND :{" "}
                          {snapshot.accesWeekend ? "OUI" : "NON"}
                        </div>
                        <div
                          className={`p-1.5 rounded-lg border font-bold ${snapshot.exterieur ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                        >
                          BORNE EXTÉRIEURE :{" "}
                          {snapshot.exterieur ? "OUI" : "NON"}
                        </div>
                      </div>

                      {snapshot.horaires &&
                        (() => {
                          try {
                            const parsedSchs = JSON.parse(snapshot.horaires);
                            if (
                              Array.isArray(parsedSchs) &&
                              parsedSchs.length > 0 &&
                              parsedSchs.some(
                                (s: any) => s.days && s.days.length > 0,
                              )
                            ) {
                              return (
                                <div className="bg-slate-50 p-3 rounded-lg mt-2 text-xs border border-slate-150">
                                  <span className="text-[8px] text-slate-500 font-mono uppercase block mb-1">
                                    📅 Horaires d'ouverture
                                  </span>
                                  <div className="space-y-1 font-sans text-slate-700">
                                    {parsedSchs.map((sch: any, idx: number) => {
                                      if (!sch.days || sch.days.length === 0)
                                        return null;
                                      const dayShorts = sch.days
                                        .map((d: string) => d.substring(0, 3))
                                        .join(", ");
                                      return (
                                        <div
                                          key={idx}
                                          className="flex flex-col sm:flex-row sm:justify-between border-b border-dashed border-slate-200 last:border-b-0 pb-1 last:pb-0"
                                        >
                                          <span className="font-semibold text-slate-800">
                                            {dayShorts} :
                                          </span>
                                          <span>
                                            {sch.fermetureMidi ? (
                                              <span className="font-mono text-indigo-700">
                                                {sch.openMorning} -{" "}
                                                {sch.closeMorning} /{" "}
                                                {sch.openAfternoon} -{" "}
                                                {sch.closeAfternoon}
                                              </span>
                                            ) : (
                                              <span className="font-mono text-emerald-700">
                                                {sch.openContinuous} -{" "}
                                                {sch.closeContinuous}
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                    </div>

                    {/* 5, 6, 7 & 8: CONSUMABLES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cartouches electrodes */}
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                        <h4 className="text-[9px] font-extrabold text-slate-800 uppercase font-mono border-b border-slate-200 pb-1 block">
                          🔍 ÉLECTRODES & ÉPUISEMENT PADS
                        </h4>

                        <div className="space-y-2">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">
                              JEU D'ÉLECTRODES ADULTE
                            </span>
                            <p className="font-bold text-slate-850 mt-0.5">
                              {elAMod
                                ? elAMod.nom
                                : snapshot.modeleElectrodeAId}
                            </p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>
                                LOT :{" "}
                                <span className="font-bold text-slate-700">
                                  {snapshot.lotElectrodeA || "-"}
                                </span>
                              </div>
                              <div>
                                PÉREMPTION :{" "}
                                <span
                                  className={`font-bold ${snapshot.situationElectrodeA === "Rouge" ? "text-rose-600" : "text-emerald-700"}`}
                                >
                                  {snapshot.peremptionElectrodeA || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">
                              JEU PÉDIATRIQUE (ENFANTS)
                            </span>
                            <p className="font-bold text-slate-850 mt-0.5">
                              {elPMod
                                ? elPMod.nom
                                : snapshot.modeleElectrodePId ||
                                  "Non spécifié / Absent"}
                            </p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>
                                LOT :{" "}
                                <span className="font-bold text-slate-700">
                                  {snapshot.lotElectrodeP || "-"}
                                </span>
                              </div>
                              <div>
                                PÉREMPTION :{" "}
                                <span
                                  className={`font-bold ${snapshot.situationElectrodeP === "Rouge" ? "text-rose-600" : "text-emerald-700"}`}
                                >
                                  {snapshot.peremptionElectrodeP || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Batteries */}
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                        <h4 className="text-[9px] font-extrabold text-slate-800 uppercase font-mono border-b border-slate-200 pb-1 block">
                          🔌 CELLULE ALIMENTATION / PILES
                        </h4>

                        <div className="space-y-2">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">
                              BLOC BATTERIE PRINCIPAL
                            </span>
                            <p className="font-bold text-slate-850">
                              {batMod ? batMod.nom : snapshot.modeleBatterieId}
                            </p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>
                                LOT BLOC :{" "}
                                <span className="font-bold text-slate-700">
                                  {snapshot.lotBatterie || "-"}
                                </span>
                              </div>
                              <div>
                                ÉCHÉANCE :{" "}
                                <span
                                  className={`font-bold ${snapshot.situationBatterie === "Rouge" ? "text-rose-600" : "text-emerald-700"}`}
                                >
                                  {snapshot.peremptionBatterie || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-[10px]">
                            <div>
                              <span className="text-[7.5px] text-slate-500 font-mono block uppercase font-bold">
                                Capacité nominale auditée
                              </span>
                              <span className="text-xs font-black text-slate-850 font-mono">
                                {snapshot.pourcentageBatterie}%
                              </span>
                            </div>
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-250">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  parseInt(snapshot.pourcentageBatterie) < 25
                                    ? "bg-rose-500"
                                    : parseInt(snapshot.pourcentageBatterie) <
                                        60
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${snapshot.pourcentageBatterie}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overall audit conclusion and conformite */}
                    <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50 shadow-xs">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black text-indigo-750 uppercase tracking-widest block font-mono">
                          DÉCISION DE CONFORMITÉ FINALE
                        </span>
                        <p className="text-[10px] text-slate-600">
                          L'appareil de secours a été audité sur l'ensemble de
                          ses 9 étapes de conformité.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                        <span
                          className={`px-4 py-2 rounded-lg border flex items-center gap-2 uppercase tracking-wide font-black ${
                            snapshot.conforme === "Oui"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                              : "bg-rose-55 text-rose-700 border-rose-250"
                          }`}
                        >
                          {snapshot.conforme === "Oui" ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>OPÉRATIONNEL (CONFORME)</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                              <span>HORS SERVICE (NON CONFORME)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Technical Signature section */}
                    <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-[11px] font-mono text-slate-600">
                      <div className="space-y-1">
                        <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">
                          🗓️ GARANTIES DU REPRÉSENTANT
                        </span>
                        <p>
                          Fabrication d'origine :{" "}
                          <span className="font-bold text-slate-700">
                            {snapshot.fabrication || "-"}
                          </span>
                        </p>
                        <p>
                          Échéance Garantie :{" "}
                          <span className="font-bold text-slate-700">
                            {snapshot.finGarantie || "-"}
                          </span>
                        </p>
                        <p>
                          Visite de Contrôle Actuelle :{" "}
                          <span className="font-bold text-indigo-700">
                            {snapshot.derniereMaintenance || "-"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">
                          ✍️ SIGNATURE REPRÉSENTANT & CACHET
                        </span>
                        <div className="pt-2 h-14 flex items-center justify-end">
                          {printingReport.photoUrl ? (
                            <div className="border border-slate-200 rounded overflow-hidden h-full max-w-[120px] bg-white p-0.5 shadow-xs">
                              <img
                                src={printingReport.photoUrl}
                                className="h-full w-auto object-contain mx-auto"
                                alt="Preuve d'intervention"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="h-full w-32 border border-slate-200 bg-white rounded flex items-center justify-center font-mono text-[8px] uppercase tracking-wider text-slate-400 border-dashed">
                              Visuel Non Fourni
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-slate-800 text-[10px] mt-2 font-mono uppercase">
                          {printingReport.techName}
                        </p>
                        <p className="text-[8px] text-slate-500 font-bold font-sans">
                          Agent Technique Certifié
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Return footer */}
              <div className="border-t border-slate-200 pt-4 text-center text-[9px] text-slate-400 font-mono no-print">
                <p className="uppercase tracking-wider">
                  Ce constat de conformité de l'appareil de secours fait foi de
                  l'évaluation physique réalisée.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
