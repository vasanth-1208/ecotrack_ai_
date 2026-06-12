'use client';

import type { StreakDay } from '../../types/ecotrack';

type StreakCalendarProps = {
  days: StreakDay[];
};

export default function StreakCalendar({ days }: StreakCalendarProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <div
          key={day.date}
          className={`min-h-20 rounded-xl border p-2 flex flex-col justify-between text-[10px] transition-all ${
            day.active
              ? 'bg-emerald-50/70 border-emerald-600 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
          title={day.label}
        >
          <span className="font-bold uppercase tracking-wider">{day.date.slice(5)}</span>
          <span className="font-semibold">{day.active ? 'Active' : 'Rest'}</span>
        </div>
      ))}
    </div>
  );
}
