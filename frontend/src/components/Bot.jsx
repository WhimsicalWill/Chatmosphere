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
      const response = await axiosInstance.get('/bot-response', {
        params: { topic: message }
      });
      console.log(response.data);
      const convMatches = response.data.similar_conversations;
      const segwayResponses = response.data.segway_response.split('\n');
      console.log(convMatches);
      console.log(segwayResponses);
      const combined = segwayResponses.map((segwayResponse, i) => ({
         text: segwayResponse, 
         match: convMatches[i] 
      }));
      return combined;
    } catch (error) {
      console.error(error);
      return [{ text: "An error occurred :(", match: "" }]; // return an array with one element in the case of an error
    }
  }
}

export default Bot;
