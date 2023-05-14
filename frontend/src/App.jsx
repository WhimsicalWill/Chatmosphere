import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Bot from './components/Bot';

// Material UI imports
import ChatBubble from '@mui/icons-material/ChatBubble';
import BrainstormIcon from '@mui/icons-material/Lightbulb';
import Forum from '@mui/icons-material/Forum';

function App() {
  const brainstormOpeningText = "Hi! I'm here to get you connected to a human conversation. Just tell me whatever you'd like to talk about. You can use fully formed sentences instead of keywords.";

  const [conversations, setConversations] = useState({
    "Conversation 1": [
      { text: "Hello!", user: true },
      { text: "Hi there!", user: false },
    ],
    "Conversation 2": [
      //... messages for Conversation 2
    ],
    "Brainstorm": [
      { text: brainstormOpeningText, user: false },
    ],
  });

  const [brainstormActive, setBrainstormActive] = useState(false);

  const chatEndRef = useRef(null);

  const [currentConversation, setCurrentConversation] = useState("Conversation 1");

  const addConversation = (name) => {
    setConversations({ ...conversations, [name]: [] });
  };
  
  // This effect will run whenever the current conversation changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const addChatMessage = (conversationName, text, user) => {
    return new Promise(resolve => {
      setConversations(prevConversations => {
        if (!prevConversations[conversationName]) return prevConversations; // handle error here
        const updatedConversations = {
          ...prevConversations,
          [conversationName]: [...prevConversations[conversationName], { text, user }],
        };
        resolve(updatedConversations);
        return updatedConversations;
      });
    });
  };

  return (
    <div className="container">
      <div className="sidebar">
        <div className="conversations-container">
          <div className="conversations-header">
            <h2><Forum className='header-icon' /> Conversations</h2>
          </div>
          <ul className="conversation-list">
              {Object.keys(conversations).filter(c => c !== 'Brainstorm').map((conversationName, index) => (
                  <li
                      key={index}
                      onClick={() => {
                        setCurrentConversation(conversationName);
                        setBrainstormActive(false);
                      }}
                      className={`conversation ${currentConversation === conversationName ? "active-conversation" : ""}`}
                  >
                      <ChatBubble className='chat-icon' /> {conversationName}
                  </li>
              ))}
          </ul>
        </div>
        <div 
            className={`brainstorm ${brainstormActive ? "active-brainstorm" : ""}`} 
            onClick={() => {
              setBrainstormActive(true);
              setCurrentConversation('Brainstorm');
            }}
        >
            <BrainstormIcon className='brainstorm-icon' /> Brainstorm
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
              </div>
            ))}
          <div className="chat-message" ref={chatEndRef} />
        </div>
        <div className="send-message">
          <input id="messageInput" type="text" onKeyDown={async (event) => {
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
                  await addChatMessage(currentConversation, botResponse, false);
                }
              }
            }
          }} />
        </div>
      </div>
    </div>
  );
}

export default App;
