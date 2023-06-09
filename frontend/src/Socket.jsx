import io from 'socket.io-client';

const findParentTopic = (topics, chatID) => {
  for (let topicName in topics) {
    if (topics[topicName][chatID]) {
      return topicName;
    }
  }
  return null;
};

export const setupSocket = ({
  socketRef,
  userID, 
  topics,
  setTopics, 
}) => {

  socketRef.current = io('http://localhost:5000');
  socketRef.current.emit('user-join', { userID: userID.current, room: userID.current });

  // Iterate through all chats and join the rooms using chat-join
  Object.keys(topics).forEach(topicID => {
    const chats = topics[topicID];
    Object.keys(chats).forEach(chatID => {
      if (chatID === 'title') return;
      socketRef.current.emit('chat-join', { userID: userID.current, room: chatID });
      console.log('Joined room', chatID);
    });
  });

  // handle receiving a message for a specific chat
  socketRef.current.on('message', (response) => {
    console.log('Received message:', response);

    const { chatID, message, senderID, matchInfo } = response;
    
    // update the topic object to include the new message
    setTopics(prevTopics => {
      const topicID = findParentTopic(prevTopics, chatID);

      if (!topicID) {
        console.error('No topic found for given chatID');
        return;
      }

      if (!prevTopics[topicID] || !prevTopics[topicID][chatID]) return prevTopics;

      const messageID = prevTopics[topicID][chatID].messages.length;
      const updatedChat = {
        ...prevTopics[topicID][chatID],
        messages: [...prevTopics[topicID][chatID].messages, { message, senderID, matchInfo, messageID }],
      };
      const updatedTopics = {
        ...prevTopics,
        [topicID]: {
          ...prevTopics[topicID],
          [chatID]: updatedChat,
        },
      };

      return updatedTopics;
    });
  });

  // handle another user creating a new chat with this user
  socketRef.current.on('new-chat', (chatInfo) => {
    console.log('New chat created:', chatInfo);

    const {
      chatID,
      creatorTopicID,
      matchedTopicID,
      userCreatorID,
      userMatchedID,
    } = chatInfo;
    // TODO: add the otherUserID to the chatInfo locally

    socketRef.current.emit('chat-join', { userID: userCreatorID, room: chatID });
    
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };

      const chatName = `Chat ${chatID}`;
      if (!updatedTopics[creatorTopicID]) updatedTopics[creatorTopicID] = {};
      if (!updatedTopics[creatorTopicID][chatID]) 
        updatedTopics[creatorTopicID][chatID] = { name: chatName, messages: [] }

      return updatedTopics;
    });
  });

  // Return a cleanup function
  return () => { socketRef.current.disconnect(); }
}
