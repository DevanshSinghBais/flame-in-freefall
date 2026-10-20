export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TimestampColumns = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null } & TimestampColumns;
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      saved_papers: {
        Row: {
          id: string;
          user_id: string;
          nasa_id: string;
          canonical_url: string;
          title: string;
          abstract: string | null;
          authors: string[];
          publication_date: string | null;
          doi: string | null;
          document_type: string | null;
          center: string | null;
          subject_categories: string[];
          source_retrieved_at: string;
        } & TimestampColumns;
        Insert: {
          id?: string;
          user_id: string;
          nasa_id: string;
          canonical_url: string;
          title: string;
          abstract?: string | null;
          authors?: string[];
          publication_date?: string | null;
          doi?: string | null;
          document_type?: string | null;
          center?: string | null;
          subject_categories?: string[];
          source_retrieved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          canonical_url?: string;
          title?: string;
          abstract?: string | null;
          authors?: string[];
          publication_date?: string | null;
          doi?: string | null;
          document_type?: string | null;
          center?: string | null;
          subject_categories?: string[];
          source_retrieved_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      research_collections: {
        Row: { id: string; user_id: string; name: string; description: string | null } & TimestampColumns;
        Insert: { id?: string; user_id: string; name: string; description?: string | null; created_at?: string; updated_at?: string };
        Update: { name?: string; description?: string | null; updated_at?: string };
        Relationships: [];
      };
      collection_items: {
        Row: { user_id: string; collection_id: string; saved_paper_id: string; created_at: string };
        Insert: { user_id: string; collection_id: string; saved_paper_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      personal_notes: {
        Row: { id: string; user_id: string; saved_paper_id: string; content: string } & TimestampColumns;
        Insert: { id?: string; user_id: string; saved_paper_id: string; content: string; created_at?: string; updated_at?: string };
        Update: { content?: string; updated_at?: string };
        Relationships: [];
      };
      saved_searches: {
        Row: { id: string; user_id: string; name: string; query: string; filters: Json } & TimestampColumns;
        Insert: { id?: string; user_id: string; name: string; query: string; filters?: Json; created_at?: string; updated_at?: string };
        Update: { name?: string; query?: string; filters?: Json; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
