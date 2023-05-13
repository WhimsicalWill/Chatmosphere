import axiosInstance from '../axiosInstance';

// Sample bot responses
const responses = ["Hey!", "How can I assist you?", "Nice to meet you!"];

class Bot {
  static getRandomResponse(message) {
    const randomIndex = Math.floor(Math.random() * responses.length);
    const randomResponse = responses[randomIndex];
    return randomResponse;
  }

  static async getResponse(message) {
    try {
      const response = await axiosInstance.get('/similar-conversations', {
        params: { topic: message }
      });
      console.log(response.data);
      const similarConversations = response.data.similar_conversations;
      const responses = [];
      for (const conv of similarConversations) {
        responses.push(`Here's a similar conversation: ${conv}`);
      }
      return responses;
    } catch (error) {
      console.error(error);
      return ["An error occurred :("]; // return an empty array in the case of an error
    }
  }
}

export default Bot;
