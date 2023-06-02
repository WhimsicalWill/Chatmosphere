import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import { setupSocket } from './Socket';

function App() {
  // TODO: add user-authentication and retrieve the user's id
  const userId = 0;
  const botId = -1;
  const brainstormId = -1;

  // state variables cause the component to re-render when they are updated
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');

  const [topics, setTopics] = useState({
    "Brainstorm": {
      // each message formatted as { message: "Hello!", user: true, matchInfo: null, messageId: 0 },
      [brainstormId]: { name: "Brainstorm", messages: [] },
      //... more chats
    },
    //... more topics
  });

  // ref variables are persistent and changes to them do not cause the component to re-render
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // This effect ensures we only set up the socket once, when App is mounted
  useEffect(() => {
      const cleanup = setupSocket({ socketRef, brainstormId, userId, topics, setTopics });
      return cleanup;
  }, []);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  // TODO: remove duplicated brainstorm logic (in this and sendMessage)
  const submitNewTopicName = async (event) => {
    if (event.key === 'Enter') {

        // return early if socket is not setup yet
        if (!socketRef.current) {
         console.log('Socket not setup yet');
         return;
        }

        event.preventDefault(); // Prevent form submission
        const message = event.target.value;
        event.target.value = '';
        if (message) {
          setBrainstormActive(true);
          // TODO: might have to pass null in place of the botResponse.matchInfo
          socketRef.current.emit('new_message', { 
            chatId: brainstormId,
            message: message,
            userId: userId,
            matchInfo: null,
          });
          const botResponses = await ApiManager.getResponse(message, userId);
          for (const botResponse of botResponses) {
            socketRef.current.emit('new_message', { 
              chatId: brainstormId,
              message: botResponse.text,
              userId: botId,
              matchInfo: botResponse.matchInfo,
            });
          }
        }
        setEditingNewTopic(false);
    }
  };

  const addChatUnderTopic = async (matchInfo, messageId) => {
    const brainstormChat = topics["Brainstorm"][brainstormId];
    let topicName = null;

    // Call backend to create a new chat (with a chat id)
    const chatId = await ApiManager.createChatAndGetId(matchInfo.userId, matchInfo.topicId);
    if (!chatId) {
      console.error('Failed to create a new chat');
      return;
    }
    // call socketRef.current.join to join a room with the chatId
    socketRef.current.emit('join', { username: userId, room: chatId });

    // Retrieve the nearest user message above this messageId to use as the topic name
    for (let j = messageId - 1; j >= 0; j--) {
      if (brainstormChat[j].user === userId) {
        topicName = brainstormChat[j].text;
        break;
      }
    }

    if (!topicName) {
      console.error('Failed to find a user message to use as the topic name');
      return;
    }

    const chatName = matchInfo.chatName;

    // Add a new topic if it doesn't already exist and add a new chat under that topic
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};

      // Use matchInfo.text as the chat title
      if (!updatedTopics[topicName][chatId]) 
        updatedTopics[topicName][chatId] = { name: chatName, messages: [] }

      return updatedTopics;
    });

    // Focus on the new chat and topic
    setCurrentTopic(topicName);
    setCurrentChat(chatId);
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

    // If brainstorm is currently active, deactivate it
    setBrainstormActive(false);
  };

  const handleBackClick = () => {
    setCurrentTab('Topics');
    setCurrentTopic(null);
    setCurrentChat(null);
  };

  const handleNewMessage = async (event) => {
    if (event.key === 'Enter') {
      
      // return early if socket is not setup yet
      if (!socketRef.current) {
        console.log('Socket not setup yet');
        return;
      }

      event.preventDefault(); // Prevent form submission
      const message = event.target.value;
      event.target.value = '';
      console.log('Entering message:', message);
      // TODO: this if else can be made more readable
      if (message && currentTopic !== 'Brainstorm') {
        // { username: userId, room: chatId }
        socketRef.current.emit('new_message', { 
          chatId: currentChat,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const randomBotResponse = ApiManager.getRandomResponse(message, userId);
        // TODO: remove the line below, since the other use will be sending messages
        socketRef.current.emit('new_message', { 
          chatId: currentChat,
          message: randomBotResponse,
          userId: botId,
          matchInfo: null,
        });
      }
      else if (message) {
        socketRef.current.emit('new_message', { 
          chatId: currentChat,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const botResponses = await ApiManager.getResponse(message, userId);
        for (const botResponse of botResponses) {
          socketRef.current.emit('new_message', { 
            chatId: currentChat,
            message: botResponse.text,
            userId: botId,
            matchInfo: botResponse.matchInfo,
          });
        }
      }
    }
  };

  const sidebarProps = { 
    currentTab,
    topics, 
    currentTopic, 
    currentChat, 
    setCurrentChat, 
    deleteChat,
    deleteTopic,
    handleTopicClick,
    submitNewTopicName,
    isEditingNewTopic,
    setEditingNewTopic,
    brainstormActive,
    setBrainstormActive,
  };

  const mainProps = {
    brainstormId,
    currentTopic,
    currentChat,
    topics,
    addChatUnderTopic,
    chatEndRef,
    brainstormActive,
    currentTab,
    handleNewMessage,
    userId,
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
