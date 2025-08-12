import axios from 'axios';

class LocationService {
  constructor() {
    this.ipApiKey = process.env.IPAPI_KEY || '';
    this.azureMapsKey = process.env.AZURE_MAPS_KEY || '';
    this.openWeatherKey = process.env.OPENWEATHER_API_KEY || '';
  }

  // Get location from IP address
  async getLocationFromIP(ipAddress) {
    try {
      // Using ipapi.co as example (free tier available)
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
      
      return {
        ip: response.data.ip,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country_name,
        countryCode: response.data.country_code,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
        currency: response.data.currency,
        source: 'ipapi'
      };
    } catch (error) {
      console.error('Error getting location from IP:', error);
      
      // Fallback to default location
      return {
        city: 'New York',
        region: 'NY',
        country: 'United States',
        countryCode: 'US',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        currency: 'USD',
        source: 'fallback'
      };
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2, unit = 'km') {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get weather for location
  async getWeather(lat, lon) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.openWeatherKey}&units=metric`
      );
      
      const weather = response.data;
      return {
        temperature: Math.round(weather.main.temp),
        feelsLike: Math.round(weather.main.feels_like),
        condition: weather.weather[0].main,
        description: weather.weather[0].description,
        icon: weather.weather[0].icon,
        humidity: weather.main.humidity,
        windSpeed: weather.wind.speed,
        isGoodForOutdoor: this.isGoodWeatherForOutdoor(weather)
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }

  // Determine if weather is good for outdoor activities
  isGoodWeatherForOutdoor(weather) {
    const temp = weather.main.temp;
    const condition = weather.weather[0].main.toLowerCase();
    const windSpeed = weather.wind.speed;
    
    // Bad conditions
    if (['rain', 'snow', 'thunderstorm'].includes(condition)) return false;
    if (temp < 10 || temp > 35) return false; // Too cold or too hot
    if (windSpeed > 15) return false; // Too windy
    
    return true;
  }

  // Get directions using Azure Maps
  async getDirections(origin, destination, mode = 'car') {
    if (!this.azureMapsKey) {
      // Fallback to estimated time based on distance
      const distance = this.calculateDistance(
        origin.lat, origin.lon,
        destination.lat, destination.lon
      );
      
      const speeds = {
        car: 60,      // 60 km/h average
        bicycle: 15,  // 15 km/h average
        pedestrian: 5 // 5 km/h average
      };
      
      const estimatedTime = Math.round((distance / speeds[mode]) * 60); // in minutes
      
      return {
        distance,
        duration: estimatedTime,
        mode,
        source: 'estimated'
      };
    }
    
    try {
      const travelMode = {
        car: 'car',
        bicycle: 'bicycle',
        pedestrian: 'pedestrian',
        transit: 'bus'
      }[mode] || 'car';
      
      const response = await axios.get(
        `https://atlas.microsoft.com/route/directions/json`,
        {
          params: {
            'subscription-key': this.azureMapsKey,
            'api-version': '1.0',
            query: `${origin.lat},${origin.lon}:${destination.lat},${destination.lon}`,
            travelMode
          }
        }
      );
      
      const route = response.data.routes[0];
      return {
        distance: route.summary.lengthInMeters / 1000, // Convert to km
        duration: Math.round(route.summary.travelTimeInSeconds / 60), // Convert to minutes
        mode,
        source: 'azure-maps'
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      
      // Fallback to estimation
      return this.getDirections(origin, destination, mode);
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    if (!this.azureMapsKey) {
      // Simple fallback - return a default location
      return {
        latitude: 40.7128,
        longitude: -74.0060,
        formattedAddress: address,
        source: 'fallback'
      };
    }
    
    try {
      const response = await axios.get(
        `https://atlas.microsoft.com/search/address/json`,
        {
          params: {
            'subscription-key': this.azureMapsKey,
            'api-version': '1.0',
            query: address
          }
        }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.position.lat,
          longitude: result.position.lon,
          formattedAddress: result.address.freeformAddress,
          source: 'azure-maps'
        };
      }
      
      throw new Error('No results found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      return {
        latitude: 40.7128,
        longitude: -74.0060,
        formattedAddress: address,
        source: 'fallback'
      };
    }
  }

  // Find nearby places
  async findNearbyPlaces(lat, lon, category, radius = 5000) {
    // This would integrate with real APIs like Google Places, Yelp, etc.
    // For now, return enhanced mock data based on location
    
    const mockCategories = {
      restaurant: ['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean'],
      hotel: ['Luxury', 'Business', 'Budget', 'Boutique'],
      activity: ['Escape Room', 'Bowling', 'Mini Golf', 'Spa', 'Museum']
    };
    
    const places = [];
    const types = mockCategories[category] || ['General'];
    
    for (let i = 0; i < 10; i++) {
      const latOffset = (Math.random() - 0.5) * 0.05;
      const lonOffset = (Math.random() - 0.5) * 0.05;
      
      places.push({
        id: `${category}-${i}`,
        name: `${types[i % types.length]} ${category} ${i + 1}`,
        category,
        type: types[i % types.length],
        latitude: lat + latOffset,
        longitude: lon + lonOffset,
        distance: this.calculateDistance(lat, lon, lat + latOffset, lon + lonOffset),
        rating: 3.5 + Math.random() * 1.5,
        priceLevel: Math.ceil(Math.random() * 4),
        isOpen: Math.random() > 0.3
      });
    }
    
    return places.sort((a, b) => a.distance - b.distance);
  }

  // Get timezone for coordinates
  async getTimezone(lat, lon) {
    try {
      // Using timezone API
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      
      return {
        timeZoneId: response.data.timeZoneId,
        timeZoneName: response.data.timeZoneName,
        rawOffset: response.data.rawOffset,
        dstOffset: response.data.dstOffset
      };
    } catch (error) {
      console.error('Error getting timezone:', error);
      
      // Fallback based on longitude
      const offset = Math.round(lon / 15);
      return {
        timeZoneId: `UTC${offset >= 0 ? '+' : ''}${offset}`,
        timeZoneName: `UTC${offset >= 0 ? '+' : ''}${offset}`,
        rawOffset: offset * 3600,
        dstOffset: 0
      };
    }
  }

  // Check if location is within service area
  isLocationSupported(lat, lon, supportedRegions = ['US', 'IN', 'UK']) {
    // Define rough boundaries for supported regions
    const regionBounds = {
      US: { latMin: 24, latMax: 49, lonMin: -125, lonMax: -66 },
      IN: { latMin: 8, latMax: 37, lonMin: 68, lonMax: 97 },
      UK: { latMin: 49, latMax: 61, lonMin: -8, lonMax: 2 }
    };
    
    for (const region of supportedRegions) {
      const bounds = regionBounds[region];
      if (bounds && 
          lat >= bounds.latMin && lat <= bounds.latMax &&
          lon >= bounds.lonMin && lon <= bounds.lonMax) {
        return { supported: true, region };
      }
    }
    
    return { supported: false, region: null };
  }
}

export const locationService = new LocationService(); 