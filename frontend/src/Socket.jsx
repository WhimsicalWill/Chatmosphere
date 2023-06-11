import io from 'socket.io-client';
import ApiManager from './ApiManager';

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
    const chats = topics[topicID].chats;
    Object.keys(chats).forEach(chatID => {
      socketRef.current.emit('chat-join', { userID: userID.current, room: chatID });
      console.log('Joined room', chatID);
    });
  });

  // handle receiving a message for a specific chat
  socketRef.current.on('message', (response) => {
    // TODO: pass the timestamp from the backend
    const { messageNumber, isoString, chatID, text, senderID, topicInfo } = response;
    const timestamp = new Date(isoString);

    // update the topic object to include the new message
    setTopics(prevTopics => {
      const topicID = ApiManager.findParentTopic(prevTopics, chatID);

      if (!topicID) {
        console.error('No topic found for given chatID');
        return;
      }

      if (!prevTopics[topicID] || !prevTopics[topicID].chats || !prevTopics[topicID].chats[chatID]) return prevTopics;

      const updatedChat = {
        ...prevTopics[topicID].chats[chatID],
        messages: [...prevTopics[topicID].chats[chatID].messages, { messageNumber, senderID, text, timestamp, topicInfo }],
      };

      const updatedTopics = {
        ...prevTopics,
        [topicID]: {
          title: prevTopics[topicID].title,
          chats: {
            ...prevTopics[topicID].chats,
            [chatID]: updatedChat,
          },
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

    socketRef.current.emit('chat-join', { userID: userCreatorID, room: chatID });

    Promise.all([ApiManager.getTopic(matchedTopicID), ApiManager.getTopic(creatorTopicID)]).then(([chatName, creatorTopicName]) => {
      setTopics(prevTopics => {
        const updatedTopics = { ...prevTopics };

        if (!updatedTopics[creatorTopicID]) updatedTopics[creatorTopicID] = { title: creatorTopicName, chats: {} };
        if (!updatedTopics[creatorTopicID].chats[chatID]) 
          updatedTopics[creatorTopicID].chats[chatID] = { name: chatName, messages: [] }

        return updatedTopics;
      });
    }).catch(err => console.error(err));
  });

  // Return a cleanup function
  return () => { socketRef.current.disconnect(); }
}
