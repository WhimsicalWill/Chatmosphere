import React from 'react';

// Material UI imports
import ChatBubble from '@mui/icons-material/ChatBubble';
import Forum from '@mui/icons-material/Forum';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export function SidebarHeader() {
  return (
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
  );
}

export function SidebarTabHeader({ currentTab, handleBackClick }) {
  return (
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
  );
}

export function SidebarContent({ 
  currentTab, 
  topics, 
  currentTopic, 
  currentChat, 
  setCurrentChat, 
  deleteChat, 
  deleteTopic,
  newTopicName,
  handleTopicClick,
  setNewTopicName,
  submitNewTopicName,
  isEditingNewTopic,
  setEditingNewTopic 
}) {
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
      <AddIcon className='brainstorm-icon' /> New Topic
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
    <>
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
    </>
  );
}
