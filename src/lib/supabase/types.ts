export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      scholars: {
        Row: {
          id: string
          slug: string
          english_name: string
          arabic_name: string | null
          death_year: string | null
          biography: string | null
          image_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['scholars']['Row']>
        Update: Partial<Database['public']['Tables']['scholars']['Row']>
      }
      sources: {
        Row: {
          id: string
          slug: string
          title: string
          arabic_title: string | null
          author: string | null
          publisher: string | null
          edition: string | null
          cover_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['sources']['Row']>
        Update: Partial<Database['public']['Tables']['sources']['Row']>
      }
      translators: {
        Row: {
          id: string
          slug: string
          name: string
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['translators']['Row']>
        Update: Partial<Database['public']['Tables']['translators']['Row']>
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          arabic_name: string | null
          description: string | null
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['categories']['Row']>
        Update: Partial<Database['public']['Tables']['categories']['Row']>
      }
      tags: {
        Row: {
          id: string
          slug: string
          name: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['tags']['Row']>
        Update: Partial<Database['public']['Tables']['tags']['Row']>
      }
      quotes: {
        Row: {
          id: string
          slug: string
          arabic_text: string | null
          english_text: string
          scholar_id: string
          source_id: string | null
          translator_id: string | null
          status: 'draft' | 'published' | 'archived'
          featured: boolean | null
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
        }
        Insert: Partial<Database['public']['Tables']['quotes']['Row']>
        Update: Partial<Database['public']['Tables']['quotes']['Row']>
      }
      imports: {
        Row: {
          id: string
          original_identifier: string | null
          raw_text: string
          parsed_arabic: string | null
          parsed_english: string | null
          parsed_scholar: string | null
          parsed_source: string | null
          duplicate_quote_id: string | null
          status: 'pending' | 'approved' | 'rejected'
          error_info: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['imports']['Row']>
        Update: Partial<Database['public']['Tables']['imports']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
