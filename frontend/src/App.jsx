import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Bot from './components/Bot';

// Material UI imports
import ChatBubble from '@mui/icons-material/ChatBubble';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import Forum from '@mui/icons-material/Forum';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function App() {
  const [topics, setTopics] = useState({
    "Topic 1": {
      "Chat 1": [
        { text: "Hello!", user: true, match: null },
        { text: "Hi there!", user: false, match: null },
        //... more messages
      ],
      "Chat 2": [
        //... messages for Chat 2
      ],
      //... more chats
    },
    "Topic 2": {
      //... chats for Topic 2
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
  const [newTopicName, setNewTopicName] = useState("");
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
          setCurrentTopic('Brainstorm');
          setCurrentChat('Brainstorm');
          await addChatMessage('Brainstorm', 'Brainstorm', message, true);
          const botResponses = await Bot.getResponse(message);
          for (const botResponse of botResponses) {
            await addChatMessage('Brainstorm', 'Brainstorm', botResponse.text, false, botResponse.match);
          }
        }
        setEditingNewTopic(false);
        setNewTopicName("");
    }
  };

  const addTopic = (name) => {
    setTopics({ ...topics, [name]: [] });
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

        const updatedTopics = {
          ...prevTopics,
          [topicName]: {
            ...prevTopics[topicName],
            [chatName]: [...prevTopics[topicName][chatName], { text, user, match }],
          },
        };

        resolve(updatedTopics);
        return updatedTopics;
      });
    });
  };

  const handleTopicClick = (topicName, isBrainstorm = false) => {
    setCurrentTopic(topicName);
    // If we're in the brainstorm chat, automatically set the current chat to brainstorm (it's the only chat)
    setCurrentChat(isBrainstorm ? 'Brainstorm' : null);
    setBrainstormActive(isBrainstorm);
    setCurrentTab('Active Chats');
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

  // Declare some tricky sections as variables
  const editingNewTopicSection = isEditingNewTopic ?
    <input
      className="new-topic-input"
      type="text"
      placeholder="What do you want to talk about?"
      value={newTopicName}
      onChange={(event) => setNewTopicName(event.target.value)}
      onKeyDown={(event) => submitNewTopicName(event)}
      onBlur={() => setEditingNewTopic(false)}
    />
    :
    <div 
      className="topic" 
      onClick={() => setEditingNewTopic(true)}
    >
      <LightbulbIcon className='brainstorm-icon' /> New Topic
    </div>
  ;

  const topicListSection = 
    <ul className="topic-list">
      {Object.keys(topics).filter(c => c !== 'Brainstorm').map((topicName, index) => (
        <li
          key={index}
          onClick={() => handleTopicClick(topicName, false)}
          className={`topic ${currentTopic === topicName ? "active-topic" : ""}`}
        >
          <ChatBubble className='topic-icon' /> {topicName}
          <DeleteIcon 
            className='delete-icon' 
            onClick={(event) => {
              event.stopPropagation(); // prevent the sidebar click event from firing
              deleteTopic(topicName);
            }}
          />
        </li>
      ))}
    </ul>
  ;


  return (
    <div className="container">
      <div className="sidebar">
        <div className="sidebar-container">
          <a href="https://github.com/WhimsicalWill/Chatmos" target="_blank" rel="noopener noreferrer">
            <div className="sidebar-header">
              <Forum className='header-icon' />
                <h2>Chatmos</h2>
              {/* Invisible 'dummy' icon to balance the visible icon */}
              <IconButton style={{ visibility: "hidden" }}>
                <Forum />
              </IconButton>
            </div>
          </a>
          {/* The tab header adds a dummy button for proper centering*/}
          <div className="tab-header">
            {currentTab === 'Active Chats' ? (
              <IconButton onClick={handleBackClick}>
                <ArrowBackIcon />
              </IconButton>
            ) : (
              <IconButton style={{ visibility: "hidden" }}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <h2>{currentTab}</h2>
            <IconButton style={{ visibility: "hidden" }}>
              <ArrowBackIcon />
            </IconButton>
          </div>
          {currentTab === 'Topics' && (
            <>
              {editingNewTopicSection}
              {topicListSection}
            </>
          )}
          {currentTab === 'Active Chats' && (
            <ul className="chat-list">
              {Object.keys(topics[currentTopic]).map((chatName, index) => (
                <li
                  key={index}
                  onClick={() => setCurrentChat(chatName, false)}
                  className={`chat ${currentChat === chatName ? "active-chat" : ""}`}
                >
                  {/* TODO: Find a better icon for topic */}
                  <ChatBubble className='chat-icon' /> {chatName}
                  <DeleteIcon 
                    className='delete-icon' 
                    onClick={(event) => {
                      event.stopPropagation(); // prevent the sidebar click event from firing
                      deleteChat(currentTopic, chatName);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* The following is not being used but I'm keeping it because the space may be useful
        in the UI at some later point. Currently, clicking it just focuses the brainstorm topic. */}
        <div 
            className={`brainstorm ${brainstormActive ? "active-brainstorm" : ""}`} 
            onClick={() => handleTopicClick('Brainstorm', true) }
        >
            <LightbulbIcon className='brainstorm-icon' /> Brainstorm
        </div>
      </div>
      <div className="main">
        <div className="chat-messages">
          {currentTopic && currentChat &&
            topics[currentTopic][currentChat].map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.user ? 'user' : 'bot'}`}
              >
                {message.text}
                {message.match && 
                  <div className="topic-match">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => addTopic(message.match)}
                    >
                      {message.match}
                    </Button>
                  </div>
                }
              </div>
            ))}
          <div className="chat-message" ref={chatEndRef} />
        </div>
        {!brainstormActive && (
          <div className="send-message">
            <input id="messageInput" type="text" placeholder="Send a message." onKeyDown={async (event) => handleNewMessage(event)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
