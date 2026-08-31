export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type QuoteStatus = 'draft' | 'published' | 'archived'

export type Database = {
  public: {
    Tables: {
      scholars: RowTable<{
        id: string
        slug: string
        english_name: string
        arabic_name: string | null
        death_year: string | null
        biography: string | null
        image_url: string | null
        metadata: Json | null
        is_archived: boolean
        created_at: string
        updated_at: string
      }>
      sources: RowTable<{
        id: string
        slug: string
        title: string
        arabic_title: string | null
        author: string | null
        publisher: string | null
        edition: string | null
        cover_url: string | null
        metadata: Json | null
        is_archived: boolean
        created_at: string
        updated_at: string
      }>
      translators: RowTable<{
        id: string
        slug: string
        name: string
        bio: string | null
        is_archived: boolean
        created_at: string
        updated_at: string
      }>
      categories: RowTable<{
        id: string
        slug: string
        name: string
        arabic_name: string | null
        description: string | null
        parent_id: string | null
        sort_order: number
        is_archived: boolean
        created_at: string
        updated_at: string
      }>
      tags: RowTable<{
        id: string
        slug: string
        name: string
        is_archived: boolean
        created_at: string
        updated_at: string
      }>
      quotes: RowTable<{
        id: string
        slug: string
        arabic_text: string | null
        english_text: string
        scholar_id: string
        source_id: string | null
        translator_id: string | null
        status: QuoteStatus
        featured: boolean
        book: string | null
        volume: string | null
        page: string | null
        chapter: string | null
        edition: string | null
        external_reference: string | null
        admin_notes: string | null
        created_at: string
        updated_at: string
        published_at: string | null
      }>
      quote_categories: RowTable<{
        quote_id: string
        category_id: string
      }, { quote_id: string; category_id: string }, Partial<{ quote_id: string; category_id: string }>>
      quote_tags: RowTable<{
        quote_id: string
        tag_id: string
      }, { quote_id: string; tag_id: string }, Partial<{ quote_id: string; tag_id: string }>>
      admins: RowTable<{
        id: string
        email: string
        role: 'admin'
        password_hash: string | null
        created_at: string
      }, {
        id?: string
        email: string
        role?: 'admin'
        password_hash?: string | null
        created_at?: string
      }>
      audit_log: RowTable<{
        id: string
        actor_admin_id: string | null
        action: string
        entity_type: string
        entity_id: string | null
        details: Json
        created_at: string
      }>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      normalize_arabic_search: {
        Args: { input_text: string | null }
        Returns: string
      }
      search_published_quotes: {
        Args: {
          p_search?: string | null
          p_scholar_slug?: string | null
          p_category_slug?: string | null
          p_source_slug?: string | null
          p_translator_slug?: string | null
          p_tag_slug?: string | null
          p_sort?: string
          p_offset?: number
          p_limit?: number
        }
        Returns: Array<{
          id: string
          slug: string
          arabic_text: string | null
          english_text: string
          book: string | null
          volume: string | null
          page: string | null
          chapter: string | null
          edition: string | null
          external_reference: string | null
          featured: boolean
          published_at: string | null
          scholar_id: string
          scholar_name: string
          scholar_slug: string
          scholar_death_year: string | null
          source_id: string | null
          source_title: string | null
          source_slug: string | null
          translator_id: string | null
          translator_name: string | null
          translator_slug: string | null
          total_count: number
        }>
      }
      admin_save_quote: {
        Args: {
          p_id: string | null
          p_slug: string
          p_arabic_text: string | null
          p_english_text: string
          p_scholar_id: string
          p_source_id: string | null
          p_translator_id: string | null
          p_status: QuoteStatus
          p_featured: boolean
          p_book: string | null
          p_volume: string | null
          p_page: string | null
          p_chapter: string | null
          p_edition: string | null
          p_external_reference: string | null
          p_admin_notes: string | null
          p_category_ids: string[]
          p_tag_ids: string[]
          p_actor_admin_id: string
        }
        Returns: string
      }
      admin_merge_tags: {
        Args: {
          p_source_tag_id: string
          p_target_tag_id: string
          p_actor_admin_id: string
        }
        Returns: undefined
      }
      admin_delete_quote: {
        Args: { p_quote_id: string; p_actor_admin_id: string }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
