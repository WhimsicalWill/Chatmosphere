import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ApiManager from './ApiManager';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';
import { setupSocket } from './Socket';


function App() {
  const botID = -1;

  // state variables cause the component to re-render when they are updated
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');
  const [topics, setTopics] = useState(null);

  // ref variables are persistent and changes to them do not cause the component to re-render
  // TODO: add user-authentication and retrieve the user's id
  const userID = useRef(null);
  const brainstormTopicID = useRef(null);
  const brainstormChatID = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // This effect fetches the user id
  useEffect(() => {
    (async () => {
      userID.current = await ApiManager.getNextUserID();
      [brainstormTopicID.current, brainstormChatID.current] = await ApiManager.getTopicsAndChats(userID.current, setTopics);
      // TODO: could add another ref/state for isLoading here
    })();
  }, []);

  // This effect sets up the socket
  useEffect(() => {
    // Hack to check if the promises have resolved
    console.log('Trying to setup socket');
    if (typeof userID.current === 'number' && typeof brainstormChatID.current === 'string') {
      const cleanup = setupSocket({ socketRef, brainstormChatID, userID, setTopics });
      console.log('Socket setup');
      return () => cleanup;
    }
  }, [userID.current, brainstormChatID.current]);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  const addChatUnderTopic = async (matchInfo, messageID) => {
    const brainstormChat = topics[brainstormTopicID.current][brainstormChatID.current];

    console.log('brainstormChat', brainstormChat);
    let topicName = null;

    // Retrieve the nearest user message above this messageID to use as the topic name
    for (let j = messageID - 1; j >= 0; j--) {
      if (Number(brainstormChat.messages[j].userID) === Number(userID.current)) {
        topicName = brainstormChat.messages[j].message;
        break;
      }
    }

    // TODO: create new topic here
    // Then, we will have to pass the two topicIDs to the backend

    // Call backend to create a new chat (with a chat id)
    const chatID = await ApiManager.createChatAndGetID(matchInfo.userID, matchInfo.topicID, topicName);
    if (chatID == null) {
      console.error('Failed to create a new chat');
      return;
    }
    // join a room with the chatID
    socketRef.current.emit('chat-join', { userID: userID.current, room: chatID });

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
      if (!updatedTopics[topicName][chatID]) 
        updatedTopics[topicName][chatID] = { name: chatName, messages: [] }

      console.log('updatedTopics', topics);

      return updatedTopics;
    });
  };

  const deleteTopic = (name) => {
    // TODO: socketRef.current leave room by chatID
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

  // changed chatName to chatID
  const deleteChat = (topicName, chatID) => {
    // TODO: socketRef.current leave room by chatID
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) return updatedTopics; // handle error here

      const updatedChats = { ...updatedTopics[topicName] };
      delete updatedChats[chatID];

      updatedTopics[topicName] = updatedChats;

      if (currentChat === chatID) {
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

  const handleTopicClick = (topicID) => {
    setCurrentTopic(topicID);
    setCurrentTab('Active Chats');
    setEditingNewTopic(false)
    
    // Set the first chat of the selected topic as the current chat
    const availableChats = Object.keys(topics[topicID]);
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
    const messageSent = handleMessage(event, brainstormChatID.current);
    if (!messageSent) return;
    setEditingNewTopic(false);
    setCurrentTopic(brainstormTopicID.current);
    setCurrentChat(brainstormChatID.current);
  }

  const handleMessage = (event, chatID) => {
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

    handleMessageHelper(chatID, message);
    return true;
  };

  const handleMessageHelper = async (chatID, message) => {

    // TODO: call the ChatMessage endpoint and add a new message to the database

    console.log('Sending message:', message);
    console.log(chatID, message);
    socketRef.current.emit('new-message', { 
      chatID: chatID,
      message: message,
      senderID: userID.current,
      matchInfo: null,
    });

    if (chatID === brainstormChatID.current) {
      const botResponses = await ApiManager.submitTopicAndGetResponse(message, userID.current);
      for (const botResponse of botResponses) {
        socketRef.current.emit('new-message', { 
          chatID: chatID,
          message: botResponse.text,
          senderID: botID,
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
    brainstormTopicID,
    brainstormChatID,
  };

  const mainProps = {
    currentTopic,
    currentChat,
    currentTab,
    topics,
    addChatUnderTopic,
    chatEndRef,
    currentTab,
    handleMessage,
    handleBackClick,
    userID,
  }


  return (
    <div className="container">
      <div className="sidebar">
        <SidebarHeader />
        <SidebarTabHeader {...sidebarProps} />
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
