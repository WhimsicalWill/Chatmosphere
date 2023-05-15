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
  const [conversations, setConversations] = useState({
    "Conversation 1": [
      { text: "Hello!", user: true, match: null},
      { text: "Hi there!", user: false, match: null },
    ],
    "Conversation 2": [
      //... messages for Conversation 2
    ],
    "Brainstorm": [
      //... messages for Brainstorm
    ],
  });
  const [brainstormActive, setBrainstormActive] = useState(false);
  const [currentConversation, setCurrentConversation] = useState("Conversation 1");
  const [newChatName, setNewChatName] = useState("");
  const [isNewChatActive, setNewChatActive] = useState(false);
  const chatEndRef = useRef(null);

  // This effect will run whenever the current conversation changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const startNewChat = () => {
    setNewChatActive(true);
  };

  const submitNewChat = async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission
        const message = event.target.value;
        event.target.value = '';
        if (message) {
          setCurrentConversation('Brainstorm');
          await addChatMessage('Brainstorm', message, true);
          const botResponses = await Bot.getResponse(message);
          for (const botResponse of botResponses) {
            await addChatMessage('Brainstorm', botResponse.text, false, botResponse.match);
          }
        }
        setNewChatActive(false);
        setNewChatName("");
    }
  };

  const addConversation = (name) => {
    setConversations({ ...conversations, [name]: [] });
  };

  const deleteConversation = (name) => {
    setConversations(prevConversations => {
      const updatedConversations = { ...prevConversations };
      delete updatedConversations[name];
      if (currentConversation === name) {
        const remainingConversations = Object.keys(updatedConversations);
        if (remainingConversations.length > 0) {
          setCurrentConversation(remainingConversations[0]); // Select the first remaining conversation
        } else {
          setCurrentConversation(null); // No conversations left
        }
      }
      return updatedConversations;
    });
  };

  const addChatMessage = (conversationName, text, user, match = null) => {
    return new Promise(resolve => {
      setConversations(prevConversations => {
        if (!prevConversations[conversationName]) return prevConversations; // handle error here
        const updatedConversations = {
          ...prevConversations,
          [conversationName]: [...prevConversations[conversationName], { text, user, match }],
        };
        resolve(updatedConversations);
        return updatedConversations;
      });
    });
  };

  const handleSidebarClick = (conversationName, isBrainstorm = false) => {
    setCurrentConversation(conversationName);
    setBrainstormActive(isBrainstorm);
  };

  const handleNewMessage = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      const message = event.target.value;
      event.target.value = '';
      if (message && currentConversation !== 'Brainstorm') {
        await addChatMessage(currentConversation, message, true);
        const randomBotResponse = Bot.getRandomResponse(message);
        await addChatMessage(currentConversation, randomBotResponse, false);
      }
      else if (message) {
        await addChatMessage(currentConversation, message, true);
        const botResponses = await Bot.getResponse(message);
        for (const botResponse of botResponses) {
          await addChatMessage(currentConversation, botResponse.text, false, botResponse.match);
        }
      }
    }
  };

  return (
    <div className="container">
      <div className="sidebar">
        <div className="conversations-container">
          <div className="conversations-header">
            <h2><Forum className='header-icon' /> Chatmos</h2>
          </div>
          {isNewChatActive ?
              <input
                  className="new-chat-input"
                  type="text"
                  placeholder="What do you want to talk about?"
                  value={newChatName}
                  onChange={(event) => setNewChatName(event.target.value)}
                  onKeyDown={(event) => submitNewChat(event)}
                  onBlur={() => setNewChatActive(false)}
              />
              :
              <div 
                  className="conversation" 
                  onClick={() => startNewChat()}
              >
                  <LightbulbIcon className='brainstorm-icon' /> New Topic
              </div>
          }
          <ul className="conversation-list">
              {Object.keys(conversations).filter(c => c !== 'Brainstorm').map((conversationName, index) => (
                  <li
                      key={index}
                      onClick={() => handleSidebarClick(conversationName, false)}
                      className={`conversation ${currentConversation === conversationName ? "active-conversation" : ""}`}
                  >
                      <ChatBubble className='chat-icon' /> {conversationName}
                      <DeleteIcon 
                        className='delete-icon' 
                        onClick={(event) => {
                          event.stopPropagation(); // prevent the sidebar click event from firing
                          deleteConversation(conversationName);
                        }}
                      />
                  </li>
              ))}
          </ul>
        </div>
        {/* The following is not being used but I'm keeping it because the space may be useful
        in the UI at some later point. Currently, clicking it just focuses the brainstorm conversation. */}
        <div 
            className={`brainstorm ${brainstormActive ? "active-brainstorm" : ""}`} 
            onClick={() => handleSidebarClick('Brainstorm', true) }
        >
            <LightbulbIcon className='brainstorm-icon' /> Brainstorm
        </div>
      </div>
      <div className="main">
        <div className="chat-messages">
          {currentConversation &&
            conversations[currentConversation].map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.user ? 'user' : 'bot'}`}
              >
                {message.text}
                {message.match && 
                  <div className="conversation-match">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => addConversation(message.match)}
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
