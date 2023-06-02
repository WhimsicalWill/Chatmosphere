import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import { useSocket } from './Socket';

function App() {
  const userId = 0; // TODO: add user-authentication and retrieve the user's id
  const botId = -1;
  
  const [topics, setTopics] = useState({});
  const [brainstormChat, setBrainstormChat] = useState(null);
  const [topicChatMap, setTopicChatMap] = useState({}); 
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("Example Topic");
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);
  const socketRef = useSocket({ userId, setTopics, setTopicChatMap, setCurrentTopic, setCurrentChat, topicChatMap });

  // TODO: there is a cycle in our dependencies
  // Socket depends on topicChatMap
  // but topicChatMap depends on socket
  const fetchInitialData = async () => {
    const chatId = await ApiManager.getNextChatId();
    const chatName = "Brainstorm";

    const newBrainstormChat = { id: chatId, name: chatName, messages: [] };
    setBrainstormChat(newBrainstormChat);

    socketRef.current.emit('join', { username: userId, room: chatId });
    console.log('Joined brainstorm chat room:', chatId)

    const newTopics = {
      "Brainstorm": {
        "Brainstorm": newBrainstormChat,
      },
      //... more topics
    };
    setTopics(newTopics);

    const newTopicChatMap = {
      [chatId]: ['Brainstorm', 'Brainstorm']
    };
    setTopicChatMap(newTopicChatMap);
    console.log(newTopicChatMap);
    console.log(topicChatMap);
  }

  useEffect(() => {
    if (socketRef.current) {
      fetchInitialData().then(() => setIsLoading(false));
    }
  }, [socketRef.current]);

  // debugging socketRef.current
  console.log('socketRef.current:', socketRef.current);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  // TODO: remove duplicated brainstorm logic (in this and sendMessage)
  const submitNewTopicName = async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        const message = event.target.value;
        event.target.value = '';
        if (message) {
          setBrainstormActive(true);
          // TODO: might have to pass null in place of the botResponse.matchInfo
          socketRef.current.emit('new_message', { 
            room: brainstormChat.id,
            message: message,
            userId: userId,
            match: null,
          });
          const botResponses = await ApiManager.getResponse(message, userId);
          for (const botResponse of botResponses) {
            socketRef.current.emit('new_message', { 
              room: brainstormChat.id,
              message: botResponse.text,
              userId: botId,
              match: botResponse.matchInfo,
            });
          }
        }
        setEditingNewTopic(false);
    }
  };

  const addChatUnderTopic = async (matchInfo, messageId) => {
    const brainstormChats = topics["Brainstorm"]["Brainstorm"];
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
      if (brainstormChats[j].user) {
        topicName = brainstormChats[j].text;
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
      if (!updatedTopics[topicName][chatName]) 
        updatedTopics[topicName][chatName] = { id: chatId, name: chatName, messages: [] }

      return updatedTopics;
    });

    setTopicChatMap(prevTopicChatMap => ({
      ...prevTopicChatMap,
      [chatId]: [topicName, matchInfo.chatName]
    }));

    // Focus on the new chat and topic
    setCurrentTopic(topicName);
    setCurrentChat(chatName);
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

  const deleteChat = (topicName, chatName) => {
    // TODO: socketRef.current leave room by chatId
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) return updatedTopics; // handle error here

      const updatedChats = { ...updatedTopics[topicName] };
      delete updatedChats[chatName];

      updatedTopics[topicName] = updatedChats;

      // TODO: should use chatId instead of chatName for uniqueness
      if (currentChat === chatName) {
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
      event.preventDefault(); // Prevent form submission
      const message = event.target.value;
      event.target.value = '';
      console.log('Entering message:', message);
      // TODO: this if else can be made more readable
      if (message && currentTopic !== 'Brainstorm') {
        // { username: userId, room: chatId }
        socketRef.current.emit('new_message', { 
          room: currentChat.id,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const randomBotResponse = ApiManager.getRandomResponse(message, userId);
        // TODO: remove the line below, since the other use will be sending messages
        socketRef.current.emit('new_message', { 
          room: currentChat.id,
          message: randomBotResponse,
          userId: botId,
          matchInfo: null,
        });
      }
      else if (message) {
        socketRef.current.emit('new_message', { 
          room: currentChat.id,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const botResponses = await ApiManager.getResponse(message, userId);
        for (const botResponse of botResponses) {
          socketRef.current.emit('new_message', { 
            room: currentChat.id,
            message: botResponse.text,
            userId: botId,
            match: botResponse.matchInfo,
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
    currentTopic,
    currentChat,
    topics,
    addChatUnderTopic,
    chatEndRef,
    brainstormActive,
    currentTab,
    handleNewMessage,
    userId,
    isLoading,
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
