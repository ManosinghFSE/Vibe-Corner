# 📊 Vibe Cooler - Dummy Data Summary

## 🎯 Overview

This document provides a comprehensive overview of all dummy data created for the Vibe Cooler application, including Bill Splitter, Skill Swap, and enhanced Event Grid with images.

## 👥 Demo Users

### **Total Users: 96**
- **Admin Users**: 1 (Admin Root)
- **Manager Users**: 2 (Jane Manager, Mike Manager)
- **Regular Users**: 93 (Alex Patel through Lillian Diaz)

### **User Distribution:**
- **Geographic Diversity**: Users from various cultural backgrounds
- **Role Distribution**: Mix of admin, manager, and regular users
- **Email Format**: `name@vibecorneras.local`
- **Password Format**: `Pass!role#` (e.g., `Pass!user1`, `Pass!manager1`)

## 💰 Bill Splitter Data

### **Groups Created: 15**
1. **Weekend Trip Squad** (5 members) - Adventure seekers group
2. **Office Lunch Group** (8 members) - Daily lunch buddies
3. **Roommates** (3 members) - Apartment sharing expenses
4. **Family Vacation** (6 members) - Annual family trip
5. **Book Club** (4 members) - Monthly book discussions
6. **Gaming Night Crew** (7 members) - Weekly gaming sessions
7. **Hiking Buddies** (4 members) - Outdoor adventure group
8. **Birthday Party Planning** (10 members) - Special celebration planning
9. **Team Building Event** (12 members) - Corporate team activities
10. **Bachelor Party** (8 members) - Pre-wedding celebration
11. **Girls Night Out** (6 members) - Monthly girls gathering
12. **Guys Weekend** (5 members) - Men's weekend activities
13. **Study Group** (4 members) - Academic study sessions
14. **Fitness Buddies** (3 members) - Gym and workout partners
15. **Travel Enthusiasts** (7 members) - International travel group

### **Bills Generated: 45-120**
- **3-8 bills per group** (random distribution)
- **Bill Types**: Restaurant, Groceries, Activities, Mixed
- **Bill Amounts**: $20-$320 per bill
- **Total Spent**: Varies by group (calculated dynamically)

### **Venues & Activities:**
- **Restaurants**: 20 different venues (The Gourmet Kitchen, Pizza Paradise, etc.)
- **Activities**: 19 different activities (Movie tickets, Concert tickets, etc.)
- **Expense Categories**: 10 categories (Restaurant, Groceries, Transportation, etc.)

### **Sample Bill Data:**
```json
{
  "id": "uuid",
  "groupId": "group-uuid",
  "title": "Dinner at The Gourmet Kitchen",
  "description": "Group dinner at The Gourmet Kitchen",
  "currency": "USD",
  "total": 156.50,
  "itemCount": 6,
  "status": "settled",
  "createdAt": "2024-12-01T18:30:00.000Z"
}
```

## 🎓 Skill Swap Data

### **Skill Categories: 7**
1. **Programming** (31 skills) - JavaScript, Python, React, Node.js, etc.
2. **Design** (19 skills) - UI/UX Design, Graphic Design, Figma, etc.
3. **Business** (19 skills) - Project Management, Agile/Scrum, Marketing, etc.
4. **Creative** (18 skills) - Photography, Videography, Content Creation, etc.
5. **Language** (19 skills) - English, Spanish, French, German, etc.
6. **Technical** (19 skills) - Data Science, Machine Learning, Cybersecurity, etc.
7. **Soft Skills** (17 skills) - Communication, Problem Solving, Leadership, etc.

### **User Skills Generated:**
- **3-10 skills per user** (random distribution)
- **Skill Levels**: Beginner, Intermediate, Advanced, Expert
- **Experience**: 1-10 years per skill
- **Availability**: Available, Busy, Limited, Not Available

### **Skill Requests: 20-50**
- **Status**: Open, In Progress, Completed, Cancelled
- **Request Types**: Learning requests for various skills
- **Time Range**: Last 90 days

### **Skill Exchanges: 15-40**
- **Exchange Types**: Skill-for-skill trades between users
- **Status**: Proposed, Accepted, In Progress, Completed, Cancelled
- **Time Range**: Last 60 days

### **Skill Matches: Dynamic**
- **Match Algorithm**: Based on skill availability and request requirements
- **Match Score**: 60-100 (calculated based on skill level and availability)
- **Status**: Pending, Accepted, Rejected, Completed

### **Sample Skill Data:**
```json
{
  "id": "uuid",
  "userEmail": "alex.patel@vibecorneras.local",
  "skill": "React",
  "category": "Programming",
  "level": "Advanced",
  "experience": 5,
  "availability": "Available",
  "description": "I can help with React and have 5 years of experience."
}
```

## 📅 Event Grid with Images

### **Event Types & Images:**
1. **Team Building Events**
   - Images: Group collaboration, team activities, office teamwork
   - Tags: team-building, collaboration, corporate

2. **Training Events**
   - Images: Learning sessions, workshops, educational content
   - Tags: training, learning, workshop

3. **Social Events**
   - Images: Social gatherings, parties, celebrations
   - Tags: social, party, celebration

4. **Tech Talks**
   - Images: Technology presentations, coding sessions, tech discussions
   - Tags: tech-talk, technology, programming

5. **Workshops**
   - Images: Hands-on learning, interactive sessions, skill development
   - Tags: workshop, hands-on, interactive

6. **Networking Events**
   - Images: Professional networking, business meetings, connections
   - Tags: networking, professional, business

7. **Wellness Events**
   - Images: Health and wellness activities, meditation, fitness
   - Tags: wellness, health, fitness

8. **Outdoor Events**
   - Images: Outdoor activities, nature, adventure
   - Tags: outdoor, adventure, nature

9. **Creative Events**
   - Images: Creative workshops, art sessions, design activities
   - Tags: creative, art, design

### **Image Sources:**
- **Primary Source**: Unsplash (high-quality, free images)
- **Image Format**: 800x600 pixels, optimized for web
- **Image Categories**: 9 main categories with 3 images each
- **Default Images**: 5 fallback images for any event type

### **Sample Event Data:**
```json
{
  "id": "uuid",
  "title": "React Workshop for Beginners",
  "description": "Learn React fundamentals in this hands-on workshop",
  "startAt": "2024-12-15T10:00:00.000Z",
  "endAt": "2024-12-15T16:00:00.000Z",
  "location": "Conference Room A",
  "organizerName": "Alex Patel",
  "capacity": 20,
  "tags": ["workshop", "training", "react"],
  "imageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop",
  "attendeeCount": 15
}
```

## 🔧 Technical Implementation

### **Data Generation Features:**
- **Realistic Data**: Based on real-world scenarios and user behaviors
- **Dynamic Relationships**: Users are properly linked across different modules
- **Time-based Data**: Created dates span realistic time periods
- **Status Tracking**: Various statuses for different lifecycle stages
- **Calculated Fields**: Totals, counts, and statistics computed dynamically

### **Data Storage:**
- **In-Memory Maps**: Fast access and manipulation
- **UUID Generation**: Unique identifiers for all entities
- **JSON Serialization**: Easy export and import capabilities
- **Relationship Management**: Proper foreign key relationships

### **API Endpoints:**
- **Bill Splitter**: `/api/billsplitter/*` (groups, bills, items, settlements)
- **Skill Swap**: `/api/skillswap/*` (skills, requests, exchanges, matches)
- **Event Grid**: `/api/eventgrid/*` (events, RSVPs, statistics)

## 📊 Statistics Summary

### **Bill Splitter Stats:**
- **Groups**: 15
- **Bills**: 45-120 (varies by run)
- **Items**: 90-240 (varies by run)
- **Settlements**: Calculated dynamically
- **Total Spent**: $1,000-$5,000 (varies by run)

### **Skill Swap Stats:**
- **Users with Skills**: 96 (all demo users)
- **Total Skills**: 288-960 (3-10 per user)
- **Skill Requests**: 20-50
- **Skill Exchanges**: 15-40
- **Skill Matches**: Dynamic based on requests

### **Event Grid Stats:**
- **Total Events**: 50-100 (varies by run)
- **Event Types**: 9 categories
- **Image Coverage**: 100% (every event has an appropriate image)
- **RSVP Data**: Realistic attendance patterns

## 🚀 Usage Instructions

### **Accessing the Data:**
1. **Start Backend**: `cd backend && npm start`
2. **API Endpoints**: All data accessible via REST APIs
3. **Frontend Integration**: Data automatically loaded in frontend components
4. **Real-time Updates**: Data persists in memory during session

### **Testing the Data:**
- **Bill Splitter**: Navigate to `/billsplitter` in the app
- **Skill Swap**: Navigate to `/skillswap` in the app
- **Event Grid**: Navigate to `/eventgrid` in the app
- **API Testing**: Use `/api/health` to verify backend is running

### **Data Customization:**
- **Modify Mock Files**: Edit files in `backend/src/mock/`
- **Add New Categories**: Extend skill categories and event types
- **Adjust Quantities**: Change generation parameters in mock functions
- **Update Images**: Modify image URLs in event grid

## 🎉 Benefits

### **Development Benefits:**
- **Realistic Testing**: Data mimics real user behavior
- **UI Development**: Rich data for frontend development
- **Feature Testing**: Comprehensive scenarios for all features
- **Performance Testing**: Large datasets for performance validation

### **User Experience Benefits:**
- **Immediate Value**: Users see realistic data immediately
- **Feature Discovery**: Users can explore all features with sample data
- **Visual Appeal**: High-quality images enhance event presentation
- **Engagement**: Realistic scenarios encourage user interaction

### **Business Benefits:**
- **Demo Ready**: Application ready for demonstrations
- **User Onboarding**: New users can immediately understand features
- **Stakeholder Presentations**: Rich data for business presentations
- **Feature Validation**: Realistic data validates feature requirements

---

**Created**: December 2024  
**Status**: ✅ Complete and Ready for Use  
**Coverage**: 100% of requested features with realistic, comprehensive data 