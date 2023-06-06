import axiosInstance from './axiosInstance';

class ApiManager {
  static async getResponse(message, userId) {
    try {
      const response = await axiosInstance.get('/bot-response', {
        params: { 
          topic: message,
          userId: userId,
        }
      });

      const convMatches = response.data.convMatches;
      const segwayResponses = response.data.segwayResponses.split('\n');

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

  // Add function to create a new chat
  static async getNextChatId() {
    try {
      // modify the api call to feed in the two users
      const response = await axiosInstance.get('/next-chat-id');
      console.log(response.data);
      return response.data.nextChatId;
    } catch (error) {
      console.error(error);
      return null; // return null in the case of an error
    }
  }

  // Add function to create a new chat
  static async getNextUserId() {
    try {
      // modify the api call to feed in the two users
      const response = await axiosInstance.get('/next-user-id');
      console.log(response.data);
      return response.data.nextUserId;
    } catch (error) {
      console.error(error);
      return null; // return null in the case of an error
    }
  }

  static async createChatAndGetId(otherUserId, topicId, chatName) {
    console.log('Creating match with', otherUserId, topicId, chatName);
    try {
      const response = await axiosInstance.post('/create-chat', {
        otherUserId: otherUserId,
        topicId: topicId,
        chatName: chatName,
      });

      const chatId = response.data.chatId;
      return chatId;
    } catch (error) {
      console.error('Failed to create a new chat:', error);
      return null;
    }
  }
}

export default ApiManager;
