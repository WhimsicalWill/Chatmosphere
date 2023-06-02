import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = ({
    userId, 
    setTopics, 
    setTopicChatMap, 
    setCurrentTopic, 
    setCurrentChat, 
    topicChatMap,
}) => {
    const socketRef = useRef();

    useEffect(() => {
        if (Object.keys(topicChatMap).length > 0) {
            socketRef.current = io('http://localhost:5000');
            socketRef.current.emit('join', { username: userId, room: userId });

            socketRef.current.on('message', (response) => {
                console.log('Received message:', response);

                const { chatId, message, user, matchInfo } = response;

                console.log('topicChatMap:', topicChatMap);
                const [topicName, chatName] = topicChatMap[chatId];

                if (!topicName || !chatName) {
                    console.error('No topic or chat name found for given chatId');
                    return;
                }

                setTopics(prevTopics => {
                    if (!prevTopics[topicName] || !prevTopics[topicName][chatName]) return prevTopics;

                    const messageId = prevTopics[topicName][chatName].messages.length;

                    const updatedChat = {
                        ...prevTopics[topicName][chatName],
                        messages: [...prevTopics[topicName][chatName].messages, { message, user, matchInfo, messageId }],
                    };

                    const updatedTopics = {
                        ...prevTopics,
                        [topicName]: {
                            ...prevTopics[topicName],
                            [chatName]: updatedChat,
                        },
                    };

                    return updatedTopics;
                });
            });

            socketRef.current.on('new_chat', (chatInfo) => {
                console.log('New chat created:', chatInfo);

                const chatId = chatInfo.chatId;
                if (!chatId) {
                    console.error('No chatId received');
                    return;
                }

                socketRef.current.emit('join', { username: userId, room: chatId });

                const topicName = 'SomeTopic';
                const chatName = 'SomeChatName';

                setTopics(prevTopics => {
                    const updatedTopics = { ...prevTopics };

                    if (!updatedTopics[topicName]) updatedTopics[topicName] = {};
                    if (!updatedTopics[topicName][chatName]) 
                        updatedTopics[topicName][chatName] = { id: chatId, name: chatName, messages: [] }

                    return updatedTopics;
                });

                setTopicChatMap(prevTopicChatMap => ({
                    ...prevTopicChatMap,
                    [chatId]: [topicName, chatName]
                }));

                setCurrentTopic(topicName);
                setCurrentChat(chatName);
            });
        }
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
  }, [topicChatMap]); // Note the addition of topicChatMap here

    return socketRef;
};
