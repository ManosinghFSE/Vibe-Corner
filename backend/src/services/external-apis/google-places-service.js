import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.mockMode = !this.apiKey; // Use mock data if no API key
  }

  // Search for places
  async searchPlaces(query, location, radius = 5000, type = null) {
    if (this.mockMode) {
      return this.getMockSearchResults(query, location, radius, type);
    }

    try {
      const params = {
        key: this.apiKey,
        query,
        location: `${location.lat},${location.lng}`,
        radius,
        type
      };

      const response = await axios.get(`${this.baseUrl}/textsearch/json`, { params });
      return this.transformSearchResults(response.data.results);
    } catch (error) {
      console.error('Google Places search error:', error);
      return this.getMockSearchResults(query, location, radius, type);
    }
  }

  // Get place details
  async getPlaceDetails(placeId) {
    if (this.mockMode) {
      return this.getMockPlaceDetails(placeId);
    }

    try {
      const params = {
        key: this.apiKey,
        place_id: placeId,
        fields: 'name,rating,formatted_phone_number,opening_hours,website,price_level,reviews,photos,geometry,types,business_status,editorial_summary,serves_vegetarian_food,serves_vegan_food,wheelchair_accessible_entrance'
      };

      const response = await axios.get(`${this.baseUrl}/details/json`, { params });
      return this.transformPlaceDetails(response.data.result);
    } catch (error) {
      console.error('Google Places details error:', error);
      return this.getMockPlaceDetails(placeId);
    }
  }

  // Transform search results
  transformSearchResults(results) {
    return results.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      types: place.types,
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        url: `${this.baseUrl}/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.apiKey}`
      })),
      openNow: place.opening_hours?.open_now,
      icon: place.icon,
      businessStatus: place.business_status
    }));
  }

  // Transform place details
  transformPlaceDetails(place) {
    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      types: place.types,
      phone: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours,
      reviews: place.reviews,
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        url: `${this.baseUrl}/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.apiKey}`
      })),
      editorialSummary: place.editorial_summary?.overview,
      servesVegetarian: place.serves_vegetarian_food,
      servesVegan: place.serves_vegan_food,
      wheelchairAccessible: place.wheelchair_accessible_entrance
    };
  }

  // Extensive mock data
  getMockSearchResults(query, location, radius, type) {
    const mockPlaces = [];
    const baseTypes = type ? [type] : ['restaurant', 'hotel', 'tourist_attraction'];
    
    // Generate 50-100 mock places
    const count = 50 + Math.floor(Math.random() * 50);
    
    for (let i = 0; i < count; i++) {
      const placeType = baseTypes[i % baseTypes.length];
      const place = this.generateMockPlace(i, location, placeType);
      
      // Filter by query if provided
      if (!query || place.name.toLowerCase().includes(query.toLowerCase()) || 
          place.types.some(t => t.includes(query.toLowerCase()))) {
        mockPlaces.push(place);
      }
    }

    // Sort by distance
    return mockPlaces.sort((a, b) => a.distance - b.distance).slice(0, 20);
  }

  generateMockPlace(index, centerLocation, type) {
    const names = {
      restaurant: [
        'The Golden Fork', 'Sunset Bistro', 'The Spice Garden', 'Ocean View Grill',
        'Mountain Peak Restaurant', 'The Local Kitchen', 'Riverside Cafe', 'Urban Eatery',
        'The Chef\'s Table', 'Garden Terrace', 'Fire & Ice', 'The Hungry Bear',
        'Silk Road Kitchen', 'The Blue Plate', 'Harvest Moon', 'The Cork & Fork'
      ],
      hotel: [
        'Grand Plaza Hotel', 'The Riverside Inn', 'Sunset Resort & Spa', 'City Center Suites',
        'Mountain View Lodge', 'The Executive Hotel', 'Coastal Retreat', 'Urban Oasis Hotel',
        'The Heritage House', 'Skyline Tower Hotel', 'The Boutique Stay', 'Comfort Palace',
        'The Business Hub', 'Lakeside Resort', 'The Metropolitan', 'Cloud Nine Hotel'
      ],
      tourist_attraction: [
        'City Museum of Art', 'Historic Downtown Tour', 'Botanical Gardens', 'Adventure Park',
        'The Observatory', 'Cultural Heritage Center', 'Wildlife Sanctuary', 'The Old Market',
        'Scenic Overlook', 'Interactive Science Center', 'The Grand Theater', 'Sports Complex',
        'Aquarium & Marine Life', 'The Art District', 'Theme Park Plaza', 'Nature Trail'
      ]
    };

    const cuisineTypes = [
      'italian', 'chinese', 'indian', 'mexican', 'thai', 'japanese', 'french', 
      'mediterranean', 'american', 'vietnamese', 'korean', 'spanish', 'greek'
    ];

    const hotelAmenities = [
      'spa', 'gym', 'pool', 'business_center', 'conference_room', 'restaurant',
      'bar', 'parking', 'wifi', 'airport_shuttle', 'pet_friendly', 'laundry_service'
    ];

    const attractionTypes = [
      'museum', 'park', 'amusement_park', 'zoo', 'aquarium', 'art_gallery',
      'tourist_attraction', 'point_of_interest', 'natural_feature', 'stadium'
    ];

    // Generate location with some randomness
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const lat = centerLocation.lat + latOffset;
    const lng = centerLocation.lng + lngOffset;
    
    // Calculate distance
    const distance = Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 111; // Rough km conversion

    const placeNames = names[type] || names.restaurant;
    const name = placeNames[index % placeNames.length] + (index >= placeNames.length ? ` ${Math.floor(index / placeNames.length) + 1}` : '');

    const place = {
      id: `place_${type}_${uuidv4()}`,
      name,
      address: `${100 + index} ${this.getStreetName()}, ${this.getCityName(centerLocation)}`,
      location: { lat, lng },
      distance: Math.round(distance * 1000) / 1000,
      rating: 3.5 + Math.random() * 1.5,
      userRatingsTotal: Math.floor(Math.random() * 2000) + 50,
      priceLevel: Math.ceil(Math.random() * 4),
      types: [],
      photos: this.generateMockPhotos(type, 3 + Math.floor(Math.random() * 5)),
      openNow: Math.random() > 0.2,
      businessStatus: 'OPERATIONAL'
    };

    // Add type-specific attributes
    if (type === 'restaurant') {
      place.types = ['restaurant', 'food', 'point_of_interest', cuisineTypes[index % cuisineTypes.length]];
      place.cuisine = cuisineTypes[index % cuisineTypes.length];
      place.servesVegetarian = Math.random() > 0.3;
      place.servesVegan = Math.random() > 0.5;
      place.takeout = Math.random() > 0.2;
      place.delivery = Math.random() > 0.3;
      place.dineIn = Math.random() > 0.1;
    } else if (type === 'hotel') {
      place.types = ['lodging', 'point_of_interest', ...hotelAmenities.slice(0, Math.floor(Math.random() * 5) + 2)];
      place.starRating = Math.ceil(place.rating);
      place.amenities = hotelAmenities.slice(0, Math.floor(Math.random() * 8) + 4);
      place.roomsAvailable = Math.floor(Math.random() * 50) + 5;
    } else {
      place.types = ['tourist_attraction', 'point_of_interest', attractionTypes[index % attractionTypes.length]];
      place.ticketPrice = Math.floor(Math.random() * 50) + 10;
      place.duration = `${Math.floor(Math.random() * 4) + 1}-${Math.floor(Math.random() * 3) + 2} hours`;
    }

    return place;
  }

  getMockPlaceDetails(placeId) {
    const type = placeId.includes('restaurant') ? 'restaurant' : 
                 placeId.includes('hotel') ? 'hotel' : 'tourist_attraction';
    
    const basePlace = this.generateMockPlace(0, { lat: 40.7128, lng: -74.0060 }, type);
    
    // Enhance with detailed information
    const details = {
      ...basePlace,
      id: placeId,
      phone: `+1 ${this.generatePhoneNumber()}`,
      website: `https://www.${basePlace.name.toLowerCase().replace(/\s+/g, '')}.com`,
      openingHours: this.generateOpeningHours(),
      reviews: this.generateReviews(5 + Math.floor(Math.random() * 10)),
      editorialSummary: this.generateEditorialSummary(type),
      popularTimes: this.generatePopularTimes(),
      wheelchairAccessible: Math.random() > 0.2
    };

    if (type === 'restaurant') {
      details.menu = this.generateMenu();
      details.specialties = this.generateSpecialties();
    } else if (type === 'hotel') {
      details.roomTypes = this.generateRoomTypes();
      details.checkInTime = '15:00';
      details.checkOutTime = '11:00';
    }

    return details;
  }

  generateMockPhotos(type, count) {
    const photoUrls = {
      restaurant: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9',
        'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0'
      ],
      hotel: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd',
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa'
      ],
      tourist_attraction: [
        'https://images.unsplash.com/photo-1518611012118-696072aa579a',
        'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7',
        'https://images.unsplash.com/photo-1569163139394-de4798284b24',
        'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82',
        'https://images.unsplash.com/photo-1543039625-14cbd3802e7d'
      ]
    };

    const urls = photoUrls[type] || photoUrls.restaurant;
    return Array.from({ length: count }, (_, i) => ({
      reference: `mock_photo_${i}`,
      url: `${urls[i % urls.length]}?w=800&h=600&fit=crop&q=80`
    }));
  }

  generateOpeningHours() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = days.map(day => {
      const isWeekend = day === 'Saturday' || day === 'Sunday';
      const isClosed = Math.random() > 0.9 && day === 'Monday';
      
      if (isClosed) {
        return { day, hours: 'Closed' };
      }
      
      const openTime = isWeekend ? '10:00 AM' : '9:00 AM';
      const closeTime = isWeekend ? '11:00 PM' : '10:00 PM';
      
      return {
        day,
        hours: `${openTime} - ${closeTime}`
      };
    });

    return {
      weekday_text: hours.map(h => `${h.day}: ${h.hours}`),
      periods: hours.filter(h => h.hours !== 'Closed').map((h, i) => ({
        open: { day: i, time: '0900' },
        close: { day: i, time: '2200' }
      }))
    };
  }

  generateReviews(count) {
    const reviewTemplates = [
      'Amazing experience! The {aspect} was {quality}. Would definitely {action} again.',
      'Really enjoyed the {aspect}. The staff was {quality} and the atmosphere was {quality2}.',
      '{quality} place! The {aspect} exceeded expectations. {recommendation}',
      'The {aspect} was {quality}, but the {aspect2} could be better. Overall {rating}.',
      'Fantastic {aspect}! {quality} service and {quality2} ambiance. {recommendation}'
    ];

    const aspects = ['food', 'service', 'location', 'ambiance', 'value', 'experience'];
    const qualities = ['excellent', 'outstanding', 'great', 'wonderful', 'fantastic', 'superb'];
    const actions = ['visit', 'come back', 'recommend', 'return'];
    const recommendations = ['Highly recommend!', 'Must visit!', 'Worth every penny!', 'Will be back!'];
    const ratings = ['good experience', 'great time', 'pleasant visit', 'memorable experience'];

    return Array.from({ length: count }, (_, i) => {
      const template = reviewTemplates[i % reviewTemplates.length];
      const text = template
        .replace('{aspect}', aspects[Math.floor(Math.random() * aspects.length)])
        .replace('{aspect2}', aspects[Math.floor(Math.random() * aspects.length)])
        .replace(/{quality}/g, qualities[Math.floor(Math.random() * qualities.length)])
        .replace('{quality2}', qualities[Math.floor(Math.random() * qualities.length)])
        .replace('{action}', actions[Math.floor(Math.random() * actions.length)])
        .replace('{recommendation}', recommendations[Math.floor(Math.random() * recommendations.length)])
        .replace('{rating}', ratings[Math.floor(Math.random() * ratings.length)]);

      return {
        author_name: this.generateAuthorName(),
        author_url: '#',
        language: 'en',
        profile_photo_url: `https://i.pravatar.cc/100?img=${i + 1}`,
        rating: 4 + Math.floor(Math.random() * 2),
        relative_time_description: this.generateRelativeTime(),
        text,
        time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 31536000)
      };
    });
  }

  generateAuthorName() {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Amy'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Martinez'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  generateRelativeTime() {
    const times = ['2 weeks ago', '1 month ago', '3 weeks ago', '2 months ago', '1 week ago', '4 days ago', '6 weeks ago'];
    return times[Math.floor(Math.random() * times.length)];
  }

  generatePhoneNumber() {
    const area = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const line = Math.floor(Math.random() * 9000) + 1000;
    return `${area}-${prefix}-${line}`;
  }

  getStreetName() {
    const streets = ['Main Street', 'Park Avenue', 'Broadway', 'Market Street', 'High Street', 
                     'Church Street', 'Elm Street', 'Washington Avenue', 'Oak Lane', 'Maple Drive'];
    return streets[Math.floor(Math.random() * streets.length)];
  }

  getCityName(location) {
    // Simple city name based on approximate coordinates
    if (Math.abs(location.lat - 40.7) < 1) return 'New York, NY';
    if (Math.abs(location.lat - 34.0) < 1) return 'Los Angeles, CA';
    if (Math.abs(location.lat - 41.8) < 1) return 'Chicago, IL';
    if (Math.abs(location.lat - 29.7) < 1) return 'Houston, TX';
    return 'City Center';
  }

  generateEditorialSummary(type) {
    const summaries = {
      restaurant: [
        'A culinary destination offering an unforgettable dining experience with fresh, locally-sourced ingredients and innovative dishes.',
        'This charming establishment combines traditional recipes with modern techniques to create memorable meals.',
        'Known for its warm hospitality and exceptional cuisine, this restaurant has become a local favorite.',
        'An elegant dining space where classic meets contemporary, offering a menu that celebrates seasonal flavors.'
      ],
      hotel: [
        'A luxurious retreat offering world-class amenities and exceptional service in the heart of the city.',
        'This modern hotel combines comfort with convenience, providing an ideal base for business and leisure travelers.',
        'Experience refined hospitality at this boutique property, where attention to detail meets personalized service.',
        'A sophisticated urban oasis featuring contemporary design and state-of-the-art facilities.'
      ],
      tourist_attraction: [
        'A must-visit destination offering unique experiences and memorable moments for visitors of all ages.',
        'Discover the rich history and cultural significance of this iconic landmark.',
        'An interactive and educational experience that brings learning to life through engaging exhibits.',
        'Immerse yourself in natural beauty and adventure at this popular outdoor destination.'
      ]
    };

    const typeSummaries = summaries[type] || summaries.tourist_attraction;
    return typeSummaries[Math.floor(Math.random() * typeSummaries.length)];
  }

  generatePopularTimes() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(day => ({
      day,
      hours: Array.from({ length: 24 }, (_, hour) => {
        let popularity = 20;
        if (hour >= 11 && hour <= 14) popularity = 60 + Math.random() * 30; // Lunch
        else if (hour >= 18 && hour <= 21) popularity = 70 + Math.random() * 25; // Dinner
        else if (hour < 9 || hour > 22) popularity = Math.random() * 10; // Closed/quiet
        else popularity = 20 + Math.random() * 30;
        
        return Math.round(popularity);
      })
    }));
  }

  generateMenu() {
    const categories = ['Appetizers', 'Main Courses', 'Desserts', 'Beverages'];
    const menu = {};
    
    categories.forEach(category => {
      menu[category] = Array.from({ length: 5 + Math.floor(Math.random() * 5) }, (_, i) => ({
        name: `${category} Item ${i + 1}`,
        description: 'Delicious item made with fresh ingredients',
        price: `$${Math.floor(Math.random() * 30) + 10}`,
        dietary: Math.random() > 0.5 ? ['vegetarian'] : []
      }));
    });
    
    return menu;
  }

  generateSpecialties() {
    const specialties = [
      'Chef\'s Special Pasta', 'Signature Grilled Salmon', 'House-made Pizza',
      'Award-winning Burger', 'Seasonal Tasting Menu', 'Fresh Seafood Platter'
    ];
    return specialties.slice(0, 3 + Math.floor(Math.random() * 3));
  }

  generateRoomTypes() {
    return [
      { type: 'Standard Room', price: '$150-200', capacity: 2 },
      { type: 'Deluxe Room', price: '$250-300', capacity: 2 },
      { type: 'Suite', price: '$400-500', capacity: 4 },
      { type: 'Executive Suite', price: '$600-800', capacity: 4 }
    ];
  }
}

export const googlePlacesService = new GooglePlacesService(); 