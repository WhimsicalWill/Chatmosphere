from langchain import FewShotPromptTemplate, LLMChain, PromptTemplate
from langchain.chains import LLMChain
import openai
from dotenv import load_dotenv
import os
from langchain.llms import OpenAI


class AsymmetricQueryGenerator:
    """
    A class that generates asymmetric queries based on the user's initial query using a language model.

    Attributes:
        llm (OpenAI): Language model to generate queries.
    """

    def __init__(self):
        """
        The constructor for AsymmetricQueryGenerator class.
        """
        self.initApiKey()
        self.llm = OpenAI(model_name="text-davinci-003")  # Initialize your language model
        # Define the structure of the prompt with input variables and template
        self.configurePrompt()
        self.chain = LLMChain(llm=self.llm, prompt=self.few_shot_prompt)

    def initApiKey(self):
        load_dotenv()
        #openai.api_key = os.getenv('OPENAI_API_KEY')
        openai.api_key = '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' 
        

    # changed the prompt/examples to create alternates in both directions
    def configurePrompt(self):
        example_1 = {
            "original_query": "What is it like getting old?",
            "alternate_query": "My experiences getting older"
        }

        example_2 = {
            "original_query": "I'm an expert on painting and color theory",
            "alternate_query": "What are the key elements of painting?"
        }

        example_3 = {
            "original_query": "How is it like working in a startup?",
            "alternate_query": "I developed a startup at 18, ask me anything!"
        }

        example_4 = {
            "original_query": "Experiences as a professional musician",
            "alternate_query": "What does it feel like to be a professional musician?"
        }

        example_5 = {
            "original_query": "What does it feel like to travel in space?",
            "alternate_query": "The physical and psychological effects of space travel"
        }

        example_6 = {
            "original_query": "Running a hydroponics farm",
            "alternate_query": "What is it like to live in an eco-friendly way?"
        }
        example_7 = {
            "original_query": "What is it like to be a software engineer?",
            "alternate_query": "The day-to-day responsibilities of a software engineer"
        }

        example_8 = {
            "original_query": "Methods and challenges of language acquisition",
            "alternate_query": "What's it like to learn a new language?"
        }

        example_9 = {
            "original_query": "What is it like to live in a different culture?",
            "alternate_query": "Experiencing and adapting to cultural differences"
        }

        example_10 = {
            "original_query": "The preparation and challenges of high-altitude mountaineering",
            "alternate_query": "What is it like to climb Mount Everest?"
        }

        example_11 = {
            "original_query": "What are the best hidden spots in New York City?",
            "alternate_query": "Unveiling the hidden gems of New York City from a local's perspective"
        }

        examples = [example_1, example_2, example_3, example_4, example_5,
                    example_6, example_7, example_8, example_9, example_10, example_11]

        example_prompt = PromptTemplate(
            input_variables=["original_query", "alternate_query"],
            template="\nOriginal Query: {original_query}\nAlternate Query: {alternate_query}\n"
        )

        # Define the prefix for the prompt, giving clear instructions on how to construct an engaging response
        prompt_prefix = "In this task, you will take on the role of a topic matcher for an application that centers around conversational " \
        "topics, and you will focus on creating asymmetric queries. Your role requires you to either think like an expert or someone who is " \
        "curious to learn more about a particular topic, depending on the user's query. For queries that express amateur interest in a subject, " \
        "please produce an alternate query by doing the following: imagine there's a user capable of answering this query in depth. Please " \
        "create an alternate query that this qualified user may have entered themselves in relation to their expertise. For queries that express " \
        "proficiency in a topic, please create an alternate query that expresses amateur interest in said topic. In essence, you are matching the " \
        "curiosity of one user with the expertise of another. Below are some examples to illustrate this process:"

        # Generate the few-shot prompt with the provided examples and structure
        self.few_shot_prompt = FewShotPromptTemplate(
            examples=examples,
            example_prompt=example_prompt,
            prefix=prompt_prefix,
            suffix="\nOriginal Query: {original_query}\nAlternate Query:",
            input_variables=["original_query"],
            example_separator="\n",
        )

    def generate(self, query, num_alternates=1):
        """
        Generates alternate queries based on the user's initial query.

        Parameters:
            query (str): The user's initial query.
            num_alternates (int): The number of alternate queries to generate.

        Returns:
            list: A list of generated alternate queries.
        """
        alternate_queries = []
        for _ in range(num_alternates):
            # Provide the original query as input
            input = {"original_query": query}
            response = self.chain.run(input)
            alternate_query = response.strip()

            alternate_queries.append(alternate_query)

        return alternate_queries

generator = AsymmetricQueryGenerator()
query = "How can I learn to code?"
alternates = generator.generate(query, num_alternates=5 )
for i, alt in enumerate(alternates):
        print(f"Alternate Query {i+1}: {alt}")