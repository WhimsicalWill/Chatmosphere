import React from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

const Main = ({ 
  currentTopic,
  currentChat,
  topics,
  addTopic,
  handleNewMessage,
  chatEndRef,
  brainstormActive,
}) => {
  return (
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
          ))
        }
        <div className="chat-message" ref={chatEndRef} />
      </div>
      {!brainstormActive && (
        <div className="send-message">
          <input id="messageInput" type="text" placeholder="Send a message." onKeyDown={async (event) => handleNewMessage(event)} />
        </div>
      )}
    </div>
  );
}

export default Main;
