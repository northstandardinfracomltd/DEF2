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

  // List of technician members only
  const techniciansList = useMemo(() => {
    const all = members && members.length > 0 ? members : (companyInfo?.members || []);
    const techOnly = all.filter(m => {
      const r = (m.role || '').toLowerCase();
      return r.includes('tech') || r.includes('technicien');
    });
    return techOnly.length > 0 ? techOnly : all;
  }, [members, companyInfo]);

  // Default selected technician
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
    const found = techniciansList.find(m => m.name.trim().toLowerCase() === selectedTech.trim().toLowerCase());
    return found || authenticatedUser || null;
  }, [selectedTech, techniciansList, authenticatedUser]);

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
    <div className="space-y-4 font-sans pb-12" id="planning-tab-wrapper">
      {/* Field Technicien - Styled identical to Interventions dropdown */}
      <div className="px-1 select-none">
        <select
          value={selectedTech}
          onChange={(e) => setSelectedTech(e.target.value)}
          className="w-full bg-white text-black appearance-none transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none text-center cursor-pointer"
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
          <option value="Tous">{t("Tous les techniciens")}</option>
          {techniciansList.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Field Mois - Styled identical to Interventions dropdown */}
      <div className="px-1 select-none pb-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="w-full bg-white text-black appearance-none transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none text-center cursor-pointer"
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
          {MONTH_NAMES_FR.map((monthName, idx) => (
            <option key={monthName} value={idx}>
              {monthName} {selectedYear}
            </option>
          ))}
        </select>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {daysInMonthList.map(({ dayNum, isoDate, dayName, isToday }) => {
          // Absences
          const matchingAbsences: { memberName: string; abs: MemberAbsence }[] = [];
          const techsToCheck = selectedTech === 'Tous'
            ? techniciansList
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
              className="bg-white p-4 sm:p-5 space-y-4"
              style={{
                border: "1px solid rgb(201, 190, 205)",
                borderRadius: "14px",
              }}
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

              {/* Schedules / Absences Plages */}
              {matchingAbsences.map(({ abs }, aIdx) => (
                <div
                  key={`abs-${aIdx}`}
                  className="bg-slate-50 p-3 space-y-2"
                  style={{
                    border: "1px solid rgb(201, 190, 205)",
                    borderRadius: "14px",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-black text-white font-medium text-[16px]">
                      Indisponible
                    </span>
                  </div>
                  {abs.commentaire && (
                    <div className="text-[16px] text-slate-800">
                      {abs.commentaire}
                    </div>
                  )}
                </div>
              ))}

              {scheduleSlotsByTech.map(({ schedule }, sIdx) => {
                const slotText = schedule.fermetureMidi
                  ? `${schedule.openMorning || '09:00'} - ${schedule.closeMorning || '12:00'} / ${schedule.openAfternoon || '14:00'} - ${schedule.closeAfternoon || '18:00'}`
                  : `${schedule.openContinuous || '09:00'} - ${schedule.closeContinuous || '17:00'}`;

                return (
                  <div
                    key={`sch-${sIdx}`}
                    className="bg-slate-50 p-3 space-y-2"
                    style={{
                      border: "1px solid rgb(201, 190, 205)",
                      borderRadius: "14px",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-full bg-black text-white font-medium text-[16px]">
                        {slotText}
                      </span>
                    </div>
                    {schedule.commentaire && (
                      <div className="text-[16px] text-slate-800">
                        {schedule.commentaire}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Missions */}
              {dayMissions.map(({ tour, mission }, mIdx) => {
                const clientObj = clients.find(
                  c => c.id === mission.clientId || c.denomination === mission.clientDenomination
                );

                const dateVal = getFormattedDateFR(
                  mission.estimatedDate || (tour.startDate !== 'A trier' ? tour.startDate : '')
                );
                const creneauVal = mission.estimatedSlot || mission.creneau || mission.estimatedTime || '08:00';

                const clientName = mission.clientDenomination || mission.client || clientObj?.denomination || '';
                const siteName = mission.site || mission.siteName || '';

                const ville = mission.ville || clientObj?.ville || '';
                const cp = mission.codePostal || clientObj?.codePostal || '';
                const locationStr = ville
                  ? `${ville}${cp ? ` (${cp})` : ''}`
                  : (mission.address || clientObj?.adresse || '');

                const equipType = mission.equipmentType || 'Défibrillateur';
                const identifiant = mission.defibIdentifiant || mission.identifiant || '';

                return (
                  <div
                    key={`m-${mIdx}`}
                    className="bg-slate-50 p-4 space-y-3"
                    style={{
                      border: "1px solid rgb(201, 190, 205)",
                      borderRadius: "14px",
                    }}
                  >
                    {/* Gélules Date et Créneau */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-full bg-black text-white font-medium text-[16px]">
                        Date : {dateVal}
                      </span>
                      <span className="px-3.5 py-1.5 rounded-full bg-black text-white font-medium text-[16px]">
                        Créneau : {creneauVal}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-[16px] text-slate-800">
                      <div>
                        <span className="font-bold">Client : </span>
                        <span>{clientName}</span>
                      </div>
                      <div>
                        <span className="font-bold">Site : </span>
                        <span>{siteName}</span>
                      </div>
                      <div>
                        <span className="font-bold">Localisation : </span>
                        <span>{locationStr}</span>
                      </div>
                      <div>
                        <span className="font-bold">Type de matériel : </span>
                        <span>{equipType}</span>
                      </div>
                      <div>
                        <span className="font-bold">Identifiant : </span>
                        <span>{identifiant}</span>
                      </div>
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
