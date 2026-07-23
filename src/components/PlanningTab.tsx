import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Wrench, 
  Info, 
  Search, 
  Briefcase,
  Layers,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { CompanyInfo, Member, MemberSchedule, MemberAbsence } from '../types';
import { formatDateToFR } from '../utils';

interface PlanningTabProps {
  companyInfo?: CompanyInfo;
  fsmTours?: any[];
  authenticatedUser?: any;
  defibrillateurs?: any[];
  otherEquipments?: any[];
  clients?: any[];
  variables?: any[];
  t: (key: string) => string;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_SHORT_FR = [
  'Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'
];

const DAY_NAMES_FR = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

export const PlanningTab: React.FC<PlanningTabProps> = ({
  companyInfo,
  fsmTours = [],
  authenticatedUser,
  defibrillateurs = [],
  otherEquipments = [],
  clients = [],
  variables = [],
  t
}) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedTech, setSelectedTech] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Tous');

  // List of members / technicians
  const membersList = useMemo(() => {
    return companyInfo?.members || [];
  }, [companyInfo]);

  // Set default technician if authenticatedUser matches a member
  useEffect(() => {
    if (authenticatedUser?.name && selectedTech === 'Tous') {
      const match = membersList.find(
        m => m.name.toLowerCase() === authenticatedUser.name.toLowerCase() ||
             m.email?.toLowerCase() === authenticatedUser.email?.toLowerCase()
      );
      if (match) {
        setSelectedTech(match.name);
      }
    }
  }, [authenticatedUser, membersList]);

  // Get active selected member object
  const activeMember = useMemo(() => {
    if (selectedTech === 'Tous') return null;
    return membersList.find(m => m.name === selectedTech) || null;
  }, [selectedTech, membersList]);

  // Generate days for the selected month and year
  const daysInMonthList = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysArr = [];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dateObj = new Date(selectedYear, selectedMonth, dayNum);
      const yearStr = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const isoDate = `${yearStr}-${monthStr}-${dayStr}`;
      const dayName = DAY_NAMES_FR[dateObj.getDay()];
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isToday = 
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();

      daysArr.push({
        dayNum,
        dateObj,
        isoDate,
        dayName,
        isWeekend,
        isToday
      });
    }

    return daysArr;
  }, [selectedYear, selectedMonth]);

  // Retrieve all assigned missions for selected tech / all techs grouped by date
  const missionsByDate = useMemo(() => {
    const map: Record<string, { tour: any; mission: any }[]> = {};

    fsmTours.forEach(tour => {
      // Check tech filter
      if (selectedTech !== 'Tous') {
        const tourTech = (tour.techName || '').trim().toLowerCase();
        const selTech = selectedTech.trim().toLowerCase();
        if (tourTech !== selTech) return;
      }

      if (!tour.missions || !Array.isArray(tour.missions)) return;

      tour.missions.forEach((m: any) => {
        // Mission date logic: m.estimatedDate or tour.startDate
        const missionDate = m.estimatedDate || (tour.startDate !== 'A trier' ? tour.startDate : null);
        if (!missionDate) return;

        // Apply search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const clientName = (m.clientDenomination || m.client || '').toLowerCase();
          const reason = (m.reason || m.type || '').toLowerCase();
          const defibId = (m.defibIdentifiant || '').toLowerCase();
          const tourTitle = (tour.title || '').toLowerCase();
          if (!clientName.includes(q) && !reason.includes(q) && !defibId.includes(q) && !tourTitle.includes(q)) {
            return;
          }
        }

        // Apply status filter
        if (filterStatus !== 'Tous') {
          const mStatus = m.status || 'À faire';
          if (filterStatus === 'AFaire' && mStatus === 'Terminée') return;
          if (filterStatus === 'Terminee' && mStatus !== 'Terminée') return;
        }

        if (!map[missionDate]) {
          map[missionDate] = [];
        }
        map[missionDate].push({ tour, mission: m });
      });
    });

    return map;
  }, [fsmTours, selectedTech, searchQuery, filterStatus]);

  // Navigate Year
  const handlePrevYear = () => setSelectedYear(prev => prev - 1);
  const handleNextYear = () => setSelectedYear(prev => prev + 1);

  // Jump to today
  const handleJumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setTimeout(() => {
      const todayEl = document.getElementById(`calendar-day-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans" id="planning-tab-wrapper">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {t("Planning Technicien")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("Vue calendrier vertical des plages de travail, indisponibilités et missions attribuées.")}
              </p>
            </div>
          </div>

          {/* Quick Actions & Technician Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleJumpToToday}
              className="px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4" />
              {t("Aujourd'hui")}
            </button>

            {/* Tech Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">{t("Technicien:")}</span>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer py-1"
              >
                <option value="Tous">{t("Tous les techniciens")}</option>
                {membersList.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} {m.role ? `(${m.role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Tech Info Banner if filtered */}
        {activeMember && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                {activeMember.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-slate-900">{activeMember.name}</span>
                {activeMember.role && <span className="text-slate-500 ml-2">({activeMember.role})</span>}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-slate-600">
              {activeMember.semaineTypique && activeMember.semaineTypique.length > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {t("Semaine typique configurée")} ({activeMember.semaineTypique.length} {t("plage(s)")})
                </span>
              )}
              {activeMember.absences && activeMember.absences.length > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {activeMember.absences.length} {t("période(s) d'indisponibilité")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-auto sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("Rechercher un client, une mission, un équipement, une tournée...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{t("Missions:")}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="Tous">{t("Toutes les missions")}</option>
              <option value="AFaire">{t("À faire")}</option>
              <option value="Terminee">{t("Terminées")}</option>
            </select>
          </div>
        </div>

        {/* MONTH CAPSULES (HORIZONTAL GÉLULES ONE-LINE) */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
              {t("Sélection du mois")}
            </span>
            
            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={handlePrevYear}
                className="p-1 hover:bg-white rounded-md transition-colors text-slate-600 cursor-pointer"
                title={t("Année précédente")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 px-2">{selectedYear}</span>
              <button
                onClick={handleNextYear}
                className="p-1 hover:bg-white rounded-md transition-colors text-slate-600 cursor-pointer"
                title={t("Année suivante")}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Single Line Scrollable Capsules / Gélules */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto py-1.5 px-0.5 scrollbar-none">
            {MONTH_NAMES_FR.map((monthName, idx) => {
              const isSelected = selectedMonth === idx;
              const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === idx;

              return (
                <button
                  key={monthName}
                  onClick={() => setSelectedMonth(idx)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span>{monthName}</span>
                  {isCurrentMonth && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MONTH HEADER SUMMARY */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-900 capitalize">
          {MONTH_NAMES_FR[selectedMonth]} {selectedYear}
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {daysInMonthList.length} {t("jours dans le mois")}
        </span>
      </div>

      {/* VERTICAL CALENDAR (1 CASE PAR JOUR) */}
      <div className="space-y-4">
        {daysInMonthList.map(({ dayNum, dateObj, isoDate, dayName, isWeekend, isToday }) => {
          // 1. Check Absences for this day (for selectedTech or membersList)
          const matchingAbsences: { memberName: string; abs: MemberAbsence }[] = [];
          
          const techsToCheck = selectedTech === 'Tous' 
            ? membersList 
            : (activeMember ? [activeMember] : []);

          techsToCheck.forEach(m => {
            if (m.absences && Array.isArray(m.absences)) {
              m.absences.forEach(abs => {
                if (abs.startDate && abs.endDate) {
                  if (isoDate >= abs.startDate && isoDate <= abs.endDate) {
                    matchingAbsences.push({ memberName: m.name, abs });
                  }
                }
              });
            }
          });

          // 2. Check Semaine Typique schedule for this day
          const scheduleSlotsByTech: { memberName: string; schedule: MemberSchedule }[] = [];
          
          techsToCheck.forEach(m => {
            if (m.semaineTypique && Array.isArray(m.semaineTypique)) {
              const sch = m.semaineTypique.find(s => s.days && s.days.includes(dayName));
              if (sch) {
                scheduleSlotsByTech.push({ memberName: m.name, schedule: sch });
              }
            }
          });

          // 3. Missions on this date
          const dayMissions = missionsByDate[isoDate] || [];

          return (
            <div
              key={isoDate}
              id={`calendar-day-${isoDate}`}
              className={`bg-white rounded-2xl border transition-all duration-150 overflow-hidden ${
                isToday 
                  ? 'border-2 border-indigo-500 shadow-md ring-4 ring-indigo-500/10' 
                  : isWeekend 
                  ? 'border-slate-200 bg-slate-50/50' 
                  : 'border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Day Card Header */}
              <div className={`p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                isToday 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : isWeekend 
                  ? 'bg-slate-100/70 border-slate-200 text-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-base ${
                    isToday
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-3xs'
                  }`}>
                    {dayNum}
                  </div>

                  <div>
                    <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                      <span>{dayName}</span>
                      <span>{dayNum} {MONTH_SHORT_FR[selectedMonth]} {selectedYear}</span>
                    </div>
                    {isWeekend && (
                      <span className={`text-[11px] font-medium ${isToday ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {t("Week-end")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Badges Header */}
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="px-3 py-1 bg-white text-indigo-600 font-extrabold text-xs rounded-full shadow-2xs">
                      {t("Aujourd'hui")}
                    </span>
                  )}

                  {dayMissions.length > 0 && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      isToday 
                        ? 'bg-indigo-700 text-white' 
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      <Briefcase className="w-3.5 h-3.5" />
                      {dayMissions.length} {dayMissions.length > 1 ? t("missions") : t("mission")}
                    </span>
                  )}
                </div>
              </div>

              {/* Day Card Body */}
              <div className="p-3.5 sm:p-5 space-y-4">

                {/* A. PÉRIODES D'INDISPONIBILITÉ */}
                {matchingAbsences.length > 0 && (
                  <div className="space-y-2">
                    {matchingAbsences.map(({ memberName, abs }, aIdx) => (
                      <div 
                        key={aIdx} 
                        className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-rose-100 text-rose-700 rounded-lg flex-shrink-0">
                            <XCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                                {t("Période d'indisponibilité")}
                              </span>
                              {selectedTech === 'Tous' && (
                                <span className="text-[11px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                                  {memberName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-rose-700 font-medium">
                              {abs.commentaire ? abs.commentaire : t("Indisponible / Injoignable")}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs font-bold text-rose-800 bg-white/80 border border-rose-200 px-3 py-1 rounded-lg self-start sm:self-center">
                          {formatDateToFR(abs.startDate)} - {formatDateToFR(abs.endDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* B. PLAGES SEMAINE TYPIQUE */}
                <div>
                  {scheduleSlotsByTech.length === 0 ? (
                    <div className="text-xs text-slate-400 italic flex items-center gap-1.5 py-1">
                      <Clock className="w-3.5 h-3.5 text-slate-300" />
                      <span>{t("Aucune plage horaire configurée pour ce jour (Jour non travaillé / Repos).")}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {t("Semaine Typique (Plages horaires)")}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scheduleSlotsByTech.map(({ memberName, schedule }, sIdx) => {
                          const isOpenForMissions = schedule.openForMissions !== false;

                          return (
                            <div 
                              key={sIdx}
                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-colors ${
                                isOpenForMissions
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-amber-50/50 border-amber-200/80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  {selectedTech === 'Tous' && (
                                    <span className="text-xs font-bold text-slate-800 block">
                                      {memberName}
                                    </span>
                                  )}

                                  {/* Working Hours Slots */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-slate-900">
                                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                    {schedule.fermetureMidi ? (
                                      <span>
                                        {schedule.openMorning || '09:00'} - {schedule.closeMorning || '12:00'}
                                        <span className="mx-1 text-slate-400">|</span>
                                        {schedule.openAfternoon || '14:00'} - {schedule.closeAfternoon || '18:00'}
                                      </span>
                                    ) : (
                                      <span>
                                        {schedule.openContinuous || '09:00'} - {schedule.closeContinuous || '17:00'} ({t("Continu")})
                                      </span>
                                    )}
                                  </div>

                                  {schedule.commentaire && (
                                    <p className="text-[11px] text-slate-600 italic">
                                      « {schedule.commentaire} »
                                    </p>
                                  )}
                                </div>

                                {/* Ouvert pour missions pill */}
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                  isOpenForMissions
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {isOpenForMissions ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      {t("Ouvert pour missions.")}
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      {t("Non ouvert pour missions.")}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* C. MISSIONS DE SES TOURNÉES ATTRIBUÉES */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      {t("Missions attribuées")} ({dayMissions.length})
                    </span>
                  </div>

                  {dayMissions.length === 0 ? (
                    <div className="p-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      {t("Aucune mission planifiée pour ce jour.")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayMissions.map(({ tour, mission }, mIdx) => {
                        const mStatus = mission.status || 'À faire';
                        const isDone = mStatus === 'Terminée' || mStatus === 'Succès';
                        const isForced = mission.isForced || mission.isManualDate || mission.isManualSlot;

                        // Match Equipment details
                        const defib = defibrillateurs.find(d => d.identifiant === mission.defibIdentifiant);
                        const other = !defib ? otherEquipments.find(o => o.identifiant === mission.defibIdentifiant) : null;
                        const client = clients.find(c => c.id === mission.clientId);

                        return (
                          <div
                            key={mIdx}
                            className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                              isDone
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-white border-slate-200 hover:border-indigo-300 shadow-3xs'
                            }`}
                          >
                            {/* Mission Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-slate-900 text-white font-extrabold text-xs rounded-lg flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-400" />
                                  {mission.estimatedSlot || '08:00'}
                                </span>

                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {mStatus}
                                </span>

                                {isForced && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full" title={t("Horaire forcé / verrouillé")}>
                                    🔒 {t("Forcé")}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-500 font-medium">
                                <span className="text-slate-400">{t("Tournée:")}</span>{' '}
                                <span className="font-bold text-slate-800">{tour.title || t("Sans titre")}</span>
                                {selectedTech === 'Tous' && tour.techName && (
                                  <span className="ml-2 font-semibold text-indigo-600">({tour.techName})</span>
                                )}
                              </div>
                            </div>

                            {/* Client & Intervention */}
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                <span className="text-indigo-600">
                                  {mission.clientDenomination || client?.denomination || t("Client non renseigné")}
                                </span>
                              </h4>

                              {(mission.site || mission.address || client?.adresse) && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {mission.site || mission.address || `${client?.adresse || ''} ${client?.ville || ''}`}
                                  </span>
                                </p>
                              )}
                            </div>

                            {/* Reason / Equipment Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-full font-bold text-[11px]">
                                {mission.equipmentType || 'Défibrillateur'}
                              </span>

                              {mission.defibIdentifiant && (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold text-[11px]">
                                  ID: {mission.defibIdentifiant}
                                </span>
                              )}

                              {(mission.reason || mission.type) && (
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium text-[11px]">
                                  {mission.reason || mission.type}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
