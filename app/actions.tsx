'use server'
import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { OpenAIApi, Configuration } from 'openai-edge'
import { openai } from '@ai-sdk/openai'
import * as cheerio from 'cheerio'
import axios from "axios";

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

Also, please welcome the user by their name
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

  let text = messages[messages.length - 1].content
  if (getUrls(text).length > 0){
    text = await upsertPC(text, _openai, index)
  }

  const embedding = await _openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text as string,
  })

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
    messages: [
      { role: 'system', content: systemPrompt},
      ...lastDataWithoutLastMessage,
      { role: 'user', content: lastMessageContent},
    ],
  })

  const stream = createStreamableValue(completion.textStream)
  return stream.value
}

function getUrls(text: any){
  const url_regex = /https:\/\/www\.ratemyprofessors\.com\/professor\/\d+/g
  return text.match(url_regex) || [];
}

function replaceUrlsInText(text: any, urls: any, processed_data: any){
  for (let i = 0; i < urls.length; i++){
    text = text.replace(
      urls[i],
      `${processed_data[i].id} with ${processed_data[i].metadata['rating']} star rating in ${processed_data[i].metadata['department']}}`
    );
  }
  return text;
}

async function scrape_webpage(url: string){
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html)

    const name = $('div.NameTitle__Name-dowf0z-0 span').first().text().trim();
    const lastName = $('div.NameTitle__LastNameWrapper-dowf0z-2').first().text().trim();
    const fullName = `${name} ${lastName}`;

    const rating = $('div.RatingValue__Numerator-qw8sqy-2.liyUjw').text().trim();
    const reviews = $('div.Comments__StyledComments-dzzyvm-0').text().trim();
    const departmentName = $('a.TeacherDepartment__StyledDepartmentLink-fl79e8-0').text().trim();

    return {
      name: fullName,
      rating: rating,
      review: reviews,
      department: departmentName
    }

  } catch (error) {
    console.error('Failed to scrape webpage:', error);
    return null;
  }
}

async function upsertPC(text: any, client: any, index: any){
  const urls: any = getUrls(text)
  const processed_data: any[] = []

  for (const url of urls){
    const data: any = await scrape_webpage(url);
    if (!data) continue;

    try {
      const res = await client.embeddings.create({
        input: data.review as string,
        model: 'text-embedding-3-small'
      })

      const embedding = res.data[0].embedding
      processed_data.push({
        id: data.name,
        values: embedding,
        metadata: {
          rating: data.rating,
          review: data.review,
          department: data.department
        }
      })
    } catch (error) {
      console.error('Failed to scrape webpage:', error);
    }
  }

  try {
    await index.upsert(processed_data);
    return replaceUrlsInText(text, urls, processed_data)
  } catch (error) {
    console.error('Failed to upsert data:', error);
    return null;
  }
}