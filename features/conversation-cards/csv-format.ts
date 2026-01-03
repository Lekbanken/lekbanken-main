export const CONVERSATION_CARDS_CSV_HEADERS = [
  'collection_title',
  'collection_description',
  'main_purpose',
  'sub_purpose',
  'card_title',
  'primary_prompt',
  'followup_1',
  'followup_2',
  'followup_3',
  'leader_tip',
] as const

export type ConversationCardsCsvHeader = (typeof CONVERSATION_CARDS_CSV_HEADERS)[number]

export type ConversationCardsCsvRow = Record<ConversationCardsCsvHeader, string>
