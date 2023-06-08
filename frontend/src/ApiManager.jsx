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

  static async getTopicsAndChats(userID, setTopics) {
    try {
      const topicInfo = await ApiManager.getTopicsOrCreateBrainstorm(userID);
      console.log('topicInfo', topicInfo);

      if (topicInfo == null) {
        console.error('Failed to get topics');
        return;
      }

      const topics = {};

      const chatPromises = topicInfo.map((topic) => {
        return ApiManager.getChatsByTopicID(topic.id);
      });

      // This allows all of our API calls to resolve in parallel
      await Promise.all(chatPromises)
        .then((results) => {
          results.forEach((topicChats, i) => {
            const topic = topicInfo[i];
            topics[topic.id] = {
              title: topic.title,
              ...topicChats,
            };
          });
        })
        .catch((err) => console.log(err));

      console.log('set up topics:', topics);
      setTopics(topics);
    } catch (error) {
      console.error(error);
    }
  }

  static async getTopicsOrCreateBrainstorm(userID) {
    try {
      // modify the api call to feed in the two users
      const response = await axiosInstance.get(`/user-topics/${userID}`);
      return response.data;
    } catch (error) {
      // If the user has no topics, we need to create brainstorm topic and chat
      if (error.response && error.response.status === 404) {
        console.log('Creating brainstorm topic and chat');
        const brainstormResponse = await ApiManager.createBrainstormChat(userID);
        console.log('brainstormResponse', brainstormResponse);
        return brainstormResponse
      } else {
        console.error(error);
      }
      return null;
    }
  }

  static async createBrainstormChat(userID) {
    try {
      // Attempt to create the 'Brainstorm' topic
      const topicResponse = await axiosInstance.post(`/user-topics/${userID}`, {
        title: 'Brainstorm'
      });

      console.log('topicResponse', topicResponse);

      if (topicResponse.status === 201) {
        // TODO: just call ApiManager.createChatandGetID here
        // If successful, create the 'Brainstorm' chat under this topic
        const chatResponse = await axiosInstance.post('/create-chat', {
          creatorTopicID: topicResponse.data.id,
          matchedTopicID: -1,
          userCreatorID: userID,
          userMatchedID: -1,
        });

        console.log('chatResponse', chatResponse);

        if (chatResponse.status === 201) {
          // TODO: set the brainstormID.ref to the chatID
          console.log(`Brainstorm topic and chat created for user ${userID}`);
          return [{ id: topicResponse.data.id, title: 'Brainstorm' }];
        }
      }
    } catch (creationError) {
      // Log an appropriate error if the creation process fails
      console.error('Error creating Brainstorm topic or chat: ', creationError);
    }
    return null;
  }

  static async getChatsByTopicID(userID) {
    try {
    } catch (error) {
      console.log(error);
    }
  }
}

export default ApiManager;
