# Chatmos

Chatmos is a web application designed to foster 1-1 human connections around specific topics or ideas. Users can cast out multiple conversations at once, maximizing their chances of making a connection. With the help of artificial intelligence, users are seamlessly matched with conversation partners based on their interests. The application also provides several additional functionalities like content moderation, language support, and sentiment analysis to ensure a safe and enriching user experience.

# Features
- Topic-based Conversation Matching: Find other users interested in the same topics as you.
- AI Integration: The AI chatbot can serve as a conversation facilitator, ice-breaker, and fact-checker.
- Content Moderation: Ensures a safe and respectful environment by monitoring for inappropriate language or behavior.
- Language Support: Offers real-time translation for users speaking different languages.
- Sentiment Analysis: Analyzes the tone of the conversation and adapts its interventions to match the mood.

# Installation
This project uses React on the frontend and Flask on the backend. You'll need to have Node.js (which comes with npm) and Python installed on your computer. You'll also need to install the Anaconda package manager.

## Node.js and npm
Download Node.js and npm from [here](https://nodejs.org/en/download). 

## Python and Anaconda
Download Python [here](https://www.python.org/downloads/).
Download Anaconda [here](https://www.anaconda.com/download).

## Clone the Repository
Clone this repository to your local machine.

```bash
git clone https://github.com/username/Chatmos.git
```

## Frontend Setup
Navigate to the frontend directory and install the dependencies.

```bash
cd frontend
npm install
```
Start the React development server.

```bash
npm start
```

The app should now be running on http://localhost:3000.

## Backend Setup
Navigate to the backend directory and create a new Conda environment from the `environment.yml` file and activate it.

```bash
cd backend
conda env create -f environment.yml
conda activate conv
```

Set your OpenAI API key as an environment variable.

```bash
export OPENAI_API_KEY=<your-api-key>
```

Run the Flask server.

```bash
python main.py
```

The backend API should now be running on http://localhost:5000.

# Contributing
Contributions are welcome!

# License
This project is licensed under the terms of the MIT license. See the LICENSE file for details.