"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { CalendarData, CalendarDay, CalendarDayItem } from "@/types";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const fetchCalendar = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<CalendarData>(`/calendar?month=${month}&year=${year}`);
        if (res.success && res.data) {
          setCalendarData(res.data);
          // Default selected day to today or day 1
          const todayDateStr = new Date().toISOString().split("T")[0];
          const todayMatch = res.data.days.find((d) => d.date === todayDateStr);
          setSelectedDay(todayMatch || res.data.days[0] || null);
        }
      } catch (err) {
        console.error("Failed to fetch calendar data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendar();
  }, [month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currency = calendarData?.currency || user?.default_currency || "USD";

  // Calculate starting day of the week for the first day of the month (0=Sun, 6=Sat)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = calendarData?.days || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF2500]">Schedule</span>
            <span className="text-xs text-[#7C766C]">• Renewal Calendar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1712]">Renewal Schedule</h1>
          <p className="text-xs sm:text-sm text-[#7C766C] mt-1">
            See every upcoming charge mapped to the exact day of the month.
          </p>
        </div>

        {/* Month Navigation & Month Total */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-[#E2DED4] shadow-xs flex items-center gap-2">
            <span className="text-xs text-[#7C766C]">Month Total:</span>
            <span className="text-sm font-black text-[#1A1712]">
              {formatMoney(calendarData?.totalMonthSpend || 0, currency)}
            </span>
          </div>

          <div className="flex items-center bg-white rounded-2xl border border-[#E2DED4] p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#7C766C] hover:text-[#1A1712] hover:bg-[#FAF8F5] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold text-[#1A1712] min-w-[120px] text-center">
              {monthNames[month - 1]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#7C766C] hover:text-[#1A1712] hover:bg-[#FAF8F5] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 bg-[#14141A] hover:bg-[#202028] text-white rounded-2xl text-xs font-bold transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Day Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#7C766C] uppercase pb-3 border-b border-[#EAE6DC]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2 pt-3">
            {/* Blank cells for offset before 1st of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[85px] rounded-2xl bg-[#FAF8F5]/50 border border-transparent" />
            ))}

            {/* Actual Month Days */}
            {daysInMonth.map((dayData) => {
              const hasRenewals = dayData.items.length > 0;
              const isSelected = selectedDay?.date === dayData.date;
              const isToday = dayData.date === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={dayData.date}
                  onClick={() => setSelectedDay(dayData)}
                  className={`min-h-[90px] rounded-2xl p-2 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-[#14141A] bg-[#FAF8F5] ring-2 ring-[#14141A]/10 shadow-sm"
                      : hasRenewals
                      ? "border-[#E2DED4] bg-white hover:border-[#FF2500]/50"
                      : "border-[#EAE6DC] bg-[#FAF8F5]/30 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-[#FF2500] text-white"
                          : isSelected
                          ? "bg-[#14141A] text-white"
                          : "text-[#1A1712]"
                      }`}
                    >
                      {dayData.day}
                    </span>
                    {hasRenewals && (
                      <span className="text-[10px] font-black text-[#FF2500]">
                        {formatMoney(dayData.totalAmount, currency)}
                      </span>
                    )}
                  </div>

                  {/* Renewals Pills inside Cell */}
                  <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                    {dayData.items.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white truncate shadow-xs flex items-center gap-1"
                        style={{ backgroundColor: item.color || "#FF2500" }}
                      >
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                    {dayData.items.length > 2 && (
                      <span className="text-[9px] text-[#7C766C] font-semibold text-center">
                        +{dayData.items.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2DED4] shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[#EAE6DC] mb-5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FF2500] uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Selected Day</span>
              </div>
              <h3 className="text-lg font-extrabold text-[#1A1712]">
                {selectedDay ? selectedDay.date : "Choose a Date"}
              </h3>
              <p className="text-xs text-[#7C766C] mt-0.5">
                {selectedDay?.items.length || 0} scheduled renewals on this date
              </p>
            </div>

            {selectedDay && selectedDay.items.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedDay.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DC] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: item.color || "#FF2500" }}
                      >
                        {item.name[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1712]">{item.name}</h4>
                        <span className="text-[10px] text-[#7C766C] block capitalize">
                          {item.category} • {item.billing_cycle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#1A1712]" title={item.currency ? `Billed in ${item.currency}` : undefined}>
                        {formatMoney(item.convertedAmount ?? item.amount, currency)}
                      </span>
                      {item.currency && item.currency !== currency && (
                        <span className="text-[10px] text-[#7C766C] block">
                          {formatMoney(item.amount, item.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 text-[#7C766C] mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-[#1A1712]">No charges scheduled on this day</p>
                <p className="text-[11px] text-[#7C766C] mt-1">Select another day with colored markers to see charges.</p>
              </div>
            )}
          </div>

          {selectedDay && selectedDay.items.length > 0 && (
            <div className="pt-4 border-t border-[#EAE6DC] mt-4 flex justify-between items-center text-xs">
              <span className="font-bold text-[#7C766C]">Total Due on {selectedDay.date}:</span>
              <span className="font-black text-sm text-[#FF2500]">
                {formatMoney(selectedDay.totalAmount, currency)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
