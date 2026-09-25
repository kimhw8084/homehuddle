import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

import { Chore, Section } from '../types/chores';
import { INITIAL_CHORES, INITIAL_SECTIONS } from '../constants/mockData';
import { computeNextDate } from '../utils/dateUtils';

// ─── Market Types ────────────────────────────────────────────────
export type MarketPriceEntry = { date: string; pts: number };

export type MarketItem = {
    id: string;
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
    name: string;
    avatar: string;
    role: 'Parent' | 'Child';
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

interface HuddleState {
    // Data
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
    walletTransactions: { id: string; member: string; label: string; pts: number; date: string; icon: string }[];
    addWalletTransaction: (tx: { member: string; label: string; pts: number; date: string; icon: string }) => void;

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

const T = (m: number) => Date.now() - 1000 * 60 * m;

export const useHuddleStore = create<HuddleState>((set) => ({
    currentUser: 'Haewon Kim',
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
    familyMembers: [
        { name: 'Haewon Kim', avatar: '👨🏻', role: 'Parent', pool: 'Parents', stats: { choresCompleted: 42, pointsEarned: 1250, streak: 5 } },
        { name: 'Sarah Kim', avatar: '👩🏻', role: 'Parent', pool: 'Parents', stats: { choresCompleted: 38, pointsEarned: 1100, streak: 3 } },
        { name: 'Leo Kim', avatar: '👦🏻', role: 'Child', pool: 'Kids', stats: { choresCompleted: 25, pointsEarned: 850, streak: 7 } },
    ],
    choreSort: null,
    choreFilter: { assignees: [], recurring: false, photoRequired: false, nudged: false, overdue: false },
    overdueExpanded: false,
    chores: INITIAL_CHORES,
    sections: INITIAL_SECTIONS,
    restockItems: [
        { id: 'r1', name: 'Whole Milk', category: 'Dairy & Eggs', addedBy: { name: 'Mom', avatar: '👩🏼‍🦰' }, isUrgent: true, isStaple: true, isCompleted: false, addedAt: T(10), qty: 1, unit: 'gal', store: 'Costco', brand: 'Organic Valley' },
        { id: 'r2', name: 'Eggs', category: 'Dairy & Eggs', addedBy: { name: 'Dad', avatar: '👨🏼‍💻' }, isUrgent: true, isStaple: true, isCompleted: false, addedAt: T(90), qty: 2, unit: 'dozen', store: 'Costco', brand: 'Kirkland', tags: ['🌱 Organic'] },
        { id: 'r3', name: 'Sourdough Bread', category: 'Bakery & Bread', addedBy: { name: 'Mom', avatar: '👩🏼‍' }, isUrgent: false, isStaple: true, isCompleted: false, addedAt: T(200), qty: 1, unit: 'loaf', store: 'Trader Joe\'s' },
    ],
    recipes: [
        { id: 'rec1', name: 'Margherita Pizza', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca', cuisine: 'Italian', emoji: '🍕', prepTime: '45m', difficulty: 'Medium', tags: ['Italian', 'Vegetarian'], ingredients: ['Flour', 'Yeast', 'Tomato Sauce', 'Mozzarella', 'Basil'], addedBy: 'Haewon Kim', votes: 2, votedBy: ['Haewon Kim', 'Leo Kim'] },
        { id: 'rec2', name: 'Salmon Teriyaki', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288', cuisine: 'Asian', emoji: '🍣', prepTime: '30m', difficulty: 'Easy', tags: ['Asian', 'Healthy'], ingredients: ['Salmon', 'Teriyaki Sauce', 'Broccoli', 'Rice'], addedBy: 'Sarah Kim', votes: 1, votedBy: ['Sarah Kim'] },
        { id: 'rec3', name: 'Beef Tacos', emoji: '🌮', cuisine: 'Mexican', prepTime: '20m', difficulty: 'Easy', tags: ['Quick', 'Family Favorite'], ingredients: ['Ground Beef', 'Taco Shells', 'Lettuce', 'Cheese'], addedBy: 'Haewon Kim', votes: 0, votedBy: [] },
        { id: 'rec4', name: 'Chicken Fried Rice', emoji: '🍚', cuisine: 'Asian', prepTime: '25m', difficulty: 'Easy', tags: ['Quick', 'Kids Love'], ingredients: ['Rice', 'Chicken', 'Eggs', 'Soy Sauce', 'Green Onion'], addedBy: 'Sarah Kim', votes: 3, votedBy: ['Sarah Kim', 'Haewon Kim', 'Leo Kim'] },
        { id: 'rec5', name: 'BBQ Ribs', emoji: '🍖', cuisine: 'American', prepTime: '3h', difficulty: 'Hard', tags: ['Weekend', 'BBQ'], ingredients: ['Ribs', 'BBQ Sauce', 'Brown Sugar', 'Paprika'], addedBy: 'Haewon Kim', votes: 1, votedBy: ['Leo Kim'] },
        { id: 'rec6', name: 'Chicken Tikka Masala', emoji: '🍛', cuisine: 'Indian', prepTime: '50m', difficulty: 'Medium', tags: ['Flavorful', 'Spicy'], ingredients: ['Chicken', 'Tomatoes', 'Cream', 'Garam Masala', 'Ginger'], addedBy: 'Sarah Kim', votes: 2, votedBy: ['Sarah Kim', 'Haewon Kim'] },
        { id: 'rec7', name: 'Korean Bibimbap', emoji: '🥘', cuisine: 'Korean', prepTime: '40m', difficulty: 'Medium', tags: ['Healthy', 'Korean'], ingredients: ['Rice', 'Mixed Vegetables', 'Egg', 'Gochujang', 'Sesame Oil'], addedBy: 'Haewon Kim', votes: 2, votedBy: ['Haewon Kim', 'Leo Kim'] },
        { id: 'rec8', name: 'Spaghetti Bolognese', emoji: '🍝', cuisine: 'Italian', prepTime: '1h', difficulty: 'Medium', tags: ['Italian', 'Comfort'], ingredients: ['Spaghetti', 'Ground Beef', 'Tomatoes', 'Onion', 'Garlic'], addedBy: 'Sarah Kim', votes: 1, votedBy: ['Leo Kim'] },
        { id: 'rec9', name: 'Butter Chicken', emoji: '🍗', cuisine: 'Indian', prepTime: '45m', difficulty: 'Medium', tags: ['Creamy', 'Indian'], ingredients: ['Chicken', 'Butter', 'Cream', 'Tomato Puree', 'Spices'], addedBy: 'Haewon Kim', votes: 0, votedBy: [] },
        { id: 'rec10', name: 'Greek Salad with Pita', emoji: '🥗', cuisine: 'Greek', prepTime: '15m', difficulty: 'Easy', tags: ['Light', 'Quick'], ingredients: ['Cucumber', 'Tomato', 'Feta', 'Olives', 'Pita'], addedBy: 'Sarah Kim', votes: 0, votedBy: [] },
        { id: 'rec11', name: 'Shrimp Stir Fry', emoji: '🍤', cuisine: 'Asian', prepTime: '20m', difficulty: 'Easy', tags: ['Quick', 'Seafood'], ingredients: ['Shrimp', 'Bell Peppers', 'Snap Peas', 'Oyster Sauce', 'Ginger'], addedBy: 'Haewon Kim', votes: 0, votedBy: [] },
        { id: 'rec12', name: 'Classic Cheeseburger', emoji: '🍔', cuisine: 'American', prepTime: '25m', difficulty: 'Easy', tags: ['Kids Love', 'Weekend'], ingredients: ['Ground Beef', 'Burger Bun', 'Cheese', 'Lettuce', 'Tomato'], addedBy: 'Leo Kim', votes: 1, votedBy: ['Leo Kim'] },
        { id: 'rec13', name: 'Pad Thai', emoji: '🍜', cuisine: 'Thai', prepTime: '30m', difficulty: 'Medium', tags: ['Thai', 'Noodles'], ingredients: ['Rice Noodles', 'Tofu', 'Bean Sprouts', 'Tamarind', 'Peanuts'], addedBy: 'Sarah Kim', votes: 0, votedBy: [] },
        { id: 'rec14', name: 'Avocado Toast Breakfast', emoji: '🥑', cuisine: 'Healthy', prepTime: '10m', difficulty: 'Easy', tags: ['Breakfast', 'Quick'], ingredients: ['Sourdough', 'Avocado', 'Egg', 'Red Pepper Flakes', 'Lemon'], addedBy: 'Haewon Kim', votes: 0, votedBy: [] },
        { id: 'rec15', name: 'Ramen Bowl', emoji: '🍜', cuisine: 'Japanese', prepTime: '40m', difficulty: 'Medium', tags: ['Comfort', 'Soup'], ingredients: ['Ramen Noodles', 'Pork Belly', 'Soft Egg', 'Nori', 'Miso Broth'], addedBy: 'Haewon Kim', votes: 2, votedBy: ['Haewon Kim', 'Sarah Kim'] },
    ],
    weekMenu: {
        'Mon': { recipeId: 'rec1', recipeName: 'Margherita Pizza', cook: 'Haewon Kim', type: 'home' },
        'Tue': { recipeId: 'rec2', recipeName: 'Salmon Teriyaki', cook: 'Sarah Kim', type: 'home' },
        'Wed': { type: 'dining_out', note: 'Pizza Night Out' },
        'Thu': { recipeId: 'rec4', recipeName: 'Chicken Fried Rice', cook: 'Sarah Kim', type: 'home' },
        'Fri': { type: 'leftovers' },
        'Sat': { type: 'to_go', note: 'Thai Takeout' },
        'Sun': { recipeId: 'rec5', recipeName: 'BBQ Ribs', cook: 'Haewon Kim', type: 'home' }
    },
    pastMenus: [
        { id: 'arch_1', weekStarting: '2026-04-14', menu: { 'Mon': { type: 'home', recipeName: 'Beef Tacos', cook: 'Haewon Kim' }, 'Tue': { type: 'home', recipeName: 'Salmon Teriyaki', cook: 'Sarah Kim' }, 'Wed': { type: 'dining_out', note: 'Chipotle' }, 'Thu': { type: 'home', recipeName: 'Chicken Tikka Masala', cook: 'Sarah Kim' }, 'Fri': { type: 'leftovers' }, 'Sat': { type: 'to_go', note: 'Japanese' }, 'Sun': { type: 'home', recipeName: 'Sunday Roast', cook: 'Haewon Kim' } } },
        { id: 'arch_2', weekStarting: '2026-04-07', menu: { 'Mon': { type: 'home', recipeName: 'Margherita Pizza', cook: 'Leo Kim' }, 'Tue': { type: 'dining_out', note: 'Korean BBQ' }, 'Wed': { type: 'home', recipeName: 'Chicken Fried Rice', cook: 'Sarah Kim' }, 'Thu': { type: 'to_go', note: 'Subway' }, 'Fri': { type: 'leftovers' }, 'Sat': { type: 'home', recipeName: 'BBQ Ribs', cook: 'Haewon Kim' }, 'Sun': { type: 'home', recipeName: 'Korean Bibimbap', cook: 'Haewon Kim' } } },
        { id: 'arch_3', weekStarting: '2026-03-31', menu: { 'Mon': { type: 'home', recipeName: 'Salmon Teriyaki', cook: 'Sarah Kim' }, 'Tue': { type: 'home', recipeName: 'Beef Tacos', cook: 'Leo Kim' }, 'Wed': { type: 'dining_out', note: 'Thai Palace' }, 'Thu': { type: 'home', recipeName: 'Margherita Pizza', cook: 'Haewon Kim' }, 'Fri': { type: 'leftovers' }, 'Sat': { type: 'home', recipeName: 'BBQ Ribs', cook: 'Haewon Kim' }, 'Sun': { type: 'to_go', note: 'Dim Sum' } } },
    ],
    menuPhase: 'voting',
    voteWeekId: '',
    announcements: [
        { 
            id: 'a1', 
            title: 'Grandparents visiting!', 
            content: 'Grandma and Grandpa are both visiting this weekend — please clean your rooms by Friday evening!', 
            type: 'info', 
            author: 'Mom', 
            timestamp: T(120), 
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
            style: 'instagram',
            color: '#E1306C',
            reactions: { '❤️': ['Dad', 'Alex'], '🎉': ['Emma'] }
        },
        { 
            id: 'a2', 
            title: 'Soccer Practice', 
            content: 'Alex has soccer practice at 5 PM. Don\'t forget your cleats!', 
            type: 'reminder', 
            author: 'Dad', 
            timestamp: T(300),
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 2,
            style: 'classic',
            color: '#6366F1'
        },
    ],
    goals: [
        { id: 'g1', title: 'New Outdoor Grill', target: 5000, current: 3250, color: '#6366F1' },
        { id: 'g2', title: 'Summer Vacation', target: 10000, current: 4500, color: '#10B981' },
    ],
    pets: [
        { id: 'pet1', name: 'Buddy', type: 'Dog', avatar: '🐶', lastFed: T(45), lastWalked: T(180) },
        { id: 'pet2', name: 'Luna', type: 'Cat', avatar: '🐱', lastFed: T(120) },
    ],
    birthdays: [
        { name: 'Dad', date: '05-12', avatar: '👨🏻' },
        { name: 'Lily', date: '08-24', avatar: '👧🏻' },
    ],
    wifi: { ssid: 'Huddle_Home_5G', password: 'happy-family-2024' },
    deliveries: [
        { id: 'd1', carrier: 'Amazon', item: 'Kitchen Scale', window: '2pm - 5pm', signatureRequired: false, status: 'in-transit', day: 'Today', date: (() => { const d = new Date(); d.setHours(14,0,0,0); return d.toISOString(); })() },
        { id: 'd2', carrier: 'FedEx', item: 'Office Chair', window: '9am - 12pm', signatureRequired: true, status: 'in-transit', day: 'Tomorrow', isHeavy: true, date: (() => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d.toISOString(); })() },
        { id: 'd3', carrier: 'UPS', item: 'Dog Food', window: 'By End of Day', signatureRequired: false, status: 'delivered', day: 'Today', confirmedBy: ['Dad'], date: (() => { const d = new Date(); d.setHours(16,0,0,0); return d.toISOString(); })() },
        { id: 'd4', carrier: 'Amazon', item: 'Laptop Stand', window: '10am - 1pm', signatureRequired: false, status: 'delivered', day: 'Upcoming', confirmedBy: ['Mom', 'Dad'], date: (() => { const d = new Date(); d.setDate(d.getDate()-2); d.setHours(10,0,0,0); return d.toISOString(); })() },
        { id: 'd5', carrier: 'USPS', item: 'Birthday Cards', window: '12pm - 3pm', signatureRequired: false, status: 'delivered', day: 'Upcoming', confirmedBy: [], date: (() => { const d = new Date(); d.setDate(d.getDate()-5); d.setHours(12,0,0,0); return d.toISOString(); })() },
        { id: 'd6', carrier: 'FedEx', item: 'Winter Jacket', window: '2pm - 6pm', signatureRequired: true, status: 'delivered', day: 'Upcoming', isFragile: false, confirmedBy: ['Mom'], date: (() => { const d = new Date(); d.setDate(d.getDate()-8); d.setHours(14,0,0,0); return d.toISOString(); })() },
        { id: 'd7', carrier: 'DHL', item: 'Art Supplies', window: 'By End of Day', signatureRequired: false, status: 'delivered', day: 'Upcoming', confirmedBy: ['Alex'], date: (() => { const d = new Date(); d.setDate(d.getDate()-12); d.setHours(15,0,0,0); return d.toISOString(); })() },
        { id: 'd8', carrier: 'Amazon', item: 'Blender', window: '9am - 1pm', signatureRequired: false, status: 'delivered', day: 'Upcoming', confirmedBy: ['Dad', 'Lily'], date: (() => { const d = new Date(); d.setDate(d.getDate()-3); d.setHours(11,0,0,0); return d.toISOString(); })() },
    ],
    pendingApprovals: [
        { id: 'pa1', kid: 'Alex', title: 'Cleaned Bedroom', points: 50, submittedAt: T(30), photoRequired: true, photos: ['https://example.com/clean_room.jpg'], comments: [] },
        { id: 'pa2', kid: 'Lily', title: 'Watered Plants', points: 20, submittedAt: T(60), photoRequired: false, comments: [{ author: 'Lily', text: 'I did a great job!', time: T(55) }] },
    ],

    // Actions
    setChoreSort: (choreSort) => set({ choreSort }),
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
    resetToMockData: () => set({ sections: INITIAL_SECTIONS, chores: INITIAL_CHORES }),
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
