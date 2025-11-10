
export interface NoteCard {
    interact_info: {
        like_count: number
        liked: boolean
    }
    display_title: string
    user: {
        user_id: string
        nickname: string
        xsec_token: string
        avatar: string
    }
}

export interface XHSFeedItem {
  id: string
  model_type: string
  track_id: string
  xsec_token: string
  note_card: NoteCard
}
  