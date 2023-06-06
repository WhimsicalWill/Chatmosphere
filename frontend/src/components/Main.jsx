import React from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export function MainChat({ 
  currentTopic,
  currentChat,
  topics,
  addChatUnderTopic,
  chatEndRef,
  userID,
}) {
  
  const shouldRenderChat = currentTopic && currentChat;
  let messagesToRender = [];
  let chatHeaderText = "";

  if (shouldRenderChat) {
    messagesToRender = topics[currentTopic][currentChat].messages;
    chatHeaderText = topics[currentTopic][currentChat].name;
  }

  const instructionOverview = (
    <div className="instruction-text">
      <h2>Welcome to Chatmos</h2>
      <p>Here are some tips to get you started:</p>
      <ul>
        <li>Select a topic from the sidebar to start a chat.</li>
        <li>Enter a message into the input box at the bottom to send a message.</li>
        <li>You can add a new topic by clicking on the '+' button in the sidebar.</li>
      </ul>
    </div>
  );


  return (
    <div className="chat-messages">
      {shouldRenderChat ? (
        <>
          <div className="chat-header-container">
            {/* TODO: load the user's profile */}
            <img className="profile-picture" src={"https://cdn-icons-png.flaticon.com/128/3135/3135715.png"} alt="Profile" />
            <h1 className="chat-header-text">{chatHeaderText}</h1>
          </div> 
          {
            messagesToRender.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.userID === userID ? 'user' : 'bot'}`}
            >
              {message.message}
              {message.matchInfo && 
              <div className="topic-match">
                <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => addChatUnderTopic(message.matchInfo, message.messageID)}
                >
                {message.matchInfo.chatName}
                </Button>
              </div>
              }
            </div>
            ))
          }
        </>
      ) : (
        instructionOverview
      )}
      <div className="chat-message" ref={chatEndRef} />
    </div>
  );
}

export function MainInput({ 
  currentTopic,
  currentChat,
  handleMessage,
}) {
  return (
    <>
      {currentTopic && currentChat && (
        <div className="send-message">
          <input 
          id="messageInput"
          type="text"
          placeholder="Send a message."
          onKeyDown={async (event) => handleMessage(event, currentChat)} />
        </div>
      )}
    </>
  );
}
