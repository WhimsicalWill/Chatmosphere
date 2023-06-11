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
  const [lastStateInfo, setLastStateInfo] = useState([{
    topic: null,
    chat: null, 
    tab: null,
  }]);

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
      console.log('Setting up socket');
      const cleanup = setupSocket({ socketRef, userID, topics, setTopics });
      console.log('Socket setup');
      return () => cleanup;
    }
  }, [userID.current, brainstormChatID.current]);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  const addChatUnderTopic = async (botTopicInfo, messageNumber) => {
    const brainstormChat = topics[brainstormTopicID.current].chats[brainstormChatID.current];
    let userTopicInfo = null;

    // Retrieve the nearest user message above this messageID to use as the topic name
    for (let j = messageNumber - 1; j >= 0; j--) {
      if (Number(brainstormChat.messages[j].senderID) === Number(userID.current)) {
        userTopicInfo = brainstormChat.messages[j].topicInfo;
        break;
      }
    }

    if (!userTopicInfo) {
      console.error('Failed to find topicInfo from user messages');
      return;
    }

    // Check if chat between topics already exists
    if (topics[userTopicInfo.topicID]?.chats[botTopicInfo.topicID]) {
      console.error('Chat between these topics already exists');
      return;
    }

    // Call backend to create a new chat (and keep the new chat id)
    const chatID = await ApiManager.createChatAndGetID(
      botTopicInfo.topicID,
      userTopicInfo.topicID,
      botTopicInfo.userID,
      userTopicInfo.userID,
    );

    if (chatID == null) {
      console.error('Failed to create a new chat');
      return;
    }

    // join a room with the chatID
    socketRef.current.emit('chat-join', { userID: userID.current, room: chatID });

    // Add a new topic if it doesn't already exist and add a new chat under that topic
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[userTopicInfo.topicID]) {
        updatedTopics[userTopicInfo.topicID] = { title: userTopicInfo.topicName, chats: {} };
      }
      updatedTopics[userTopicInfo.topicID].chats[chatID] = { 
        name: botTopicInfo.topicName,
        userTopicID: userTopicInfo.topicID,
        otherUserTopicID: botTopicInfo.topicID,
        messages: [] 
      }
      return updatedTopics;
    });
    setLastStateInfo({ topic: currentTopic, chat: currentChat, tab: currentTab });
    setCurrentTab('Active Chats');
    setCurrentTopic(userTopicInfo.topicID);
    setCurrentChat(chatID);
    setEditingNewTopic(false)
    console.log('Created new chat with ID:', chatID);
  };

  const deleteTopic = (topicID) => {
    const topicChats = topics[topicID]?.chats || {};

    // Leave all chat rooms in the topic
    Object.keys(topicChats).forEach(chatID => {
      socketRef.current.emit('chat-leave', { userID: userID.current, room: chatID });
    });

    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      delete updatedTopics[topicID];
      
      // Adjust currentTopic if necessary
      if (currentTopic === topicID) {
        const remainingTopics = Object.keys(updatedTopics);
        if (remainingTopics.length > 0) {
          setCurrentTopic(remainingTopics[0]); // Select the first remaining topic
          // Reset currentChat to first chat of the new currentTopic
          const availableChats = Object.keys(updatedTopics[remainingTopics[0]].chats);
          setCurrentChat(availableChats.length > 0 ? availableChats[0] : null);
        } else {
          setCurrentTopic(null); // No topics left
          setCurrentChat(null); // No chats left
        }
      }
      return updatedTopics;
    });
  };

  const deleteChat = (topicID, chatID) => {
    socketRef.current.emit('chat-leave', { userID: userID.current, room: chatID });

    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicID]) return updatedTopics; // handle error here

      const updatedChats = { ...updatedTopics[topicID].chats };
      delete updatedChats[chatID];

      updatedTopics[topicID].chats = updatedChats;

      // Adjust currentChat if necessary
      if (currentChat === chatID) {
        const remainingChats = Object.keys(updatedChats);
        setCurrentChat(remainingChats.length > 0 ? remainingChats[0] : null); // Select the first remaining chat or null if no chats left
      }
      return updatedTopics;
    });
  };

  const handleTopicClick = (topicID) => {
    // Set the first chat of the selected topic as the current chat
    const availableChats = Object.keys(topics[topicID].chats);
    let chatToFocus = null;
    
    if (availableChats.length > 0) {
      chatToFocus = availableChats[0];
    } else {
      chatToFocus = null;
    }
    // When opening a chat:
    setLastStateInfo({ topic: currentTopic, chat: currentChat, tab: currentTab });
    setCurrentTopic(topicID);
    setCurrentChat(chatToFocus);
    setCurrentTab('Active Chats');
    setEditingNewTopic(false)
  };

  const handleChatClick = (topicID, chatID) => {
    setCurrentChat(chatID);

    if (topics) {
      const currentChatMessages = topics[topicID]?.chats[chatID]?.messages;

      if (!currentChatMessages || Object.keys(currentChatMessages).length === 0) {
        ApiManager.loadChatMessages(topics, setTopics, chatID);
      }
    }

    setLastStateInfo({ topic: currentTopic, chat: currentChat, tab: currentTab });
    setCurrentTopic(topicID);
    setCurrentChat(chatID);
  };

  const handleBackClick = () => {
    if (lastStateInfo) {  // Check if there is a chat to go back to
      const { topic, chat, tab } = lastStateInfo;  // Get the previous chat
      setCurrentTopic(topic);
      setCurrentChat(chat);
      setCurrentTab(tab)
      setLastStateInfo(null);
    } else {  // If there is no chat to go back to, go to the topics list
      setCurrentTopic(null);
      setCurrentChat(null);
      setCurrentTab('Topics');
    }
  };

  const submitNewTopicName = async (event) => {
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
    const text = event.target.value;
    event.target.value = '';
    
    if (!text) {
      return false;
    }

    handleMessageHelper(chatID, text);
    return true;
  };

  const handleMessageHelper = async (chatID, text) => {
    if (chatID === brainstormChatID.current) {
      const topicInfo = await ApiManager.addTopic(text, userID.current, setTopics);
      const botResponses = await ApiManager.getBotResponse(text, userID.current);
      socketRef.current.emit('new-message', { 
        chatID: chatID,
        text: text,
        senderID: userID.current,
        topicInfo: topicInfo,
      });
      for (const botResponse of botResponses) {
        socketRef.current.emit('new-message', { 
          chatID: chatID,
          text: botResponse.text,
          senderID: botID,
          topicInfo: botResponse.topicInfo,
        });
      }
    } else {
      socketRef.current.emit('new-message', { 
        chatID: chatID,
        text: text,
        senderID: userID.current,
        topicInfo: null,
      });
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
    handleChatClick,
    handleBackClick,
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
    handleMessage,
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
