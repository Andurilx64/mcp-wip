import React, { useState, useEffect } from 'react';
import { Plus, X, Save, CalendarDays, Clock, Loader2, ArrowLeft } from 'lucide-react';
import type { WidgetProps, WidgetComponent } from '@mcp-wip/react-widget-sdk';

type CalendarEvent = {
  id: string;
  title: string;
  init?: string;
  end?: string;
  date?: string; // added for robustness
};

type EventsByDate = Record<string, CalendarEvent[]>;

const mockAPI = {
  fetchEvents: async (year: number, month: number): Promise<EventsByDate> => {
    // Fetch real events from the local MCP server resource endpoint for the specified month/year
    const uri = `calendar://calendar/${year}/${month + 1}`;
    const response = await fetch(`http://localhost:9000/wip/resource-template?uri=${uri}`);
    if (!response.ok) throw new Error('Failed to fetch calendar month data');
    const d = await response.json();

    // d might be JSON string or already parsed
    const data = typeof d === 'string' ? JSON.parse(d) : d;

    // Normalize response: sometimes .events is on the root, sometimes in data.events
    const eventsArray = Array.isArray(data?.events)
      ? data.events
      : (Array.isArray(data) ? data : []);

    // Ensure dates have zero-padded month and day for consistent matching
    const pad = (n: number | string) => String(n).padStart(2, '0');
    const eventsByDate: EventsByDate = {};
    for (const event of eventsArray) {
      // event.date comes as "YYYY-MM-DD"
      if (!event?.date) continue;
      // Normalize date (ensure string and zero-padded month & day)
      const [y, m, d] = event.date.split('-');
      const normalizedDateKey = `${y}-${pad(m)}-${pad(d)}`;
      if (!eventsByDate[normalizedDateKey]) eventsByDate[normalizedDateKey] = [];
      eventsByDate[normalizedDateKey].push({
        id: event.id,
        title: event.title,
        init: event.init || "",
        end: event.end || "",
        date: event.date
      });
    }
    return eventsByDate;
  },

  createEvent: async (date: string, eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { id: Date.now().toString(), ...eventData, date };
  }
};

let lastSelectedDay: number | null = null;
let lastSelectedMonth: number | null = null;
let lastSelectedYear: number | null = null;
let lastEvents: EventsByDate = {};

const InteractiveCalendar: WidgetComponent = ({ parameters }: WidgetProps) => {
  const today = parameters?.initial_date ? new Date(parameters.initial_date) : new Date();
  const initialMonth = typeof parameters?.month === 'number' ? parameters.month : today.getMonth();
  const initialYear = typeof parameters?.year === 'number' ? parameters.year : today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [events, setEvents] = useState<EventsByDate>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', init: '', end:''});

  // Helper for consistency for key format
  const pad = (n: number | string) => String(n).padStart(2, '0');

  // When user picks a day, use zero-padded key for lookup
  const getDateKey = (year: number, month: number, day: number) =>
    `${year}-${pad(month + 1)}-${pad(day)}`;

  useEffect(() => {
    if (parameters?.initial_date) {
      const d = new Date(parameters.initial_date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        setSelectedDay(d.getDate());
        setViewMode('day');
        lastSelectedDay = d.getDate();
        lastSelectedMonth = d.getMonth();
        lastSelectedYear = d.getFullYear();
      }
    }
  }, [parameters?.initial_date, currentMonth, currentYear]);

  useEffect(() => {
    loadEvents();
  }, [currentMonth, currentYear]);

  const loadEvents = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await mockAPI.fetchEvents(currentYear, currentMonth);
      setEvents(data);
      lastEvents = data;
      lastSelectedMonth = currentMonth;
      lastSelectedYear = currentYear;
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    setIsSaving(true);
    try {
      const start_time = newEvent.init?.split('-')[0]?.trim() ?? "";
      const end_time = newEvent.end?.split('-')[1]?.trim() ?? "";
      const dateKey = getDateKey(currentYear, currentMonth, selectedDay);

      const requestBody = {
        date: dateKey,
        description: newEvent.title,
        start_time,
        end_time
      };
      const response = await fetch('http://localhost:9000/wip/call-tool/create_appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`Failed to create appointment (${response.status})`);
      const result = await response.json();
      const createdEvent = result?.event || {
        id: Math.random().toString(36).slice(2),
        title: newEvent.title,
        init: start_time,
        end: end_time,
        date: dateKey
      };

      setEvents(prev => {
        const updated: EventsByDate = {
          ...prev,
          [dateKey]: [...(prev[dateKey] || []), createdEvent]
        };
        lastEvents = updated;
        return updated;
      });
      setNewEvent({ title: '', init: '', end:''});
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(null);
    setViewMode('month');
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setViewMode('day');
    lastSelectedDay = day;
    lastSelectedMonth = currentMonth;
    lastSelectedYear = currentYear;
  };

  const handleBackToMonth = () => {
    setSelectedDay(null);
    setViewMode('month');
  };

  const handleAddEventClick = () => {
    if (!selectedDay) {
      alert('Please select a day first');
      return;
    }
    setShowAddModal(true);
  };

  // Use zero-padded date for all keys
  const dateKey = selectedDay ? getDateKey(currentYear, currentMonth, selectedDay) : null;
  const selectedDayEvents: CalendarEvent[] = dateKey ? (events[dateKey] || []) : [];

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="bg-slate-950 rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-auto border border-slate-800">

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => changeMonth(-1)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">←</button>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-200 tracking-wide">{monthNames[currentMonth]} {currentYear}</div>
              <div className="text-sm text-slate-400">
                {isLoading ? 'Loading events...' : 'Select a day to view or add events'}
              </div>
            </div>
            <button onClick={() => changeMonth(1)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">→</button>
          </div>

          <div className="grid grid-cols-7 text-center mb-2">
            {dayNames.map(dn => (
              <div key={dn} className="text-slate-400 font-semibold text-xs uppercase tracking-wider py-2">{dn}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-6">
            {calendarDays.map((day, idx) => {
              // Use zero-padded keys for lookup
              const dayKey =
                day != null
                  ? `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`
                  : null;
              const hasEvents = !!(dayKey && events[dayKey]?.length);
              return (
                <div
                  key={idx}
                  onClick={day ? () => handleDayClick(day) : undefined}
                  className={`
                    relative p-2 h-12 rounded-lg flex flex-col items-center justify-start
                    ${day
                      ? `cursor-pointer ${day === selectedDay ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-100 hover:bg-slate-700'} ${hasEvents ? 'border-2 border-blue-400/50' : 'border border-slate-700'}`
                      : 'bg-transparent'}
                  `}
                >
                  {day && (
                    <>
                      <div className="font-bold text-base mb-1">{day}</div>
                      {hasEvents && (
                        <div className="flex gap-1">
                          {events[dayKey!]?.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && selectedDay && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToMonth}
              className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-2 pl-5 text-blue-300 font-bold text-lg">
              <CalendarDays size={20} />
              {monthNames[currentMonth]} {selectedDay}, {currentYear}
            </div>
            
          </div>
          <button
              onClick={handleAddEventClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-md"
            >
              <Plus size={16} /> Add Event
            </button>
          <p className="mt-2 text-slate-400 text-sm">
            Add event calls directly an MCP tool on the server.
          </p>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2 pt-5">
              {selectedDayEvents.map(event => (
                <div key={event.id} className="bg-slate-800 p-3 rounded-lg flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-slate-100 font-medium">{event.title}</div>
                    {(event.init || event.end) && (
                      <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                        <Clock size={12} />{event.init}{event.init && event.end ? ` - ${event.end}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">No events scheduled</div>
            </div>
          )}
        </div>
      )}

      {/* Modal stays unchanged */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-200">Add New Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Team Meeting"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">From (optional)</label>
                <input
                  type="text"
                  value={newEvent.init}
                  onChange={e => setNewEvent({ ...newEvent, init: e.target.value })}
                  placeholder="e.g., 10:00am"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">To (optional)</label>
                <input
                  type="text"
                  value={newEvent.end}
                  onChange={e => setNewEvent({ ...newEvent, end: e.target.value })}
                  placeholder="e.g., 11:00am"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title.trim() || isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : (<><Save size={16} /> Save Event</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Keep widget metadata and helper functions as before
InteractiveCalendar.initWidget = (parameters?: Record<string, any>) => {
  console.log('InteractiveCalendar initialized with', parameters);
};

InteractiveCalendar.getNextBestActions = () => [];
InteractiveCalendar.getWidgetContext = () => {
  if (lastSelectedDay != null && lastSelectedMonth != null && lastSelectedYear != null) {
    const y = lastSelectedYear, m0 = lastSelectedMonth, d = lastSelectedDay;
    const pad = (n: number | string) => String(n).padStart(2, '0');
    const isoDate = `${y}-${pad(m0 + 1)}-${pad(d)}`;
    const key = `${y}-${pad(m0 + 1)}-${pad(d)}`;
    const eventsForDate = lastEvents[key] || [];
   
  
    return "The last selected date from the user".concat(isoDate)
      
  }
  return undefined;
};
InteractiveCalendar.widgetName = "Calendar";
InteractiveCalendar.description = "Visualize your calendar and add appointments";
InteractiveCalendar.getIcon = () => (<span role="img" aria-label="image carousel" style={{ fontSize: "1.5em", lineHeight: "1" }}>🗓️</span>);
InteractiveCalendar.visualization = "both";
export default InteractiveCalendar;
