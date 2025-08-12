import axios from 'axios';
import { azureAdConfig } from '../config/azure-ad.js';

class GraphService {
  constructor() {
    this.baseUrl = azureAdConfig.graph.baseUrl;
    this.betaUrl = azureAdConfig.graph.betaUrl;
  }

  // Get user profile
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get user's Teams
  async getUserTeams(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/me/joinedTeams`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data.value;
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw error;
    }
  }

  // Get user's calendar events
  async getCalendarEvents(accessToken, startDateTime, endDateTime) {
    try {
      const params = new URLSearchParams({
        startDateTime: startDateTime || new Date().toISOString(),
        endDateTime: endDateTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        $select: 'subject,start,end,location,attendees',
        $orderby: 'start/dateTime',
        $top: '50'
      });

      const response = await axios.get(`${this.baseUrl}/me/calendarView?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"'
        }
      });
      return response.data.value;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // Create calendar event
  async createCalendarEvent(accessToken, event) {
    try {
      const response = await axios.post(`${this.baseUrl}/me/events`, event, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Get Team channels
  async getTeamChannels(accessToken, teamId) {
    try {
      const response = await axios.get(`${this.baseUrl}/teams/${teamId}/channels`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data.value;
    } catch (error) {
      console.error('Error fetching team channels:', error);
      throw error;
    }
  }

  // Send message to Teams channel
  async sendChannelMessage(accessToken, teamId, channelId, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/teams/${teamId}/channels/${channelId}/messages`,
        {
          body: {
            content: message.content,
            contentType: message.contentType || 'html'
          },
          attachments: message.attachments || []
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending channel message:', error);
      throw error;
    }
  }

  // Create Teams meeting
  async createTeamsMeeting(accessToken, meeting) {
    try {
      const response = await axios.post(`${this.baseUrl}/me/onlineMeetings`, {
        startDateTime: meeting.startDateTime,
        endDateTime: meeting.endDateTime,
        subject: meeting.subject,
        participants: {
          attendees: meeting.attendees || []
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Teams meeting:', error);
      throw error;
    }
  }

  // Get user's presence
  async getUserPresence(accessToken, userId) {
    try {
      const response = await axios.get(`${this.baseUrl}/users/${userId}/presence`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user presence:', error);
      throw error;
    }
  }

  // Create activity card for Teams
  createActivityCard(activity) {
    return {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          {
            type: 'TextBlock',
            text: activity.title,
            size: 'Large',
            weight: 'Bolder'
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'Image',
                    url: activity.imageUrl,
                    size: 'Medium'
                  }
                ]
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: activity.description,
                    wrap: true
                  },
                  {
                    type: 'FactSet',
                    facts: [
                      {
                        title: 'Type:',
                        value: activity.type
                      },
                      {
                        title: 'Location:',
                        value: activity.location
                      },
                      {
                        title: 'Price:',
                        value: `$${activity.price} per person`
                      },
                      {
                        title: 'Rating:',
                        value: `${activity.rating} ⭐`
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'ActionSet',
            actions: [
              {
                type: 'Action.OpenUrl',
                title: 'View Details',
                url: activity.detailsUrl
              },
              {
                type: 'Action.Submit',
                title: 'Add to Shortlist',
                data: {
                  action: 'shortlist',
                  activityId: activity.id
                }
              }
            ]
          }
        ]
      }
    };
  }
}

export const graphService = new GraphService(); 