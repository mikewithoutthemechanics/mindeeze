import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function generateAIDraft({
  bulletPoints,
  noteType = 'soap',
  context = '',
}: {
  bulletPoints: string[]
  noteType?: 'soap' | 'dap' | 'narrative'
  context?: string
}) {
  try {
    const systemPrompt = `You are a clinical documentation assistant for mental health professionals. 
You help therapists draft session notes based on their bullet point observations.
Always maintain professional, clinical language. Never generate diagnoses or treatment recommendations - 
only structure the provided information into the requested note format.
The draft should be reviewed and edited by the therapist before signing.`

    const noteInstructions = {
      soap: `Structure the note as SOAP format:
- Subjective: Client's reported feelings, thoughts, and experiences
- Objective: Observable behaviors, therapist observations
- Assessment: Clinical impression and formulation
- Plan: Next steps and homework assignments`,
      dap: `Structure the note as DAP format:
- Data: What happened in the session, client statements
- Assessment: Clinical interpretation and progress
- Plan: Future treatment direction`,
      narrative: `Structure as a coherent narrative summary of the session`,
    }

    const userPrompt = `Context: ${context}

Bullet points from the session:
${bulletPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

${noteInstructions[noteType]}

Generate a structured note draft based on these bullet points. Return the response in JSON format with the appropriate sections.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error generating AI draft:', error)
    throw error
  }
}

export async function summarizeTranscription({
  transcription,
  noteType = 'soap',
}: {
  transcription: string
  noteType?: 'soap' | 'dap' | 'narrative'
}) {
  try {
    const systemPrompt = `You are a clinical documentation assistant for mental health professionals.
You help therapists draft session notes based on session transcriptions.
Always maintain professional, clinical language. Never generate diagnoses or treatment recommendations - 
only structure the provided information into the requested note format.
The draft should be reviewed and edited by the therapist before signing.`

    const noteInstructions = {
      soap: `Structure the note as SOAP format:
- Subjective: Client's reported feelings, thoughts, and experiences
- Objective: Observable behaviors, therapist observations
- Assessment: Clinical impression and formulation
- Plan: Next steps and homework assignments`,
      dap: `Structure the note as DAP format:
- Data: What happened in the session, client statements
- Assessment: Clinical interpretation and progress
- Plan: Future treatment direction`,
      narrative: `Structure as a coherent narrative summary of the session`,
    }

    const userPrompt = `Session transcription:
${transcription}

${noteInstructions[noteType]}

Generate a structured note draft based on this transcription. Return the response in JSON format with the appropriate sections.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error summarizing transcription:', error)
    throw error
  }
}

export async function generateSessionSummary({
  clientName,
  sessionNotes,
  progressTrends,
}: {
  clientName: string
  sessionNotes: string[]
  progressTrends?: { phq9?: number[]; gad7?: number[] }
}) {
  try {
    const systemPrompt = `You are a clinical documentation assistant. Generate a brief 3-sentence summary of client progress for therapist review.
Focus on observable progress, engagement, and treatment direction. Never make clinical diagnoses.`

    let trendsInfo = ''
    if (progressTrends) {
      if (progressTrends.phq9) {
        trendsInfo += `PHQ-9 scores: ${progressTrends.phq9.join(', ')}. `
      }
      if (progressTrends.gad7) {
        trendsInfo += `GAD-7 scores: ${progressTrends.gad7.join(', ')}. `
      }
    }

    const userPrompt = `Client: ${clientName}
${trendsInfo}
Recent session notes:
${sessionNotes.map((note, i) => `Session ${i + 1}: ${note}`).join('\n\n')}

Generate a 3-sentence progress summary for this client.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error generating session summary:', error)
    throw error
  }
}

export async function analyzeSentiment({
  noteContent,
}: {
  noteContent: string
}) {
  try {
    const systemPrompt = `You are a clinical sentiment analysis assistant. Analyze the emotional tone and mood indicators in session notes.
Provide a brief analysis without making clinical judgments. Focus on observable emotional states mentioned in the note.`

    const userPrompt = `Analyze the emotional sentiment and mood indicators in this session note:
${noteContent}

Return the analysis in JSON format with these fields:
- overall_sentiment: "positive", "neutral", "negative", or "mixed"
- mood_indicators: array of key emotional words or phrases detected
- confidence: number from 0 to 1 indicating confidence in the analysis
- themes: array of 2-3 main themes identified in the note`

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated')
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error analyzing sentiment:', error)
    throw error
  }
}
