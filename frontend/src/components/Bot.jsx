// Sample bot responses
const responses = ["Hey!", "How can I assist you?", "Nice to meet you!"];

class Bot {
  static getResponse(message) {
    const randomIndex = Math.floor(Math.random() * responses.length);
    const randomResponse = responses[randomIndex];
    return randomResponse;
  }
}

export default Bot;