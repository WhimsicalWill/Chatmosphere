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
    //... more topics
  });
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("Topic 1");
  const [currentChat, setCurrentChat] = useState("Chat 1");
  const [newTopicName, setNewTopicName] = useState("");
  const [isEditingNewTopic, setEditingNewTopic] = useState(false);
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
          await addChatMessage('Brainstorm', message, true);
          const botResponses = await Bot.getResponse(message);
          for (const botResponse of botResponses) {
            await addChatMessage('Brainstorm', botResponse.text, false, botResponse.match);
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

  const handleSidebarClick = (topicName, isBrainstorm = false) => {
    setCurrentTopic(topicName);
    setCurrentChat(null);
    setBrainstormActive(isBrainstorm);
  };

  const handleNewMessage = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      const message = event.target.value;
      event.target.value = '';
      if (message && currentTopic !== 'Brainstorm') {
        await addChatMessage(currentTopic, message, true);
        const randomBotResponse = Bot.getRandomResponse(message);
        await addChatMessage(currentTopic, randomBotResponse, false);
      }
      else if (message) {
        await addChatMessage(currentTopic, message, true);
        const botResponses = await Bot.getResponse(message);
        for (const botResponse of botResponses) {
          await addChatMessage(currentTopic, botResponse.text, false, botResponse.match);
        }
      }
    }
  };

  return (
    <div className="container">
      <div className="sidebar">
        <div className="topics-container">
          <div className="topics-header">
            {/* TODO: try moving this out of the topics-header div*/}
            <h2><Forum className='header-icon' /> Chatmos</h2>
          </div>
          {isEditingNewTopic ?
              <input
                  className="new-chat-input"
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
          }
          <ul className="topic-list">
              {Object.keys(topics).filter(c => c !== 'Brainstorm').map((topicName, index) => (
                  <li
                      key={index}
                      onClick={() => handleSidebarClick(topicName, false)}
                      className={`topic ${currentTopic === topicName ? "active-topic" : ""}`}
                  >
                      {/* TODO: Find a better icon for topic */}
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
        </div>
        {/* The following is not being used but I'm keeping it because the space may be useful
        in the UI at some later point. Currently, clicking it just focuses the brainstorm topic. */}
        <div 
            className={`brainstorm ${brainstormActive ? "active-brainstorm" : ""}`} 
            onClick={() => handleSidebarClick('Brainstorm', true) }
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
