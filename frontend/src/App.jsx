import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './components/ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import io from 'socket.io-client';

function App() {
  const userId = 0; // TODO: add user-authentication and retrieve the user's id
  const botId = -1;
  
  // Connect to the socket server, and join the user's room
  const socket = io('http://localhost:5000');
  socket.emit('join', { username: userId, room: userId });
  
  const createNewChat = (chatName) => {
      return { id: ApiManager.getNextChatId(), name: chatName, messages: [] };
  };

  const exampleChat = createNewChat("Example Chat");
  const brainstormChat = createNewChat("Brainstorm");
  const [topics, setTopics] = useState({
    "Example Topic": {
      // each message formatted as { text: "Hello!", user: true, matchInfo: null, messageId: 0 },
      // TODO: use chatId instead of chatName for uniqueness
      "Example Chat": exampleChat,
      //... more chats
    },
    // this topic / chat is specifically for the bot to process new topics
    "Brainstorm": {
      "Brainstorm": brainstormChat,
    },
    //... more topics
  });
  const topicChatMap = {
    [exampleChat.id]: ['Example Topic', 'Example Chat'],
    [brainstormChat.id]: ['Brainstorm', 'Brainstorm']
  };
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("Example Topic");
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');
  const chatEndRef = useRef(null);

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
          socket.emit('new_message', { 
            room: brainstormChat.id,
            message: message,
            userId: userId,
            match: null,
          });
          const botResponses = await ApiManager.getResponse(message);
          for (const botResponse of botResponses) {
            socket.emit('new_message', { 
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
    // call socket.join to join a room with the chatId
    socket.emit('join', { username: userId, room: chatId });

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

    // Add a new topic if it doesn't already exist and add a new chat under that topic
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};

      // Use matchInfo.text as the chat title
      const chatName = matchInfo.chatName;
      if (!updatedTopics[topicName][chatName]) 
        updatedTopics[topicName][chatName] = { id: chatId, name: chatName, messages: [] }
        updatedTopics[topicName][chatName] = createNewChat(chatName, chatId);

      return updatedTopics;
    });

    // Update topicChatMap
    topicChatMap[chatId] = [topicName, matchInfo.chatName];

    // Focus on the new chat and topic
    setCurrentTopic(topicName);
    setCurrentChat(chatName);
  };

  const deleteTopic = (name) => {
    // TODO: socket leave room by chatId
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
    // TODO: socket leave room by chatId
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

  socket.on('message', (response) => {
    // When a chat event is received, add the message to state
    setTopics(prevTopics => {
      // You'd need to determine the topicName and chatName from the response
      const {chatId, message, user, matchInfo } = response;

      // get topicName and chatName using chatId
      const [topicName, chatName] = topicChatMap[chatId];

      if (!prevTopics[topicName] || !prevTopics[topicName][chatName]) return prevTopics; // handle error here

      const messageId = prevTopics[topicName][chatName].messages.length; // Use the length of the messages array as the messageId

      const updatedChat = {
        ...prevTopics[topicName][chatName],
        messages: [...prevTopics[topicName][chatName].messages, { message, user, matchInfo, messageId }]
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

  socket.on('new_chat', (chatInfo) => {
    // Extract chatId from chatInfo
    const chatId = chatInfo.chatId;
    if (!chatId) {
        console.error('No chatId received');
        return;
    }

    // Join the new chat room
    socket.emit('join', { username: userId, room: chatId });

    // You will need a way to determine topicName and chatName in this context as well
    // For now, let's assume they are fixed values
    const topicName = 'SomeTopic';
    const chatName = 'SomeChatName';

    // Add the new topic and chat to the list of topics
    setTopics(prevTopics => {
        const updatedTopics = { ...prevTopics };
        if (!updatedTopics[topicName]) updatedTopics[topicName] = {};

        if (!updatedTopics[topicName][chatName]) 
              // return { id: ApiManager.getNextChatId(), name: chatName, messages: [] };
            updatedTopics[topicName][chatName] = { id: chatId, name: chatName, messages: [] }

        return updatedTopics;
    });

    // Update topicChatMap
    topicChatMap[chatId] = [topicName, chatName];

    // Focus on the new chat and topic
    setCurrentTopic(topicName);
    setCurrentChat(chatName);
  });

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
      // TODO: this if else can be made more readable
      if (message && currentTopic !== 'Brainstorm') {
        // { username: userId, room: chatId }
        socket.emit('new_message', { 
          room: currentChat.id,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const randomBotResponse = ApiManager.getRandomResponse(message, userId);
        // TODO: remove the line below, since the other use will be sending messages
        socket.emit('new_message', { 
          room: currentChat.id,
          message: randomBotResponse,
          userId: botId,
          matchInfo: null,
        });
      }
      else if (message) {
        socket.emit('new_message', { 
          room: currentChat.id,
          message: message,
          userId: userId,
          matchInfo: null,
        });
        const botResponses = await ApiManager.getResponse(message, userId);
        for (const botResponse of botResponses) {
          socket.emit('new_message', { 
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
