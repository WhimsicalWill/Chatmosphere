import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import { setupSocket } from './Socket';

// changed in backend:
// convMatches, segwayResponse

function App() {
  const botId = -1;

  // state variables cause the component to re-render when they are updated
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');
  const [topics, setTopics] = useState(null);

  // ref variables are persistent and changes to them do not cause the component to re-render
  // TODO: add user-authentication and retrieve the user's id
  const userId = useRef(null);
  const brainstormId = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // This effect fetches the user id
  useEffect(() => {
    (async () => {
      userId.current = await ApiManager.getNextUserId();
      brainstormId.current = await ApiManager.getNextChatId();
    })();
  }, []);

  // This effect sets up the socket
  useEffect(() => {
    // Check if userId.current is a numeric value
    if (typeof userId.current === 'number' && typeof brainstormId.current === 'number') {
      setTopics({
        "Brainstorm": {
          [brainstormId.current]: { name: "AI Helper", messages: [] },
          //... more chats
        },
        //... more topics
      });
      const cleanup = setupSocket({ socketRef, brainstormId: brainstormId.current, userId: userId.current, setTopics });
      return () => cleanup;
    }
  }, [userId.current, brainstormId.current]);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  const addChatUnderTopic = async (matchInfo, messageId) => {
    const brainstormChat = topics["Brainstorm"][brainstormId.current];

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
    socketRef.current.emit('chat-join', { username: userId.current, room: chatId });

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
    setEditingNewTopic(false)
    
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
    const messageSent = handleMessage(event, brainstormId.current);
    if (!messageSent) return;
    setEditingNewTopic(false);
    setCurrentTopic('Brainstorm');
    setCurrentChat(brainstormId.current);
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
    socketRef.current.emit('new-message', { 
      chatId: chatId,
      message: message,
      userId: userId.current,
      matchInfo: null,
    });

    if (chatId === brainstormId.current) {
      const botResponses = await ApiManager.getResponse(message, userId.current);
      for (const botResponse of botResponses) {
        socketRef.current.emit('new-message', { 
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
    brainstormId: brainstormId.current,
  };

  const mainProps = {
    brainstormId: brainstormId.current,
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
