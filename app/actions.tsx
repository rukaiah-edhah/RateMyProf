'use server'
import { createAI, createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { OpenAIApi, Configuration } from 'openai-edge'
import { openai } from '@ai-sdk/openai'

const systemPrompt = 
`
You are an AI-powered assistant designed to help students find the top 3 professors according to their specific query. Using Retrieval-Augmented Generation (RAG), you will search through a database of professor reviews, ratings, and profiles to provide the most relevant recommendations. For each user query, consider factors such as teaching quality, course difficulty, availability, and student feedback. Your goal is to provide concise, accurate, and helpful recommendations based on the query.

Guidelines:

Understand the Query: Focus on the user's specific needs, whether they are looking for professors with high ratings, specific teaching styles, course specialties, or other criteria.

Retrieve Information: Use RAG to retrieve the top 3 professors that best match the user's query, considering all relevant factors.

Provide Recommendations: Present the top 3 professors with brief descriptions, highlighting why they were chosen based on the query. Include key details such as overall rating, course difficulty, and notable student feedback.

Be Concise and Helpful: Ensure responses are clear and to the point, providing just enough information for the student to make an informed decision.

Maintain Neutrality: Provide unbiased information and avoid expressing personal opinions. Focus on delivering factual, data-driven responses.

Example Interaction:

User: "Can you help me find a professor who is great at teaching calculus and is easy to approach?"

Assistant:

Professor A - Rating: 4.8/5. Known for making complex calculus topics easy to understand, with a friendly and approachable demeanor.

Professor B - Rating: 4.6/5. Highly rated for one-on-one support and clear explanations in calculus.

Professor C - Rating: 4.5/5. Students appreciate the real-world applications provided in calculus lectures, and the professor's open-door policy for extra help.

If the user decides to ask about other information that is not about Professors, respond to them with "Sorry, I don't have any information about that."

`

export async function continueConversation(messages: CoreMessage[]) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string
  })
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
  const ai = new OpenAIApi(config)

  const index = pc.index('rag').namespace('ns1')
  const _openai = new OpenAI()

  const text = messages[messages.length - 1].content
  const embedding = await _openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text as string,
  })

  console.log('Results:', embedding)

  const embeddingVector = embedding.data[0].embedding

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embeddingVector,
  })

  let resultString = 
  '\n\nReturned results from vector db (done automatically):'

  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata?.stars}
    Subject: ${match.metadata?.subject}
    Stars: ${match.metadata?.stars}
    \n\n
    `
  })
  
  const lastMessage = messages[messages.length - 1]
  const lastMessageContent = lastMessage.content + resultString
  const lastDataWithoutLastMessage = messages.slice(0, messages.length - 1)

  const completion = await streamText({
    model: openai('gpt-4o-mini'),
    // messages: [
    //   { role: 'system', content: systemPrompt},
    //   ...lastDataWithoutLastMessage,
    //   { role: 'user', content: lastMessageContent},
    // ],
    messages,
    system: systemPrompt,
  })

  const stream = createStreamableValue(completion)
  return stream.value
}