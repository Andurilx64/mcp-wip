import React, { useState, useEffect } from 'react';
import { Plus, X, Save, CalendarDays, Clock, Loader2 } from 'lucide-react';
import type { WidgetProps, WidgetComponent} from '@mcp-wip/react-widget-sdk';

// Types for events stored in the calendar
type CalendarEvent = {
  id: string;
  title: string;
  time?: string;
};

type EventsByDate = Record<string, CalendarEvent[]>;

// Mock API functions - replace with actual server endpoints
const mockAPI = {
  fetchEvents: async (year: number, month: number): Promise<EventsByDate> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data
    return {
      [`${year}-${month + 1}-5`]: [
        { id: '1', title: "Team Meeting", time: "10:00am" }
      ],
      [`${year}-${month + 1}-14`]: [
        { id: '2', title: "Project Deadline", time: "" }
      ],
      [`${year}-${month + 1}-22`]: [
        { id: '3', title: "Lunch with Alex", time: "12:00pm" },
        { id: '4', title: "Dentist", time: "3:30pm" }
      ],
    };
  },
  
  createEvent: async (
    date: string,
    eventData: Omit<CalendarEvent, 'id'>
  ): Promise<CalendarEvent> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return created event with ID
    return {
      id: Date.now().toString(),
      ...eventData
    };
  }
};

let lastSelectedDay: number | null = null;
let lastSelectedMonth: number | null = null; // 0-based
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // If there's an initial date, automatically "click" (select) it
  useEffect(() => {
    if (parameters?.initial_date) {
      const d = new Date(parameters.initial_date);
      // Only if month/year match current view and the day is present
      if (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth
      ) {
        setSelectedDay(d.getDate());
        // Set last* globals as well, since this is treated as selection
        lastSelectedDay = d.getDate();
        lastSelectedMonth = d.getMonth();
        lastSelectedYear = d.getFullYear();
      }
    }
  }, [parameters?.initial_date, currentMonth, currentYear]);
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: ''
  });

  // Load events from server
  useEffect(() => {
    loadEvents();
  }, [currentMonth, currentYear]);

  const loadEvents = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await mockAPI.fetchEvents(currentYear, currentMonth);
      setEvents(data);
      lastEvents = data;
      // keep track of the current visible month/year as the context of selection
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
      const dateKey = `${currentYear}-${currentMonth + 1}-${selectedDay}`;
      const createdEvent = await mockAPI.createEvent(dateKey, newEvent);
      
      // Update local state
      setEvents(prev => {
        const updated: EventsByDate = {
          ...prev,
          [dateKey]: [...(prev[dateKey] || []), createdEvent]
        };
        lastEvents = updated;
        return updated;
      });
      
      // Reset form
      setNewEvent({ title: '', time: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    lastSelectedDay = day;
    lastSelectedMonth = currentMonth;
    lastSelectedYear = currentYear;
  };

  const handleAddEventClick = () => {
    if (!selectedDay) {
      alert('Please select a day first');
      return;
    }
    setShowAddModal(true);
  };

  const dateKey: string | null = selectedDay
    ? `${currentYear}-${currentMonth + 1}-${selectedDay}`
    : null;
  const selectedDayEvents: CalendarEvent[] = dateKey ? (events[dateKey] || []) : [];

  return (
    <div className="bg-slate-950 rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-auto border border-slate-800">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => changeMonth(-1)}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          ←
        </button>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-200 tracking-wide">
            {monthNames[currentMonth]} {currentYear}
          </div>
          <div className="text-sm text-slate-400">
            {isLoading ? 'Loading events...' : 'Select a day to view or add events'}
          </div>
        </div>
        
        <button
          onClick={() => changeMonth(1)}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          →
        </button>
      </div>

      {/* Day widgetNames */}
      <div className="grid grid-cols-7 text-center mb-2">
        {dayNames.map(dn => (
          <div key={dn} className="text-slate-400 font-semibold text-xs uppercase tracking-wider py-2">
            {dn}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {calendarDays.map((day, idx) => {
          const dayKey: string | null = day
            ? `${currentYear}-${currentMonth + 1}-${day}`
            : null;
          const dayEvents = dayKey ? events[dayKey] : undefined;
          const hasEvents = !!(dayEvents && dayEvents.length > 0);
          
          return (
            <div
              key={idx}
              onClick={day ? () => handleDayClick(day) : undefined}
              className={`
                relative p-2 h-24 rounded-lg transition-all duration-200 flex flex-col items-center justify-start
                ${day
                  ? `cursor-pointer
                     ${day === selectedDay
                       ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg scale-105'
                       : 'bg-slate-800/80 text-slate-100 hover:bg-slate-700 hover:scale-102'}
                     ${hasEvents ? 'border-2 border-blue-400/50' : 'border border-slate-700'}
                    `
                  : 'bg-transparent'
                }
              `}
            >
              {day && (
                <>
                  <div className="font-bold text-base mb-1">{day}</div>
                  {hasEvents && (
                    <div className="flex gap-1">
                      {dayEvents?.slice(0, 3).map((_: CalendarEvent, i: number) => (
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

      {/* Selected day details */}
      {selectedDay && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-lg">
              <CalendarDays size={20} />
              {monthNames[currentMonth]} {selectedDay}, {currentYear}
            </div>
            <button
              onClick={handleAddEventClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-md"
            >
              <Plus size={16} />
              Add Event
            </button>
          </div>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDayEvents.map((event: CalendarEvent) => (
                <div
                  key={event.id}
                  className="bg-slate-800 p-3 rounded-lg flex items-start gap-3 hover:bg-slate-750 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-slate-100 font-medium">{event.title}</div>
                    {event.time && (
                      <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                        <Clock size={12} />
                        {event.time}
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

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-200">Add New Event</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Team Meeting"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Time (optional)
                </label>
                <input
                  type="text"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  placeholder="e.g., 10:00am"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title.trim() || isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Event
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

InteractiveCalendar.initWidget = (parameters?: Record<string, any>) => {
  console.log('InteractiveCalendar initialized with', parameters);
};

InteractiveCalendar.getNextBestActions = () => {
  return [];
};

InteractiveCalendar.getWidgetContext = () => {
  if (
    lastSelectedDay != null &&
    lastSelectedMonth != null &&
    lastSelectedYear != null
  ) {
    const y = lastSelectedYear;
    const m0 = lastSelectedMonth; // 0-based
    const d = lastSelectedDay;
    const pad = (n: number) => String(n).padStart(2, '0');
    const isoDate = `${y}-${pad(m0 + 1)}-${pad(d)}`; // YYYY-MM-DD

    // keys in storage are unpadded
    const key = `${y}-${m0 + 1}-${d}`;
    const eventsForDate = lastEvents[key] || [];

    return {
      "The last selected date from the user": isoDate,
      "The events already set for the last selected date": eventsForDate,
    };
  }
  return undefined;
};

InteractiveCalendar.widgetName="Calendar"
InteractiveCalendar.description="Visualize your calendar and add appointments"
InteractiveCalendar.getIcon = () => (
  <span role="img" aria-label="image carousel" style={{fontSize: "1.5em", lineHeight: "1"}}>
      🗓️
  </span>
);
InteractiveCalendar.visualization = "both";
export default InteractiveCalendar;

