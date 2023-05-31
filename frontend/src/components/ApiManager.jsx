import axiosInstance from '../axiosInstance';

// Sample bot responses
const responses = ["Hey!", "How can I assist you?", "Nice to meet you!"];

class ApiManager {
  static getRandomResponse(message) {
    const randomIndex = Math.floor(Math.random() * responses.length);
    const randomResponse = responses[randomIndex];
    return randomResponse;
  }

  static async getResponse(message, userId) {
    try {
      const response = await axiosInstance.get('/bot-response', {
        params: { 
          topic: message,
          userId: userId,
        }
      });

      console.log(response.data);
      const convMatches = response.data.similar_conversations;
      const segwayResponses = response.data.segway_response.split('\n');
      console.log(convMatches);
      console.log(segwayResponses);

      const combined = segwayResponses.map((segwayResponse, i) => ({
        text: segwayResponse,
        matchInfo: convMatches[i]
      }));

      return combined;

    } catch (error) {
      console.error(error);
      return [{ text: "An error occurred :(", matchInfo: "" }]; // return an array with one element in the case of an error
    }
  }

  // Add function to get next chat id
  static async getNextChatId() {
    try {
      const response = await axiosInstance.get('/next-chat-id');
      console.log(response.data);
      return response.data.nextChatId;
    } catch (error) {
      console.error(error);
      return null; // return null in the case of an error
    }
  }
  
  // Add function to create a new chat
  static async getNextChatId(user1, user2, chatname) {
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

  static async createChatAndGetId(otherUserId, topicId) {
    try {
      // Make the POST request to your API endpoint and pass the required parameters
      const response = await fetch('http://localhost:5000/create-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId, topicId }),
      });

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`An error occurred: ${response.statusText}`);
      }

      // Extract the chatId from the response
      const data = await response.json();
      const chatId = data.chatId;

      return chatId;
    } catch (error) {
      console.error('Failed to create a new chat:', error);
      return null;
    }
  }
}

export default ApiManager;
