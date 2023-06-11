import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000', // This is the default port for Flask apps
});

class ApiManager {
  static findParentTopic = (topics, chatID) => {
    for (let topicName in topics) {
      if (topics[topicName].chats[chatID]) {
        return topicName;
      }
    }
    return null;
  };

  static async getBotResponse(text, userID) {
    try {
      const botResponse = await axiosInstance.get('/bot-response', {
        params: { 
          topic: text,
          userID: userID,
        }
      });

      const topicMatches = botResponse.data.topicMatches;
      const segwayResponses = botResponse.data.segwayResponses.split('\n');

      const combined = segwayResponses.map((segwayResponse, i) => ({
        text: segwayResponse,
        topicInfo: topicMatches[i]
      }));

      return combined;
    } catch (error) {
      console.error(error);
      return [{ text: "An error occurred :(", topicInfo: null }]; // return an array with one element in the case of an error
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
  static async createChatAndGetID(creatorTopicID, matchedTopicID, userCreatorID, userMatchedID) {
    try {
      const response = await axiosInstance.post('/create-chat', {
        creatorTopicID: creatorTopicID,
        matchedTopicID: matchedTopicID,
        userCreatorID: userCreatorID,
        userMatchedID: userMatchedID,
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
      let topicInfo = await ApiManager.getTopics(userID);
      let brainstormTopic = topicInfo.find(topic => topic.title === 'Brainstorm');
      let brainstormTopicID = brainstormTopic ? String(brainstormTopic.id) : null;

      if (!brainstormTopic) {
        console.log('Creating brainstorm topic/chat now');
        const brainstormResponse = await ApiManager.createBrainstorm(userID);

        if (!brainstormResponse) {
          return [null, null];
        }

        brainstormTopicID = brainstormResponse.id;
        topicInfo = topicInfo.concat(brainstormResponse);
      }

      const topics = {};

      const chatPromises = topicInfo.map((topic) => {
        return ApiManager.getChatsByTopicID(topic.id, userID);
      });

      // This allows all of our API calls to resolve in parallel
      await Promise.all(chatPromises)
        .then((results) => {
          results.forEach((topicChats, i) => {
            const topic = topicInfo[i];
            topics[topic.id] = {
              title: topic.title,
              chats: { ...topicChats },
            };
          });
        })
        .catch((err) => console.log(err));

      setTopics(topics);
      const brainstormChatID = Object.keys(topics[brainstormTopicID].chats)[0];
      return [brainstormTopicID, brainstormChatID];
    } catch (error) {
      console.error(error);
    }
  }

  static async getTopic(topicID) {
    try {
      const response = await axiosInstance.get(`/topics/${topicID}`);
      return response.data.title;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  static async getTopics(userID) {
    try {
      const response = await axiosInstance.get(`/user-topics/${userID}`);
      return response.data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }
  static async getChatsByTopicID(topicID, userID) {
    try {
      const topicChats = {};
      const response = await axiosInstance.get(`/chatmetadata/${topicID}`);
      for (let chatResponse of response.data) {
        if (chatResponse.matchedTopicID === -1) {
          topicChats[chatResponse.chatID] = { 
            name: "Brainstorm", 
            otherUserID: -1,
            messages: []
          };
          continue;
        }

        let otherUserID, otherTopicID;

        if (userID === chatResponse.userCreatorID) {
          otherTopicID = chatResponse.matchedTopicID;
          otherUserID = chatResponse.userMatchedID;
        } else {
          otherTopicID = chatResponse.creatorTopicID;
          otherUserID = chatResponse.userCreatorID;
        }

        // Get the name of the other user's topic to use as our chat name
        try {
          console.log("requesting chat name");
          const topicResponse = await axiosInstance.get(`/topics/${otherTopicID}`);
          topicChats[chatResponse.chatID] = { 
            name: topicResponse.data.title, 
            otherUserID: otherUserID,
            messages: []
          };
        } catch (topicError) {
          console.error(`Failed to get topic name for user ${otherTopicID}`, topicError);
          continue; // Skip to next chat if we fail to get the topic name
        }
      }
      return topicChats;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`No chats found for topic ${topicID}`);
      } else {
        console.error(error);
      }
    }
  }

  // Load messages when a user clicks on a chat
  static async loadChatMessages(topics, setTopics, chatID) {
    try {
      const messageResponse = await axiosInstance.get(`/chats/${chatID}`);

      console.log('Message response:', messageResponse);

      if (messageResponse.status === 200) {
        // Fetch all match infos
        const topicInfoPromises = messageResponse.data.map(async message => {
          if (message.topicID) {
            const topicResponse = await axiosInstance.get(`/topics/${message.topicID}`);
            if (topicResponse.status === 200) {
              console.log(topicResponse);
              return {
                topicName: topicResponse.data.title,
                topicID: message.topicID,
                userID: topicResponse.data.userID
              };
            } else {
              console.error('Failed to load matched topic:', topicResponse);
            }
          }
          return null;
        });

        const topicInfos = await Promise.all(topicInfoPromises);

        console.log('Match infos:', topicInfos);

        // Update messages with match info
        const messages = messageResponse.data.map((message, i) => {
          return {
            ...message,
            topicInfo: topicInfos[i],
          };
        });

        // TODO: refactor findParentTopic out of ApiManager since its not async
        const topicID = ApiManager.findParentTopic(topics, chatID);
        
        console.log('parent topic', topicID);

        setTopics(prevTopics => {
          const updatedTopics = {...prevTopics};
          updatedTopics[topicID].chats[chatID].messages = messages;
          return updatedTopics;
        });
      }
    } catch (error) {
      console.error('Failed to load messages for the chat:', error);
    }
  }

  static async createBrainstorm(userID) {
    try {
      // Attempt to create the 'Brainstorm' topic
      const topicResponse = await axiosInstance.post(`/user-topics/${userID}`, {
        title: 'Brainstorm'
      });

      if (topicResponse.status === 201) {
        // TODO: just call ApiManager.createChatandGetID here
        // If successful, create the 'Brainstorm' chat under this topic
        const chatResponse = await axiosInstance.post('/create-chat', {
          creatorTopicID: topicResponse.data.id,
          matchedTopicID: -1,
          userCreatorID: userID,
          userMatchedID: -1,
        });

        if (chatResponse.status === 201) {
          // TODO: set the brainstormID.ref to the chatID
          console.log(`Brainstorm topic and chat created for user ${userID}`);
          return { id: String(topicResponse.data.id), title: 'Brainstorm' };
        }
      }
    } catch (creationError) {
      // Log an appropriate error if the creation process fails
      console.error('Error creating Brainstorm topic or chat: ', creationError);
    }
    return null;
  }

  // TODO: throw error when user enters a repeat topic
  static async addTopic(topicName, userID, setTopics) {
    console.log('Adding topic', topicName);

    // add the topic to the database
    try {
      const topicResponse = await axiosInstance.post(`/user-topics/${userID}`, {
        title: topicName,
      });
      
      // add the topic to the user's local info
      setTopics(prevTopics => {
        const updatedTopics = { ...prevTopics };
        if (!updatedTopics[topicResponse.data.id]) {
          updatedTopics[topicResponse.data.id] = {
            title: topicName,
            chats: {},
          };
        }
        return updatedTopics;
      });

      // return a topicInfo object
      return { topicName: topicName, topicID: topicResponse.data.id, userID: userID };

    } catch (error) {
      console.error(error);
    }
  }

  static async addUser(username) {
    try {
      const response = await axiosInstance.post('/users', {
        username: username
      });

      if (response.status === 201) {
        console.log('New user added to the database');
        return response.data.id; // return the ID of the new user
      }
    } catch (error) {
      console.error('Failed to add a new user to the database:', error);
      return null;
    }
  }
}

export default ApiManager;
