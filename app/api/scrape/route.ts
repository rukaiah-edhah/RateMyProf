import { NextResponse } from "next/server";
import { load } from 'cheerio'
import path from "path";
import fs from 'fs'
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../../data')

if (!fs.existsSync(dataDir)){
  fs.mkdirSync(dataDir);
}

export async function POST(req: Request){
  try {
    const { url, selector} = await req.json();

    if (!url || !selector) {
      return NextResponse.json({ error: ''}, {  status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${url}: ${response.statusText}`)
    }

    const body = await response.text();
    const $ = load(body);

    const htmlFilePath = path.join(dataDir, 'data.html')
    fs.writeFileSync(htmlFilePath, body, 'utf-8')
    console.log(`Page content saved to ${htmlFilePath}`)

    const dataJson: { tag: string | undefined; content: string; class: string;}[] = []
    $(selector).each((i, elem) => {
      const content = $(elem).text().trim();
      const tag = $(elem).prop('tagName');
      const className = $(elem).attr('class') || '';

      if (content){
        dataJson.push({ tag, content, class: className });
      }
    })

    if (dataJson.length === 0){
      throw new Error(`No elements found with selector: ${selector}`);
    }


  } catch (error){
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error || 'Failed to scrape.'}, {  status: 500 });
  }
}

export async function GET(req: Request){
  const url = new URL(req.url)

  try {
    
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data.'}, {  status: 500 });
  }
}