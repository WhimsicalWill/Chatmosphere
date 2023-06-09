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
  brainstormChatID,
  userID, 
  setTopics, 
}) => {

  socketRef.current = io('http://localhost:5000');
  socketRef.current.emit('user-join', { userID: userID.current, room: userID });
  socketRef.current.emit('chat-join', { userID: userID.current, room: brainstormChatID.current });
  console.log('Connected to backend and joined room', brainstormChatID.current);

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
  // TODO: need to refactor this to handle the new chatInfo object
  socketRef.current.on('new-chat', (chatInfo) => {
    console.log('New chat created:', chatInfo);

    const { chatID, chatName, topicName } = chatInfo;

    if (!chatID) {
      console.error('No chatID received');
      return;
    }

    socketRef.current.emit('chat-join', { userID: userID, room: chatID });
    
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };

      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};
      if (!updatedTopics[topicName][chatID]) 
        updatedTopics[topicName][chatID] = { name: chatName, messages: [] }

      return updatedTopics;
    });
  });

  // Return a cleanup function
  return () => { socketRef.current.disconnect(); }
}
