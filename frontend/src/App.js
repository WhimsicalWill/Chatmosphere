import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Bot from './components/Bot';

function App() {
  const [conversations, setConversations] = useState({
    "Conversation 1": [
      { text: "Hello!", user: true },
      { text: "Hi there!", user: false },
    ],
    "Conversation 2": [
      //... messages for Conversation 2
    ],
  });

  const addConversation = (name) => {
    setConversations({ ...conversations, [name]: [] });
  };

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

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const [currentConversation, setCurrentConversation] = useState("Conversation 1");

  return (
    <div className="container">
      <div className="sidebar">
        <button
          onClick={() => {
            const name = prompt("Enter the name of the new conversation:");
            if (name) {
              addConversation(name);
            }
          }}
        >
          New Conversation
        </button>
        <ul>
          {Object.keys(conversations).map((conversationName, index) => (
            <li
              key={index}
              onClick={() => setCurrentConversation(conversationName)}
              className={currentConversation === conversationName ? "active" : ""}
            >
              {conversationName}
            </li>
          ))}
        </ul>
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
              if (message) {
                await addChatMessage(currentConversation, message, true);
                const botResponse = Bot.getResponse(message);
                await addChatMessage(currentConversation, botResponse, false);
              }
            }
          }} />
        </div>
      </div>
    </div>
  );
}

export default App;
