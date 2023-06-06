import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000', // This is the default port for Flask apps
});

class ApiManager {
  static async submitTopicAndGetResponse(message, userID) {
    try {
      const botResponse = await axiosInstance.get('/bot-response', {
        params: { 
          topic: message,
          userID: userID,
        }
      });

      // submit a POST request to the TopicResource
      await axiosInstance.post('/topics', { // replace '/topics' with your actual TopicResource route
        userID: userID,
        title: message,
      });

      const convMatches = botResponse.data.convMatches;
      const segwayResponses = botResponse.data.segwayResponses.split('\n');

      console.log('segwayResponses', segwayResponses);

      const combined = segwayResponses.map((segwayResponse, i) => ({
        text: segwayResponse,
        matchInfo: convMatches[i]
      }));

      console.log("API response:", combined);

      return combined;

    } catch (error) {
      console.error(error);
      return [{ text: "An error occurred :(", matchInfo: null }]; // return an array with one element in the case of an error
    }
  }

  // TODO: will need to change these functions since we are
  // now using a database to track users and chats

  // Add function to create a new chat
  static async getNextChatID() {
    try {
      // modify the api call to feed in the two users
      const response = await axiosInstance.get('/next-chat-id');
      console.log(response.data);
      return response.data.nextChatID;
    } catch (error) {
      console.error(error);
      return null; // return null in the case of an error
    }
  }

  // Add function to create a new chat
  static async getNextUserID() {
    try {
      // modify the api call to feed in the two users
      const response = await axiosInstance.get('/next-user-id');
      console.log(response.data);
      return response.data.nextUserID;
    } catch (error) {
      console.error(error);
      return null; // return null in the case of an error
    }
  }

  // TODO: make sure that the arguments are passed correctly
  // the creator is the person whose topic was in the DB first
  static async createChatAndGetID(userCreatorID, userMatchedID, creatorTopicID, matchedTopicID) {
    console.log('Creating match with', userCreatorID);
    try {
      const response = await axiosInstance.post('/chatmetadata', {
        userCreatorID: userCreatorID,
        userMatchedID: userMatchedID,
        creatorTopicID: creatorTopicID,
        matchedTopicID: matchedTopicID,
      });

      const chatID = response.data.chatID;
      return chatID;
    } catch (error) {
      console.error('Failed to create a new chat:', error);
      return null;
    }
  }
}

export default ApiManager;
