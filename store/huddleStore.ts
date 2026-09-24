import { create } from 'zustand';
import type { HouseholdSnapshot } from '../types/household';
import * as Haptics from 'expo-haptics';

import { Chore, Section } from '../types/chores';
import { createDemoHousehold } from '../fixtures/demo-household';
import { computeNextDate } from '../utils/dateUtils';

// ─── Market Types ────────────────────────────────────────────────
export type MarketPriceEntry = { date: string; pts: number };

export type MarketItem = {
    id: string;
    version?: number;
    name: string;
    emoji: string;
    pts: number;
    category: string;
    desc: string;
    purchaseCount: number;
    stock: number | null;
    expiresInDays: number | null;
    eligibleMembers: string[];
    curators: string[];
    createdBy: string;
    priceHistory: MarketPriceEntry[];
};

export type FlashSaleScope =
    | { type: 'all' }
    | { type: 'categories'; categories: string[] }
    | { type: 'items'; itemIds: string[] };

export type MarketFlashSale = {
    id: string;
    scope: FlashSaleScope;
    discountPct: number;
    expiresAt: number;
};

// ─── Wallet Bag Types ─────────────────────────────────────────────
export type WalletBagStatus = 'active' | 'used' | 'expired' | 'gifted';

export type WalletBagItem = {
    id: string;
    memberId?: string;
    member: string;
    name: string;
    emoji: string;
    pts: number;
    claimedDate: string;
    usedDate: string | null;
    expiresDate: string | null;
    status: WalletBagStatus;
    note: string | null;
    gifted: boolean;
};

export type WalletTransaction = { id: string; memberId?: string; member: string; label: string; pts: number; date: string; icon: string };

export type HomeMachine = {
    id: string;
    name: string;
    status: string;
    since: number | null;
    startedBy: string | null;
    usesThisWeek: number;
    location?: string;
    runMinutes?: number;
    icon?: string;
};

export type AutomationRun = { date: string; triggeredBy: string };

export type HomeAutomation = {
    id: string;
    title: string;
    emoji: string;
    color?: string;
    chores: { id: string; title: string; [key: string]: any }[];
    runHistory?: AutomationRun[];
};

export type RestockItem = {
    id: string;
    name: string;
    category: string;
    addedBy: { name: string; avatar: string };
    isUrgent: boolean;
    isStaple: boolean;
    isCompleted: boolean;
    addedAt: number;
    completedAt?: number;
    qty?: number;
    unit?: string;
    store?: string;
    brand?: string;
    note?: string;
    tags?: string[];
};

export type WidgetSize = 'full' | 'half';
export type WidgetConfig = {
    id: string;
    size: WidgetSize;
};

export type WishlistItem = {
    id: string;
    name: string;
    description: string;
    desiredPts: number;
    reason: string;
    addedBy: string;
    addedAt: number;
};

export type FamilyMember = {
    id?: string;
    authUserId?: string | null;
    householdRole?: 'owner' | 'parent' | 'teen' | 'child';
    name: string;
    avatar: string;
    role: 'Parent' | 'Teen' | 'Child';
    pool: 'Me' | 'Kids' | 'Parents';
    stats: {
        choresCompleted: number;
        pointsEarned: number;
        streak: number;
    };
};

export type Recipe = {
    id: string;
    name: string;
    image?: string;
    cuisine: string;
    emoji: string;
    prepTime: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    ingredients: string[];
    description?: string;
    addedBy: string;
    votes: number;
    votedBy: string[];
};

export type DayMenu = {
    recipeId?: string;
    recipeName?: string;
    cook?: string;
    type: 'home' | 'dining_out' | 'to_go' | 'leftovers';
    note?: string;
};

export type WeekMenu = Record<string, DayMenu>;

export type ArchiveMenu = {
    id: string;
    weekStarting: string; // YYYY-MM-DD
    menu: WeekMenu;
};

export type AnnouncementStyle = 'classic' | 'instagram' | 'imessage' | 'neon' | 'glass';

export type Announcement = {
    id: string;
    title: string;
    content?: string;
    type: 'info' | 'reminder' | 'alert' | 'meeting' | 'fun';
    author: string;
    timestamp: number;
    expiresAt: number;
    style: AnnouncementStyle;
    color: string;
    reactions?: Record<string, string[]>; // emoji -> [usernames]
};

export interface HuddleState {
    // Data
    snapshot: HouseholdSnapshot | null;
    householdId: string | null;
    currentMemberId: string | null;
    chores: Chore[];
    sections: Section[];
    restockItems: RestockItem[];
    familyMembers: FamilyMember[];
    recipes: Recipe[];
    weekMenu: WeekMenu;
    pastMenus: ArchiveMenu[];
    menuPhase: 'voting' | 'results' | 'finalized';
    voteWeekId: string; // ISO week string "YYYY-Www" for current vote cycle
    currentUser: string;
    announcements: Announcement[];
    goals: { id: string; title: string; target: number; current: number; color: string }[];
    pets: { id: string; name: string; type: string; avatar: string; lastFed: number; lastWalked?: number }[];
    birthdays: { name: string; date: string; avatar: string }[];
    wifi: { ssid: string; password: string };
    familyWidgets: WidgetConfig[];
    wishlist: WishlistItem[];
    deliveries: { 
        id: string; 
        date?: string;
        carrier: string; 
        item: string; 
        window: string; 
        signatureRequired: boolean; 
        status: 'in-transit' | 'delivered';
        isHeavy?: boolean;
        isFragile?: boolean;
        isPerishable?: boolean;
        day: 'Today' | 'Tomorrow' | 'Upcoming';
        confirmedBy?: string[];
    }[];
    pendingApprovals: { id: string; title: string; kid: string; points: number; submittedAt: number; photoRequired: boolean; photos?: string[]; comments: { author: string; text: string; time: number }[] }[];
    setPendingApprovals: (pendingApprovals: HuddleState['pendingApprovals']) => void;

    // Chore sort/filter prefs (persisted across tab navigation)
    choreSort: { field: string; dir: string } | null;
    choreFilter: { assignees: string[]; recurring: boolean; photoRequired: boolean; nudged: boolean; overdue: boolean };
    updateMemberStats: (name: string, delta: { pointsEarned?: number; choresCompleted?: number; streak?: number }) => void;
    overdueExpanded: boolean;
    setChoreSort: (sort: { field: string; dir: string } | null) => void;
    setChoreFilter: (filter: { assignees: string[]; recurring: boolean; photoRequired: boolean; nudged: boolean; overdue: boolean }) => void;
    setOverdueExpanded: (val: boolean) => void;

    // Actions - Chores
    setChores: (chores: Chore[]) => void;
    addChore: (chore: Omit<Chore, 'id'> & { id?: string }) => void;
    updateChore: (id: string, updates: Partial<Chore>) => void;
    deleteChore: (id: string, scope?: 'instance' | 'series') => void;
    addChoreDeletedDate: (id: string, date: string) => void;
    removeChoreDeletedDate: (id: string, date: string) => void;
    restoreChore: (id: string) => void;
    softDeleteChoresByGroup: (recurringGroupId: string, fromDate: string) => void;
    purgeDeletedChores: () => void;
    completeChore: (id: string) => void;

    // Actions - Sections
    setSections: (sections: Section[]) => void;
    addSection: (section: Section) => void;
    updateSection: (id: string, updates: Partial<Section>) => void;
    deleteSection: (id: string) => void;

    // Actions - Restock
    restockCategoryOrder: string[] | null;
    setRestockCategoryOrder: (order: string[] | null) => void;
    restockExpandedCategories: Record<string, boolean>;
    setRestockExpandedCategories: (cats: Record<string, boolean>) => void;
    setRestockItems: (items: RestockItem[]) => void;
    addRestockItem: (item: Omit<RestockItem, 'id'>) => void;
    updateRestockItem: (id: string, updates: Partial<RestockItem>) => void;
    toggleRestockItem: (id: string) => void;
    deleteRestockItem: (id: string) => void;

    // Actions - Family & Menu
    addRecipe: (recipe: Omit<Recipe, 'id' | 'votes' | 'votedBy'>) => void;
    updateRecipe: (id: string, updates: Partial<Recipe>) => void;
    deleteRecipe: (id: string) => void;
    voteForRecipe: (recipeId: string, userName: string) => void;
    resetVotes: () => void;
    
    updateWeekMenu: (updates: Partial<WeekMenu>) => void;
    updateDayMenu: (day: string, updates: Partial<DayMenu>) => void;
    finalizeMenu: (weekStarting: string) => void;
    setMenuPhase: (phase: 'voting' | 'results' | 'finalized') => void;
    startNextWeek: () => void;
    checkAndAdvanceVotingPhase: (familySize: number) => void;

    // Actions - Announcements
    addAnnouncement: (a: Omit<Announcement, 'id' | 'timestamp'>) => void;
    updateAnnouncement: (id: string, updates: Partial<Announcement>) => void;
    deleteAnnouncement: (id: string) => void;
    addAnnouncementReaction: (id: string, emoji: string, userName: string) => void;

    addWishlistItem: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => void;
    deleteWishlistItem: (id: string) => void;
    setFamilyWidgets: (widgets: WidgetConfig[]) => void;
    updateWidgetSize: (id: string, size: WidgetSize) => void;
    reorderWidgets: (from: number, to: number) => void;
    addDelivery: (d: Omit<HuddleState['deliveries'][0], 'id' | 'status'>) => void;
    updateDelivery: (id: string, updates: Partial<HuddleState['deliveries'][0]>) => void;
    deleteDelivery: (id: string) => void;
    approveChore: (id: string) => void;
    rejectChore: (id: string, reason: string) => void;
    setCurrentUser: (name: string) => void;
    setFamilyMembers: (members: FamilyMember[]) => void;
    updateMemberAvatar: (name: string, avatar: string) => void;
    updateMemberName: (oldName: string, newName: string) => void;
    addFamilyMember: (member: Omit<FamilyMember, 'stats'>) => void;
    removeFamilyMember: (name: string) => void;
    resetToMockData: () => void;

    // Vacation mode
    vacationMode: { active: boolean; startDate: string; endDate: string } | null;
    setVacationMode: (mode: { active: boolean; startDate: string; endDate: string } | null) => void;

    // Market
    marketItems: MarketItem[];
    marketFlashSales: MarketFlashSale[];
    marketItemHistory: { name: string; emoji: string; pts: number; category: string; desc: string }[];
    setMarketItemHistory: (history: { name: string; emoji: string; pts: number; category: string; desc: string }[]) => void;
    setMarketItems: (items: MarketItem[]) => void;
    addMarketItem: (item: MarketItem) => void;
    updateMarketItem: (id: string, updates: Partial<MarketItem>) => void;
    deleteMarketItem: (id: string) => void;
    setMarketFlashSales: (sales: MarketFlashSale[]) => void;
    addMarketFlashSale: (sale: MarketFlashSale) => void;
    removeMarketFlashSale: (id: string) => void;

    // Wallet Bag
    walletBag: WalletBagItem[];
    setWalletBag: (bag: WalletBagItem[]) => void;
    addWalletBagItem: (item: WalletBagItem) => void;
    updateWalletBagItem: (id: string, updates: Partial<WalletBagItem>) => void;
    removeWalletBagItem: (id: string) => void;

    // Wallet Transactions (usage log)
    walletTransactions: WalletTransaction[];
    setWalletTransactions: (transactions: WalletTransaction[]) => void;
    addWalletTransaction: (tx: Omit<WalletTransaction, 'id'>) => void;

    // Home - Machines & Automations
    machines: HomeMachine[];
    automations: HomeAutomation[];
    setMachines: (machines: HomeMachine[]) => void;
    addMachine: (machine: Omit<HomeMachine, 'id'>) => void;
    updateMachine: (id: string, updates: Partial<HomeMachine>) => void;
    deleteMachine: (id: string) => void;
    setAutomations: (automations: HomeAutomation[]) => void;
    addAutomation: (automation: Omit<HomeAutomation, 'id'>) => void;
    updateAutomation: (id: string, updates: Partial<HomeAutomation>) => void;
    deleteAutomation: (id: string) => void;
}

export const useHuddleStore = create<HuddleState>((set) => ({
    snapshot: null,
    householdId: null,
    currentMemberId: null,
    currentUser: '',
    familyWidgets: [
        { id: 'hero_dinner', size: 'full' },
        { id: 'the_crew', size: 'full' },
        { id: 'recent_activity', size: 'full' },
        { id: 'chore_heatmap', size: 'full' },
        { id: 'chore_weekly', size: 'full' },
        { id: 'wishlist', size: 'full' },
        { id: 'announcements', size: 'full' },
        { id: 'family_goals', size: 'full' },
        { id: 'pet_tracker_buddy', size: 'half' },
        { id: 'pet_tracker_luna', size: 'half' },
        { id: 'emergency_contacts', size: 'full' },
        { id: 'quick_links', size: 'full' }
    ],
    wishlist: [],
    familyMembers: [],
    choreSort: null,
    choreFilter: { assignees: [], recurring: false, photoRequired: false, nudged: false, overdue: false },
    overdueExpanded: false,
    chores: [],
    sections: [],
    restockItems: [],
    recipes: [],
    weekMenu: {},
    pastMenus: [],
    menuPhase: 'voting',
    voteWeekId: '',
    announcements: [],
    goals: [],
    pets: [],
    birthdays: [],
    wifi: { ssid: '', password: '' },
    deliveries: [],
    pendingApprovals: [],

    // Actions
    setChoreSort: (choreSort) => set({ choreSort }),
    setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),
    setChoreFilter: (choreFilter) => set({ choreFilter }),
    updateMemberStats: (name, delta) => set((state) => ({
        familyMembers: state.familyMembers.map(m =>
            m.name !== name ? m : {
                ...m,
                stats: {
                    ...m.stats,
                    pointsEarned: m.stats.pointsEarned + (delta.pointsEarned ?? 0),
                    choresCompleted: m.stats.choresCompleted + (delta.choresCompleted ?? 0),
                    streak: delta.streak !== undefined ? delta.streak : m.stats.streak,
                }
            }
        )
    })),
    setOverdueExpanded: (overdueExpanded) => set({ overdueExpanded }),
    setChores: (chores) => set({ chores }),
    addChore: (chore) => set((state) => ({ chores: [...state.chores, { ...chore, id: chore.id ?? `c_${Date.now()}` }] })),
    updateChore: (id, updates) => set((state) => ({
        chores: state.chores.map((c) => (c.id === id ? { ...c, ...updates } : c))
    })),
    deleteChore: (id, scope?: 'instance' | 'series') => set((state) => ({
        chores: state.chores.map((c) => c.id === id ? { ...c, deletedAt: Date.now(), deleteScope: scope } : c)
    })),
    addChoreDeletedDate: (id, date) => set((state) => ({
        chores: state.chores.map((c) =>
            c.id === id
                ? { ...c, deletedDates: Array.from(new Set([...(c.deletedDates ?? []), date])) }
                : c
        )
    })),
    removeChoreDeletedDate: (id, date) => set((state) => ({
        chores: state.chores.map((c) =>
            c.id === id
                ? { ...c, deletedDates: (c.deletedDates ?? []).filter(d => d !== date) }
                : c
        )
    })),
    restoreChore: (id) => set((state) => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return {
            chores: state.chores.map((c) => {
                if (c.id !== id) return c;
                // For series-deleted recurring chores with a past dueDate, snap dueDate to today
                // to prevent stale overdue entries from appearing on restore
                const newDueDate = (c.deleteScope === 'series' && c.isRecurring && c.dueDate < today)
                    ? today
                    : c.dueDate;
                // For series-deleted recurring chores snapped to today: clear overdue state since dueDate is now today
                const snapped = newDueDate !== c.dueDate;
                return {
                    ...c,
                    deletedAt: undefined,
                    deleteScope: undefined,
                    deletedDates: undefined,
                    deletedFromDate: undefined,
                    dueDate: newDueDate,
                    due: newDueDate,
                    // Preserve overdue state unless we snapped dueDate (then it's no longer overdue)
                    isOverdue: snapped ? false : c.isOverdue,
                    overdueDays: snapped ? undefined : c.overdueDays,
                    wasOverdue: snapped ? (c.isOverdue || c.wasOverdue ? true : undefined) : c.wasOverdue,
                    missedStreak: c.missedStreak,
                    isOverdueRecovery: snapped ? undefined : c.isOverdueRecovery,
                };
            })
        };
    }),
    softDeleteChoresByGroup: (recurringGroupId, fromDate) => set((state) => {
        const now = Date.now();
        return {
            chores: state.chores.map((c) =>
                c.recurringGroupId === recurringGroupId && c.dueDate >= fromDate && !c.deletedAt
                    ? { ...c, deletedAt: now, deleteScope: c.deleteScope ?? ('series' as const) }
                    : c
            )
        };
    }),
    purgeDeletedChores: () => set((state) => {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return { chores: state.chores.filter((c) => !c.deletedAt || c.deletedAt > cutoff) };
    }),
    completeChore: (id) => set((state) => ({
        chores: state.chores.map((c) => (c.id === id ? { ...c, status: 'completed' as const } : c))
    })),

    setSections: (sections) => set({ sections }),
    addSection: (section) => set((state) => ({ sections: [...state.sections, section] })),
    updateSection: (id, updates) => set((state) => ({
        sections: state.sections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    })),
    deleteSection: (id) => set((state) => ({
        sections: state.sections.filter((s) => s.id !== id)
    })),

    restockCategoryOrder: null,
    setRestockCategoryOrder: (order) => set({ restockCategoryOrder: order }),
    restockExpandedCategories: {},
    setRestockExpandedCategories: (cats) => set({ restockExpandedCategories: cats }),
    setRestockItems: (restockItems) => set({ restockItems }),
    addRestockItem: (item) => set((state) => ({ restockItems: [...state.restockItems, { ...item, id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }] })),
    updateRestockItem: (id, updates) => set((state) => ({
        restockItems: state.restockItems.map((r) => (r.id === id ? { ...r, ...updates } : r))
    })),
    toggleRestockItem: (id) => set((state) => ({
        restockItems: state.restockItems.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted, completedAt: !r.isCompleted ? Date.now() : undefined } : r))
    })),
    deleteRestockItem: (id) => set((state) => ({
        restockItems: state.restockItems.filter((r) => r.id !== id)
    })),

    addRecipe: (recipe) => set((state) => ({
        recipes: [...state.recipes, { ...recipe, id: `rec_${Date.now()}`, votes: 0, votedBy: [] }]
    })),
    updateRecipe: (id, updates) => set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updates } : r))
    })),
    deleteRecipe: (id) => set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id)
    })),
    voteForRecipe: (recipeId, userName) => set((state) => ({
        recipes: state.recipes.map((r) => {
            if (r.id !== recipeId) return r;
            const alreadyVoted = r.votedBy.includes(userName);
            return {
                ...r,
                votes: alreadyVoted ? r.votes - 1 : r.votes + 1,
                votedBy: alreadyVoted ? r.votedBy.filter(u => u !== userName) : [...r.votedBy, userName]
            };
        })
    })),
    resetVotes: () => set((state) => ({
        recipes: state.recipes.map(r => ({ ...r, votes: 0, votedBy: [] }))
    })),

    updateWeekMenu: (updates) => set((state) => ({
        weekMenu: { ...state.weekMenu, ...updates } as WeekMenu
    })),
    updateDayMenu: (day, updates) => set((state) => ({
        weekMenu: { ...state.weekMenu, [day]: { ...state.weekMenu[day], ...updates } }
    })),
    finalizeMenu: (weekStarting) => set((state) => ({
        pastMenus: [{ id: `arch_${Date.now()}`, weekStarting, menu: { ...state.weekMenu } }, ...state.pastMenus],
        menuPhase: 'finalized'
    })),
    setMenuPhase: (menuPhase) => set({ menuPhase }),
    checkAndAdvanceVotingPhase: (familySize) => set((state) => {
        const now = new Date();
        const day = now.getDay(); // 0=Sun,1=Mon..6=Sat
        // ISO week id: "YYYY-Www"
        const jan4 = new Date(now.getFullYear(), 0, 4);
        const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
        const weekId = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        // New week started (Mon) — reset votes and open voting
        if (day === 1 && state.voteWeekId !== weekId) {
            return {
                voteWeekId: weekId,
                menuPhase: 'voting',
                recipes: state.recipes.map(r => ({ ...r, votes: 0, votedBy: [] })),
            };
        }
        // Sun 00:00 → close voting → move to results
        if (day === 0 && state.menuPhase === 'voting') {
            return { menuPhase: 'results' };
        }
        // 100% participation → move to results
        const totalVoters = new Set(state.recipes.flatMap(r => r.votedBy)).size;
        if (state.menuPhase === 'voting' && familySize > 0 && totalVoters >= familySize) {
            return { menuPhase: 'results' };
        }
        return {};
    }),
    startNextWeek: () => set((state) => ({
        weekMenu: { Mon: { type: 'home' }, Tue: { type: 'home' }, Wed: { type: 'home' }, Thu: { type: 'home' }, Fri: { type: 'home' }, Sat: { type: 'home' }, Sun: { type: 'home' } } as WeekMenu,
        recipes: state.recipes.map(r => ({ ...r, votes: 0, votedBy: [] })),
        menuPhase: 'voting',
    })),

    addAnnouncement: (a) => set((state) => ({
        announcements: [{ ...a, id: `a_${Date.now()}`, timestamp: Date.now(), reactions: {} }, ...state.announcements]
    })),
    updateAnnouncement: (id, updates) => set((state) => ({
        announcements: state.announcements.map((a) => (a.id === id ? { ...a, ...updates } : a))
    })),
    deleteAnnouncement: (id) => set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id)
    })),
    addAnnouncementReaction: (id, emoji, userName) => set((state) => ({
        announcements: state.announcements.map((a) => {
            if (a.id !== id) return a;
            const reactions = { ...(a.reactions || {}) };
            const users = reactions[emoji] || [];
            reactions[emoji] = users.includes(userName) ? users.filter(u => u !== userName) : [...users, userName];
            return { ...a, reactions };
        })
    })),

    addWishlistItem: (item) => set((state) => ({
        wishlist: [...state.wishlist, { ...item, id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, addedAt: Date.now() }]
    })),
    deleteWishlistItem: (id) => set((state) => ({ wishlist: state.wishlist.filter(w => w.id !== id) })),
    setFamilyWidgets: (familyWidgets) => set({ familyWidgets }),
    updateWidgetSize: (id, size) => set((state) => ({
        familyWidgets: state.familyWidgets.map((w) => (w.id === id ? { ...w, size } : w))
    })),
    reorderWidgets: (from, to) => set((state) => {
        const widgets = [...state.familyWidgets];
        const [moved] = widgets.splice(from, 1);
        widgets.splice(to, 0, moved);
        return { familyWidgets: widgets };
    }),
    addDelivery: (d) => set((state) => ({
        deliveries: [{ ...d, id: `d_${Date.now()}`, status: 'in-transit' }, ...state.deliveries]
    })),
    updateDelivery: (id, updates) => set((state) => ({
        deliveries: state.deliveries.map((d) => (d.id === id ? { ...d, ...updates } : d))
    })),
    deleteDelivery: (id) => set((state) => ({
        deliveries: state.deliveries.filter((d) => d.id !== id)
    })),
    approveChore: (id) => set((state) => ({
        pendingApprovals: state.pendingApprovals.filter(pa => pa.id !== id)
    })),
    rejectChore: (id, _reason) => set((state) => ({
        pendingApprovals: state.pendingApprovals.filter(pa => pa.id !== id)
    })),
    setCurrentUser: (name) => set({ currentUser: name }),
    setFamilyMembers: (familyMembers) => set({ familyMembers }),
    updateMemberAvatar: (name, avatar) => set((state) => ({
        familyMembers: state.familyMembers.map(m => m.name === name ? { ...m, avatar } : m),
    })),
    updateMemberName: (oldName, newName) => set((state) => ({
        familyMembers: state.familyMembers.map(m => m.name === oldName ? { ...m, name: newName } : m),
        currentUser: state.currentUser === oldName ? newName : state.currentUser,
    })),
    addFamilyMember: (member) => set((state) => ({
        familyMembers: [...state.familyMembers, { ...member, stats: { choresCompleted: 0, pointsEarned: 0, streak: 0 } }],
    })),
    removeFamilyMember: (name) => set((state) => ({
        familyMembers: state.familyMembers.filter(m => m.name !== name),
    })),
    resetToMockData: () => {
        if (__DEV__) set({ ...useHuddleStore.getInitialState(), ...createDemoHousehold() });
    },
    vacationMode: null,
    setVacationMode: (vacationMode) => set({ vacationMode }),

    marketItems: [],
    marketFlashSales: [],
    marketItemHistory: [],
    setMarketItemHistory: (marketItemHistory) => set({ marketItemHistory }),
    setMarketItems: (marketItems) => set({ marketItems }),
    addMarketItem: (item) => set((state) => {
        const entry = { name: item.name, emoji: item.emoji, pts: item.pts, category: item.category, desc: item.desc };
        const alreadyInHistory = state.marketItemHistory.some(h => h.name.toLowerCase() === item.name.toLowerCase());
        return {
            marketItems: [...state.marketItems, item],
            marketItemHistory: alreadyInHistory ? state.marketItemHistory : [...state.marketItemHistory, entry],
        };
    }),
    updateMarketItem: (id, updates) => set((state) => ({
        marketItems: state.marketItems.map(i => i.id === id ? { ...i, ...updates } : i),
    })),
    deleteMarketItem: (id) => set((state) => ({
        marketItems: state.marketItems.filter(i => i.id !== id),
    })),
    setMarketFlashSales: (marketFlashSales) => set({ marketFlashSales }),
    addMarketFlashSale: (sale) => set((state) => ({ marketFlashSales: [...state.marketFlashSales, sale] })),
    removeMarketFlashSale: (id) => set((state) => ({
        marketFlashSales: state.marketFlashSales.filter(s => s.id !== id),
    })),

    walletBag: [],
    setWalletBag: (walletBag) => set({ walletBag }),
    addWalletBagItem: (item) => set((state) => ({ walletBag: [...state.walletBag, item] })),
    updateWalletBagItem: (id, updates) => set((state) => ({
        walletBag: state.walletBag.map(b => b.id === id ? { ...b, ...updates } : b),
    })),
    removeWalletBagItem: (id) => set((state) => ({
        walletBag: state.walletBag.filter(b => b.id !== id),
    })),

    walletTransactions: [],
    setWalletTransactions: (walletTransactions) => set({ walletTransactions }),
    addWalletTransaction: (tx) => set((state) => ({
        walletTransactions: [{ ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...state.walletTransactions],
    })),

    machines: [],
    automations: [],
    setMachines: (machines) => set({ machines }),
    addMachine: (machine) => set((state) => ({
        machines: [...state.machines, { ...machine, id: `machine_${Date.now()}` }],
    })),
    updateMachine: (id, updates) => set((state) => ({
        machines: state.machines.map(m => m.id === id ? { ...m, ...updates } : m),
    })),
    deleteMachine: (id) => set((state) => ({
        machines: state.machines.filter(m => m.id !== id),
    })),
    setAutomations: (automations) => set({ automations }),
    addAutomation: (automation) => set((state) => ({
        automations: [...state.automations, { ...automation, id: `auto_${Date.now()}` }],
    })),
    updateAutomation: (id, updates) => set((state) => ({
        automations: state.automations.map(a => a.id === id ? { ...a, ...updates } : a),
    })),
    deleteAutomation: (id) => set((state) => ({
        automations: state.automations.filter(a => a.id !== id),
    })),
}));

/** Clear every household field, including drafts and UI filters, on identity change. */
export function resetHouseholdState() {
    useHuddleStore.setState(useHuddleStore.getInitialState(), true);
}
