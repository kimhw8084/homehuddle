import type { HuddleState } from '../store/huddleStore';
import { INITIAL_CHORES, INITIAL_SECTIONS } from '../constants/mockData';

// Explicit development fixtures. Never hydrated into a signed-in account.
export function createDemoHousehold(): Pick<HuddleState, 'currentUser' | 'familyMembers' | 'chores' | 'sections' | 'restockItems' | 'recipes' | 'weekMenu' | 'pastMenus' | 'announcements' | 'goals' | 'pets' | 'birthdays' | 'wifi' | 'deliveries' | 'pendingApprovals'> {
    const T = (m: number) => Date.now() - 1000 * 60 * m;
    return {
    currentUser: 'Haewon Kim',
    familyMembers: [
        { name: 'Haewon Kim', avatar: '👨🏻', role: 'Parent', pool: 'Parents', stats: { choresCompleted: 42, pointsEarned: 1250, streak: 5 } },
        { name: 'Sarah Kim', avatar: '👩🏻', role: 'Parent', pool: 'Parents', stats: { choresCompleted: 38, pointsEarned: 1100, streak: 3 } },
        { name: 'Leo Kim', avatar: '👦🏻', role: 'Child', pool: 'Kids', stats: { choresCompleted: 25, pointsEarned: 850, streak: 7 } },
    ],
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
    };
}
