import os

import openai
from langchain.llms import OpenAI
from dotenv import load_dotenv

from query import AsymmetricQueryHelper

load_dotenv()  
openai.api_key = os.getenv('OPENAI_API_KEY')
llm = OpenAI(model_name="text-davinci-003")  # Initialize your language model

generator = AsymmetricQueryHelper()
query = "How can I learn to code?"
alternates = generator.generate(query, num_alternates=5)
for i, alt in enumerate(alternates):
        print(f"Alternate Query {i+1}: {alt}")