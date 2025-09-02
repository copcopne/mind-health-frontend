export type Note = {
  id: number
  shortContent: string
  moodLevel: "VERY_BAD" | "BAD" | "NORMAL" | "GOOD" | "EXCELLENT"
  mainTopic: string | null
  otherTopics: string[]
  sentimentScore: number | null
  isCrisis: boolean
  isEditable: boolean
  createdAt: Date
}

export type NoteDetail = {
  id: number
  content: string
  moodLevel: "VERY_BAD" | "BAD" | "NORMAL" | "GOOD" | "EXCELLENT"
  mainTopic: string | null
  otherTopics: string[]
  sentimentScore: number | null
  isCrisis: boolean
  isEditable: boolean
  createdAt: Date
}

type NoteResponse = {
  id: number
  short_content: string
  content: string
  mood_level: "VERY_BAD" | "BAD" | "NORMAL" | "GOOD" | "EXCELLENT"
  main_topic: string | null
  other_topics: string[] | null
  sentiment_score: number | null
  is_crisis: boolean | null
  is_editable: boolean
  created_at: Date
}

export function mapNote(res: NoteResponse): Note {
  return {
    id: res.id,
    shortContent: res.short_content,
    moodLevel: res.mood_level,
    mainTopic: res.main_topic,
    otherTopics: res.other_topics ?? [],
    sentimentScore: res.sentiment_score,
    isCrisis: res.is_crisis ?? false,
    isEditable: res.is_editable,
    createdAt: res.created_at
  }
}
export function mapNoteDetail(res: NoteResponse): NoteDetail {
  return {
    id: res.id,
    content: res.content,
    moodLevel: res.mood_level,
    mainTopic: res.main_topic,
    otherTopics: res.other_topics ?? [],
    sentimentScore: res.sentiment_score,
    isCrisis: res.is_crisis ?? false,
    isEditable: res.is_editable,
    createdAt: res.created_at
  }
}
