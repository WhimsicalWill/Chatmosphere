import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Bot from './components/Bot';
import { SidebarHeader, SidebarTabHeader, SidebarContent } from './components/Sidebar';
import { MainChat, MainInput } from './components/Main';

function App() {
  const [topics, setTopics] = useState({
    "Topic 1": {
      "Chat 1": [
        { text: "Hello!", user: true, match: null, chatId: 0 },
        { text: "Hi there!", user: false, match: null, chatID: 1 },
        //... more messages
      ],
      //... more chats
    },
    // this topic / chat is specifically for the bot to process new topics
    // TODO: separate out this logic and handle it more cleanly
    "Brainstorm": {
      "Brainstorm": [
        //... chats for Brainstorm
      ],
    },
    //... more topics
  });
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("Topic 1");
  const [currentChat, setCurrentChat] = useState("Chat 1");
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
  const [currentTab, setCurrentTab] = useState('Topics');
  const chatEndRef = useRef(null);

  // This effect will run whenever the current topic changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topics]);

  const submitNewTopicName = async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        const message = event.target.value;
        event.target.value = '';
        if (message) {
          setBrainstormActive(true);
          await addChatMessage('Brainstorm', 'Brainstorm', message, true);
          const botResponses = await Bot.getResponse(message);
          for (const botResponse of botResponses) {
            await addChatMessage('Brainstorm', 'Brainstorm', botResponse.text, false, botResponse.match);
          }
        }
        setEditingNewTopic(false);
    }
  };

  const addChatUnderTopic = (chatName, chatId) => {
    const brainstormChats = topics["Brainstorm"]["Brainstorm"];
    let topicName = null;

    // retrieve the nearest user message above this chatId to use as the topic name
    for (let j = chatId - 1; j >= 0; j--) {
      if (brainstormChats[j].user) {
        topicName = brainstormChats[j].text;
        break;
      }
    }

    if (!topicName) return; // handle error here

    // add a new topic if it doesn't already exist and add a new chat under that topic
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) updatedTopics[topicName] = {};
      if (!updatedTopics[topicName][chatName]) updatedTopics[topicName][chatName] = [];
      
      return updatedTopics;
    });

    // focus on the new chat and topic
    setCurrentTopic(topicName);
    setCurrentChat(chatName);
  };

  const deleteTopic = (name) => {
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
    setTopics(prevTopics => {
      const updatedTopics = { ...prevTopics };
      if (!updatedTopics[topicName]) return updatedTopics; // handle error here

      const updatedChats = { ...updatedTopics[topicName] };
      delete updatedChats[chatName];

      updatedTopics[topicName] = updatedChats;

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

  const addChatMessage = (topicName, chatName, text, user, match=null) => {
    return new Promise(resolve => {
      setTopics(prevTopics => {
        if (!prevTopics[topicName] || !prevTopics[topicName][chatName]) return prevTopics; // handle error here

        const chatId = prevTopics[topicName][chatName].length; // Use the length of the chat array as the chatId

        const updatedTopics = {
          ...prevTopics,
          [topicName]: {
            ...prevTopics[topicName],
            [chatName]: [...prevTopics[topicName][chatName], { text, user, match, chatId }],
          },
        };

        resolve(updatedTopics);
        return updatedTopics;
      });
    });
  };

  const handleTopicClick = (topicName) => {
    setCurrentTopic(topicName);
    setCurrentTab('Active Chats');
    
    // Set the first chat of the selected topic as the current chat
    const availableChats = Object.keys(topics[topicName]);
    if (availableChats.length > 0) {
      setCurrentChat(null); // No chats left
    } else {
      setCurrentChat(availableChats[0]);
    }

    // If brainstorm is currently active, deactivate it
    setBrainstormActive(false);
  };


  const handleBackClick = () => {
    setCurrentTab('Topics');
    setCurrentChat(null);
  };

  const handleNewMessage = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      const message = event.target.value;
      event.target.value = '';
      // TODO: this if else can be made more readable
      if (message && currentTopic !== 'Brainstorm') {
        await addChatMessage(currentTopic, currentChat, message, true);
        const randomBotResponse = Bot.getRandomResponse(message);
        await addChatMessage(currentTopic, currentChat, randomBotResponse, false);
      }
      else if (message) {
        await addChatMessage(currentTopic, currentChat, message, true);
        const botResponses = await Bot.getResponse(message);
        for (const botResponse of botResponses) {
          await addChatMessage(currentTopic, currentChat, botResponse.text, false, botResponse.match);
        }
      }
    }
  };

  const activeChatsProps = { 
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
        <SidebarContent {...activeChatsProps} />
      </div>
      <div className="main">
        <MainChat {...mainProps} />
        <MainInput {...mainProps} />
      </div>
    </div>
  );
}

export default App;
