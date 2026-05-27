interface TranscriptionOptions {
  audioFile: File
  language?: string
}

interface TranscriptionResult {
  text: string
  duration?: number
}

export async function transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const { audioFile, language = 'en' } = options

  const formData = new FormData()
  formData.append('file', audioFile)
  formData.append('model', 'whisper-1')
  formData.append('language', language)

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transcription failed')
    }

    const data = await response.json()
    return {
      text: data.text,
      duration: data.duration,
    }
  } catch (error) {
    console.error('Whisper transcription error:', error)
    throw error
  }
}

export async function transcribeAudioRealtime(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transcription failed')
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error('Whisper real-time transcription error:', error)
    throw error
  }
}
