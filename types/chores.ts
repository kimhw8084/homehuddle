export type LinkedRestockItem = {
  id: string;       // local UUID for the linked item
  name: string;
  qty?: number;
  unit?: string;
  store?: string;
  brand?: string;
  everyN: number;   // add to restock every N completions (1 = every time)
  tags?: string[];
};

export type Chore = {
  id: string;
  title: string;
  assignee: string | null;
  avatar: string;
  pool: 'Me' | 'Kids' | 'Parents';
  points: number;
  estMinutes: number;
  dueDate: string;
  due: string; // compatibility
  isOverdue: boolean;
  overdueDays?: number;
  baseOverdueDays?: number; // original overdue count before any reschedule accumulation
  missedStreak?: number;
  isRecurring?: boolean;
  status: 'pending' | 'completed' | 'deferred' | 'sick_reassigned';
  photoRequired: boolean;
  photoMode?: 'after' | 'both';
  photoProvided: { before: boolean; after: boolean; beforeUri?: string; afterUri?: string };
  isNudged: boolean;
  priorityIndex: number;
  sectionId: string | null;
  assigned_to?: string;
  nextRecurringDate?: string;
  recurrenceRule?: string;
  recurringGroupId?: string;  // links the overdue entry and its future instances
  seriesStartDate?: string;   // dueDate of the very first occurrence in the series (for COUNT enforcement)
  overdueParentId?: string;   // id of the overdue entry this instance is linked to
  completedBy?: string | null;
  completedAt?: number | string | null;
  wasOverdue?: boolean;
  isOverdueRecovery?: boolean; // Flag for items brought back from overdue list
  deletedAt?: number; // Unix ms — set on soft-delete, absent when active
  deleteScope?: 'instance' | 'series'; // set on soft-delete for recurring chores
  deletedDates?: string[]; // EXDATE list: specific occurrence dates excluded from virtual projection (YYYY-MM-DD)
  deletedFromDate?: string; // If set, all virtual projections on or after this date are suppressed
  _isVirtual?: boolean;   // Runtime-only: true when this chore is a virtual projection onto a future date
  notes?: string;         // Optional instructions / notes for the chore
  dueTime?: string;       // Optional HH:MM time string for when the chore is due
  recurringSection?: { title: string; color: string }; // Section config to auto-create on each future date
  linkedRestockItems?: LinkedRestockItem[]; // items to auto-add to restock on completion
  randomAssignedBy?: string; // gameId of the random game that assigned this chore
  randomAssignedGameName?: string; // display name of the game
  randomAssignedRunId?: string; // ID in the audit log
  randomAssignedOverridden?: boolean; // true when manually reassigned after a random assignment
};

export type Section = {
  id: string;
  title: string;
  themeColor: string;
  isCollapsed: boolean;
  date: string;
  priorityIndex: number;
};
