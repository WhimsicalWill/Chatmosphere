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
        

    def configurePrompt(self):

        # Generate a list of examples of original queries and alternate queries
        # example_1 = {
        #     "original_query": "What is it like getting old?",
        #     "alternate_query": "Dealing with old age"
        # }
        example_1 = {
            "original_query": "What is it like getting old?",
            "alternate_query": "My experiences getting older"
        }

        # example_2 = {
        #     "original_query": "What are the key elements of painting?",
        #     "alternate_query": "Fundamentals of art and painting"
        # }
        example_2 = {
            "original_query": "What are the key elements of painting?",
            "alternate_query": "I'm an art history fanatic"
        }

        # example_3 = {
        #     "original_query": "How is it like working in a startup?",
        #     "alternate_query": "The dynamics of a startup work environment"
        # }
        example_3 = {
            "original_query": "How is it like working in a startup?",
            "alternate_query": "I developed a startup at 18, ask me anything!"
        }

        # example_4 = {
        #     "original_query": "What does it feel like to be a professional musician?",
        #     "alternate_query": "The life and challenges of a professional musician"
        # }
        example_4 = {
            "original_query": "What does it feel like to be a professional musician?",
            "alternate_query": "My life and experiences as a professional musician"
        }

        # example_5 = {
        #     "original_query": "How does one experience space travel?",
        #     "alternate_query": "The physical and psychological effects of space travel"
        # }
        example_5 = {
            "original_query": "How does one experience space travel?",
            "alternate_query": "The physical and psychological effects of space travel"
        }

        # example_6 = {
        #     "original_query": "What is it like to live in an eco-friendly way?",
        #     "alternate_query": "Practices for sustainable and green living"
        # }
        example_6 = {
            "original_query": "What is it like to live in an eco-friendly way?",
            "alternate_query": "I run a hydroponics farm"
        }
        example_7 = {
            "original_query": "What is it like to be a software engineer?",
            "alternate_query": "The day-to-day responsibilities of a software engineer"
        }

        example_8 = {
            "original_query": "What's the experience of learning a new language?",
            "alternate_query": "Methods and challenges of language acquisition"
        }

        example_9 = {
            "original_query": "What is it like to live in a different culture?",
            "alternate_query": "Experiencing and adapting to cultural differences"
        }

        example_10 = {
            "original_query": "What is it like to climb Mount Everest?",
            "alternate_query": "The preparation and challenges of high-altitude mountaineering"
        }


        examples = [example_1, example_2, example_3, example_4, example_5,
                    example_6, example_7, example_8, example_9, example_10,]

        example_prompt = PromptTemplate(
            input_variables=["original_query", "alternate_query"],
            template="\nOriginal Query: {original_query}\nAlternate Query: {alternate_query}\n"
        )

        # Define the prefix for the prompt, giving clear instructions on how to construct an engaging response
        prompt_prefix = "In this task, you will take on the role of a topic matcher for an application that centers around conversational" \
        "topics, specifically focusing on its asymmetric functionality. Your role requires you to think like an expert or someone with" \
        "extensive knowledge or experience in a particular field. For every provided query, imagine there's a user capable of answering" \
        "that query in depth. Your job is to figure out what query this user might have entered themselves in relation to their expertise." \
        "Your goal is to create an alternate query that would cater to someone interested in learning more about the subject. In essence, " \
        "you are matching the curiosity of one user with the expertise of another. Below are some examples to illustrate this process:"
        
        #image there is a user that can answer the question of the query. What would this user have entered as their own query?

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
query = "I want to learn more about philosphers from the 60's"
alternates = generator.generate(query, num_alternates=5 )
for i, alt in enumerate(alternates):
        print(f"Alternate Query {i+1}: {alt}")