import io from 'socket.io-client';

const findParentTopic = (topics, chatId) => {
  for (let topicName in topics) {
    if (topics[topicName][chatId]) {
      return topicName;
    }
  }
  return null;
};

export const setupSocket = ({
  socketRef,
  brainstormId,
  userId, 
  topics,
  setTopics, 
}) => {

  socketRef.current = io('http://localhost:5000');
  socketRef.current.emit('user_join', { username: userId, room: userId });
  socketRef.current.emit('chat_join', { username: userId, room: brainstormId });
  console.log('Connected to backend and joined rooms')

  // handle receiving a message for a specific chat
  socketRef.current.on('message', (response) => {
    console.log('Received message:', response);

    const { chatId, message, userId, matchInfo } = response;
    
    // update the topic object to include the new message
    setTopics(prevTopics => {
      console.log('prevTopics', prevTopics);
      const topicName = findParentTopic(prevTopics, chatId);

      if (!topicName) {
        console.error('No topic or chat name found for given chatId');
        return;
      }

      console.log('prevTopics', prevTopics);

      if (!prevTopics[topicName] || !prevTopics[topicName][chatId]) return prevTopics;

      const messageId = prevTopics[topicName][chatId].messages.length;
      const updatedChat = {
        ...prevTopics[topicName][chatId],
        messages: [...prevTopics[topicName][chatId].messages, { message, userId, matchInfo, messageId }],
      };
      const updatedTopics = {
        ...prevTopics,
        [topicName]: {
          ...prevTopics[topicName],
          [chatId]: updatedChat,
        },
      };

      return updatedTopics;
    });
  });

  // handle another user creating a new chat with this user
  socketRef.current.on('new_chat', (chatInfo) => {
    console.log('New chat created:', chatInfo);

    const { chatId, chatName, topicName } = chatInfo;

    if (!chatId) {
      console.error('No chatId received');
      return;
    }

    socketRef.current.emit('chat_join', { username: userId, room: chatId });
    
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };

      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};
      if (!updatedTopics[topicName][chatId]) 
        updatedTopics[topicName][chatId] = { name: chatName, messages: [] }

      return updatedTopics;
    });
  });

  // Return a cleanup function
  return () => { socketRef.current.disconnect(); }
}
