import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import { setupSocket } from './Socket';

function App() {
  const botId = -1;
  const brainstormId = -1;

  // state variables cause the component to re-render when they are updated
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');

  const [topics, setTopics] = useState({
    "Brainstorm": {
      // each message formatted as { message: "Hello!", user: true, matchInfo: null, messageId: 0 },
      [brainstormId]: { name: "AI Helper", messages: [] },
      //... more chats
    },
    //... more topics
  });

  // ref variables are persistent and changes to them do not cause the component to re-render
  // TODO: add user-authentication and retrieve the user's id
  const userId = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // This effect fetches the user id
  useEffect(() => {
    (async () => {
      userId.current = await ApiManager.getNextUserId();
    })();
  }, []);

  // This effect sets up the socket
  useEffect(() => {
    // Check if userId.current is a numeric value
    if (typeof userId.current === 'number') {
      const cleanup = setupSocket({ socketRef, brainstormId, userId: userId.current, setTopics });
      return () => cleanup;
    }
  }, [userId.current]);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  const addChatUnderTopic = async (matchInfo, messageId) => {
    const brainstormChat = topics["Brainstorm"][brainstormId];

    console.log('brainstormChat', brainstormChat);
    let topicName = null;

    // Retrieve the nearest user message above this messageId to use as the topic name
    for (let j = messageId - 1; j >= 0; j--) {
      if (Number(brainstormChat.messages[j].userId) === Number(userId.current)) {
        topicName = brainstormChat.messages[j].message;
        break;
      }
    }

    // Call backend to create a new chat (with a chat id)
    const chatId = await ApiManager.createChatAndGetId(matchInfo.userId, matchInfo.topicId, topicName);
    if (chatId == null) {
      console.error('Failed to create a new chat');
      return;
    }
    // call socketRef.current.join to join a room with the chatId
    socketRef.current.emit('chat_join', { username: userId.current, room: chatId });

    if (!topicName) {
      console.error('Failed to find a user message to use as the topic name');
      return;
    }

    console.log('matchInfo.chatName', matchInfo.chatName);
    const chatName = matchInfo.chatName;

    // Add a new topic if it doesn't already exist and add a new chat under that topic
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};

      // Use matchInfo.text as the chat title
      if (!updatedTopics[topicName][chatId]) 
        updatedTopics[topicName][chatId] = { name: chatName, messages: [] }

      console.log('updatedTopics', topics);

      return updatedTopics;
    });
  };

  const deleteTopic = (name) => {
    // TODO: socketRef.current leave room by chatId
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      delete updatedTopics[name];
      if (currentTopic === name) {
        const remainingTopics = Object.keys(updatedTopics);
        if (remainingTopics.length > 0) {
          setCurrentTopic(remainingTopics[0]); // Select the first remaining topic
        } else {
          setCurrentTopic(null); // No topics left
        }
      }
      return updatedTopics;
    });
  };

  // changed chatName to chatId
  const deleteChat = (topicName, chatId) => {
    // TODO: socketRef.current leave room by chatId
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) return updatedTopics; // handle error here

      const updatedChats = { ...updatedTopics[topicName] };
      delete updatedChats[chatId];

      updatedTopics[topicName] = updatedChats;

      if (currentChat === chatId) {
        const remainingChats = Object.keys(updatedChats);
        if (remainingChats.length > 0) {
          setCurrentChat(remainingChats[0]); // Select the first remaining chat
        } else {
          setCurrentChat(null); // No chats left
        }
      }
      return updatedTopics;
    });
  };

  const handleTopicClick = (topicName) => {
    setCurrentTopic(topicName);
    setCurrentTab('Active Chats');
    
    // Set the first chat of the selected topic as the current chat
    const availableChats = Object.keys(topics[topicName]);
    if (availableChats.length > 0) {
      setCurrentChat(availableChats[0]);
    } else {
      setCurrentChat(null); // No chats left
    }
  };

  const handleBackClick = () => {
    setCurrentTab('Topics');
    setCurrentTopic(null);
    setCurrentChat(null);
  };

  const submitNewTopicName = (event) => {
    const messageSent = handleMessage(event, brainstormId);
    console.log('messageSent', messageSent);
    if (!messageSent) return;
    setEditingNewTopic(false);
    setCurrentTopic('Brainstorm');
    setCurrentChat(brainstormId);
  }

  const handleMessage = (event, chatId) => {
    if (event.key !== 'Enter') {
      return false;
    }
    
    // return early if socket is not setup yet
    if (!socketRef.current) {
      console.log('Socket not setup yet');
      return false;
    }

    // get message and clear input
    event.preventDefault(); // Prevent form submission
    const message = event.target.value;
    event.target.value = '';
    
    if (!message) {
      return false;
    }

    handleMessageHelper(event, chatId, message);
    return true;
  };

  const handleMessageHelper = async (event, chatId, message) => {
    socketRef.current.emit('new_message', { 
      chatId: chatId,
      message: message,
      userId: userId.current,
      matchInfo: null,
    });

    if (chatId === brainstormId) {
      const botResponses = await ApiManager.getResponse(message, userId.current);
      for (const botResponse of botResponses) {
        socketRef.current.emit('new_message', { 
          chatId: chatId,
          message: botResponse.text,
          userId: botId,
          matchInfo: botResponse.matchInfo,
        });
      }
    }
  };

  const sidebarProps = { 
    currentTab,
    topics, 
    currentTopic, 
    currentChat, 
    setCurrentTopic,
    setCurrentChat, 
    deleteChat,
    deleteTopic,
    handleTopicClick,
    submitNewTopicName,
    isEditingNewTopic,
    setEditingNewTopic,
    brainstormId,
  };

  const mainProps = {
    brainstormId,
    currentTopic,
    currentChat,
    topics,
    addChatUnderTopic,
    chatEndRef,
    currentTab,
    handleMessage,
    userId: userId.current,
  }


  return (
    <div className="container">
      <div className="sidebar">
        <SidebarHeader />
        <SidebarTabHeader currentTab={currentTab} handleBackClick={handleBackClick} />
        <SidebarContent {...sidebarProps} />
      </div>
      <div className="main">
        <MainChat {...mainProps} />
        <MainInput {...mainProps} />
      </div>
    </div>
  );
}

export default App;
