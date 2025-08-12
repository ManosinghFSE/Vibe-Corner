class RecommendationsService {
  constructor() {
    this.holidays = this.generateHolidays();
    this.ageGroups = {
      'child': { min: 0, max: 12, preferences: ['toys', 'games', 'books', 'outdoor'] },
      'teen': { min: 13, max: 19, preferences: ['tech', 'fashion', 'music', 'gaming'] },
      'youngAdult': { min: 20, max: 35, preferences: ['experiences', 'tech', 'travel', 'fitness'] },
      'adult': { min: 36, max: 55, preferences: ['home', 'wellness', 'dining', 'hobbies'] },
      'senior': { min: 56, max: 100, preferences: ['comfort', 'health', 'family', 'leisure'] }
    };
    this.familyTypes = {
      'single': { budgetMultiplier: 1, activities: ['solo travel', 'personal development', 'networking'] },
      'couple': { budgetMultiplier: 1.5, activities: ['romantic dinners', 'couple activities', 'weekend getaways'] },
      'youngFamily': { budgetMultiplier: 2, activities: ['family outings', 'educational', 'kid-friendly'] },
      'largeFamily': { budgetMultiplier: 2.5, activities: ['group activities', 'budget-friendly', 'outdoor'] }
    };
  }

  generateHolidays() {
    const year = new Date().getFullYear();
    return [
      { name: "New Year's Day", date: `${year}-01-01`, type: 'holiday' },
      { name: "Valentine's Day", date: `${year}-02-14`, type: 'holiday' },
      { name: "Independence Day", date: `${year}-07-04`, type: 'holiday' },
      { name: "Halloween", date: `${year}-10-31`, type: 'holiday' },
      { name: "Thanksgiving", date: `${year}-11-28`, type: 'holiday' },
      { name: "Christmas", date: `${year}-12-25`, type: 'holiday' }
    ];
  }

  getUpcomingEvents(userId, days = 30) {
    const events = [];
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + Number(days || 30));

    // Holidays in window
    this.holidays.forEach(holiday => {
      const d = new Date(holiday.date);
      d.setFullYear(today.getFullYear());
      if (d < today) d.setFullYear(today.getFullYear() + 1);
      if (d >= today && d <= endDate) {
        events.push({
          id: `holiday-${holiday.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'holiday',
          title: holiday.name,
          date: d.toISOString(),
        });
      }
    });

    // Sort by soonest
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    return events;
  }

  generateRecommendations(userId) {
    const recommendations = [];
    const upcomingEvents = this.getUpcomingEvents(userId, 30);
    const familyInfo = this.familyTypes['adult'];

    upcomingEvents.forEach(event => {
      const budget = this.calculateHolidayBudget('celebration', familyInfo);
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random()}`,
        eventId: event.title,
        type: 'holiday',
        title: `${event.title} Planning`,
        description: `Get ready for ${event.title}`,
        date: event.date,
        suggestions: this.generateHolidaySuggestions('celebration').map(item => ({ item, price: Math.random() * budget * 0.5 })),
        activities: this.generateHolidayActivities('celebration', familyInfo),
        budget: budget,
        priority: this.calculatePriority(event.date),
        animation: this.getRandomAnimation()
      });
    });
    return recommendations;
  }

  calculateBudget(ageGroup, familyInfo) { const baseBudget = { child: 50, teen: 75, youngAdult: 100, adult: 150, senior: 100 }; return baseBudget[ageGroup.name] * familyInfo.budgetMultiplier; }
  calculateHolidayBudget() { return 200; }
  generateGiftSuggestions(ageGroup, budget) { return [{ item: 'Experience Voucher', price: budget * 0.5, category: 'experiences' }]; }
  generateActivitySuggestions(ageGroup, familyInfo) { return [{ name: 'Cooking class', participants: familyInfo.activities[0], duration: '2-4 hours' }]; }
  generateHolidaySuggestions() { return ['Party supplies','Decorations','Special menu']; }
  generateHolidayActivities() { return [{ name: 'Game night', suitability: 'family', estimated_cost: 50 }]; }
  calculatePriority(eventDate) { const daysUntil = Math.floor((new Date(eventDate) - new Date()) / (1000 * 60 * 60 * 24)); if (daysUntil <= 3) return 'urgent'; if (daysUntil <= 7) return 'high'; if (daysUntil <= 14) return 'medium'; return 'low'; }
  getRandomAnimation() { return 'fadeIn'; }
}

export const recommendationsService = new RecommendationsService(); 