import React, { useState, useMemo, useEffect } from 'react';
import { CompanyInfo, Member, MemberSchedule, MemberAbsence } from '../types';

interface PlanningTabProps {
  companyInfo?: CompanyInfo;
  fsmTours?: any[];
  authenticatedUser?: any;
  defibrillateurs?: any[];
  otherEquipments?: any[];
  clients?: any[];
  variables?: any[];
  members?: Member[];
  t: (key: string) => string;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES_FR = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

const getFormattedDateFR = (dateStr?: string) => {
  if (!dateStr || dateStr === 'A trier') return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

export const PlanningTab: React.FC<PlanningTabProps> = ({
  companyInfo,
  fsmTours = [],
  authenticatedUser,
  defibrillateurs = [],
  otherEquipments = [],
  clients = [],
  variables = [],
  members = [],
  t
}) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedTech, setSelectedTech] = useState<string>('Tous');

  // List of members / technicians
  const membersList = useMemo(() => {
    if (members && members.length > 0) return members;
    return companyInfo?.members || [];
  }, [members, companyInfo]);

  // Set default technician if authenticatedUser matches
  useEffect(() => {
    if (authenticatedUser?.name) {
      setSelectedTech(authenticatedUser.name);
    }
  }, [authenticatedUser]);

  // Active member object
  const activeMember = useMemo(() => {
    if (selectedTech === 'Tous') {
      return authenticatedUser || null;
    }
    const found = membersList.find(m => m.name.trim().toLowerCase() === selectedTech.trim().toLowerCase());
    return found || authenticatedUser || null;
  }, [selectedTech, membersList, authenticatedUser]);

  // Days list for selected month/year
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
      const isToday =
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();

      daysArr.push({
        dayNum,
        dateObj,
        isoDate,
        dayName,
        isToday
      });
    }

    return daysArr;
  }, [selectedYear, selectedMonth]);

  // Retrieve assigned missions
  const missionsByDate = useMemo(() => {
    const map: Record<string, { tour: any; mission: any }[]> = {};

    fsmTours.forEach(tour => {
      if (selectedTech !== 'Tous') {
        const tourTech = (tour.techName || '').trim().toLowerCase();
        const selTech = selectedTech.trim().toLowerCase();
        if (tourTech !== selTech) return;
      }

      if (!tour.missions || !Array.isArray(tour.missions)) return;

      tour.missions.forEach((m: any) => {
        const missionDate = m.estimatedDate || (tour.startDate !== 'A trier' ? tour.startDate : null);
        if (!missionDate) return;

        if (!map[missionDate]) {
          map[missionDate] = [];
        }
        map[missionDate].push({ tour, mission: m });
      });
    });

    return map;
  }, [fsmTours, selectedTech]);

  // Auto-scroll to today's date card on load
  useEffect(() => {
    const yearStr = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const todayIso = `${yearStr}-${monthStr}-${dayStr}`;

    const timer = setTimeout(() => {
      const todayEl = document.getElementById(`calendar-day-${todayIso}`);
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedMonth, selectedYear]);

  return (
    <div className="space-y-6 pb-12 font-sans" id="planning-tab-wrapper">
      {/* Top Header Div: 2 full-width select fields */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-4">
        <div className="space-y-2 w-full">
          <label className="block font-bold text-[18px] text-slate-800">
            {t("Technicien")}
          </label>
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="w-full p-3.5 text-[16px] font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="Tous">{t("Tous les techniciens")}</option>
            {membersList.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} {m.role ? `(${m.role})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 w-full">
          <label className="block font-bold text-[18px] text-slate-800">
            {t("Mois")}
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full p-3.5 text-[16px] font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            {MONTH_NAMES_FR.map((monthName, idx) => (
              <option key={monthName} value={idx}>
                {monthName} {selectedYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {daysInMonthList.map(({ dayNum, isoDate, dayName, isToday }) => {
          // Absences
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

          // Semaine typique
          const scheduleSlotsByTech: { memberName: string; schedule: MemberSchedule }[] = [];
          techsToCheck.forEach(m => {
            if (m.semaineTypique && Array.isArray(m.semaineTypique)) {
              const sch = m.semaineTypique.find(s => s.days && s.days.includes(dayName));
              if (sch) {
                scheduleSlotsByTech.push({ memberName: m.name, schedule: sch });
              }
            }
          });

          // Missions
          const dayMissions = missionsByDate[isoDate] || [];

          return (
            <div
              key={isoDate}
              id={`calendar-day-${isoDate}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4"
            >
              {/* Day Circle */}
              <div className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full font-bold text-[18px] flex items-center justify-center ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  {dayNum}
                </div>
              </div>

              {/* Schedules / Absences Comments */}
              {matchingAbsences.map(({ abs }, aIdx) => {
                const text = abs.commentaire || t("Période d'indisponibilité");
                return (
                  <div key={`abs-${aIdx}`} className="bg-slate-50 rounded-xl p-3 text-[16px] text-slate-800">
                    {text}
                  </div>
                );
              })}

              {scheduleSlotsByTech.map(({ schedule }, sIdx) => {
                const text = schedule.commentaire || (schedule.fermetureMidi ? `${schedule.openMorning || '09:00'} - ${schedule.closeMorning || '12:00'} / ${schedule.openAfternoon || '14:00'} - ${schedule.closeAfternoon || '18:00'}` : `${schedule.openContinuous || '09:00'} - ${schedule.closeContinuous || '17:00'}`);
                return (
                  <div key={`sch-${sIdx}`} className="bg-slate-50 rounded-xl p-3 text-[16px] text-slate-800">
                    {text}
                  </div>
                );
              })}

              {/* Missions */}
              {dayMissions.map(({ tour, mission }, mIdx) => {
                const clientObj = clients.find(c => c.id === mission.clientId || c.denomination === mission.clientDenomination);

                const dateEst = getFormattedDateFR(mission.estimatedDate || (tour.startDate !== 'A trier' ? tour.startDate : ''));
                const creneauEst = mission.estimatedSlot || mission.creneau || '08:00';

                const clientName = mission.clientDenomination || mission.client || clientObj?.denomination || '';
                const siteName = mission.site || mission.siteName || '';

                const ville = mission.ville || clientObj?.ville || '';
                const cp = mission.codePostal || clientObj?.codePostal || '';
                const locationStr = ville ? `${ville} (${cp})` : (mission.address || clientObj?.adresse || '');

                const equipType = mission.equipmentType || 'Défibrillateur';
                const identifiant = mission.defibIdentifiant || mission.identifiant || '';

                return (
                  <div key={`m-${mIdx}`} className="bg-slate-50 rounded-xl p-4 space-y-3">
                    {/* Gélules Date et Créneau */}
                    <div className="flex flex-wrap items-center gap-2">
                      {dateEst && (
                        <span className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium text-[16px]">
                          Date estimée : {dateEst}
                        </span>
                      )}
                      {creneauEst && (
                        <span className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium text-[16px]">
                          Créneau estimé : {creneauEst}
                        </span>
                      )}
                    </div>

                    {/* Mission Details */}
                    <div className="space-y-1.5 text-[16px] text-slate-800">
                      {clientName && (
                        <div>
                          <span className="font-bold">Client : </span>
                          <span>{clientName}</span>
                        </div>
                      )}
                      {siteName && (
                        <div>
                          <span className="font-bold">Nom du site : </span>
                          <span>{siteName}</span>
                        </div>
                      )}
                      {locationStr && (
                        <div>
                          <span className="font-bold">Localisation : </span>
                          <span>{locationStr}</span>
                        </div>
                      )}
                      {equipType && (
                        <div>
                          <span className="font-bold">Type de matériel : </span>
                          <span>{equipType}</span>
                        </div>
                      )}
                      {identifiant && (
                        <div>
                          <span className="font-bold">Identifiant : </span>
                          <span>{identifiant}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
